# ABE Stack Development Scripts

This directory contains cross-platform scripts for managing the ABE Stack development environment. These scripts automatically detect your operating system and ensure that the backend (Express), frontend (Vite), and database (PostgreSQL) services run on their designated ports.

## Quick Start

The easiest way to start the development environment is:

```bash
npm run dev
```

This will automatically detect your OS and run the appropriate script.

## Available Scripts

### Main Development Scripts

| Script                  | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `npm run dev`           | **Recommended**: Auto-detects OS and starts development environment |
| `npm run dev:force`     | Starts development environment, ignoring PostgreSQL check           |
| `npm run dev:quiet`     | Starts development environment with minimal output (no server logs) |
| `npm run dev:node-only` | Uses pure Node.js implementation (no platform-specific scripts)     |

### Platform-Specific Scripts

| Script                   | Description                  | OS Support            |
| ------------------------ | ---------------------------- | --------------------- |
| `npm run dev:windows`    | Windows batch script         | Windows               |
| `npm run dev:unix`       | Unix shell script            | Linux, macOS          |
| `npm run dev:powershell` | PowerShell script            | Windows, Linux, macOS |
| `npm run dev:legacy`     | Original concurrently script | All                   |

### Port Management

| Script                    | Description                  |
| ------------------------- | ---------------------------- |
| `npm run ports:check`     | Check which ports are in use |
| `npm run ports:kill`      | Kill all Node.js processes   |
| `npm run ports:kill:8080` | Kill processes on port 8080  |
| `npm run ports:kill:5173` | Kill processes on port 5173  |

## Port Configuration

The scripts manage these ports:

- **Backend (Express)**: `8080`
- **Frontend (Vite)**: `5173`
- **Database (PostgreSQL)**: `5432`

## Features

### Automatic OS Detection

The main script (`start-dev.js`) automatically detects your operating system and runs the most appropriate script:

- **Windows**: Uses `start-dev.bat` or falls back to Node.js implementation
- **macOS**: Uses `start-dev.sh` with macOS-specific commands
- **Linux**: Uses `start-dev.sh` with Linux-specific commands

### Port Cleanup

All scripts automatically:

1. **Kill existing processes** on required ports before starting
2. **Verify PostgreSQL** is running (with option to continue without it)
3. **Wait for services** to start before proceeding
4. **Provide cleanup** on exit (Ctrl+C)

### Error Handling

- Timeout detection for services that fail to start
- Graceful cleanup on script termination
- Clear error messages with suggested solutions

### Server Logging

The main script displays server logs in real-time with colored prefixes:

- **Backend logs**: Blue `[Backend]` prefix
- **Frontend logs**: Green `[Frontend]` prefix
- **Error logs**: Red text with appropriate prefix

This mimics the behavior of the original `concurrently` setup but with enhanced port management and cross-platform support.

**Logging Options:**

- **Default**: Shows all server logs with colored prefixes
- **Quiet mode**: Hides server logs for minimal output (`--quiet` flag)
- **Legacy mode**: Uses original `concurrently` without port management

## Usage Examples

### Basic Development

```bash
# Start development environment (recommended)
npm run dev

# Start with force (skip PostgreSQL check)
npm run dev:force
```

### Platform-Specific Usage

```bash
# Windows users
npm run dev:windows

# Linux/macOS users
npm run dev:unix

# PowerShell users (any OS)
npm run dev:powershell
```

### Troubleshooting

```bash
# Check what's using your ports
npm run ports:check

# Kill all Node.js processes and restart
npm run ports:kill
npm run dev

# Use pure Node.js implementation
npm run dev:node-only
```

## Command Line Options

The main script supports these options:

- `--force`: Skip PostgreSQL connectivity check
- `--quiet`: Hide server logs for minimal output
- `--node-only`: Use Node.js implementation instead of platform scripts
- `--verbose`: Enable verbose logging (deprecated, logs shown by default)

```bash
# Examples
node tools/dev/start-dev.js --force
node tools/dev/start-dev.js --quiet
node tools/dev/start-dev.js --node-only --quiet
```

## Script Files

| File            | Purpose                    | OS Support            |
| --------------- | -------------------------- | --------------------- |
| `start-dev.js`  | Main cross-platform script | All                   |
| `start-dev.bat` | Windows batch script       | Windows               |
| `start-dev.sh`  | Unix shell script          | Linux, macOS          |
| `start-dev.ps1` | PowerShell script          | Windows, Linux, macOS |

## Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   npm run ports:check
   npm run ports:kill:8080  # or :5173
   ```

2. **PostgreSQL not running**

   ```bash
   # Start PostgreSQL first, or use:
   npm run dev:force
   ```

3. **Permission denied (Unix)**

   ```bash
   chmod +x tools/dev/start-dev.sh
   ```

4. **PowerShell execution policy (Windows)**
   ```bash
   # Run as administrator:
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

### Log Files (Unix)

When using the shell script, logs are saved to:

- Backend: `/tmp/abe-backend.log`
- Frontend: `/tmp/abe-frontend.log`

View logs in real-time:

```bash
tail -f /tmp/abe-backend.log
tail -f /tmp/abe-frontend.log
```

## Development

To modify or extend these scripts:

1. **Cross-platform logic**: Edit `start-dev.js`
2. **Windows-specific**: Edit `start-dev.bat`
3. **Unix-specific**: Edit `start-dev.sh`
4. **PowerShell-specific**: Edit `start-dev.ps1`

## Environment Variables

The scripts respect these environment variables:

- `NODE_ENV`: Set to `development` for dev servers
- `PORT`: Backend port (defaults to 8080)
- `VITE_PORT`: Frontend port (defaults to 5173)

## Contributing

When adding new features:

1. Update the main `start-dev.js` script
2. Update platform-specific scripts as needed
3. Update this README
4. Test on multiple operating systems
