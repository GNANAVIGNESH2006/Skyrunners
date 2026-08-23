#!/usr/bin/env pwsh
# KnowBase AI - PowerShell setup and start script

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " KnowBase AI -- Setup & Start" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

# Install backend
Write-Host "`n[1/4] Installing backend dependencies..." -ForegroundColor Yellow
Push-Location "$root\backend"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Backend install failed" -ForegroundColor Red; exit 1 }
Pop-Location

# Install frontend
Write-Host "`n[2/4] Installing frontend dependencies..." -ForegroundColor Yellow
Push-Location "$root\frontend"
npm install
if ($LASTEXITCODE -ne 0) { Write-Host "ERROR: Frontend install failed" -ForegroundColor Red; exit 1 }
Pop-Location

# Start backend
Write-Host "`n[3/4] Starting backend (port 3001)..." -ForegroundColor Yellow
$backend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev" -PassThru

# Wait a moment
Start-Sleep -Seconds 2

# Start frontend
Write-Host "`n[4/4] Starting frontend (port 5173)..." -ForegroundColor Yellow
$frontend = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -PassThru

Start-Sleep -Seconds 3

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " KnowBase AI is starting!" -ForegroundColor Green
Write-Host ""
Write-Host " Frontend : http://localhost:5173" -ForegroundColor Cyan
Write-Host " API      : http://localhost:3001/api/health" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Green

Start-Process "http://localhost:5173"
