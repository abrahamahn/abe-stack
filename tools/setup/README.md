# 🔧 Installation Tools

## 📋 Overview

This directory contains scripts and utilities for setting up and configuring the development environment. These tools streamline the installation process, ensure consistent environments across development machines, and automate the configuration of prerequisites.

## 🧩 Available Tools

| Script                 | Description                                                                            |
| ---------------------- | -------------------------------------------------------------------------------------- |
| [setup.ts](./setup.ts) | Main setup script that guides users through the installation and configuration process |

## 🔍 Features

The installation tools provide the following features:

- **Cross-platform Support**: Works on Windows, macOS, and Linux
- **Prerequisite Checks**: Verifies that all required software is installed
- **Package Manager Integration**: Uses the appropriate package manager for each OS (Homebrew, Chocolatey, apt)
- **Environment Configuration**: Sets up and configures environment variables
- **Database Setup**: Configures local or dockerized database connections
- **Interactive Setup**: User-friendly prompts for customizing the installation
- **Visual Feedback**: Progress indicators and clear success/error messages

## 🔧 Using the Setup Script

The `setup.ts` script provides an interactive setup process for the application. To use it:

```bash
# Navigate to the project root
cd /path/to/project

# Run the setup script with npm
npm run setup

# Or execute it directly with ts-node
npx ts-node src/tools/installation/setup.ts
```

The setup process will:

1. Check for required prerequisites (Node.js, npm, Docker, PostgreSQL)
2. Install missing prerequisites using the appropriate package manager
3. Create and configure environment files (.env.development, .env.production)
4. Set up database connections
5. Configure application settings
6. Verify the setup is working correctly

## 📊 Setup Options

During the setup process, you'll be prompted to make choices about your environment:

- **Development Mode**: Configure for local development
- **Production Mode**: Configure for production deployment
- **Docker Usage**: Whether to use Docker for services like databases
- **Database Configuration**: Connection settings for PostgreSQL
- **Application Settings**: Ports, hosts, logging levels, etc.

## 🚫 Troubleshooting

If you encounter issues during setup:

1. **Permission Problems**:

   - On Unix-based systems, you may need to use `sudo` for some operations
   - On Windows, run the terminal as Administrator

2. **Database Connection Issues**:

   - Verify PostgreSQL is running with `pg_isready` or check the service status
   - Check firewall settings
   - Ensure the database user has appropriate permissions

3. **Docker Problems**:
   - Verify Docker is running with `docker info`
   - Check Docker service status
   - Ensure your user has permissions to access Docker

## 🔄 Manual Configuration

If the automated setup doesn't work for your environment, you can manually configure the application:

1. Copy `.env.example` to `.env.development` and `.env.production`
2. Edit the environment files to match your system configuration
3. Install all required dependencies with `npm install`
4. Set up the database schema manually
5. Start the application with `npm run dev`

## 🔗 Related Resources

- [Development Documentation](../../../docs/development.md) - Development guidelines
- [Environment Configuration](../../../docs/environment.md) - Environment variable reference
- [Docker Setup](../../../docs/docker.md) - Additional Docker configuration options
