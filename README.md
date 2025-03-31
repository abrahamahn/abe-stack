# ABE Stack

> A modern TypeScript React boilerplate optimized for social media and multimedia applications

_Inspired by Chet Corcos's [Chet Stack](https://github.com/ccorcos/chet-stack)_

## Overview

ABE Stack is a comprehensive boilerplate for building full-stack web applications with a focus on social media features and multimedia streaming. It provides everything you need to get started quickly while remaining flexible enough to scale as your application grows.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation Options](#installation-options)
  - [Environment Configuration](#environment-configuration)
  - [Demo Database](#demo-database)
- [Development](#development)
  - [Development Commands](#development-commands)
  - [Database Commands](#database-commands)
  - [VS Code Integration](#vs-code-integration)
- [Key Components](#key-components)
  - [Database Layer](#database-layer)
  - [Services Layer](#services-layer)
  - [API Layer](#api-layer)
- [Application Structure](#application-structure)
- [Deployment](#deployment)
  - [VPS or Dedicated Server](#vps-or-dedicated-server)
  - [PaaS Platforms](#paas-platforms)
- [Environment Variables](#environment-variables)
- [Contributing](#contributing)
- [License](#license)
- [Infrastructure Components](#infrastructure-components)
  - [Logging Infrastructure](#logging-infrastructure)
- [Configuration System](#configuration-system)

## Features

- **Modern Tech Stack**: React 19, TypeScript, Vite, Express, PostgreSQL
- **Authentication System**: Complete authentication with both cookie-based sessions and JWT options
- **Theme Support**: Light/dark mode with system preference detection
- **Media Handling**: Built-in support for media uploads, processing, and streaming
- **Social Features**: User profiles, posts, comments, and notifications
- **Real-time Updates**: WebSocket-based pubsub system for live data
- **Background Processing**: Task queue for handling async operations
- **Responsive UI**: Component library with mobile-first design
- **Developer Experience**: Comprehensive VS Code integration, code generators, and documentation
- **Three Processes**: Built for easy development with frontend, backend, and database processes
- **Scalable Architecture**: Clean layered architecture designed to break into microservices when needed

## Architecture

ABE Stack follows a clean, multi-layered architecture that separates concerns and promotes maintainability and scalability:

![Architecture Diagram](docs/images/architecture.md)

### Key Layers

- **Client**: React frontend with component hierarchy, routing, and state management
- **Server**: Express-based backend with controllers, services, and repositories
- **Database**: PostgreSQL with models, migrations, and seed data
- **Infrastructure**: Supporting systems for caching, media storage, and authentication

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- Docker (optional, for containerized setup)

### Installation Options

#### Quick Start (Automated Setup)

The easiest way to get started:

```bash
# Interactive setup with configuration options
npm run setup
```

The setup script will:

- Check for and install missing prerequisites
- Configure your environment automatically
- Set up the database with sample data
- Start the development server

#### Docker Setup

ABE Stack comes with Docker support:

1. Install [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
2. Start the containers:
   ```bash
   docker-compose up
   ```

#### Manual Setup

For those who prefer a manual installation:

1. **Install PostgreSQL**:

   - **macOS**:

     ```sh
     brew install postgresql@14
     brew services start postgresql@14
     ```

   - **Windows**:

     ```sh
     choco install postgresql
     ```

   - **Linux**:

     ```sh
     # Ubuntu/Debian
     sudo apt install postgresql

     # Fedora/RHEL
     sudo dnf install postgresql-server
     ```

2. **Clone and install**:

   ```sh
   git clone https://github.com/YOUR-USERNAME/abe-stack.git project
   cd project
   npm install
   ```

3. **Start development server**:
   ```sh
   npm run dev
   ```

### Environment Configuration

The application uses environment-specific configuration files:

- `.env.development` - Development mode settings
- `.env.production` - Production mode settings

These files contain configuration for database connections, JWT secrets, server settings, etc.

### Demo Database

Create a database with sample data:

```sh
# Create a database with sample users, posts, comments, and likes
npm run seed:demo
```

This will:

1. Create a PostgreSQL database named `abe_stack`
2. Run all migrations to set up the schema
3. Insert demo users with predefined credentials
4. Create sample content (posts, comments, likes, follows)

#### Custom Database Settings

You can customize database connection settings with environment variables:

```sh
# Linux/macOS
DB_HOST=your_host DB_PORT=your_port DB_USER=your_username DB_PASSWORD=your_password npm run seed:demo

# Windows PowerShell
$env:DB_HOST="your_host"; $env:DB_PORT="your_port"; $env:DB_USER="your_username"; $env:DB_PASSWORD="your_password"; npm run seed:demo

# Windows Command Prompt
set DB_HOST=your_host && set DB_PORT=your_port && set DB_USER=your_username && set DB_PASSWORD=your_password && npm run seed:demo
```

## Development

### Development Commands

```sh
# Start development
npm run dev             # Start both client and server
npm run dev:client      # Start just the frontend
npm run dev:server      # Start just the backend

# Building
npm run build           # Build both client and server
npm run build:client    # Build just the client
npm run build:server    # Build just the server

# Production
npm run start           # Start production server
npm run start:dev       # Start development server with hot reloading

# Testing
npm run test            # Run all tests
npm run type-check      # Check TypeScript types

# Linting and Formatting
npm run lint            # Run ESLint on all TypeScript files
npm run lint:fix        # Fix automatically fixable issues
npm run format          # Format code with Prettier

# Database
npm run seed:demo       # Create and seed the database with demo data
npm run db:clear        # Clear all data while preserving schema
npm run migrate         # Run database migrations
npm run migrate:create  # Create a new migration

# Code Generation
npm run generate        # Run the interactive code generator
```

### Database Commands

#### Seeding the Database

The `seed:demo` command:

1. Connects to PostgreSQL using environment variables
2. Creates the database if it doesn't exist
3. Runs a series of SQL scripts to create the schema and sample data

#### Clearing the Database

The `db:clear` command:

1. Temporarily disables foreign key constraints
2. Truncates all tables (except migrations)
3. Re-enables foreign key constraints

This is useful for resetting the database without losing the schema.

### VS Code Integration

ABE Stack includes comprehensive VS Code integration:

- **Extensions**: Recommended extensions for TypeScript, ESLint, Prettier
- **Snippets**: Custom code snippets for common patterns
- **Launch Configurations**: Debug configurations for client, server, and tests
- **Settings**: Optimized workspace settings

## Key Components

### Database Layer

Follows the Repository pattern with:

- **Domain Models**: Data structure, validation rules, and business logic
- **Repositories**: CRUD operations with transaction support
- **Transaction Support**: Atomic operations across multiple repositories
- **Migration System**: Structured database schema versioning
- **Seeding**: Sample data for development and testing

Includes repositories for:

- Auth (User, Role, Permission, Token)
- Social (Posts, Comments, Likes, Follows)
- Media (Media files, Collections, Tags)
- Community (Groups, Memberships)
- Messaging (Conversations, Messages)
- Moderation (Content reports, actions)

### Services Layer

Encapsulates business logic across multiple repositories:

- **Auth Services**: Authentication, authorization, user management
- **Social Services**: Post creation, social interactions, content discovery
- **Media Services**: Media processing, storage, delivery
- **Community Services**: Group management and interactions
- **Messaging Services**: Conversation and message handling
- **Moderation Services**: Content moderation workflows
- **Notification Services**: Event-based notification system
- **Analytics Services**: User activity tracking and analytics

Each service follows SOLID principles with TypeScript typing, error handling, input validation, transaction management, logging, and testability.

### API Layer

Exposes services through HTTP endpoints:

- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define API endpoints and map to controllers
- **Middleware**: Authentication, rate limiting, etc.
- **Validators**: Request data validation
- **DTOs**: Data structures for API requests/responses

## Application Structure

```
.
├── src/                    # Source code
│   ├── client/             # Frontend React application
│   │   ├── components/     # React components (atoms, molecules, organisms)
│   │   ├── contexts/       # React contexts
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # Layout components
│   │   ├── services/       # Frontend services
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main React component
│   │   ├── index.tsx       # Entry point for React
│   │   └── routes.tsx      # Application routing
│   │
│   ├── server/             # Backend Express server
│   │   ├── api/            # API-related code (controllers, routes, validators)
│   │   ├── core/           # Core server functionality
│   │   ├── database/       # Database layer (models, repositories, migrations)
│   │   ├── services/       # Business logic layer
│   │   ├── config/         # Server configuration
│   │   └── utils/          # Server utilities
│   │
│   ├── shared/             # Shared code between client and server
│   ├── tools/              # Development and build tools
│   └── types/              # TypeScript type definitions
│
├── dist/                   # Compiled output
├── docs/                   # Documentation
├── uploads/                # File uploads directory
├── .env.development        # Development environment variables
├── .env.production         # Production environment variables
├── .vscode/                # VS Code configuration
└── package.json            # Project manifest
```

## Deployment

### VPS or Dedicated Server

1. **Prepare your server**:

   - Install Node.js, npm, and PostgreSQL
   - Set up a PostgreSQL database

2. **Clone and build**:

   ```sh
   git clone https://github.com/YOUR-USERNAME/abe-stack.git
   cd abe-stack
   npm install
   npm run build
   ```

3. **Set environment variables** in a `.env` file

4. **Start the application**:

   ```sh
   npm run start
   ```

5. **Set up a process manager** (recommended):

   ```sh
   npm install -g pm2
   pm2 start dist/server/index.js --name abe-stack
   pm2 save
   pm2 startup
   ```

6. **Set up a reverse proxy** with Nginx or Apache

### PaaS Platforms

1. **Create a new application** on your chosen platform
2. **Configure environment variables** in the platform's dashboard
3. **Deploy the application** by connecting your GitHub repository or using the platform's CLI
4. **Set up a PostgreSQL database** using the platform's add-on or an external service

## Environment Variables

### Server Environment Variables

| Variable       | Description                  | Default                                                  |
| -------------- | ---------------------------- | -------------------------------------------------------- |
| `NODE_ENV`     | Environment mode             | `development`                                            |
| `PORT`         | Server port                  | `8080`                                                   |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:1083035@localhost:5432/abe_stack` |
| `DB_HOST`      | PostgreSQL host              | `localhost`                                              |
| `DB_PORT`      | PostgreSQL port              | `5432`                                                   |
| `DB_USER`      | PostgreSQL username          | `postgres`                                               |
| `DB_PASSWORD`  | PostgreSQL password          | `postgres`                                               |
| `DB_NAME`      | PostgreSQL database name     | `abe_stack`                                              |
| `JWT_SECRET`   | Secret for JWT tokens        | `your-secret-key`                                        |
| `CORS_ORIGIN`  | CORS allowed origins         | `*`                                                      |
| `UPLOAD_DIR`   | Directory for file uploads   | `./uploads`                                              |

### Client Environment Variables

| Variable  | Description      | Default                  |
| --------- | ---------------- | ------------------------ |
| `API_URL` | API endpoint URL | `/api`                   |
| `WS_URL`  | WebSocket URL    | `ws://localhost:8080/ws` |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)

## Infrastructure Components

### Logging Infrastructure

The enhanced logging infrastructure provides a flexible logging system with:

- Standard log levels (debug, info, warn, error)
- Structured logging with metadata support
- Correlation IDs for request tracing
- Multiple outputs (console, file)
- Log rotation

See the [Logging Infrastructure README](src/server/infrastructure/logging/README.md) for more details.

#### Examples

Check out the [Logger Examples](src/server/infrastructure/logging/examples/README.md) for working examples of how to use the logging system.

You can run the examples using:

```bash
npx ts-node src/server/infrastructure/logging/examples/run-examples.ts
```

## Configuration System

A robust, type-safe configuration management system for server applications.

## Overview

This configuration system provides a flexible way to define, validate, and access application configuration values from various sources. It ensures type safety, validation, and proper error reporting.

## Components

### ConfigSchema

Defines the structure and validation rules for configuration values:

- **Types:** Support for strings, numbers, booleans, arrays, and objects
- **Validation:** Pattern matching, enum values, min/max values, length constraints
- **Features:** Default values, required fields, custom validators
- **Type Conversion:** Automatic conversion from string inputs to appropriate types

### ConfigService

Manages the loading, validation, and access to configuration:

- **Environment-aware:** Loads different configurations based on environment
- **Secret Management:** Securely handles sensitive configuration values
- **Cached Access:** Efficient retrieval of validated configuration values
- **Hierarchical Override:** Values from multiple sources with precedence rules

### Environments

Defines available execution environments and their specific behaviors:

- **Environment Detection:** Automatic detection of current environment
- **Environment-specific Settings:** Different validation rules per environment

## Usage Examples

### Defining Configuration Schema

```typescript
const schema: ConfigSchema = {
  PORT: {
    type: "number",
    required: true,
    min: 1,
    max: 65535,
    default: 3000,
  },
  DATABASE_URL: {
    type: "string",
    required: true,
    pattern: /^postgresql:\/\/.+$/,
  },
  FEATURE_FLAGS: {
    type: "object",
    default: {},
  },
};
```

### Accessing Configuration

```typescript
// Get typed configuration value
const port = configService.get("PORT"); // Returns number

// Check if configuration exists
if (configService.has("FEATURE_FLAGS.newFeature")) {
  // Use the feature
}
```

## Validation Features

- **Required Fields:** Ensure critical configuration is provided
- **Type Safety:** Automatic conversion and validation
- **Value Constraints:** Range validation for numbers, length validation for strings
- **Pattern Matching:** Regex validation for string formats
- **Enum Values:** Restrict values to predefined options
- **Custom Validators:** Complex validation with custom functions

## Testing

The configuration system is thoroughly tested:

- **Unit Tests:** Verify schema validation, type conversion, and constraints
- **Integration Tests:** Test loading from various sources and environment detection
- **Secret Management Tests:** Verify secure handling of sensitive data

## Error Handling

Configuration errors are detected early and provide clear feedback:

- Missing required fields
- Type conversion failures
- Validation constraint violations
- Invalid format errors
