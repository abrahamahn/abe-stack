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

ABE Stack follows a clean, multi-layered architecture that separates concerns and promotes maintainability and scalability.

For detailed architecture information, see the [Architecture Overview](docs/architecture/overview.md).

### 🧩 Key Layers

- **Client**: React frontend with component hierarchy, routing, and state management
- **Server**: Express-based backend with controllers, services, and repositories
- **Database**: PostgreSQL with models, migrations, and seed data
- **Infrastructure**: Supporting systems for caching, media storage, and authentication

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
   git clone https://github.com/YOUR-USERNAME/abe-stack.git project
   cd project
   npm install
   ```

3. **Start development server**:
   ```sh
   npm run dev
   ```

### ⚙️ Environment Configuration

The application uses environment-specific configuration files:

- `.env.development` - Development mode settings
- `.env.production` - Production mode settings

These files contain configuration for database connections, JWT secrets, server settings, etc.

## 👨‍💻 Development

### 📟 Development Commands

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

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests
npm run test:integration # Run integration tests
npm run test:e2e        # Run end-to-end tests
npm run type-check      # Check TypeScript types

# Linting and Formatting
npm run lint            # Run ESLint on all TypeScript files
npm run lint:fix        # Fix automatically fixable issues
npm run format          # Format code with Prettier

# Database
npm run db:migrate      # Run database migrations
npm run db:rollback     # Rollback the last migration
npm run db:reset        # Reset and recreate the database
npm run db:seed         # Seed the database with sample data
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
│   │   ├── components/     # React components
│   │   ├── contexts/       # React contexts
│   │   ├── config/         # Frontend configuration
│   │   ├── helpers/        # Helper functions
│   │   ├── hooks/          # Custom React hooks
│   │   ├── layouts/        # Layout components
│   │   ├── public/         # Public assets
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
│   │   │   ├── auth/       # Authentication module
│   │   │   ├── sessions/   # Session management
│   │   │   ├── users/      # User management
│   │   │   └── preferences/# User preferences
│   │   │
│   │   ├── infrastructure/ # Cross-cutting concerns
│   │   │   ├── auth/       # Authentication services
│   │   │   ├── cache/      # Caching mechanisms
│   │   │   ├── config/     # Server configuration
│   │   │   ├── database/   # Database connectivity
│   │   │   ├── di/         # Dependency injection
│   │   │   ├── errors/     # Error handling
│   │   │   ├── files/      # File management
│   │   │   ├── jobs/       # Background jobs
│   │   │   ├── lifecycle/  # Application lifecycle
│   │   │   ├── logging/    # Logging services
│   │   │   ├── middleware/ # HTTP middleware
│   │   │   ├── processor/  # Data processors
│   │   │   ├── promises/   # Promise utilities
│   │   │   ├── pubsub/     # Pub/Sub system
│   │   │   ├── queue/      # Task queues
│   │   │   ├── security/   # Security features
│   │   │   ├── server/     # Server components
│   │   │   ├── storage/    # Storage services
│   │   │   └── utils/      # Utility services
│   │   │
│   │   ├── shared/         # Shared code within server
│   │   ├── cpp/            # C++ bindings
│   │   ├── index.ts        # Server entry point
│   │   └── README.md       # Server documentation
│   │
│   ├── tools/              # Development tools
│   └── tests/              # Test suite
│
├── docs/                   # Documentation
│   ├── architecture/       # Architecture documentation
│   ├── api/                # API documentation
│   ├── development/        # Development guides
│   ├── security/           # Security guidelines
│   └── adr/                # Architecture Decision Records
│
├── .env.development        # Development environment variables
├── .env.production         # Production environment variables
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
