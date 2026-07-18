# Releasing ChapterBuilder

## Local package

```powershell
.\scripts\Publish.ps1 -Version 0.1.0
```

Assets are written to `artifacts\`:

- `2XKOChapterBuilder.exe`
- `ChapterBuilder-win-x64-v0.1.0.zip`
- `SHA256SUMS.txt`

## Automated GitHub Release

1. Ensure `main` is green in GitHub Actions.
2. Create and push a semantic-version tag:

```powershell
git checkout main
git pull
git tag v0.1.0
git push origin v0.1.0
```

The Release workflow builds the app on a GitHub-hosted Windows runner, produces the assets, creates provenance attestations, and publishes a GitHub Release.

A release can also be started manually from **Actions → Release → Run workflow** by entering a semantic version without the leading `v`.

## Code signing

The automated artifacts are currently unsigned. Windows SmartScreen may warn users because reputation is attached to a trusted code-signing identity, not merely to the build process.

Before broad public distribution, obtain a Windows code-signing certificate and add a signing step before checksums and ZIP creation. Never commit a `.pfx` file or its password to the repository.

## Installer options

The current portable single-file EXE is the simplest distribution format. Add an installer only when the workflow benefits from Start-menu shortcuts, uninstall registration, file associations, or automatic updates.

- **MSIX:** strongest Windows integration, but direct distribution requires signing.
- **Inno Setup or WiX:** conventional EXE/MSI installer around the portable build; signing is still recommended.
