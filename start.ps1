# Unified Startup Script for Multi-Agent Competitive Intelligence Engine
# Run this script to spin up the backend API and the React frontend developer servers in parallel.

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "          Launching Competitive Intelligence Agency Engine       " -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Start Python FastAPI backend in a separate window
Write-Host "`n[1/2] Spinning up Python FastAPI Backend Server (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; .\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000"

# 2. Wait for backend to warm up
Start-Sleep -Seconds 2

# 3. Start React Vite frontend in the active console
Write-Host "`n[2/2] Launching React Vite Developer Server (Port 5173)..." -ForegroundColor Yellow
Write-Host "Opening local dashboard..." -ForegroundColor Green
cd frontend
npm.cmd run dev
