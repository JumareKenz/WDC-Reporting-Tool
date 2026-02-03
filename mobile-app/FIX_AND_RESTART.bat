@echo off
echo ==========================================
echo KADUNA WDC - Fix and Restart Web
echo ==========================================
echo.

cd /d "%~dp0"

echo Clearing caches...
Remove-Item -Path .expo -Recurse -Force -ErrorAction SilentlyContinue 2>nul
Remove-Item -Path node_modules/.cache -Recurse -Force -ErrorAction SilentlyContinue 2>nul

echo.
echo Fixing React versions...
npm install react@18.3.1 react-dom@18.3.1 --legacy-peer-deps

echo.
echo Starting web server...
npx expo start --web --clear

pause
