@echo off
title KrishiSetu Launcher
echo ========================================================
echo   Launching KrishiSetu (Full-Stack Agri Platform)
echo ========================================================
echo.

REM 1. Start FastAPI Backend on port 8000
echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "KrishiSetu Backend (FastAPI)" cmd /k "cd /d ""%~dp0"" && set PYTHONPATH=backend && .\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000"

REM 2. Start Next.js Frontend on port 3000
echo [2/2] Starting Next.js Frontend on http://localhost:3000 ...
start "KrishiSetu Frontend (Next.js)" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ========================================================
echo   Both services are launching in separate windows!
echo   Frontend Application:  http://localhost:3000
echo   Backend REST API:      http://localhost:8000
echo   API Interactive Docs:  http://localhost:8000/docs
echo ========================================================
echo.
timeout /t 5
start http://localhost:3000
