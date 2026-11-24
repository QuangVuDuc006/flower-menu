<#
.SYNOPSIS
    Flower QR Menu - Cloudflare D1 Database Backup and Restore Script

.DESCRIPTION
    Exports the Cloudflare D1 database (including schema, product catalogue metadata,
    and binary image blobs) to an SQL dump file with timestamping.
    Also provides tested one-line restore instructions.

.PARAMETER Local
    Backup the local development database (.wrangler local D1 instance).
    Default is false (exports remote production database).

.PARAMETER Database
    Name of the D1 database binding or name. Default: "flower-menu-prod".

.PARAMETER OutputDir
    Directory where backup files are saved. Default: "backups".

.PARAMETER OutputFile
    Optional custom filename or path for the backup.

.EXAMPLE
    .\scripts\backup-d1.ps1
    Exports the remote production database to backups\flower-menu-prod-yyyyMMdd-HHmmss.sql

.EXAMPLE
    .\scripts\backup-d1.ps1 -Local
    Exports the local development database to backups\flower-menu-local-yyyyMMdd-HHmmss.sql
#>

[CmdletBinding()]
param (
    [switch]$Local,
    [string]$Database = "flower-menu-prod",
    [string]$OutputDir = "backups",
    [string]$OutputFile = ""
)

$ErrorActionPreference = "Stop"

$workspaceRoot = $PSScriptRoot | Split-Path -Parent
Set-Location -Path $workspaceRoot

$targetDir = Join-Path $workspaceRoot $OutputDir
if (-not (Test-Path -Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$modeLabel = if ($Local) { "local" } else { "prod" }

if (-not $OutputFile) {
    $backupFileName = "flower-menu-$modeLabel-$timestamp.sql"
    $backupFilePath = Join-Path $targetDir $backupFileName
} else {
    $backupFilePath = $OutputFile
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Flower QR Menu - D1 Database Backup" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "Database:    $Database"
Write-Host "Environment: $(if ($Local) { 'Local Development (--local)' } else { 'Remote Production (--remote)' })"
Write-Host "Output File: $backupFilePath"
Write-Host ""

$wranglerArgs = @("d1", "export", $Database, "--output", $backupFilePath)
if ($Local) {
    $wranglerArgs += "--local"
} else {
    $wranglerArgs += "--remote"
}

Write-Host "Executing: npx wrangler $($wranglerArgs -join ' ')..." -ForegroundColor Yellow

$process = Start-Process -FilePath "npx.cmd" -ArgumentList $wranglerArgs -NoNewWindow -Wait -PassThru

if ($process.ExitCode -ne 0) {
    Write-Error "Backup failed with exit code $($process.ExitCode)."
    exit $process.ExitCode
}

if (-not (Test-Path -Path $backupFilePath)) {
    Write-Error "Backup file was not created at: $backupFilePath"
    exit 1
}

$fileItem = Get-Item -Path $backupFilePath
$fileSizeKb = [math]::Round($fileItem.Length / 1KB, 2)

Write-Host ""
Write-Host "[SUCCESS] Backup completed successfully!" -ForegroundColor Green
Write-Host "File created: $backupFilePath ($fileSizeKb KB)" -ForegroundColor Green
Write-Host ""
Write-Host "----------------------------------------------------" -ForegroundColor Gray
Write-Host " RESTORE INSTRUCTIONS" -ForegroundColor Gray
Write-Host "----------------------------------------------------" -ForegroundColor Gray

if ($Local) {
    Write-Host "To restore this backup into your LOCAL development database, run:"
    Write-Host "  npx wrangler d1 execute $Database --local --file=`"$backupFilePath`"" -ForegroundColor Yellow
} else {
    Write-Host "To restore this backup into your REMOTE PRODUCTION database, run:"
    Write-Host "  npx wrangler d1 execute $Database --remote --file=`"$backupFilePath`"" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "CAUTION: Remote restore will overwrite existing tables/data." -ForegroundColor Red
    Write-Host "Always perform a fresh backup immediately before running a restore!" -ForegroundColor Red
}

Write-Host ""
Write-Host "Verification after restore:"
Write-Host "  npx wrangler d1 execute $Database $(if ($Local) { '--local' } else { '--remote' }) --command=`"SELECT count(*) AS total_products, count(imageData) AS total_images FROM products;`"" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
