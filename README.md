# ChapterBuilder

ChapterBuilder is a focused Windows desktop utility for rapidly turning tournament VOD timestamps into VidChopper chapter configuration files.

The current game profile is **2XKO**. The repository uses a broader name so future versions can support additional fighting games without creating a separate application for every roster and ruleset.

## Current workflow

- Select two characters and a Fuse for each side.
- Enter player names, round, start timestamp, and end timestamp.
- Add matches repeatedly while preserving the previous selections.
- Edit, reorder, delete, save, save as, and reopen a tournament JSON file.
- Export strict VidChopper chapter JSON using the included schema reference.

## Download

Use the latest entry under **GitHub Releases**. Each release contains:

- `2XKOChapterBuilder.exe` — portable self-contained Windows x64 executable
- `ChapterBuilder-win-x64-vX.Y.Z.zip` — executable plus schema and a short readme
- `SHA256SUMS.txt` — integrity hashes

Release binaries are currently unsigned, so Windows SmartScreen may display a warning.

## Requirements

- Windows 10 version 2004 or newer, x64
- .NET 10 SDK for development

The released executable is self-contained and does not require a separate .NET installation.

## Run from source

```powershell
git clone https://github.com/devin-thomas/ChapterBuilder.git
cd ChapterBuilder
dotnet restore
dotnet run
```

## Build locally

```powershell
dotnet build -c Release -r win-x64
```

## Create release assets locally

```powershell
.\scripts\Publish.ps1 -Version 0.1.0
```

The script creates the executable, portable ZIP, and checksum file under `artifacts\`.

## CI/CD

- **CI** runs on pushes to `main`, pull requests, and manual dispatches. It restores, builds, packages, verifies, and uploads a short-lived Windows artifact.
- **Release** runs for semantic-version tags such as `v0.1.0`. It creates a GitHub Release containing the executable, ZIP, checksums, and GitHub provenance attestations.
- **Dependabot** checks NuGet and GitHub Actions dependencies weekly.

See [docs/releasing.md](docs/releasing.md) for the release process and signing notes.

## Project structure

```text
Assets/                         Application icon
.github/workflows/ci.yml        Continuous integration
.github/workflows/release.yml   Tag-driven release publishing
scripts/Publish.ps1             Local and CI packaging entry point
schemas/                        VidChopper schema reference
MainWindow.cs                   UI and match entry
MainWindow.Persistence.cs       Open, save, and list editing
MainWindow.Export.cs            VidChopper export adapter
Models.cs                       Application and schema models
```

## Status

This is an early workflow-specific tool. The VidChopper schema is supported, but UI fields and naming conventions may continue to change as the downstream project evolves.
