using System.Collections.ObjectModel;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Windows.Graphics;
using Microsoft.Windows.Storage.Pickers;
using Windows.System;

namespace TwoXKOChapterBuilder;

public sealed partial class MainWindow : Window
{
    // Keep these lists here for now. Later they can move to a tiny user-editable config file.
    private static readonly string[] Champions =
    [
        "Ahri", "Akali", "Blitzcrank", "Braum", "Caitlyn", "Darius", "Ekko",
        "Illaoi", "Jinx", "Senna", "Teemo", "Thresh", "Vi", "Warwick", "Yasuo"
    ];

    private static readonly string[] Fuses =
    [
        "Double Down", "2X Assist", "Freestyle", "Juggernaut", "Sidekick", "Teamfight"
    ];

    private static readonly string[] Rounds =
    [
        "Pools", "Winners Round", "Losers Round", "Top 24", "Top 16", "Top 8",
        "Winners Semifinal", "Losers Quarterfinal", "Winners Final",
        "Losers Semifinal", "Losers Final", "Grand Final", "Grand Final Reset"
    ];

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        WriteIndented = true
    };

    private readonly ObservableCollection<MatchChapter> _matches = [];

    private readonly TextBox _tournamentName = NewTextBox("TNS 2XKO #123");
    private readonly TextBox _outputFolder = NewTextBox("Relative or absolute output folder (optional)");
    private readonly ComboBox _round = NewEditableComboBox(Rounds);

    private readonly TextBox _leftPlayer = NewTextBox("Player 1");
    private readonly ComboBox _leftPoint = NewComboBox(Champions);
    private readonly ComboBox _leftAssist = NewComboBox(Champions, 1);
    private readonly ComboBox _leftFuse = NewComboBox(Fuses);

    private readonly TextBox _rightPlayer = NewTextBox("Player 2");
    private readonly ComboBox _rightPoint = NewComboBox(Champions, 2);
    private readonly ComboBox _rightAssist = NewComboBox(Champions, 3);
    private readonly ComboBox _rightFuse = NewComboBox(Fuses);

    private readonly TextBox _startTime = NewTextBox("12:34, 12:34.500, or 1:12:34");
    private readonly TextBox _endTime = NewTextBox("18:20, 18:20.250, or 1:18:20");
    private readonly CheckBox _keepSelections = new()
    {
        Content = "Keep round, characters, and Fuses after adding",
        IsChecked = true
    };

    private readonly ListView _matchList = new()
    {
        SelectionMode = ListViewSelectionMode.Single,
        HorizontalContentAlignment = HorizontalAlignment.Stretch
    };

    private readonly TextBlock _matchCount = new()
    {
        Text = "0 matches",
        Style = Application.Current.Resources["SubtitleTextBlockStyle"] as Style
    };

    private readonly TextBlock _status = new()
    {
        Text = "Ready.",
        TextWrapping = TextWrapping.Wrap
    };

    private readonly TextBlock _currentFilePathText = new()
    {
        Text = "Current JSON: Not saved yet. Save will open Save As.",
        TextWrapping = TextWrapping.Wrap,
        Opacity = 0.72
    };

    private readonly Button _addOrUpdateButton = new()
    {
        Content = "Add Match",
        MinWidth = 130
    };

    private Guid? _editingId;
    private string? _loadedNamingPattern;
    private VidChopperEncoderOptions? _loadedEncoder;
    private string? _currentFilePath;

    public MainWindow()
    {
        Title = "2XKO Chapter Builder";
        Content = BuildUi();
        ApplyWindowIcon();
        _matchList.ItemsSource = _matches;

        _addOrUpdateButton.Click += AddOrUpdateMatch_Click;
        _addOrUpdateButton.KeyboardAccelerators.Add(new KeyboardAccelerator
        {
            Key = VirtualKey.Enter,
            Modifiers = VirtualKeyModifiers.Control
        });

        _endTime.KeyDown += EndTime_KeyDown;
        _matchList.DoubleTapped += MatchList_DoubleTapped;

        AppWindow.Resize(new SizeInt32(1500, 900));
        _leftPlayer.Focus(FocusState.Programmatic);
    }

    private void ApplyWindowIcon()
    {
        try
        {
            const string resourceName = "TwoXKOChapterBuilder.AppIcon.ico";
            using var iconStream = typeof(MainWindow).Assembly.GetManifestResourceStream(resourceName);

            if (iconStream is null)
            {
                return;
            }

            var iconDirectory = Path.Combine(Path.GetTempPath(), "TwoXKOChapterBuilder");
            Directory.CreateDirectory(iconDirectory);

            var iconPath = Path.Combine(iconDirectory, "2XKOChapterBuilder.ico");
            using (var output = File.Create(iconPath))
            {
                iconStream.CopyTo(output);
            }

            AppWindow.SetIcon(iconPath);
        }
        catch (Exception exception)
        {
            _status.Text = $"The custom app icon could not be applied: {exception.Message}";
        }
    }

    private FrameworkElement BuildUi()
    {
        var root = new Grid
        {
            Margin = new Thickness(18),
            RowSpacing = 14,
            ColumnSpacing = 24
        };

        root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(610) });
        root.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

        var header = BuildHeader();
        Grid.SetColumnSpan(header, 2);
        root.Children.Add(header);

        var formScroll = new ScrollViewer
        {
            VerticalScrollBarVisibility = ScrollBarVisibility.Auto,
            Content = BuildMatchForm()
        };
        Grid.SetRow(formScroll, 1);
        root.Children.Add(formScroll);

        var listPanel = BuildMatchList();
        Grid.SetRow(listPanel, 1);
        Grid.SetColumn(listPanel, 1);
        root.Children.Add(listPanel);

        var statusBorder = new Border
        {
            Padding = new Thickness(10, 8, 10, 8),
            Child = _status
        };
        Grid.SetRow(statusBorder, 2);
        Grid.SetColumnSpan(statusBorder, 2);
        root.Children.Add(statusBorder);

        return root;
    }

    private FrameworkElement BuildHeader()
    {
        var panel = new Grid { ColumnSpacing = 12, RowSpacing = 8 };
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        panel.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        panel.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        panel.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

        var title = new TextBlock
        {
            Text = "2XKO Chapter Builder",
            Style = Application.Current.Resources["TitleTextBlockStyle"] as Style
        };
        Grid.SetColumnSpan(title, 3);
        panel.Children.Add(title);

        var tournamentField = Labeled("Tournament / event name", _tournamentName);
        Grid.SetRow(tournamentField, 1);
        panel.Children.Add(tournamentField);

        var outputFolderField = Labeled("VidChopper output folder (optional)", _outputFolder);
        Grid.SetRow(outputFolderField, 1);
        Grid.SetColumn(outputFolderField, 1);
        panel.Children.Add(outputFolderField);

        var buttons = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 8,
            VerticalAlignment = VerticalAlignment.Bottom
        };

        var openButton = NewButton("Open JSON", OpenJson_Click);
        var saveButton = NewButton("Save", SaveJson_Click);
        saveButton.KeyboardAccelerators.Add(new KeyboardAccelerator
        {
            Key = VirtualKey.S,
            Modifiers = VirtualKeyModifiers.Control
        });

        var saveAsButton = NewButton("Save As...", SaveAsJson_Click);
        saveAsButton.KeyboardAccelerators.Add(new KeyboardAccelerator
        {
            Key = VirtualKey.S,
            Modifiers = VirtualKeyModifiers.Control | VirtualKeyModifiers.Shift
        });

        var clearButton = NewButton("Clear", ClearTournament_Click);

        buttons.Children.Add(openButton);
        buttons.Children.Add(saveButton);
        buttons.Children.Add(saveAsButton);
        buttons.Children.Add(clearButton);
        Grid.SetRow(buttons, 1);
        Grid.SetColumn(buttons, 2);
        panel.Children.Add(buttons);

        Grid.SetRow(_currentFilePathText, 2);
        Grid.SetColumnSpan(_currentFilePathText, 3);
        panel.Children.Add(_currentFilePathText);

        return panel;
    }

    private FrameworkElement BuildMatchForm()
    {
        var panel = new StackPanel { Spacing = 14 };

        panel.Children.Add(new TextBlock
        {
            Text = "Match entry",
            Style = Application.Current.Resources["SubtitleTextBlockStyle"] as Style
        });
        panel.Children.Add(Labeled("Round / bracket label", _round));

        var teams = new Grid { ColumnSpacing = 18 };
        teams.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        teams.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

        var left = BuildTeamPanel("Left side", _leftPlayer, _leftPoint, _leftAssist, _leftFuse);
        var right = BuildTeamPanel("Right side", _rightPlayer, _rightPoint, _rightAssist, _rightFuse);
        Grid.SetColumn(right, 1);
        teams.Children.Add(left);
        teams.Children.Add(right);
        panel.Children.Add(teams);

        var swapButton = NewButton("Swap sides", SwapSides_Click);
        swapButton.HorizontalAlignment = HorizontalAlignment.Center;
        panel.Children.Add(swapButton);

        var timestamps = new Grid { ColumnSpacing = 12 };
        timestamps.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        timestamps.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
        var start = Labeled("Start timestamp", _startTime);
        var end = Labeled("End timestamp", _endTime);
        Grid.SetColumn(end, 1);
        timestamps.Children.Add(start);
        timestamps.Children.Add(end);
        panel.Children.Add(timestamps);

        panel.Children.Add(_keepSelections);

        var actions = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 8 };
        actions.Children.Add(_addOrUpdateButton);
        actions.Children.Add(NewButton("New Entry", NewEntry_Click));
        panel.Children.Add(actions);

        panel.Children.Add(new TextBlock
        {
            Text = "Ctrl+Enter adds or updates a match. Ctrl+S saves the tournament.",
            Opacity = 0.72
        });

        return panel;
    }

    private static FrameworkElement BuildTeamPanel(
        string heading,
        TextBox player,
        ComboBox point,
        ComboBox assist,
        ComboBox fuse)
    {
        var panel = new StackPanel { Spacing = 9 };
        panel.Children.Add(new TextBlock
        {
            Text = heading,
            Style = Application.Current.Resources["BodyStrongTextBlockStyle"] as Style
        });
        panel.Children.Add(Labeled("Player", player));
        panel.Children.Add(Labeled("Point character", point));
        panel.Children.Add(Labeled("Assist character", assist));
        panel.Children.Add(Labeled("Fuse", fuse));
        return panel;
    }

    private FrameworkElement BuildMatchList()
    {
        var root = new Grid { RowSpacing = 10 };
        root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
        root.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
        root.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });

        var heading = new StackPanel { Orientation = Orientation.Horizontal, Spacing = 10 };
        heading.Children.Add(new TextBlock
        {
            Text = "Tournament matches",
            Style = Application.Current.Resources["SubtitleTextBlockStyle"] as Style
        });
        heading.Children.Add(_matchCount);
        root.Children.Add(heading);

        Grid.SetRow(_matchList, 1);
        root.Children.Add(_matchList);

        var actions = new StackPanel
        {
            Orientation = Orientation.Horizontal,
            Spacing = 8
        };
        actions.Children.Add(NewButton("Edit", EditSelected_Click));
        actions.Children.Add(NewButton("Use as Template", UseAsTemplate_Click));
        actions.Children.Add(NewButton("Delete", DeleteSelected_Click));
        actions.Children.Add(NewButton("Move Up", MoveUp_Click));
        actions.Children.Add(NewButton("Move Down", MoveDown_Click));
        Grid.SetRow(actions, 2);
        root.Children.Add(actions);

        return root;
    }

    private async void AddOrUpdateMatch_Click(object sender, RoutedEventArgs e)
    {
        await AddOrUpdateMatchAsync();
    }

    private async Task AddOrUpdateMatchAsync()
    {
        if (!TryBuildMatch(out var match, out var error))
        {
            SetStatus(error);
            return;
        }

        if (_editingId is Guid editingId)
        {
            var index = _matches.ToList().FindIndex(x => x.Id == editingId);
            if (index < 0)
            {
                SetStatus("The match being edited no longer exists. Add it as a new entry instead.");
                ResetEditingState();
                return;
            }

            match.Id = editingId;
            match.Order = _matches[index].Order;
            _matches[index] = match;
            SetStatus($"Updated match #{match.Order}: {match.Left.Name} vs {match.Right.Name}.");
        }
        else
        {
            match.Order = _matches.Count + 1;
            _matches.Add(match);
            SetStatus($"Added match #{match.Order}: {match.Left.Name} vs {match.Right.Name}.");
        }

        UpdateCount();
        ClearEntry(_keepSelections.IsChecked == true);
        await Task.CompletedTask;
    }

    private bool TryBuildMatch(out MatchChapter match, out string error)
    {
        match = new MatchChapter();
        error = string.Empty;

        var leftName = _leftPlayer.Text.Trim();
        var rightName = _rightPlayer.Text.Trim();
        if (leftName.Length == 0 || rightName.Length == 0)
        {
            error = "Enter both player names.";
            return false;
        }

        var leftPoint = Selected(_leftPoint);
        var leftAssist = Selected(_leftAssist);
        var rightPoint = Selected(_rightPoint);
        var rightAssist = Selected(_rightAssist);

        if (leftPoint == leftAssist)
        {
            error = "The left-side point and assist characters must be different.";
            return false;
        }

        if (rightPoint == rightAssist)
        {
            error = "The right-side point and assist characters must be different.";
            return false;
        }

        if (!TryParseTimestamp(_startTime.Text, out var startMilliseconds, out var normalizedStart))
        {
            error = "Start timestamp must look like 12:34, 12:34.500, or 1:12:34.";
            return false;
        }

        if (!TryParseTimestamp(_endTime.Text, out var endMilliseconds, out var normalizedEnd))
        {
            error = "End timestamp must look like 18:20, 18:20.250, or 1:18:20.";
            return false;
        }

        if (endMilliseconds <= startMilliseconds)
        {
            error = "End timestamp must be later than the start timestamp.";
            return false;
        }

        match = new MatchChapter
        {
            Round = _round.Text.Trim(),
            Start = normalizedStart,
            End = normalizedEnd,
            StartMilliseconds = startMilliseconds,
            EndMilliseconds = endMilliseconds,
            Left = new MatchSide
            {
                Name = leftName,
                Point = leftPoint,
                Assist = leftAssist,
                Fuse = Selected(_leftFuse)
            },
            Right = new MatchSide
            {
                Name = rightName,
                Point = rightPoint,
                Assist = rightAssist,
                Fuse = Selected(_rightFuse)
            }
        };
        match.Title = BuildTitle(match);
        return true;
    }

}
