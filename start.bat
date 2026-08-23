@echo off
echo ============================================================
echo  KnowBase AI -- Setup and Start Script
echo ============================================================
echo.

echo [1/4] Installing backend dependencies...
cd /d "%~dp0backend"
call npm install
if errorlevel 1 (
  echo ERROR: Backend npm install failed. Make sure Node.js 18+ is installed.
  pause
  exit /b 1
)
echo Backend dependencies installed!
echo.

echo [2/4] Installing frontend dependencies...
cd /d "%~dp0frontend"
call npm install
if errorlevel 1 (
  echo ERROR: Frontend npm install failed.
  pause
  exit /b 1
)
echo Frontend dependencies installed!
echo.

echo [3/4] Starting backend server (port 3001)...
cd /d "%~dp0backend"
start "KnowBase AI Backend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo [4/4] Starting frontend dev server (port 5173)...
cd /d "%~dp0frontend"
start "KnowBase AI Frontend" cmd /k "npm run dev"
timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo  KnowBase AI is starting!
echo.
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:3001/api/health
echo.
echo  Two terminal windows will open -- keep them running.
echo  Press any key to open the app in your browser...
echo ============================================================
pause >nul
start http://localhost:5173
