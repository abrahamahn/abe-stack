#!/usr/bin/env pwsh

# ABE Stack Development Environment Startup Script
# This script ensures services run on their designated ports by killing existing processes first

param(
    [switch]$Force,
    [switch]$SkipPortCheck,
    [switch]$Verbose
)

# Configuration
$BACKEND_PORT = 8080
$FRONTEND_PORT = 5173
$POSTGRES_PORT = 5432
$REQUIRED_PORTS = @($BACKEND_PORT, $FRONTEND_PORT, $POSTGRES_PORT)

# Colors for output
$Colors = @{
    Success = "Green"
    Warning = "Yellow" 
    Error = "Red"
    Info = "Cyan"
    Header = "Magenta"
}

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Colors[$Color]
}

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-ColorOutput "=" * 60 -Color "Header"
    Write-ColorOutput "  $Title" -Color "Header"
    Write-ColorOutput "=" * 60 -Color "Header"
    Write-Host ""
}

function Get-ProcessOnPort {
    param([int]$Port)
    
    try {
        $netstatOutput = netstat -ano | Select-String ":$Port\s"
        if ($netstatOutput) {
            foreach ($line in $netstatOutput) {
                if ($line -match "LISTENING.*?(\d+)$") {
                    $pid = $matches[1]
                    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
                    if ($process) {
                        return @{
                            PID = $pid
                            ProcessName = $process.ProcessName
                            Port = $Port
                        }
                    }
                }
            }
        }
    }
    catch {
        if ($Verbose) {
            Write-ColorOutput "Error checking port $Port`: $_" -Color "Warning"
        }
    }
    return $null
}

function Stop-ProcessOnPort {
    param([int]$Port, [string]$ServiceName = "Unknown")
    
    $process = Get-ProcessOnPort -Port $Port
    if ($process) {
        Write-ColorOutput "Found $ServiceName process on port $Port (PID: $($process.PID), Name: $($process.ProcessName))" -Color "Warning"
        
        try {
            Stop-Process -Id $process.PID -Force -ErrorAction Stop
            Start-Sleep -Seconds 1
            
            # Verify the process is gone
            $stillRunning = Get-ProcessOnPort -Port $Port
            if ($stillRunning) {
                Write-ColorOutput "Failed to stop process on port $Port" -Color "Error"
                return $false
            } else {
                Write-ColorOutput "Successfully stopped $ServiceName on port $Port" -Color "Success"
                return $true
            }
        }
        catch {
            Write-ColorOutput "Error stopping process on port $Port`: $_" -Color "Error"
            return $false
        }
    } else {
        Write-ColorOutput "Port $Port is free for $ServiceName" -Color "Success"
        return $true
    }
}

function Test-PostgreSQLConnection {
    try {
        # Try to connect to PostgreSQL using psql if available
        $psqlTest = & psql -h localhost -p $POSTGRES_PORT -U postgres -d postgres -c "SELECT 1;" 2>$null
        return $LASTEXITCODE -eq 0
    }
    catch {
        return $false
    }
}

function Start-PostgreSQLIfNeeded {
    Write-ColorOutput "Checking PostgreSQL status..." -Color "Info"
    
    $pgProcess = Get-ProcessOnPort -Port $POSTGRES_PORT
    if ($pgProcess) {
        Write-ColorOutput "PostgreSQL is running on port $POSTGRES_PORT (PID: $($pgProcess.PID))" -Color "Success"
        return $true
    }
    
    Write-ColorOutput "PostgreSQL not detected on port $POSTGRES_PORT" -Color "Warning"
    Write-ColorOutput "Please ensure PostgreSQL is running on port $POSTGRES_PORT" -Color "Warning"
    Write-ColorOutput "You can start it with: pg_ctl start -D /path/to/data" -Color "Info"
    
    return $false
}

function Wait-ForPort {
    param([int]$Port, [string]$ServiceName, [int]$TimeoutSeconds = 30)
    
    Write-ColorOutput "Waiting for $ServiceName to start on port $Port..." -Color "Info"
    
    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $timeout) {
        $process = Get-ProcessOnPort -Port $Port
        if ($process) {
            Write-ColorOutput "$ServiceName is now running on port $Port" -Color "Success"
            return $true
        }
        Start-Sleep -Seconds 1
    }
    
    Write-ColorOutput "Timeout waiting for $ServiceName to start on port $Port" -Color "Error"
    return $false
}

# Main execution
try {
    Write-Header "ABE Stack Development Environment Startup"
    
    # Check if we're in the right directory
    if (-not (Test-Path "package.json")) {
        Write-ColorOutput "Error: package.json not found. Please run this script from the project root directory." -Color "Error"
        exit 1
    }
    
    # Parse package.json to verify this is the ABE Stack project
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.name -ne "abe-stack") {
        Write-ColorOutput "Warning: This doesn't appear to be the ABE Stack project (package name: $($packageJson.name))" -Color "Warning"
        if (-not $Force) {
            $continue = Read-Host "Continue anyway? (y/N)"
            if ($continue -ne "y" -and $continue -ne "Y") {
                exit 1
            }
        }
    }
    
    Write-Header "Step 1: Port Cleanup"
    
    # Stop processes on required ports
    $portsCleared = @{}
    $portsCleared[$BACKEND_PORT] = Stop-ProcessOnPort -Port $BACKEND_PORT -ServiceName "Backend Server"
    $portsCleared[$FRONTEND_PORT] = Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend Server"
    
    # Check PostgreSQL separately (don't kill it, just verify it's running)
    Write-Header "Step 2: Database Check"
    $postgresOk = Start-PostgreSQLIfNeeded
    
    if (-not $postgresOk -and -not $Force) {
        Write-ColorOutput "PostgreSQL is not running. Please start PostgreSQL and try again." -Color "Error"
        Write-ColorOutput "Or use -Force to continue anyway." -Color "Info"
        exit 1
    }
    
    Write-Header "Step 3: Starting Development Servers"
    
    # Start backend server in background
    Write-ColorOutput "Starting backend server on port $BACKEND_PORT..." -Color "Info"
    $backendJob = Start-Job -ScriptBlock {
        param($ProjectPath)
        Set-Location $ProjectPath
        npm run dev:server
    } -ArgumentList (Get-Location).Path
    
    # Wait a moment for backend to start
    Start-Sleep -Seconds 3
    
    # Check if backend started successfully
    if (-not (Wait-ForPort -Port $BACKEND_PORT -ServiceName "Backend" -TimeoutSeconds 15)) {
        Write-ColorOutput "Failed to start backend server" -Color "Error"
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        exit 1
    }
    
    # Start frontend server in background
    Write-ColorOutput "Starting frontend server on port $FRONTEND_PORT..." -Color "Info"
    $frontendJob = Start-Job -ScriptBlock {
        param($ProjectPath)
        Set-Location $ProjectPath
        npm run dev:client
    } -ArgumentList (Get-Location).Path
    
    # Wait for frontend to start
    if (-not (Wait-ForPort -Port $FRONTEND_PORT -ServiceName "Frontend" -TimeoutSeconds 15)) {
        Write-ColorOutput "Failed to start frontend server" -Color "Error"
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        exit 1
    }
    
    Write-Header "Development Environment Ready!"
    
    Write-ColorOutput "✅ Backend Server: http://localhost:$BACKEND_PORT" -Color "Success"
    Write-ColorOutput "✅ Frontend Server: http://localhost:$FRONTEND_PORT" -Color "Success"
    Write-ColorOutput "✅ API Endpoint: http://localhost:$BACKEND_PORT/api" -Color "Success"
    if ($postgresOk) {
        Write-ColorOutput "✅ PostgreSQL: localhost:$POSTGRES_PORT" -Color "Success"
    }
    
    Write-Host ""
    Write-ColorOutput "Press Ctrl+C to stop all servers and exit" -Color "Info"
    Write-Host ""
    
    # Monitor jobs and handle cleanup
    try {
        while ($true) {
            # Check if jobs are still running
            $backendRunning = (Get-Job $backendJob).State -eq "Running"
            $frontendRunning = (Get-Job $frontendJob).State -eq "Running"
            
            if (-not $backendRunning -and -not $frontendRunning) {
                Write-ColorOutput "Both servers have stopped" -Color "Warning"
                break
            }
            
            if (-not $backendRunning) {
                Write-ColorOutput "Backend server has stopped" -Color "Warning"
                Receive-Job $backendJob
            }
            
            if (-not $frontendRunning) {
                Write-ColorOutput "Frontend server has stopped" -Color "Warning"
                Receive-Job $frontendJob
            }
            
            Start-Sleep -Seconds 2
        }
    }
    catch [System.Management.Automation.PipelineStoppedException] {
        Write-ColorOutput "Received stop signal..." -Color "Info"
    }
    finally {
        Write-Header "Shutting Down"
        
        # Stop and clean up jobs
        Write-ColorOutput "Stopping development servers..." -Color "Info"
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Stop-Job $frontendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $frontendJob -ErrorAction SilentlyContinue
        
        # Final port cleanup
        Stop-ProcessOnPort -Port $BACKEND_PORT -ServiceName "Backend Server" | Out-Null
        Stop-ProcessOnPort -Port $FRONTEND_PORT -ServiceName "Frontend Server" | Out-Null
        
        Write-ColorOutput "Development environment stopped" -Color "Success"
    }
}
catch {
    Write-ColorOutput "An error occurred: $_" -Color "Error"
    exit 1
} 