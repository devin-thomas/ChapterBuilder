[CmdletBinding()]
param(
    [Parameter()]
    [string] $VidChopperRepository,

    [Parameter()]
    [string] $VidChopperCli,

    [Parameter()]
    [string] $SourceVideo
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$fixturePath = Join-Path $repositoryRoot 'examples\tns-2xko-36-chapters.json'
$schemaPath = Join-Path $repositoryRoot 'schemas\chapter-config.schema.json'

if (-not (Get-Command Test-Json -ErrorAction SilentlyContinue))
{
    throw 'PowerShell 7.4 or newer is required for JSON Schema validation with Test-Json.'
}

$json = Get-Content -Raw -LiteralPath $fixturePath
if (-not ($json | Test-Json -SchemaFile $schemaPath))
{
    throw "Compatibility fixture does not match the bundled schema: $fixturePath"
}

$document = $json | ConvertFrom-Json
if ($document.chapters.Count -ne 16)
{
    throw "Expected 16 chapters, found $($document.chapters.Count)."
}

$expectedStart = [TimeSpan]::Zero
foreach ($chapter in $document.chapters)
{
    $start = [TimeSpan]::Parse($chapter.start, [Globalization.CultureInfo]::InvariantCulture)
    $end = [TimeSpan]::Parse($chapter.end, [Globalization.CultureInfo]::InvariantCulture)

    if ($start -ne $expectedStart)
    {
        throw "Fixture has a gap or overlap before '$($chapter.name)'."
    }
    if ($end -le $start)
    {
        throw "Fixture has an invalid range for '$($chapter.name)'."
    }

    $expectedStart = $end
}

$expectedDuration = [TimeSpan]::Parse('03:09:51', [Globalization.CultureInfo]::InvariantCulture)
if ($expectedStart -ne $expectedDuration)
{
    throw "Fixture ends at $expectedStart instead of $expectedDuration."
}

if ($VidChopperRepository)
{
    $canonicalSchema = Join-Path ([IO.Path]::GetFullPath($VidChopperRepository)) 'docs\schemas\chapter-config.schema.json'
    if (-not (Test-Path -LiteralPath $canonicalSchema -PathType Leaf))
    {
        throw "VidChopper canonical schema was not found: $canonicalSchema"
    }

    $bundledHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $schemaPath).Hash
    $canonicalHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $canonicalSchema).Hash
    if ($bundledHash -ne $canonicalHash)
    {
        throw "Bundled ChapterBuilder schema differs from VidChopper: $bundledHash != $canonicalHash"
    }
}

$hasCli = -not [string]::IsNullOrWhiteSpace($VidChopperCli)
$hasSource = -not [string]::IsNullOrWhiteSpace($SourceVideo)
if ($hasCli -ne $hasSource)
{
    throw 'Pass both -VidChopperCli and -SourceVideo to run the real CLI dry-run, or omit both.'
}

if ($hasCli)
{
    $cliPath = [IO.Path]::GetFullPath($VidChopperCli)
    $sourcePath = [IO.Path]::GetFullPath($SourceVideo)
    if (-not (Test-Path -LiteralPath $cliPath -PathType Leaf))
    {
        throw "VidChopper CLI was not found: $cliPath"
    }
    if (-not (Test-Path -LiteralPath $sourcePath -PathType Leaf))
    {
        throw "Source video was not found: $sourcePath"
    }

    $dryRunOutput = & $cliPath $sourcePath $fixturePath '--dry-run' 2>&1
    $dryRunExitCode = $LASTEXITCODE
    $dryRunOutput | ForEach-Object { Write-Host $_ }
    if ($dryRunExitCode -ne 0)
    {
        throw "VidChopper CLI dry-run failed with exit code $dryRunExitCode."
    }
}

Write-Host "Validated 16 TNS 2XKO #36 chapters through $expectedDuration."
