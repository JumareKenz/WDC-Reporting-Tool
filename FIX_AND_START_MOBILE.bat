@echo off
echo ========================================
echo   KADUNA WDC - Fixing Connection Issue
echo ========================================
echo.
echo Clearing Expo cache...
cd mobile-app

if exist .expo rmdir /s /q .expo
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo.
echo ========================================
echo   Starting Mobile App with LAN mode
echo   Your app will be at: exp://192.168.0.105:8081
echo ========================================
echo.
echo Make sure backend is running first!
echo.
echo Starting in 3 seconds...
timeout /t 3

expo start --lan --clear

pause
