# 🛠️ ABE Stack Development Tools

## 📋 Overview

This directory contains essential TypeScript-based development tools and utilities for the ABE Stack project. All tools are **cross-platform** and work seamlessly on Windows, macOS, and Linux through Node.js.

## 🧩 Available Tools

| Tool                  | Description                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| **start-dev.ts**      | Enhanced development environment launcher with logging and monitoring        |
| **setup.ts**          | Interactive setup wizard for configuring the development environment         |
| **restart-db.ts**     | Emergency database connection pool restart utility                           |

## 🚀 Quick Start

```bash
# Run interactive setup (first time)
npm run setup

# Start development environment
npm run dev:start

# Restart database connection pool
npm run db:restart
```

## 📚 Tool Documentation

### 1. start-dev.ts - Development Launcher

A sophisticated, cross-platform development environment launcher with enhanced features.

#### Features

- **Automatic Port Cleanup**: Kills processes on required ports before starting
- **PostgreSQL Detection**: Verifies database is running with option to continue anyway
- **Enhanced Logging**: Color-coded, structured logging with multiple output modes
- **Service Monitoring**: Waits for services to start and monitors their health
- **Infrastructure Dashboard**: Real-time status display of all services
- **Graceful Shutdown**: Clean process termination on Ctrl+C

#### Port Configuration

- **Backend (Express)**: `8080`
- **Frontend (Vite)**: `5173`
- **Database (PostgreSQL)**: `5432`

#### Usage

```bash
# Normal startup with enhanced logging
npm run dev:start

# Minimal output (hide server logs)
npm run dev:start:quiet

# Detailed monitoring and health checks
npm run dev:start:verbose

# Skip PostgreSQL check and continue anyway
npm run dev:start:force
```

#### Command Line Options

```bash
tsx tools/start-dev.ts [options]

Options:
  --force      Skip PostgreSQL check and continue anyway
  --quiet      Minimal output, hide server logs
  --verbose    Show detailed monitoring and health checks
  --json       Output logs in JSON format
  --node-only  Use pure Node.js implementation (skip platform scripts)
  --help, -h   Show help message
```

#### Example Output

```
═══════════════════════════════════════════════════════════
  ABE Stack Enhanced Development Environment
═══════════════════════════════════════════════════════════

0.2s ℹ️  [SYSTEM]       Operating System: Linux (linux)
1.5s ✅ [SYSTEM]       Environment validation passed
2.1s ✅ [DATABASE]     PostgreSQL is running on port 5432
3.2s ✅ [BACKEND]      Backend is now running on port 8080
5.8s ✅ [FRONTEND]     Frontend is now running on port 5173

═══════════════════════════════════════════════════════════
  Development Environment Ready!
═══════════════════════════════════════════════════════════

  ✓ Frontend Application: http://localhost:5173
  ✓ Backend API: http://localhost:8080/api
  ✓ API Documentation: http://localhost:8080/api/docs
```

---

### 2. setup.ts - Interactive Setup Wizard

An interactive setup wizard that guides you through configuring the ABE Stack development environment.

#### Features

- **Cross-Platform Support**: Automatic OS detection (Windows, macOS, Linux)
- **Prerequisite Checks**: Verifies Node.js, PostgreSQL, Docker installation
- **Package Manager Integration**: Uses Homebrew (macOS), Chocolatey (Windows), or apt (Linux)
- **Environment Configuration**: Creates and configures `.env.development` and `.env.production`
- **Database Setup**: Supports both local PostgreSQL and Docker configurations
- **Demo Data**: Optional installation of demo/seed data
- **Visual Feedback**: Beautiful progress indicators and colored output

#### Usage

```bash
# Run the interactive setup wizard
npm run setup
```

#### Setup Process

1. **OS Detection**: Automatically detects your operating system
2. **Prerequisites Check**: Verifies all required software
3. **Installation Offers**: Prompts to install missing prerequisites
4. **Environment Files**: Creates `.env.development` and `.env.production`
5. **Database Choice**: Choose between Docker or local PostgreSQL
6. **Demo Data**: Optional database seeding with sample data
7. **Verification**: Confirms setup is working correctly
8. **Auto-Start**: Optionally starts the development environment

#### Prerequisites

The setup wizard checks for and can install:

- **Node.js** (v18+)
- **PostgreSQL** (v14+)
- **Docker** (optional, for containerized database)

#### Configuration Options

- **Docker Mode**: Uses containerized PostgreSQL
- **Local Mode**: Uses locally installed PostgreSQL
- **Manual Configuration**: Custom database connection settings
- **Demo Data**: Seed database with sample data for testing

---

### 3. restart-db.ts - Database Utility

Emergency tool for restarting hanging database connection pools.

#### When to Use

Use this tool when:
- Database connection pool is exhausted
- Registration/login operations hang indefinitely
- You see "connection pool timeout" errors
- Database queries are not responding

#### Features

- Connects to PostgreSQL as admin user
- Lists all active connections to `abe_stack` database
- Terminates hanging connections (running >30 seconds)
- Provides detailed connection information (PID, user, state)
- Safe operation with clear feedback

#### Usage

```bash
# Restart database connection pool
npm run db:restart
```

#### What It Does

1. Connects to PostgreSQL using admin credentials
2. Queries `pg_stat_activity` for active connections
3. Shows connection details (PID, user, state, start time)
4. Terminates connections running longer than 30 seconds
5. Reports number of connections terminated

#### Example Output

```
🚨 Emergency Database Pool Restart
This will terminate hanging connections and reset the pool
✅ Connected to PostgreSQL as admin

📊 Found 3 active connections to abe_stack:
1. PID: 1234, User: postgres, State: active
   Started: 2024-01-15T10:30:00Z, Changed: 2024-01-15T10:30:45Z
2. PID: 1235, User: postgres, State: active
   Started: 2024-01-15T10:29:30Z, Changed: 2024-01-15T10:30:00Z

🔄 Terminating hanging connections...
✅ Terminated 2 hanging connections

🎉 Database connection cleanup completed!
💡 You can now try registration again
```

---

## 📦 NPM Scripts Reference

All tools are integrated into `package.json` for easy access:

### Development Environment

```bash
npm run dev:start          # Start development environment (normal mode)
npm run dev:start:quiet    # Start with minimal output
npm run dev:start:verbose  # Start with detailed monitoring
npm run dev:start:force    # Start, skip PostgreSQL check
```

### Database Utilities

```bash
npm run db:restart         # Restart database connection pool
```

### Setup & Configuration

```bash
npm run setup              # Run interactive setup wizard
```

### Port Management

```bash
npm run ports:check        # Check which ports are in use
```

---

## 🔧 Development Guidelines

### Adding New Tools

When adding new tools to this directory:

1. **Use TypeScript**: All tools should be written in TypeScript
2. **Cross-Platform**: Ensure compatibility with Windows, macOS, and Linux
3. **Type Safety**: Use proper type declarations
4. **Error Handling**: Implement robust error handling
5. **User Feedback**: Provide clear, helpful messages
6. **Documentation**: Update this README with tool details

### Best Practices

- **Single Responsibility**: Each tool should focus on one task
- **Modularity**: Leverage composition and reusable functions
- **Configuration**: Support external configuration when appropriate
- **Testing**: Test on all three major platforms
- **CLI Options**: Support command-line flags for automation

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Port Already in Use

```bash
# Check what's using the ports
npm run ports:check

# Kill processes on specific port (manual)
# Windows: taskkill /F /PID <pid>
# Unix: kill -9 <pid>

# The start-dev.ts tool automatically handles this
npm run dev:start
```

#### 2. PostgreSQL Not Running

```bash
# Check PostgreSQL status
# Windows: Check Services
# macOS: brew services list
# Linux: sudo systemctl status postgresql

# Or force start anyway
npm run dev:start:force
```

#### 3. Database Connection Pool Exhausted

```bash
# Restart the connection pool
npm run db:restart
```

#### 4. Permission Errors

```bash
# Make sure you have write permissions
# Windows: Run as Administrator
# Unix: Check file permissions
chmod +x tools/*.ts  # If needed
```

---

## 🌐 Environment Variables

Tools respect these environment variables:

| Variable      | Description                    | Default       |
| ------------- | ------------------------------ | ------------- |
| `NODE_ENV`    | Environment mode               | `development` |
| `DB_HOST`     | PostgreSQL host                | `localhost`   |
| `DB_PORT`     | PostgreSQL port                | `5432`        |
| `DB_USER`     | PostgreSQL user                | `postgres`    |
| `DB_PASSWORD` | PostgreSQL password            | `postgres`    |
| `DB_NAME`     | Database name                  | `abe_stack`   |
| `PORT`        | Backend server port            | `8080`        |
| `VITE_PORT`   | Frontend development port      | `5173`        |

---

## 📖 Related Documentation

- [Project Setup Guide](../docs/setup.md) - Complete setup instructions
- [Development Workflow](../docs/development.md) - Development guidelines
- [Database Guide](../docs/database.md) - Database management
- [CI/CD Pipeline](../.github/workflows/) - Automated workflows

---

## 🤝 Contributing

When modifying these tools:

1. Test on **all three platforms** (Windows, macOS, Linux)
2. Update **this README** with changes
3. Maintain **TypeScript types** and documentation
4. Follow **existing code style** and patterns
5. Add **error handling** for edge cases

---

**Built with ❤️ for cross-platform development**
