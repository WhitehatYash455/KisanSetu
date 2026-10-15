Write-Host "========================================================" -ForegroundColor Green
Write-Host "  Launching KrishiSetu (Full-Stack Agri Platform)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

# 1. Start FastAPI Backend on port 8000
Write-Host "`n[1/2] Starting FastAPI Backend on http://localhost:8000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PYTHONPATH='backend'; Set-Location '$PSScriptRoot'; .\venv\Scripts\uvicorn.exe app.main:app --app-dir backend --reload --port 8000"

# 2. Start Next.js Frontend on port 3000
Write-Host "[2/2] Starting Next.js Frontend on http://localhost:3000 ..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host "`n========================================================" -ForegroundColor Green
Write-Host "  Both services launched in separate windows!" -ForegroundColor Green
Write-Host "  Frontend Web App:      http://localhost:3000" -ForegroundColor Yellow
Write-Host "  Backend REST API:      http://localhost:8000" -ForegroundColor Yellow
Write-Host "  Interactive API Docs:  http://localhost:8000/docs" -ForegroundColor Yellow
Write-Host "========================================================`n" -ForegroundColor Green

Start-Sleep -Seconds 3
Start-Process "http://localhost:3000"
