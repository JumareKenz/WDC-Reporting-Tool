@echo off
echo ========================================
echo   KADUNA WDC Backend Server
echo   Starting on http://192.168.0.105:8000
echo ========================================
echo.

cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
