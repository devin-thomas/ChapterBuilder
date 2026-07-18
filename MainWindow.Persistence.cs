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
    private async void SaveJson_Click(object sender, RoutedEventArgs e)
    {
        if (!TryPrepareSave(out var tournamentName))
        {
            return;
        }

        if (_currentFilePath is null)
        {
            await SaveAsAsync(tournamentName);
            return;
        }

        await WriteJsonAsync(_currentFilePath);
    }

    private async void SaveAsJson_Click(object sender, RoutedEventArgs e)
    {
        if (!TryPrepareSave(out var tournamentName))
        {
            return;
        }

        await SaveAsAsync(tournamentName);
    }

    private bool TryPrepareSave(out string tournamentName)
    {
        tournamentName = _tournamentName.Text.Trim();

        if (_matches.Count == 0)
        {
            SetStatus("Add at least one match before saving.");
            return false;
        }

        if (tournamentName.Length == 0)
        {
            SetStatus("Enter a tournament or event name before saving.");
            return false;
        }

        RenumberMatches();
        return true;
    }

    private async Task SaveAsAsync(string tournamentName)
    {
        try
        {
            var picker = new FileSavePicker(AppWindow.Id)
            {
                SuggestedStartLocation = PickerLocationId.DocumentsLibrary,
                SuggestedFileName = $"{SafeFileName(tournamentName)}-chapters",
                DefaultFileExtension = ".json",
                CommitButtonText = "Save JSON"
            };
            picker.FileTypeChoices.Add(
                "JSON chapter file",
                new List<string> { ".json" });

            SetStatus("Opening Save As...");
            var result = await picker.PickSaveFileAsync();
            if (result is null)
            {
                SetStatus("Save As cancelled.");
                return;
            }

            await WriteJsonAsync(result.Path);
        }
        catch (Exception ex)
        {
            SetStatus($"Could not open Save As: {ex.GetType().Name}: {ex.Message}");
        }
    }

    private async Task WriteJsonAsync(string filePath)
    {
        try
        {
            var export = CreateExportDocument();
            var json = JsonSerializer.Serialize(export, JsonOptions);
            await File.WriteAllTextAsync(filePath, json);

            if (!File.Exists(filePath))
            {
                throw new IOException("Windows reported success, but the JSON file was not found afterward.");
            }

            SetCurrentFile(filePath);
            SetStatus($"Saved {_matches.Count} matches to {DisplayPath(filePath)}.");
        }
        catch (Exception ex)
        {
            SetStatus($"Could not save the file: {ex.GetType().Name}: {ex.Message}");
        }
    }

    private async void OpenJson_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            var picker = new FileOpenPicker(AppWindow.Id)
            {
                SuggestedStartLocation = PickerLocationId.DocumentsLibrary,
                CommitButtonText = "Open JSON",
                ViewMode = PickerViewMode.List
            };
            picker.FileTypeFilter.Add(".json");

            SetStatus("Opening file picker...");
            var result = await picker.PickSingleFileAsync();
            if (result is null)
            {
                SetStatus("Open cancelled.");
                return;
            }

            var filePath = result.Path;
            var json = await File.ReadAllTextAsync(filePath);
            var document = JsonSerializer.Deserialize<VidChopperChapterConfig>(json, JsonOptions)
                ?? throw new InvalidDataException("The JSON file was empty or invalid.");

            if (document.Chapters.Count == 0)
            {
                throw new InvalidDataException("The chapter file does not contain any chapters.");
            }

            _matches.Clear();
            foreach (var chapter in document.Chapters)
            {
                _matches.Add(CreateMatchFromChapter(chapter));
            }

            _tournamentName.Text = TournamentNameFromFile(Path.GetFileName(filePath));
            _outputFolder.Text = document.Output?.Folder ?? string.Empty;
            _loadedNamingPattern = document.Output?.NamingPattern;
            _loadedEncoder = document.Encoder;
            SetCurrentFile(filePath);

            RenumberMatches();
            UpdateCount();
            ClearEntry(false);
            SetStatus($"Opened {DisplayPath(filePath)} with {_matches.Count} matches.");
        }
        catch (Exception ex)
        {
            SetStatus($"Could not open the file picker or JSON: {ex.GetType().Name}: {ex.Message}");
        }
    }

    private async void ClearTournament_Click(object sender, RoutedEventArgs e)
    {
        if (_matches.Count > 0)
        {
            var dialog = new ContentDialog
            {
                Title = "Clear this tournament?",
                Content = "This removes every match currently in the app. Save first if you need the file.",
                PrimaryButtonText = "Clear",
                CloseButtonText = "Cancel",
                DefaultButton = ContentDialogButton.Close,
                XamlRoot = ((FrameworkElement)Content).XamlRoot
            };

            if (await dialog.ShowAsync() != ContentDialogResult.Primary)
            {
                return;
            }
        }

        _matches.Clear();
        _tournamentName.Text = string.Empty;
        _outputFolder.Text = string.Empty;
        _loadedNamingPattern = null;
        _loadedEncoder = null;
        SetCurrentFile(null);
        UpdateCount();
        ClearEntry(false);
        SetStatus("Started a new tournament.");
    }

    private void NewEntry_Click(object sender, RoutedEventArgs e)
    {
        ClearEntry(_keepSelections.IsChecked == true);
        SetStatus("Ready for a new match.");
    }

    private void EditSelected_Click(object sender, RoutedEventArgs e)
    {
        if (_matchList.SelectedItem is not MatchChapter match)
        {
            SetStatus("Select a match to edit.");
            return;
        }

        LoadIntoForm(match, editing: true);
        SetStatus($"Editing match #{match.Order}.");
    }

    private void UseAsTemplate_Click(object sender, RoutedEventArgs e)
    {
        if (_matchList.SelectedItem is not MatchChapter match)
        {
            SetStatus("Select a match to use as a template.");
            return;
        }

        LoadIntoForm(match, editing: false);
        _startTime.Text = string.Empty;
        _endTime.Text = string.Empty;
        SetStatus($"Copied match #{match.Order} into a new entry. Change the names or teams and add timestamps.");
    }

    private void DeleteSelected_Click(object sender, RoutedEventArgs e)
    {
        if (_matchList.SelectedItem is not MatchChapter match)
        {
            SetStatus("Select a match to delete.");
            return;
        }

        _matches.Remove(match);
        if (_editingId == match.Id)
        {
            ResetEditingState();
        }
        RenumberMatches();
        UpdateCount();
        RefreshList();
        SetStatus($"Deleted {match.Left.Name} vs {match.Right.Name}.");
    }

    private void MoveUp_Click(object sender, RoutedEventArgs e)
    {
        MoveSelected(-1);
    }

    private void MoveDown_Click(object sender, RoutedEventArgs e)
    {
        MoveSelected(1);
    }

    private void MoveSelected(int delta)
    {
        if (_matchList.SelectedItem is not MatchChapter match)
        {
            SetStatus("Select a match to move.");
            return;
        }

        var oldIndex = _matches.IndexOf(match);
        var newIndex = oldIndex + delta;
        if (newIndex < 0 || newIndex >= _matches.Count)
        {
            return;
        }

        _matches.Move(oldIndex, newIndex);
        RenumberMatches();
        RefreshList(match);
        SetStatus($"Moved match to position {newIndex + 1}.");
    }

    private void SwapSides_Click(object sender, RoutedEventArgs e)
    {
        SwapText(_leftPlayer, _rightPlayer);
        SwapSelection(_leftPoint, _rightPoint);
        SwapSelection(_leftAssist, _rightAssist);
        SwapSelection(_leftFuse, _rightFuse);
        SetStatus("Swapped left and right sides.");
    }

    private async void EndTime_KeyDown(object sender, KeyRoutedEventArgs e)
    {
        if (e.Key == VirtualKey.Enter)
        {
            e.Handled = true;
            await AddOrUpdateMatchAsync();
        }
    }

    private void MatchList_DoubleTapped(object sender, DoubleTappedRoutedEventArgs e)
    {
        if (_matchList.SelectedItem is not MatchChapter match)
        {
            return;
        }

        LoadIntoForm(match, editing: true);
        SetStatus($"Editing match #{match.Order}.");
    }

    private void LoadIntoForm(MatchChapter match, bool editing)
    {
        _round.Text = match.Round;
        _leftPlayer.Text = match.Left.Name;
        Select(_leftPoint, match.Left.Point);
        Select(_leftAssist, match.Left.Assist);
        Select(_leftFuse, match.Left.Fuse);
        _rightPlayer.Text = match.Right.Name;
        Select(_rightPoint, match.Right.Point);
        Select(_rightAssist, match.Right.Assist);
        Select(_rightFuse, match.Right.Fuse);
        _startTime.Text = match.Start;
        _endTime.Text = match.End;

        _editingId = editing ? match.Id : null;
        _addOrUpdateButton.Content = editing ? "Update Match" : "Add Match";
        _leftPlayer.Focus(FocusState.Programmatic);
    }

    private void ClearEntry(bool preserveSelections)
    {
        _leftPlayer.Text = string.Empty;
        _rightPlayer.Text = string.Empty;
        _startTime.Text = string.Empty;
        _endTime.Text = string.Empty;

        if (!preserveSelections)
        {
            _round.Text = string.Empty;
            _leftPoint.SelectedIndex = 0;
            _leftAssist.SelectedIndex = 1;
            _leftFuse.SelectedIndex = 0;
            _rightPoint.SelectedIndex = 2;
            _rightAssist.SelectedIndex = 3;
            _rightFuse.SelectedIndex = 0;
        }

        _matchList.SelectedItem = null;
        ResetEditingState();
        _leftPlayer.Focus(FocusState.Programmatic);
    }

    private void ResetEditingState()
    {
        _editingId = null;
        _addOrUpdateButton.Content = "Add Match";
    }

}
