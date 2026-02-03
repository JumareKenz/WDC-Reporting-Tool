@echo off
echo ==========================================
echo KADUNA WDC - Debug Web Mode
echo ==========================================
echo.

cd /d "%~dp0"

set EXPO_DEBUG=true
set NODE_OPTIONS=--max-old-space-size=4096

echo Starting with debug output...
npx expo start --web --clear 2>&1

pause
