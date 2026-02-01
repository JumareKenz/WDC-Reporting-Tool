@echo off
echo ========================================
echo   Upgrading to Expo SDK 54
echo ========================================
echo.
echo This will:
echo   1. Delete node_modules and package-lock.json
echo   2. Install Expo SDK 54 compatible packages
echo   3. Clear all caches
echo.
echo This may take 2-3 minutes...
echo.
pause

cd mobile-app

echo.
echo Step 1: Cleaning old files...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del /f /q package-lock.json
if exist .expo rmdir /s /q .expo
if exist yarn.lock del /f /q yarn.lock

echo.
echo Step 2: Installing Expo SDK 54 packages...
echo This will take a few minutes...
npm install

echo.
echo Step 3: Verifying installation...
npx expo-doctor

echo.
echo ========================================
echo   Upgrade Complete!
echo ========================================
echo.
echo Now you can start the app with:
echo   START_MOBILE_TUNNEL.bat
echo.
pause
