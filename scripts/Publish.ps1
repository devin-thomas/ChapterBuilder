[CmdletBinding()]
param(
    [Parameter()]
    [ValidatePattern('^[0-9]+\.[0-9]+\.[0-9]+(?:-[0-9A-Za-z.-]+)?$')]
    [string] $Version = '0.1.0',

    [Parameter()]
    [ValidateSet('win-x64')]
    [string] $Runtime = 'win-x64',

    [Parameter()]
    [string] $OutputDirectory = 'artifacts',

    [Parameter()]
    [switch] $NoRestore
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$projectPath = Join-Path $repositoryRoot 'TwoXKOChapterBuilder.csproj'
$outputRoot = [System.IO.Path]::GetFullPath((Join-Path $repositoryRoot $OutputDirectory))
$publishDirectory = Join-Path $outputRoot "publish-$Runtime"
$packageDirectory = Join-Path $outputRoot "ChapterBuilder-$Runtime"
$executablePath = Join-Path $publishDirectory '2XKOChapterBuilder.exe'
$packageExecutablePath = Join-Path $packageDirectory '2XKOChapterBuilder.exe'
$zipPath = Join-Path $outputRoot "ChapterBuilder-$Runtime-v$Version.zip"
$releaseExecutablePath = Join-Path $outputRoot '2XKOChapterBuilder.exe'
$checksumPath = Join-Path $outputRoot 'SHA256SUMS.txt'

if (Test-Path $outputRoot)
{
    Remove-Item $outputRoot -Recurse -Force
}

New-Item -ItemType Directory -Path $publishDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $packageDirectory -Force | Out-Null

$publishArguments = @(
    'publish',
    $projectPath,
    '--configuration', 'Release',
    '--runtime', $Runtime,
    '--self-contained', 'true',
    '--output', $publishDirectory,
    "-p:Version=$Version",
    "-p:InformationalVersion=$Version"
)

if ($NoRestore)
{
    $publishArguments += '--no-restore'
}

Write-Host "Publishing ChapterBuilder v$Version for $Runtime..."
& dotnet @publishArguments
if ($LASTEXITCODE -ne 0)
{
    throw "dotnet publish failed with exit code $LASTEXITCODE."
}

if (-not (Test-Path $executablePath -PathType Leaf))
{
    throw "Expected executable was not produced: $executablePath"
}

Copy-Item $executablePath $packageExecutablePath
Copy-Item $executablePath $releaseExecutablePath

$packageReadme = @"
ChapterBuilder v$Version
========================

Run 2XKOChapterBuilder.exe on Windows 10 version 2004 or newer (x64).
The application is self-contained; no separate .NET installation is required.

Project: https://github.com/devin-thomas/ChapterBuilder
"@
Set-Content -Path (Join-Path $packageDirectory 'README.txt') -Value $packageReadme -Encoding UTF8
Copy-Item (Join-Path $repositoryRoot 'schemas\chapter-config.schema.json') (Join-Path $packageDirectory 'chapter-config.schema.json')

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory(
    $packageDirectory,
    $zipPath,
    [System.IO.Compression.CompressionLevel]::Optimal,
    $false
)

function Get-Sha256
{
    param([Parameter(Mandatory)][string] $Path)

    $stream = [System.IO.File]::OpenRead($Path)
    try
    {
        $sha256 = [System.Security.Cryptography.SHA256]::Create()
        try
        {
            $hashBytes = $sha256.ComputeHash($stream)
            return -join ($hashBytes | ForEach-Object { $_.ToString('x2') })
        }
        finally
        {
            $sha256.Dispose()
        }
    }
    finally
    {
        $stream.Dispose()
    }
}

$releaseFiles = @($releaseExecutablePath, $zipPath)
$checksumLines = foreach ($file in $releaseFiles)
{
    "$(Get-Sha256 -Path $file)  $([System.IO.Path]::GetFileName($file))"
}
$checksumLines | Set-Content -Path $checksumPath -Encoding ASCII

Write-Host ''
Write-Host 'Release assets:'
Write-Host "  $releaseExecutablePath"
Write-Host "  $zipPath"
Write-Host "  $checksumPath"
