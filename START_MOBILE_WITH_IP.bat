@echo off
echo ========================================
echo   KADUNA WDC - Starting with IP Address
echo ========================================
echo.
echo Setting environment variable for your IP...
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.105
echo.
echo Clearing cache and starting...
cd mobile-app

if exist .expo rmdir /s /q .expo

echo.
echo Starting Expo with your network IP: 192.168.0.105
echo.

npx expo start --clear --host 192.168.0.105

pause
