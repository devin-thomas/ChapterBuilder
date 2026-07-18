# Contributing

ChapterBuilder is currently a small, workflow-specific WinUI 3 application. Keep changes focused, testable, and easy to review.

## Local setup

Requirements:

- Windows 10 version 2004 or newer
- .NET 10 SDK
- WinUI application development workload when building through Visual Studio

```powershell
dotnet restore
dotnet run
```

## Before opening a pull request

```powershell
dotnet build -c Release -r win-x64
.\scripts\Publish.ps1
```

Manually verify that the app can add matches, save a VidChopper JSON file, reopen it, and save it to another path.

## Design principle

Optimize for fast tournament-VOD chapter entry. Avoid abstractions that make the workflow slower or harder to change while the VidChopper contract is still evolving.
