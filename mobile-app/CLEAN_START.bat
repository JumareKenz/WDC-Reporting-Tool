@echo off
echo ==========================================
echo KADUNA WDC - Clean Web Start
echo ==========================================
echo.

cd /d "%~dp0"

echo Removing node_modules...
Remove-Item -Path node_modules -Recurse -Force -ErrorAction SilentlyContinue 2>nul
Remove-Item -Path package-lock.json -Force -ErrorAction SilentlyContinue 2>nul
Remove-Item -Path .expo -Recurse -Force -ErrorAction SilentlyContinue 2>nul

echo Installing dependencies (this may take several minutes)...
npm install --legacy-peer-deps

echo Installing web dependencies...
npm install react-native-web react-dom @expo/webpack-config --legacy-peer-deps

echo.
echo Starting web version...
npx expo start --web --clear

pause
