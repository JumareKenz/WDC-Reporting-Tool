@echo off
echo ========================================
echo   KADUNA WDC Mobile App
echo   Configured for http://192.168.0.105:8000
echo ========================================
echo.
echo Make sure backend is running first!
echo.

cd mobile-app
expo start --lan --clear

pause
