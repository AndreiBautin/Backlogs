@echo off
setlocal enabledelayedexpansion

rem One-click launch for Backlogs.
rem
rem Named start-app.bat and not start.bat: cmd matches internal command
rem names up to the first dot, so typing "start.bat" in a terminal runs
rem the built-in START command with an argument of ".bat" and silently
rem opens an empty console instead of this script. Double-clicking would
rem still work, which is what makes the bug so confusing to hit.

cd /d "%~dp0"

set PORT=5173
set URL=http://localhost:%PORT%

echo.
echo   Backlogs
echo   --------
echo.

rem --- Prerequisites --------------------------------------------------
where pnpm >nul 2>nul
if errorlevel 1 (
    echo   pnpm was not found on PATH.
    echo.
    echo   Install Node.js 22+ from https://nodejs.org and then run:
    echo       npm install -g pnpm
    echo.
    pause
    exit /b 1
)

rem --- Dependencies ---------------------------------------------------
if not exist "node_modules" (
    echo   Installing dependencies. This only happens on a fresh clone.
    call pnpm install
    if errorlevel 1 (
        echo.
        echo   pnpm install failed. See the output above.
        echo.
        pause
        exit /b 1
    )
    echo.
)

rem --- Port -----------------------------------------------------------
rem The server below is started with --strictPort, so an occupied port is
rem a hard failure rather than a silent move to 5174. Checking it here
rem means the message names the port, instead of the server exiting into
rem a window the user never reads and a browser tab that refuses to
rem connect.
netstat -ano | findstr /R /C:"LISTENING" | findstr /C:":%PORT% " >nul
if not errorlevel 1 (
    echo   Port %PORT% is already in use.
    echo.
    echo   Something else is listening there - most likely Backlogs is
    echo   already running. Try opening %URL% first.
    echo.
    echo   To find what holds it:
    echo       netstat -ano ^| findstr :%PORT%
    echo.
    pause
    exit /b 1
)

rem --- Start ----------------------------------------------------------
echo   Starting the dev server on port %PORT%...
start "Backlogs dev server" cmd /k "pnpm dev --port %PORT% --strictPort"

rem --- Wait for it to actually accept connections ----------------------
rem Opening the browser on a fixed timer races the server on a cold start
rem - the first Vite run after an install takes well over three seconds -
rem and lands the user on a connection-refused page that looks like the
rem app is broken.
rem
rem The sleep is `ping` rather than `timeout /t`, which aborts with "input
rem redirection is not supported" whenever stdin is redirected: from a
rem pipeline, from CI, or from a tool running this script for you.
set /a ATTEMPTS=0
:waitloop
set /a ATTEMPTS+=1
if !ATTEMPTS! GTR 40 goto :timeout

powershell -NoProfile -Command "try { $null = Invoke-WebRequest -Uri '%URL%' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
    ping -n 2 127.0.0.1 >nul
    goto :waitloop
)

echo   Ready. Opening %URL%
start "" "%URL%"

echo.
echo   Backlogs is running in the "Backlogs dev server" window.
echo   Close that window, or press Ctrl+C in it, to stop the app.
echo.
echo   Your backlog lives in this browser's LocalStorage and nowhere else.
echo   Export a backup from Settings before clearing site data.
echo.
exit /b 0

:timeout
echo.
echo   The server did not start listening on port %PORT% within 40 seconds.
echo   Check the "Backlogs dev server" window for the error.
echo.
pause
exit /b 1
