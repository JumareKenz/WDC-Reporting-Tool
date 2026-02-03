@echo off
echo ==========================================
echo KADUNA WDC - Mobile App (Web Mode - Simple)
echo ==========================================
echo.

cd /d "%~dp0"

echo Clearing caches...
Remove-Item -Path .expo -Recurse -Force -ErrorAction SilentlyContinue 2>nul
Remove-Item -Path node_modules/.cache -Recurse -Force -ErrorAction SilentlyContinue 2>nul

echo.
echo Starting web version (this may take a while)...
echo.

set NODE_OPTIONS=--max-old-space-size=4096
npx expo start --web --clear --no-dev

pause
