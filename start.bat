@echo off
setlocal

cd /d "%~dp0"

where pnpm >nul 2>nul
if errorlevel 1 (
    echo pnpm was not found on PATH.
    echo Install it first, e.g.: npm install -g pnpm
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
    if errorlevel 1 (
        echo.
        echo pnpm install failed.
        pause
        exit /b 1
    )
)

echo Starting Backlogs dev server...
start "Backlogs dev server" cmd /k "pnpm dev"

timeout /t 3 /nobreak >nul
start "" http://localhost:5173

echo.
echo Backlogs is starting in a separate "Backlogs dev server" window.
echo Close that window (or Ctrl+C in it) to stop the app.
echo.
pause
