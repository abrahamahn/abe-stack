# 🛠️ Development Environment Setup

This guide will help you set up your local development environment for the ABE Stack project.

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (LTS version, currently 18.x)
- **npm** (8.x+) or **yarn** (1.22+)
- **Git** (2.x+)
- **Docker** and **Docker Compose** (for local services)
- **PostgreSQL** client tools (optional, for direct DB access)
- **Visual Studio Code** (recommended) or your preferred IDE

## 🚀 Quick Start

If you're in a hurry and have Docker installed, you can get started with:

```bash
# Clone the repository
git clone https://github.com/your-org/abe-stack.git
cd abe-stack

# Run the setup script
npm run setup

# Start the development environment
npm run dev
```

The setup script will:

1. Install dependencies
2. Set up environment files
3. Start required Docker containers
4. Initialize the database with sample data
5. Configure your local environment

## 📦 Detailed Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/abe-stack.git
cd abe-stack
```

### 2. Install Dependencies

```bash
# Using npm
npm install

# Or using yarn
yarn install
```

### 3. Configure Environment Variables

```bash
# Copy example environment files
cp .env.example .env.development
cp .env.example .env.test

# Edit the files with your local configuration
# Most defaults should work out of the box
```

Key environment variables to configure:

| Variable       | Description                  | Default                                             |
| -------------- | ---------------------------- | --------------------------------------------------- |
| `PORT`         | API server port              | 3000                                                |
| `DATABASE_URL` | PostgreSQL connection string | postgres://postgres:postgres@localhost:5432/abe_dev |
| `REDIS_URL`    | Redis connection string      | redis://localhost:6379                              |
| `JWT_SECRET`   | Secret for JWT signing       | dev-secret-change-in-production                     |
| `LOG_LEVEL`    | Logging verbosity            | debug                                               |

### 4. Set Up Local Services

We provide Docker Compose for easy local development:

```bash
# Start all required services (PostgreSQL, Redis, etc.)
docker-compose up -d

# You can also start specific services
docker-compose up -d postgres redis
```

Alternatively, if you prefer to use locally installed services:

- Ensure PostgreSQL is running on port 5432
- Ensure Redis is running on port 6379
- Create a database named `abe_dev`

### 5. Initialize the Database

```bash
# Run database migrations
npm run db:migrate

# Seed the database with sample data (optional)
npm run db:seed
```

### 6. Start the Development Server

```bash
# Start the backend development server
npm run dev:server

# In another terminal, start the frontend development server
npm run dev:client

# Or start both concurrently
npm run dev
```

## 🧪 Verify Your Setup

After starting the development servers, verify that everything is working:

1. Backend API should be running at http://localhost:8080/api
2. Frontend development server should be at http://localhost:5173
3. API documentation is available at http://localhost:8080/api-docs
4. Health check endpoint at http://localhost:3000/health should return status "ok"

## 🔧 Common Issues and Solutions

### Database Connection Errors

If you encounter database connection issues:

```bash
# Check if PostgreSQL container is running
docker-compose ps

# View PostgreSQL logs
docker-compose logs postgres

# Try connecting manually to verify credentials
psql postgres://postgres:postgres@localhost:5432/abe_dev
```

### Node.js and npm Issues

```bash
# Verify Node.js version
node --version

# Clear npm cache if needed
npm cache clean --force

# If you have nvm installed, use project's node version
nvm use
```

### Docker Issues

```bash
# Restart Docker containers
docker-compose down
docker-compose up -d

# Check container status
docker-compose ps

# Reset everything and start fresh
docker-compose down -v
docker-compose up -d
```

## 💻 Development Workflow

Once your environment is set up, here's a typical development workflow:

1. Pull the latest changes: `git pull origin main`
2. Install any new dependencies: `npm install`
3. Run any new migrations: `npm run db:migrate`
4. Start the development servers: `npm run dev`
5. Create a feature branch: `git checkout -b feature/your-feature-name`
6. Make your changes and write tests
7. Run tests to verify: `npm test`
8. Commit and push your changes
9. Create a pull request

## 🧰 Useful Commands

```bash
# Run tests
npm test                  # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests only
npm run test:e2e          # Run end-to-end tests

# Database operations
npm run db:migrate        # Run pending migrations
npm run db:rollback       # Rollback the last migration
npm run db:reset          # Reset and recreate the database
npm run db:seed           # Seed the database with sample data

# Code quality
npm run lint              # Run linting
npm run lint:fix          # Fix linting issues automatically
npm run format            # Format code with Prettier

# Build for production
npm run build             # Build the entire application
npm run build:server      # Build only the server
npm run build:client      # Build only the client

# Other utilities
npm run docs              # Generate API documentation
npm run clean             # Clean build artifacts
```

## 📚 Further Reading

- [Architecture Overview](../architecture/overview.md) - System architecture details
- [Technology Stack](../adr/0001-tech-stack-selection.md) - Details about our technology choices
