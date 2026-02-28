@echo off
echo ==========================================
echo KADUNA WDC - Restart Web Server
echo ==========================================
echo.

cd /d "%~dp0"

echo Clearing caches...
Remove-Item -Path .expo -Recurse -Force -ErrorAction SilentlyContinue 2>nul

echo.
echo Starting web server...
npx expo start --web --clear

pause
