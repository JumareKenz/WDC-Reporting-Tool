# Run mutation testing on Windows with proper UTF-8 encoding
# Usage:
#   .\mutation.ps1 quick      - Fast scan on auth/dependencies (for PRs)
#   .\mutation.ps1 full       - Full mutation scan (nightly/manual)
#   .\mutation.ps1 results    - Show current mutation results
#   .\mutation.ps1 show 5     - Show mutant #5

param(
    [Parameter(Position=0)]
    [ValidateSet("quick", "full", "results", "show")]
    [string]$Mode = "quick",
    
    [Parameter(Position=1)]
    [int]$Id
)

# Set UTF-8 encoding to avoid Windows encoding issues
$env:PYTHONUTF8 = "1"
$env:PYTHONIOENCODING = "utf-8"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

# Change to backend directory if not already there
$backendDir = Split-Path $PSScriptRoot -Parent
if ((Get-Location).Path -ne $backendDir) {
    Push-Location $backendDir
    $pushedLocation = $true
}

Write-Host "=== WDC Mutation Testing (Windows) ===" -ForegroundColor Cyan
Write-Host "Mode: $Mode" -ForegroundColor Yellow

try {
    switch ($Mode) {
        "quick" {
            Write-Host ""
            Write-Host "Running quick mutation scan (auth + dependencies)..." -ForegroundColor Green
            & python -m mutmut run --paths-to-mutate app/auth.py --paths-to-mutate app/dependencies.py --CI
        }
        "full" {
            Write-Host ""
            Write-Host "Running full mutation scan..." -ForegroundColor Green
            Write-Host "This may take several minutes..." -ForegroundColor Yellow
            & python -m mutmut run --CI
        }
        "results" {
            Write-Host ""
            Write-Host "Fetching mutation results..." -ForegroundColor Green
            & python -m mutmut results
        }
        "show" {
            if ($Id -eq 0) {
                Write-Host "Error: -Id parameter required for show mode" -ForegroundColor Red
                Write-Host "Usage: .\mutation.ps1 show 5" -ForegroundColor Yellow
                exit 1
            }
            Write-Host ""
            Write-Host "Showing mutant $Id..." -ForegroundColor Green
            & python -m mutmut show $Id
        }
    }
    
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    if ($exitCode -eq 0) {
        Write-Host "[OK] Mutation testing completed successfully" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Mutation testing finished with exit code $exitCode" -ForegroundColor Yellow
    }
} finally {
    if ($pushedLocation) {
        Pop-Location
    }
}
