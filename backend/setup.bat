@echo off
echo ====================================
echo Kaduna WDC System - Backend Setup
echo ====================================
echo.

echo Step 1: Installing dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.

echo Step 2: Seeding database...
python seed_data.py
if %errorlevel% neq 0 (
    echo ERROR: Failed to seed database
    pause
    exit /b 1
)
echo.

echo ====================================
echo Setup completed successfully!
echo ====================================
echo.
echo To start the server, run:
echo   uvicorn app.main:app --reload
echo.
echo API Documentation will be at:
echo   http://localhost:8000/docs
echo.
pause
