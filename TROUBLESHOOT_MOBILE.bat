@echo off
color 0A
echo ========================================
echo   KADUNA WDC - Connection Troubleshooter
echo ========================================
echo.
echo This will help fix the connection issue
echo.
pause

:MENU
cls
echo ========================================
echo   Choose a connection method:
echo ========================================
echo.
echo   1. Try with IP Address (192.168.0.105)
echo   2. Try with Tunnel Mode (Works Anywhere - Slower)
echo   3. Try with LAN Mode
echo   4. Clean Everything and Try Again
echo   5. Show My Current IP Address
echo   6. Test Backend Connection
echo   7. Exit
echo.
set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" goto IP_MODE
if "%choice%"=="2" goto TUNNEL_MODE
if "%choice%"=="3" goto LAN_MODE
if "%choice%"=="4" goto CLEAN_ALL
if "%choice%"=="5" goto SHOW_IP
if "%choice%"=="6" goto TEST_BACKEND
if "%choice%"=="7" goto END

echo Invalid choice. Please try again.
timeout /t 2
goto MENU

:IP_MODE
cls
echo ========================================
echo   Starting with IP Address Mode
echo ========================================
echo.
cd mobile-app
if exist .expo rmdir /s /q .expo
set REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.105
echo Starting Expo...
npx expo start --clear --host 192.168.0.105
pause
goto MENU

:TUNNEL_MODE
cls
echo ========================================
echo   Starting with Tunnel Mode
echo ========================================
echo.
echo This creates a public URL (slower but works anywhere)
echo Wait 30-60 seconds for tunnel to be created...
echo.
cd mobile-app
if exist .expo rmdir /s /q .expo
npx expo start --tunnel --clear
pause
goto MENU

:LAN_MODE
cls
echo ========================================
echo   Starting with LAN Mode
echo ========================================
echo.
cd mobile-app
if exist .expo rmdir /s /q .expo
npx expo start --lan --clear
pause
goto MENU

:CLEAN_ALL
cls
echo ========================================
echo   Cleaning All Cache Files
echo ========================================
echo.
cd mobile-app
echo Deleting .expo folder...
if exist .expo rmdir /s /q .expo
echo Deleting node_modules\.cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache
echo Deleting watchman cache...
if exist node_modules\.cache\watchman rmdir /s /q node_modules\.cache\watchman
echo.
echo Cache cleaned! Try starting again with option 1 or 2.
echo.
pause
goto MENU

:SHOW_IP
cls
echo ========================================
echo   Your Network Information
echo ========================================
echo.
ipconfig | findstr /i "ipv4 adapter"
echo.
echo Your current IP should be: 192.168.0.105
echo If it's different, you need to update src/utils/constants.js
echo.
pause
goto MENU

:TEST_BACKEND
cls
echo ========================================
echo   Testing Backend Connection
echo ========================================
echo.
echo Testing if backend is accessible at http://192.168.0.105:8000
echo.
curl -s http://192.168.0.105:8000/api/health
if %errorlevel% equ 0 (
    echo.
    echo ✓ Backend is accessible!
) else (
    echo.
    echo ✗ Cannot reach backend. Make sure it's running:
    echo   cd backend
    echo   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
)
echo.
pause
goto MENU

:END
exit
