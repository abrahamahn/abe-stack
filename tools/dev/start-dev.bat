@echo off
setlocal enabledelayedexpansion

:: ABE Stack Development Environment Startup Script (Batch Version)
:: This script ensures services run on their designated ports by killing existing processes first

echo.
echo ============================================================
echo   ABE Stack Development Environment Startup
echo ============================================================
echo.

:: Configuration
set BACKEND_PORT=8080
set FRONTEND_PORT=5173
set POSTGRES_PORT=5432

:: Check if we're in the right directory
if not exist "package.json" (
    echo Error: package.json not found. Please run this script from the project root directory.
    pause
    exit /b 1
)

echo Step 1: Port Cleanup
echo.

:: Function to kill process on port
call :kill_port_process %BACKEND_PORT% "Backend Server"
call :kill_port_process %FRONTEND_PORT% "Frontend Server"

echo.
echo Step 2: Database Check
echo.

:: Check if PostgreSQL is running
netstat -ano | findstr ":%POSTGRES_PORT%" | findstr "LISTENING" >nul
if !errorlevel! equ 0 (
    echo ✓ PostgreSQL is running on port %POSTGRES_PORT%
) else (
    echo ⚠ PostgreSQL not detected on port %POSTGRES_PORT%
    echo   Please ensure PostgreSQL is running before continuing.
    echo   You can start it with: pg_ctl start -D /path/to/data
    echo.
    set /p continue="Continue anyway? (y/N): "
    if /i not "!continue!"=="y" (
        echo Exiting...
        pause
        exit /b 1
    )
)

echo.
echo Step 3: Starting Development Servers
echo.

:: Start backend server in new window
echo Starting backend server on port %BACKEND_PORT%...
start "ABE Backend Server" cmd /c "npm run dev:server & pause"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Check if backend started
call :wait_for_port %BACKEND_PORT% "Backend"
if !errorlevel! neq 0 (
    echo Failed to start backend server
    pause
    exit /b 1
)

:: Start frontend server in new window
echo Starting frontend server on port %FRONTEND_PORT%...
start "ABE Frontend Server" cmd /c "npm run dev:client & pause"

:: Wait for frontend to start
call :wait_for_port %FRONTEND_PORT% "Frontend"
if !errorlevel! neq 0 (
    echo Failed to start frontend server
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Development Environment Ready!
echo ============================================================
echo.
echo ✓ Backend Server: http://localhost:%BACKEND_PORT%
echo ✓ Frontend Server: http://localhost:%FRONTEND_PORT%
echo ✓ API Endpoint: http://localhost:%BACKEND_PORT%/api
echo.
echo Both servers are running in separate windows.
echo Close those windows or press Ctrl+C in them to stop the servers.
echo.
pause
exit /b 0

:: Function to kill process on specific port
:kill_port_process
set port=%1
set service_name=%~2

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%port%" ^| findstr "LISTENING"') do (
    set pid=%%a
    if defined pid (
        echo Found %service_name% process on port %port% (PID: !pid!)
        taskkill /f /pid !pid! >nul 2>&1
        if !errorlevel! equ 0 (
            echo ✓ Successfully stopped %service_name% on port %port%
        ) else (
            echo ✗ Failed to stop process on port %port%
        )
    )
)

:: Check if port is now free
netstat -ano | findstr ":%port%" | findstr "LISTENING" >nul
if !errorlevel! neq 0 (
    echo ✓ Port %port% is free for %service_name%
) else (
    echo ⚠ Port %port% may still be in use
)
goto :eof

:: Function to wait for port to become active
:wait_for_port
set port=%1
set service_name=%~2
set timeout_count=0
set max_timeout=15

echo Waiting for %service_name% to start on port %port%...

:wait_loop
netstat -ano | findstr ":%port%" | findstr "LISTENING" >nul
if !errorlevel! equ 0 (
    echo ✓ %service_name% is now running on port %port%
    exit /b 0
)

set /a timeout_count+=1
if !timeout_count! geq !max_timeout! (
    echo ✗ Timeout waiting for %service_name% to start on port %port%
    exit /b 1
)

timeout /t 1 /nobreak >nul
goto wait_loop 