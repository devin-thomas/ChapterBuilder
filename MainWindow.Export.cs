using System.Collections.ObjectModel;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.Windows.Storage.Pickers;
using Windows.System;

namespace TwoXKOChapterBuilder;

public sealed partial class MainWindow
{
    // Exact VidChopper chapter-config adapter. The exported object intentionally contains
    // no app-only metadata because the schema rejects additional properties.
    private VidChopperChapterConfig CreateExportDocument()
    {
        var folder = _outputFolder.Text.Trim();

        return new VidChopperChapterConfig
        {
            Schema = "https://vidchopper.dev/schemas/chapter-config.schema.json",
            Version = 1,
            Output = folder.Length == 0 && string.IsNullOrWhiteSpace(_loadedNamingPattern)
                ? null
                : new VidChopperOutputOptions
                {
                    Folder = folder.Length == 0 ? null : folder,
                    NamingPattern = _loadedNamingPattern
                },
            Encoder = _loadedEncoder,
            Chapters = _matches
                .Select(match => new VidChopperChapter
                {
                    Name = BuildTitle(match),
                    Start = match.Start,
                    End = match.End,
                    OutputName = BuildOutputName(match)
                })
                .ToList()
        };
    }

    private void RenumberMatches()
    {
        for (var index = 0; index < _matches.Count; index++)
        {
            _matches[index].Order = index + 1;
            _matches[index].Title = BuildTitle(_matches[index]);
        }
    }

    private void RefreshList(MatchChapter? selected = null)
    {
        _matchList.ItemsSource = null;
        _matchList.ItemsSource = _matches;
        _matchList.SelectedItem = selected;
    }

    private void UpdateCount()
    {
        _matchCount.Text = _matches.Count == 1 ? "1 match" : $"{_matches.Count} matches";
    }

    private void SetStatus(string message)
    {
        _status.Text = message;
    }

    private void SetCurrentFile(string? filePath)
    {
        _currentFilePath = filePath;
        _currentFilePathText.Text = filePath is null
            ? "Current JSON: Not saved yet. Save will open Save As."
            : $"Current JSON: {DisplayPath(filePath)}";
    }

    private static string DisplayPath(string filePath)
    {
        try
        {
            return Path.GetFullPath(filePath);
        }
        catch
        {
            return filePath;
        }
    }

    private static string BuildTitle(MatchChapter match)
    {
        if (!string.IsNullOrWhiteSpace(match.NameOverride))
        {
            return match.NameOverride;
        }

        var round = string.IsNullOrWhiteSpace(match.Round) ? string.Empty : $"{match.Round}: ";
        return $"{round}{match.Left.Name} [{match.Left.Point}/{match.Left.Assist}; {match.Left.Fuse}] vs " +
               $"{match.Right.Name} [{match.Right.Point}/{match.Right.Assist}; {match.Right.Fuse}]";
    }

    private string BuildOutputName(MatchChapter match)
    {
        if (!string.IsNullOrWhiteSpace(match.OutputNameOverride))
        {
            return match.OutputNameOverride;
        }

        var tournament = SafeFileName(_tournamentName.Text.Trim());
        var round = SafeFileName(match.Round);
        var left = SafeFileName(match.Left.Name);
        var right = SafeFileName(match.Right.Name);
        var parts = new[]
        {
            tournament,
            match.Order.ToString("00", CultureInfo.InvariantCulture),
            round,
            left,
            "vs",
            right
        }.Where(part => !string.IsNullOrWhiteSpace(part));

        return string.Join('-', parts);
    }

    private static MatchChapter CreateMatchFromChapter(VidChopperChapter chapter)
    {
        if (string.IsNullOrWhiteSpace(chapter.Name))
        {
            throw new InvalidDataException("Every chapter must have a non-empty name.");
        }

        var hasStructuredTitle = TryParseGeneratedTitle(chapter.Name, out var match);
        if (!hasStructuredTitle)
        {
            match = new MatchChapter
            {
                Title = chapter.Name,
                NameOverride = chapter.Name,
                Left = new MatchSide
                {
                    Name = chapter.Name,
                    Point = Champions[0],
                    Assist = Champions[1],
                    Fuse = Fuses[0]
                },
                Right = new MatchSide
                {
                    Name = "Imported chapter",
                    Point = Champions[2],
                    Assist = Champions[3],
                    Fuse = Fuses[0]
                }
            };
        }

        if (!TryNormalizeTimecode(chapter.Start, out var startMilliseconds, out var normalizedStart) ||
            !TryNormalizeTimecode(chapter.End, out var endMilliseconds, out var normalizedEnd))
        {
            throw new InvalidDataException($"Chapter '{chapter.Name}' contains an unsupported timestamp.");
        }

        if (endMilliseconds <= startMilliseconds)
        {
            throw new InvalidDataException($"Chapter '{chapter.Name}' must end after it starts.");
        }

        match.Start = normalizedStart;
        match.End = normalizedEnd;
        match.StartMilliseconds = startMilliseconds;
        match.EndMilliseconds = endMilliseconds;
        match.OutputNameOverride = hasStructuredTitle ? string.Empty : chapter.OutputName ?? string.Empty;
        match.Title = chapter.Name;
        return match;
    }

    private static bool TryParseGeneratedTitle(string title, out MatchChapter match)
    {
        match = new MatchChapter();
        var parsed = Regex.Match(
            title,
            @"^(?:(?<round>.*?): )?(?<left>.*?) \[(?<leftPoint>[^/\]]+)/(?<leftAssist>[^;\]]+); (?<leftFuse>[^\]]+)\] vs (?<right>.*?) \[(?<rightPoint>[^/\]]+)/(?<rightAssist>[^;\]]+); (?<rightFuse>[^\]]+)\]$",
            RegexOptions.CultureInvariant);

        if (!parsed.Success)
        {
            return false;
        }

        match.Round = parsed.Groups["round"].Value;
        match.Left = new MatchSide
        {
            Name = parsed.Groups["left"].Value,
            Point = parsed.Groups["leftPoint"].Value,
            Assist = parsed.Groups["leftAssist"].Value,
            Fuse = parsed.Groups["leftFuse"].Value
        };
        match.Right = new MatchSide
        {
            Name = parsed.Groups["right"].Value,
            Point = parsed.Groups["rightPoint"].Value,
            Assist = parsed.Groups["rightAssist"].Value,
            Fuse = parsed.Groups["rightFuse"].Value
        };
        match.Title = title;
        return true;
    }

    private static string TournamentNameFromFile(string fileName)
    {
        var name = Path.GetFileNameWithoutExtension(fileName);
        return name.EndsWith("-chapters", StringComparison.OrdinalIgnoreCase)
            ? name[..^"-chapters".Length].Replace('-', ' ')
            : name.Replace('-', ' ');
    }

    private static bool TryNormalizeTimecode(object? value, out long milliseconds, out string normalized)
    {
        milliseconds = 0;
        normalized = string.Empty;

        if (value is string text)
        {
            return TryParseTimestamp(text, out milliseconds, out normalized);
        }

        if (value is JsonElement element)
        {
            if (element.ValueKind == JsonValueKind.String)
            {
                return TryParseTimestamp(element.GetString() ?? string.Empty, out milliseconds, out normalized);
            }

            if (element.ValueKind == JsonValueKind.Number && element.TryGetInt64(out milliseconds) && milliseconds >= 0)
            {
                normalized = FormatMilliseconds(milliseconds);
                return true;
            }

            return false;
        }

        if (value is int integer && integer >= 0)
        {
            milliseconds = integer;
            normalized = FormatMilliseconds(milliseconds);
            return true;
        }

        if (value is long longInteger && longInteger >= 0)
        {
            milliseconds = longInteger;
            normalized = FormatMilliseconds(milliseconds);
            return true;
        }

        return false;
    }

    private static string FormatMilliseconds(long milliseconds)
    {
        var totalSeconds = milliseconds / 1000;
        var fractionMilliseconds = milliseconds % 1000;
        var hours = totalSeconds / 3600;
        var minutes = (totalSeconds % 3600) / 60;
        var seconds = totalSeconds % 60;
        var normalized = hours > 0
            ? $"{hours}:{minutes:00}:{seconds:00}"
            : $"{minutes}:{seconds:00}";

        if (fractionMilliseconds > 0)
        {
            normalized += $".{fractionMilliseconds:000}".TrimEnd('0');
        }

        return normalized;
    }

    private static bool TryParseTimestamp(string input, out long milliseconds, out string normalized)
    {
        milliseconds = 0;
        normalized = string.Empty;

        var match = Regex.Match(
            input.Trim(),
            @"^(?:(?<hours>[0-9]+):)?(?<minutes>[0-5]?[0-9]):(?<seconds>[0-5][0-9])(?:\.(?<fraction>[0-9]{1,3}))?$",
            RegexOptions.CultureInvariant);

        if (!match.Success)
        {
            return false;
        }

        var hours = match.Groups["hours"].Success
            ? int.Parse(match.Groups["hours"].Value, CultureInfo.InvariantCulture)
            : 0;
        var minutes = int.Parse(match.Groups["minutes"].Value, CultureInfo.InvariantCulture);
        var seconds = int.Parse(match.Groups["seconds"].Value, CultureInfo.InvariantCulture);
        var fraction = match.Groups["fraction"].Value;
        var fractionMilliseconds = fraction.Length switch
        {
            0 => 0,
            1 => int.Parse(fraction, CultureInfo.InvariantCulture) * 100,
            2 => int.Parse(fraction, CultureInfo.InvariantCulture) * 10,
            _ => int.Parse(fraction, CultureInfo.InvariantCulture)
        };

        milliseconds = ((long)hours * 3600 + (long)minutes * 60 + seconds) * 1000 + fractionMilliseconds;
        normalized = FormatMilliseconds(milliseconds);
        return true;
    }

    private static TextBox NewTextBox(string placeholder)
    {
        return new TextBox
        {
            PlaceholderText = placeholder,
            HorizontalAlignment = HorizontalAlignment.Stretch
        };
    }

    private static ComboBox NewComboBox(IEnumerable<string> items, int selectedIndex = 0)
    {
        var combo = new ComboBox
        {
            HorizontalAlignment = HorizontalAlignment.Stretch,
            SelectedIndex = selectedIndex
        };
        foreach (var item in items)
        {
            combo.Items.Add(item);
        }
        combo.SelectedIndex = Math.Clamp(selectedIndex, 0, combo.Items.Count - 1);
        return combo;
    }

    private static ComboBox NewEditableComboBox(IEnumerable<string> items)
    {
        var combo = NewComboBox(items);
        combo.IsEditable = true;
        combo.SelectedItem = null;
        combo.Text = string.Empty;
        combo.PlaceholderText = "Pools, Top 8, Grand Final...";
        return combo;
    }

    private static StackPanel Labeled(string label, UIElement control)
    {
        var panel = new StackPanel { Spacing = 4 };
        panel.Children.Add(new TextBlock { Text = label });
        panel.Children.Add(control);
        return panel;
    }

    private static Button NewButton(string text, RoutedEventHandler handler)
    {
        var button = new Button { Content = text };
        button.Click += handler;
        return button;
    }

    private static string Selected(ComboBox combo)
    {
        return combo.SelectedItem?.ToString() ?? combo.Text.Trim();
    }

    private static void Select(ComboBox combo, string value)
    {
        combo.SelectedItem = combo.Items.Cast<object?>()
            .FirstOrDefault(item => string.Equals(item?.ToString(), value, StringComparison.OrdinalIgnoreCase));
    }

    private static void SwapText(TextBox first, TextBox second)
    {
        (first.Text, second.Text) = (second.Text, first.Text);
    }

    private static void SwapSelection(ComboBox first, ComboBox second)
    {
        var temporary = first.SelectedItem;
        first.SelectedItem = second.SelectedItem;
        second.SelectedItem = temporary;
    }

    private static string SafeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var cleaned = new string(value.Select(ch => invalid.Contains(ch) ? '-' : ch).ToArray());
        return string.Join('-', cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries));
    }
}
