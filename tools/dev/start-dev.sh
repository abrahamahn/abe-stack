#!/bin/bash

# ABE Stack Development Environment Startup Script (Unix Version)
# This script ensures services run on their designated ports by killing existing processes first

set -e

# Configuration
BACKEND_PORT=8080
FRONTEND_PORT=5173
POSTGRES_PORT=5432

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_color() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Function to print header
print_header() {
    local title=$1
    echo ""
    print_color $MAGENTA "============================================================"
    print_color $MAGENTA "  $title"
    print_color $MAGENTA "============================================================"
    echo ""
}

# Function to check if a port is in use
check_port() {
    local port=$1
    if command -v lsof >/dev/null 2>&1; then
        lsof -i :$port >/dev/null 2>&1
    elif command -v netstat >/dev/null 2>&1; then
        netstat -an | grep ":$port " | grep -q LISTEN
    else
        # Fallback: try to bind to the port
        (echo >/dev/tcp/localhost/$port) >/dev/null 2>&1
    fi
}

# Function to kill process on specific port
kill_port_process() {
    local port=$1
    local service_name=$2
    
    if check_port $port; then
        print_color $YELLOW "Found $service_name process on port $port"
        
        if command -v lsof >/dev/null 2>&1; then
            # Use lsof to find and kill processes
            local pids=$(lsof -ti :$port)
            if [ ! -z "$pids" ]; then
                for pid in $pids; do
                    print_color $YELLOW "Killing process $pid on port $port"
                    kill -9 $pid 2>/dev/null || true
                done
                print_color $GREEN "✓ Successfully stopped $service_name on port $port"
            fi
        elif command -v netstat >/dev/null 2>&1 && command -v awk >/dev/null 2>&1; then
            # Fallback using netstat and awk
            local pids=$(netstat -tlnp 2>/dev/null | grep ":$port " | awk '{print $7}' | cut -d'/' -f1 | grep -v -)
            if [ ! -z "$pids" ]; then
                for pid in $pids; do
                    print_color $YELLOW "Killing process $pid on port $port"
                    kill -9 $pid 2>/dev/null || true
                done
                print_color $GREEN "✓ Successfully stopped $service_name on port $port"
            fi
        else
            print_color $YELLOW "⚠ Cannot determine process ID for port $port"
        fi
    else
        print_color $GREEN "✓ Port $port is free for $service_name"
    fi
}

# Function to wait for port to become active
wait_for_port() {
    local port=$1
    local service_name=$2
    local timeout=${3:-15}
    local count=0
    
    print_color $CYAN "Waiting for $service_name to start on port $port..."
    
    while [ $count -lt $timeout ]; do
        if check_port $port; then
            print_color $GREEN "✓ $service_name is now running on port $port"
            return 0
        fi
        sleep 1
        count=$((count + 1))
    done
    
    print_color $RED "✗ Timeout waiting for $service_name to start on port $port"
    return 1
}

# Function to check PostgreSQL
check_postgresql() {
    if check_port $POSTGRES_PORT; then
        print_color $GREEN "✓ PostgreSQL is running on port $POSTGRES_PORT"
        return 0
    else
        print_color $YELLOW "⚠ PostgreSQL not detected on port $POSTGRES_PORT"
        print_color $YELLOW "  Please ensure PostgreSQL is running before continuing."
        print_color $YELLOW "  You can start it with: pg_ctl start -D /path/to/data"
        echo ""
        read -p "Continue anyway? (y/N): " continue_choice
        if [[ $continue_choice =~ ^[Yy]$ ]]; then
            return 0
        else
            print_color $RED "Exiting..."
            exit 1
        fi
    fi
}

# Main execution
main() {
    print_header "ABE Stack Development Environment Startup"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_color $RED "Error: package.json not found. Please run this script from the project root directory."
        exit 1
    fi
    
    # Parse command line arguments
    FORCE=false
    for arg in "$@"; do
        case $arg in
            --force)
                FORCE=true
                shift
                ;;
            *)
                # Unknown option
                ;;
        esac
    done
    
    print_header "Step 1: Port Cleanup"
    
    # Kill processes on required ports
    kill_port_process $BACKEND_PORT "Backend Server"
    kill_port_process $FRONTEND_PORT "Frontend Server"
    
    print_header "Step 2: Database Check"
    
    if ! check_postgresql && [ "$FORCE" != "true" ]; then
        print_color $RED "PostgreSQL is not running. Please start PostgreSQL and try again."
        print_color $CYAN "Or use --force to continue anyway."
        exit 1
    fi
    
    print_header "Step 3: Starting Development Servers"
    
    # Start backend server in background
    print_color $CYAN "Starting backend server on port $BACKEND_PORT..."
    npm run dev:server > /tmp/abe-backend.log 2>&1 &
    BACKEND_PID=$!
    
    # Wait for backend to start
    if ! wait_for_port $BACKEND_PORT "Backend" 15; then
        print_color $RED "Failed to start backend server"
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    # Start frontend server in background
    print_color $CYAN "Starting frontend server on port $FRONTEND_PORT..."
    npm run dev:client > /tmp/abe-frontend.log 2>&1 &
    FRONTEND_PID=$!
    
    # Wait for frontend to start
    if ! wait_for_port $FRONTEND_PORT "Frontend" 15; then
        print_color $RED "Failed to start frontend server"
        kill $FRONTEND_PID 2>/dev/null || true
        kill $BACKEND_PID 2>/dev/null || true
        exit 1
    fi
    
    print_header "Development Environment Ready!"
    
    print_color $GREEN "✅ Backend Server: http://localhost:$BACKEND_PORT"
    print_color $GREEN "✅ Frontend Server: http://localhost:$FRONTEND_PORT"
    print_color $GREEN "✅ API Endpoint: http://localhost:$BACKEND_PORT/api"
    if check_port $POSTGRES_PORT; then
        print_color $GREEN "✅ PostgreSQL: localhost:$POSTGRES_PORT"
    fi
    
    echo ""
    print_color $CYAN "Press Ctrl+C to stop all servers and exit"
    echo ""
    print_color $CYAN "Server logs:"
    print_color $CYAN "  Backend: tail -f /tmp/abe-backend.log"
    print_color $CYAN "  Frontend: tail -f /tmp/abe-frontend.log"
    echo ""
    
    # Function to cleanup on exit
    cleanup() {
        print_color $YELLOW "Shutting down development environment..."
        kill $BACKEND_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        
        # Final port cleanup
        kill_port_process $BACKEND_PORT "Backend Server" >/dev/null 2>&1
        kill_port_process $FRONTEND_PORT "Frontend Server" >/dev/null 2>&1
        
        print_color $GREEN "Development environment stopped"
        exit 0
    }
    
    # Set up signal handlers
    trap cleanup SIGINT SIGTERM
    
    # Wait for processes to finish
    wait $BACKEND_PID $FRONTEND_PID
}

# Run main function with all arguments
main "$@" 