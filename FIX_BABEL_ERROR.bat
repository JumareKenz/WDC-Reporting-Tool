@echo off
echo ========================================
echo   Fixing Babel Error
echo ========================================
echo.
echo Installing missing babel-preset-expo...
echo.

cd mobile-app

echo Step 1: Deleting node_modules...
if exist node_modules rmdir /s /q node_modules

echo.
echo Step 2: Deleting package-lock.json...
if exist package-lock.json del /f /q package-lock.json

echo.
echo Step 3: Clearing Expo cache...
if exist .expo rmdir /s /q .expo

echo.
echo Step 4: Installing all packages (this takes 2-3 minutes)...
npm install

echo.
echo Step 5: Installing babel-preset-expo specifically...
npm install --save-dev babel-preset-expo@~12.0.0

echo.
echo ========================================
echo   Fix Complete!
echo ========================================
echo.
echo Now start the app with:
echo   START_MOBILE_TUNNEL.bat
echo.
pause
