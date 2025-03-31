@echo off
echo Starting ABE Stack Development Environment...

:: Clear any existing port processes if needed
echo Checking for existing processes on ports...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8080') do (
  echo Found process using port 8080: %%a
  taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8081') do (
  echo Found process using port 8081: %%a
  taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8082') do (
  echo Found process using port 8082: %%a
  taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
  echo Found process using port 3000: %%a
  taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001') do (
  echo Found process using port 3001: %%a
  taskkill /f /pid %%a >nul 2>&1
)

:: Start the client and server in separate windows
echo Starting client and server...
start "ABE CLIENT" cmd /c "npm run dev:client"
timeout /t 2 > nul
start "ABE SERVER" cmd /c "npm run dev:server"

echo.
echo Development environment started in separate windows.
echo.
echo Remember to check:
echo - CLIENT window for frontend URL (usually http://localhost:3001)
echo - SERVER window for backend services on port 8080
echo.
echo Press any key to shut down both processes when done...

pause > nul

:: Kill the processes when done
taskkill /fi "WINDOWTITLE eq ABE CLIENT*" /f > nul 2>&1
taskkill /fi "WINDOWTITLE eq ABE SERVER*" /f > nul 2>&1
echo Development environment shut down. 