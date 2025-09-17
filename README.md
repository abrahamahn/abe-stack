# 🚀 ABE Stack

> A modern TypeScript React boilerplate optimized for social media and multimedia applications

_Inspired by Chet Corcos's [Chet Stack](https://github.com/ccorcos/chet-stack)_

## 📋 Overview

ABE Stack is a comprehensive boilerplate for building full-stack web applications with a focus on social media features and multimedia streaming. It provides everything you need to get started quickly while remaining flexible enough to scale as your application grows.

## 📑 Table of Contents

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
- [Documentation](#documentation)

## ✨ Features

- **Modern Tech Stack**: React 18+, TypeScript, Vite, Express, PostgreSQL
- **Authentication System**: Complete authentication with JWT-based auth including refresh tokens
- **Theme Support**: Light/dark mode with system preference detection
- **Media Handling**: Built-in support for media uploads, processing, and streaming
- **Social Features**: User profiles, posts, comments, and notifications
- **Real-time Updates**: WebSocket-based pubsub system for live data
- **Background Processing**: Task queue for handling async operations
- **Responsive UI**: Material-UI component library with mobile-first design
- **Developer Experience**: Comprehensive VS Code integration, code generators, and documentation
- **Three Processes**: Built for easy development with frontend, backend, and database processes
- **Scalable Architecture**: Clean layered architecture designed to break into microservices when needed

## 🏗️ Architecture

ABE Stack follows a clean, enterprise-grade architecture with dependency injection, layered services, and modular design that separates concerns and promotes maintainability and scalability.

For detailed architecture information, see the [Architecture Overview](docs/architecture/overview.md) and [Server Architecture](src/server/README.md).

### 🧩 Key Architectural Patterns

- **Clean Architecture**: Clear separation between API, business logic, and infrastructure layers
- **Dependency Injection**: Inversify-based DI container with interface-driven design
- **Repository Pattern**: Data access abstraction with validation and transaction support
- **Service Layer**: Business logic encapsulation with comprehensive error handling
- **Event-Driven**: Background job processing with pubsub messaging
- **Provider Pattern**: Pluggable infrastructure components (storage, cache, auth)

### 🏗️ System Layers

- **Frontend (React)**: Modern React 18+ with TypeScript, component architecture, and state management
- **Backend (Node.js)**: Express-based API with dependency injection, modular services, and comprehensive middleware
- **Infrastructure**: Cross-cutting concerns including caching, logging, security, job processing, and storage
- **Database (PostgreSQL)**: Advanced connection pooling, transaction management, and migration system

## 🚀 Getting Started

For detailed setup instructions, see the [Development Setup Guide](docs/development/setup.md).

### 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn
- Docker (optional, for containerized setup)

### 💻 Installation Options

#### ⚡ Quick Start (Automated Setup)

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

#### 🐳 Docker Setup

ABE Stack comes with Docker support:

1. Install [Docker](https://www.docker.com/get-started) and [Docker Compose](https://docs.docker.com/compose/install/)
2. Start the containers:
   ```bash
   docker-compose up
   ```

#### 🔧 Manual Setup

For those who prefer a manual installation:

1. **Install PostgreSQL**
2. **Clone and install**:

   ```sh
   git clone https://github.com/abrahamahn/abe-stack.git project
   cd project
   npm install
   ```

3. **Start development server**:
   ```sh
   npm run dev
   ```

### ⚙️ Environment Configuration

The application uses environment-specific configuration files located in `src/server/infrastructure/config/.env/`:

- `.env.development` - Development mode settings
- `.env.production` - Production mode settings
- `.env.test` - Test environment settings

These files contain configuration for database connections, JWT secrets, server settings, storage paths, and more. The configuration system supports multiple sources with schema validation.

## 👨‍💻 Development

### 📟 Development Commands

```sh
# Start development
npm run dev             # Start both client and server
npm run dev:client      # Start just the frontend
npm run dev:server      # Start just the backend
npm run dev:clean       # Kill existing processes and start dev

# Building
npm run build           # Build both client and server with checks
npm run build:check     # Run linting and type checking
npm run build:compile   # Compile client and server
npm run build:client    # Build just the client
npm run build:server    # Build just the server

# Production
npm run start           # Start production server and client
npm run start:server    # Start just production server
npm run start:client    # Start just production client
npm run preview         # Preview production build

# Testing
npm run test            # Run unit tests
npm run test:unit       # Run unit tests
npm run test:integration # Run integration tests
npm run test:e2e        # Run end-to-end tests with Playwright
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage
npm run test:all        # Run all test suites
npm run type-check      # Check TypeScript types

# Code Quality
npm run lint            # Run ESLint checks
npm run lint:strict     # Run ESLint with zero warnings
npm run lint:fix        # Fix automatically fixable issues
npm run lint:count      # Show error/warning counts
npm run format          # Format code with Prettier
npm run format:check    # Check if code is formatted

# Utilities
npm run clean           # Clean dependencies and build artifacts
npm run ports:check     # Check if development ports are free
npm run ports:kill      # Kill existing Node.js processes
npm run setup           # Interactive project setup
```

### 🧰 VS Code Integration

ABE Stack includes comprehensive VS Code integration:

- **Extensions**: Recommended extensions for TypeScript, ESLint, Prettier
- **Snippets**: Custom code snippets for common patterns
- **Launch Configurations**: Debug configurations for client, server, and tests
- **Settings**: Optimized workspace settings

## 🧩 Key Components

### 💾 Database Layer

Follows the Repository pattern with:

- **Domain Models**: Data structure, validation rules, and business logic
- **Repositories**: CRUD operations with transaction support
- **Migration System**: Structured database schema versioning
- **Seeding**: Sample data for development and testing

### ⚙️ Services Layer

Encapsulates business logic across multiple repositories:

- **Auth Services**: Authentication, authorization, user management
- **Social Services**: Post creation, social interactions, content discovery
- **Media Services**: Media processing, storage, delivery
- **Notification Services**: Event-based notification system

### 🌐 API Layer

Exposes services through HTTP endpoints:

- **RESTful API**: Resource-based API design
- **JWT Authentication**: Secure authentication with refresh tokens
- **Validation**: Request validation using Zod
- **API Documentation**: OpenAPI/Swagger documentation

For detailed API information, see the [API Overview](docs/api/overview.md).

## 📂 Application Structure

```
.
├── src/                    # Source code
│   ├── client/             # Frontend React application
│   │   ├── api/            # API client services
│   │   ├── components/     # React components
│   │   │   ├── auth/       # Authentication components
│   │   │   ├── debug/      # Debug components
│   │   │   ├── media/      # Media components
│   │   │   ├── pages/      # Page components
│   │   │   ├── social/     # Social media components
│   │   │   ├── theme/      # Theme components
│   │   │   └── ui/         # UI library components
│   │   ├── config/         # Frontend configuration
│   │   ├── contexts/       # React contexts
│   │   ├── helpers/        # Helper functions
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # Layout components
│   │   ├── public/         # Public assets and icons
│   │   ├── services/       # Frontend services
│   │   ├── test/           # Test utilities
│   │   ├── utils/          # Utility functions
│   │   ├── App.tsx         # Main React component
│   │   ├── index.html      # HTML template
│   │   ├── index.css       # Global CSS
│   │   ├── index.tsx       # Entry point for React
│   │   ├── routes.tsx      # Application routing
│   │   └── styles.ts       # Styled components
│   │
│   ├── server/             # Backend Express server
│   │   ├── modules/        # Feature modules
│   │   │   ├── base/       # Base classes and patterns
│   │   │   ├── core/       # Core business modules
│   │   │   │   ├── auth/   # Authentication & authorization
│   │   │   │   ├── email/  # Email services
│   │   │   │   ├── geo/    # Geolocation services
│   │   │   │   ├── permission/ # Permission system
│   │   │   │   ├── preferences/ # User preferences
│   │   │   │   ├── sessions/   # Session management
│   │   │   │   └── users/      # User management
│   │   │   └── reset/      # Reset utilities
│   │   │
│   │   ├── infrastructure/ # Cross-cutting concerns
│   │   │   ├── cache/      # Caching layer (Redis, in-memory)
│   │   │   ├── config/     # Configuration management
│   │   │   ├── database/   # Database connectivity
│   │   │   ├── di/         # Dependency injection
│   │   │   ├── errors/     # Error handling
│   │   │   ├── files/      # File management
│   │   │   ├── jobs/       # Background job processing
│   │   │   ├── lifecycle/  # Application lifecycle
│   │   │   ├── logging/    # Structured logging
│   │   │   ├── middleware/ # HTTP middleware
│   │   │   ├── processor/  # Media & stream processing
│   │   │   ├── promises/   # Promise utilities
│   │   │   ├── pubsub/     # Pub/Sub messaging
│   │   │   ├── queue/      # Task queues
│   │   │   ├── search/     # Search services
│   │   │   ├── security/   # Security & authentication
│   │   │   ├── server/     # HTTP server management
│   │   │   ├── storage/    # File storage
│   │   │   └── utils/      # Utility services
│   │   │
│   │   ├── shared/         # Shared code within server
│   │   ├── cpp/            # C++ bindings
│   │   ├── index.ts        # Server entry point
│   │   └── README.md       # Server documentation
│   │
│   ├── tests/              # Test suite
│   │   ├── mocks/          # Test mocks and utilities
│   │   ├── server/         # Server-side tests
│   │   │   ├── unit/       # Unit tests
│   │   │   └── integration/# Integration tests
│   │   └── types/          # Type tests
│   │
│   └── tools/              # Development and build tools
│       ├── analysis/       # Code analysis tools
│       ├── dev/            # Development utilities
│       └── setup/          # Project setup scripts
│
├── config/                 # Configuration files
│   ├── build/              # Build configuration
│   ├── dev/                # Development configuration
│   └── test/               # Test configuration
│
├── docs/                   # Documentation
│   ├── adr/                # Architecture Decision Records
│   ├── api/                # API documentation
│   ├── architecture/       # Architecture documentation
│   ├── development/        # Development guides
│   └── security/           # Security guidelines
│
├── project-data/           # Runtime data (gitignored)
│   ├── storage/            # File storage
│   ├── temp/               # Temporary files
│   ├── uploads/            # File uploads
│   ├── queue/              # Processing queue
│   └── jobs/               # Background jobs
│
└── package.json            # Project manifest
```

## 🔒 Security

ABE Stack includes comprehensive security features:

- JWT-based authentication with refresh tokens
- Role-based access control
- Input validation and sanitization
- Data encryption (at rest and in transit)
- Protection against common web vulnerabilities

For detailed security information, see the [Security Overview](docs/security/overview.md).

## 🚢 Deployment

### 🖥️ VPS or Dedicated Server

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

3. **Set environment variables** in a `.env.production` file

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

### ☁️ PaaS Platforms

1. **Create a new application** on your chosen platform
2. **Configure environment variables** in the platform's dashboard
3. **Deploy the application** by connecting your GitHub repository or using the platform's CLI
4. **Set up a PostgreSQL database** using the platform's add-on or an external service

## 🔧 Environment Variables

Key environment variables include:

| Variable       | Description                  | Default                  |
| -------------- | ---------------------------- | ------------------------ |
| `NODE_ENV`     | Environment mode             | `development`            |
| `PORT`         | Server port                  | `3000`                   |
| `DATABASE_URL` | PostgreSQL connection string | (see docs for details)   |
| `JWT_SECRET`   | Secret for JWT tokens        | (development use only)   |
| `LOG_LEVEL`    | Logging verbosity            | `debug` (in development) |

For a complete list of environment variables, see the [Development Setup Guide](docs/development/setup.md).

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📜 License

[MIT](LICENSE)

## 📚 Documentation

Comprehensive documentation is available in the `docs` directory:

- [Documentation Home](docs/README.md) - Overview of all documentation
- [Architecture](docs/architecture/overview.md) - System architecture details
- [API Documentation](docs/api/overview.md) - API usage and endpoints
- [Development Setup](docs/development/setup.md) - Development environment setup
- [Security Guidelines](docs/security/overview.md) - Security features and best practices
- [Tech Stack Selection](docs/adr/0001-tech-stack-selection.md) - Technology choices and rationale
