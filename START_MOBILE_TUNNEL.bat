@echo off
echo ========================================
echo   KADUNA WDC - Starting with Tunnel Mode
echo ========================================
echo.
echo This will create a public URL that works from anywhere
echo It's slower but bypasses all network/firewall issues
echo.
echo Starting in 3 seconds...
timeout /t 3

cd mobile-app

if exist .expo rmdir /s /q .expo

echo.
echo Starting Expo with Tunnel mode...
echo This may take 30-60 seconds to create tunnel...
echo.

npx expo start --tunnel --clear

pause
