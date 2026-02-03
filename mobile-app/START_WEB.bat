@echo off
echo ==========================================
echo KADUNA WDC - Mobile App (Web Mode)
echo ==========================================
echo.

cd /d "%~dp0"

echo Checking dependencies...
if not exist node_modules (
  echo Installing dependencies...
  call npm install
)

echo.
echo Starting web version...
echo This will open in your browser at http://localhost:19006
echo.
echo To access from phone:
echo 1. Make sure phone is on same WiFi
echo 2. Find your IP: ipconfig
echo 3. On phone: http://YOUR_IP:19006
echo.

call npx expo start --web

pause
