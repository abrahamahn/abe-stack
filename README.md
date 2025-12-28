# ABE Stack

> A modern, production-ready PERN stack monorepo boilerplate for rapid cross-platform development

## Overview

ABE Stack is a comprehensive TypeScript monorepo boilerplate designed for developers who need to quickly start building full-stack applications with shared infrastructure across web, desktop, and mobile platforms. Built on the PERN stack (PostgreSQL, Express/Fastify, React, Node.js), it provides a solid foundation with essential features like authentication, database management, and cross-platform UI components.

### Design Principles

- **Framework Independence**: React as a renderer (inspired by Notion's architecture) - business logic remains framework-agnostic
- **Pure TypeScript**: End-to-end type safety across all platforms
- **Minimal but Purposeful**: Every package serves a clear purpose - no bloat
- **Optimized DX**: Carefully crafted folder structures, dev tooling, and build processes
- **Production Ready**: Complete infrastructure with auth, database, and shared utilities

## Features

- **Cross-Platform**: Single codebase shared across web, desktop (Electron/Tauri), and mobile (React Native)
- **Monorepo Architecture**: Turborepo + pnpm workspaces for optimal build caching and dependency management
- **Flexible Backend**: Framework adapter pattern supporting both Express and Fastify
- **Type-Safe Database**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Authentication**: JWT-based auth system with bcrypt password hashing
- **Dependency Injection**: Inversify-based DI container for clean architecture
- **Shared Packages**: Reusable UI components, API client, and utilities across all platforms
- **Modern Tooling**: ESLint, Prettier, TypeScript, Vitest, Playwright
- **Git Hooks**: Pre-commit and pre-push hooks for code quality enforcement

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Frameworks**: Express 5 / Fastify 5 (adapter pattern)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: JWT + bcrypt
- **Validation**: Zod
- **DI**: Inversify with reflect-metadata
- **Caching**: Redis support
- **Testing**: Vitest + Supertest

### Frontend
- **Web**: React 18+ with Vite
- **Desktop**: Electron (with optional Tauri support)
- **Mobile**: React Native 0.76+
- **UI**: Shared component library
- **API Client**: Type-safe shared API client

### Shared Packages
- `@abe-stack/shared` - Common types, utilities, and business logic
- `@abe-stack/ui` - Cross-platform UI components
- `@abe-stack/api-client` - Type-safe API client

### DevOps
- **Monorepo**: Turborepo with pnpm workspaces
- **CI/CD**: GitHub Actions ready
- **Containerization**: Docker & Docker Compose
- **Code Quality**: ESLint, Prettier, TypeScript, lint-staged

## Quick Start

### Prerequisites

- Node.js >= 18.19 (< 25)
- pnpm >= 9.0.0
- PostgreSQL >= 14
- Docker (optional, recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url> my-project
   cd my-project
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   # Server/shared config (if not already present)
   cp config/env/.env.example config/env/.env.development

   # App-specific config (for apps you're developing)
   cp apps/web/.env.example apps/web/.env.local
   cp apps/desktop/.env.example apps/desktop/.env.local
   cp apps/mobile/.env.example apps/mobile/.env.local

   # Edit config/env/.env.development for database and backend settings
   # Edit apps/*/.env.local for app-specific API URLs
   ```

4. **Set up the database**
   ```bash
   # Generate database schema
   pnpm --filter @abe-stack/server db:generate

   # Push schema to database
   pnpm --filter @abe-stack/server db:push

   # Seed initial data (optional)
   pnpm --filter @abe-stack/server db:seed
   ```

5. **Start development**
   ```bash
   # Start all applications
   pnpm dev

   # Or start individually
   pnpm dev:web      # Web app on http://localhost:5173
   pnpm dev:server   # Express server on http://localhost:8080
   pnpm dev:desktop  # Desktop app
   pnpm dev:mobile   # Mobile app (requires Expo Go or emulator)
   ```

### Docker Setup (Recommended)

```bash
# Start all services with Docker Compose
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop services
docker-compose down
```

## Project Structure

```
abe-stack-main/
├── apps/
│   ├── web/                    # React web application (Vite)
│   │   ├── src/
│   │   │   ├── components/     # React components
│   │   │   ├── pages/          # Page components
│   │   │   ├── hooks/          # Custom hooks
│   │   │   └── utils/          # Utilities
│   │   ├── public/             # Static assets
│   │   └── package.json
│   │
│   ├── desktop/                # Electron desktop application
│   │   ├── src/
│   │   ├── electron/           # Electron main process
│   │   └── package.json
│   │
│   ├── mobile/                 # React Native mobile app
│   │   ├── src/
│   │   ├── android/            # Android native code
│   │   ├── ios/                # iOS native code
│   │   └── package.json
│   │
│   └── server/                 # Node.js backend server
│       ├── src/
│       │   ├── adapters/       # Framework adapters (Express/Fastify)
│       │   ├── infrastructure/ # Core infrastructure
│       │   │   ├── database/   # Database connection & migrations
│       │   │   ├── di/         # Dependency injection
│       │   │   ├── config/     # Configuration management
│       │   │   └── ...
│       │   ├── modules/        # Business logic modules
│       │   │   ├── auth/       # Authentication
│       │   │   ├── users/      # User management
│       │   │   └── ...
│       │   ├── fastify/        # Fastify server entry
│       │   ├── scripts/        # Utility scripts (seed, health check)
│       │   └── index.ts        # Express server entry
│       └── package.json
│
├── packages/
│   ├── shared/                 # Shared types and utilities
│   │   ├── src/
│   │   │   ├── types/          # TypeScript types
│   │   │   ├── utils/          # Shared utilities
│   │   │   └── constants/      # Shared constants
│   │   └── package.json
│   │
│   ├── ui/                     # Shared UI component library
│   │   ├── src/
│   │   │   ├── components/     # Reusable components
│   │   │   ├── hooks/          # Reusable hooks
│   │   │   └── styles/         # Shared styles
│   │   └── package.json
│   │
│   └── api-client/             # Type-safe API client
│       ├── src/
│       │   ├── client/         # HTTP client
│       │   ├── endpoints/      # API endpoints
│       │   └── types/          # API types
│       └── package.json
│
├── config/                     # Build and configuration files
├── docs/                       # Documentation
│   ├── api/                    # API documentation
│   ├── architecture.md         # Architecture overview
│   ├── development.md          # Development guide
│   └── security.md             # Security guidelines
│
├── tools/                      # Development tools and scripts
├── .github/                    # GitHub Actions workflows
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # pnpm workspace configuration
└── package.json                # Root package.json
```

## Development

### Available Commands

#### Root-Level Commands

```bash
# Development
pnpm dev              # Start all apps in development mode
pnpm dev:web          # Start web app only
pnpm dev:server       # Start backend server only
pnpm dev:desktop      # Start desktop app only
pnpm dev:mobile       # Start mobile app only

# Building
pnpm build            # Build all packages and apps
pnpm build:web        # Build web app only
pnpm build:server     # Build server only
pnpm build:desktop    # Build desktop app only
pnpm build:shared     # Build shared package only
pnpm build:ui         # Build UI package only

# Testing
pnpm test             # Run all tests
pnpm test:web         # Run web app tests
pnpm test:server      # Run server tests
pnpm test:desktop     # Run desktop tests
pnpm test:coverage    # Run tests with coverage

# Code Quality
pnpm lint             # Lint all packages
pnpm lint:fix         # Fix linting issues
pnpm type-check       # Type check all packages
pnpm format           # Format code with Prettier
pnpm format:check     # Check code formatting

# Utilities
pnpm clean            # Clean all build artifacts and node_modules
pnpm clean:build      # Clean dist folders only
pnpm ports:check      # Check if dev ports are available
pnpm setup            # Interactive project setup
```

#### Server-Specific Commands

```bash
# Database
pnpm --filter @abe-stack/server db:generate   # Generate migrations
pnpm --filter @abe-stack/server db:push       # Push schema to database
pnpm --filter @abe-stack/server db:studio     # Open Drizzle Studio
pnpm --filter @abe-stack/server db:check      # Check database health
pnpm --filter @abe-stack/server db:seed       # Seed database with initial data

# Development
pnpm --filter @abe-stack/server dev           # Start Express server
pnpm --filter @abe-stack/server dev:fastify   # Start Fastify server

# Testing
pnpm --filter @abe-stack/server test              # Run unit tests
pnpm --filter @abe-stack/server test:integration  # Run integration tests
pnpm --filter @abe-stack/server test:watch        # Run tests in watch mode
```

### Development Workflow

1. **Start development servers**
   ```bash
   pnpm dev
   ```

2. **Make changes** in your preferred app or package

3. **Changes are auto-detected** - Turborepo handles incremental builds and hot reloading

4. **Run tests**
   ```bash
   pnpm test
   ```

5. **Before committing**
   - Code is automatically formatted and linted via git hooks
   - Pre-commit: Prettier formatting check
   - Pre-push: Lint and type-check

### Environment Variables

ABE Stack uses a **hybrid environment configuration approach** for optimal organization:

#### Shared/Server Configuration (`config/env/`)

Server-side and shared configuration (database, secrets, backend settings):

- `config/env/.env.development` - Development environment
- `config/env/.env.production` - Production environment
- `config/env/.env.example` - Template with all available options

Example (`config/env/.env.development`):

```env
# Database
POSTGRES_DB=abe_stack_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Server
NODE_ENV=development
API_PORT=8080
APP_PORT=3000

# Security
JWT_SECRET=dev_jwt_secret_change_in_production
SESSION_SECRET=dev_session_secret_change_in_production

# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
```

#### App-Specific Configuration (`apps/*/.env.local`)

Each app has its own client-side environment variables:

**Web/Desktop** (Vite - `apps/web/.env.local`, `apps/desktop/.env.local`):
```env
VITE_API_URL=http://localhost:8080/api
VITE_APP_NAME=abe-stack-web
```

**Mobile** (React Native - `apps/mobile/.env.local`):
```env
API_URL=http://localhost:8080/api
APP_NAME=abe-stack-mobile
```

**Setup:**
```bash
# Copy example files for each app you're developing
cp apps/web/.env.example apps/web/.env.local
cp apps/desktop/.env.example apps/desktop/.env.local
cp apps/mobile/.env.example apps/mobile/.env.local
```

> **Note:** `.env.example` files are tracked in git as templates. `.env.local` files are gitignored and contain your actual configuration.

## Architecture

### Framework Adapter Pattern

The backend uses a framework adapter pattern, allowing you to switch between Express and Fastify without changing business logic:

```typescript
// Start with Express (default)
pnpm dev:server

// Or use Fastify
pnpm dev:fastify
```

Both frameworks share:
- Same business logic layer
- Same dependency injection container
- Same middleware/hooks
- Same route handlers (adapted at runtime)

### Dependency Injection

The server uses Inversify for clean dependency management:

```typescript
// Example: Injectable service
@injectable()
class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: IUserRepository,
    @inject(TYPES.HashService) private hashService: IHashService
  ) {}

  async createUser(data: CreateUserDto) {
    // Business logic here
  }
}
```

### Type-Safe Database

Drizzle ORM provides end-to-end type safety:

```typescript
// Define schema
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Use with full type inference
const newUser = await db.insert(users).values({
  email: 'user@example.com',
  passwordHash: await hash(password),
}).returning();
```

### Shared Code

Maximize code reuse across platforms:

```typescript
// packages/shared/src/types/user.ts
export interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Used in web, mobile, desktop, and server
import type { User } from '@abe-stack/shared';
```

## Key Features

### Authentication System

- JWT-based authentication with refresh tokens
- Bcrypt password hashing
- Role-based access control ready
- Session management
- Secure cookie handling

### Database Management

- PostgreSQL with Drizzle ORM
- Type-safe queries and mutations
- Migration system
- Seeding scripts
- Health checks

### Cross-Platform UI

- Shared component library
- Platform-specific optimizations
- Consistent design system
- Responsive layouts

### API Client

- Type-safe API calls
- Automatic error handling
- Request/response interceptors
- Authentication handling

## Testing

```bash
# Run all tests
pnpm test

# Run tests for specific app
pnpm test:web
pnpm test:server
pnpm test:desktop

# Run with coverage
pnpm test:coverage

# Watch mode for development
pnpm --filter @abe-stack/server test:watch
```

## Deployment

### Docker Deployment

```bash
# Build and run with Docker
docker-compose up --build

# Production build
docker build -t abe-stack .
docker run -p 8080:8080 abe-stack
```

### Manual Deployment

```bash
# Build all packages
pnpm build

# Set production environment variables
export NODE_ENV=production
export DATABASE_URL=<production-db-url>

# Run migrations
pnpm --filter @abe-stack/server db:push

# Start server
pnpm --filter @abe-stack/server start
```

## Documentation

Detailed documentation is available in the `/docs` directory:

- [Architecture Overview](docs/architecture.md) - System design and patterns
- [Development Guide](docs/development.md) - Setup and workflows
- [API Documentation](docs/api/overview.md) - API endpoints and usage
- [Security Guidelines](docs/security.md) - Security best practices

## Customization

### Adding New Features

1. **Create module in server**
   ```bash
   apps/server/src/modules/your-feature/
   ```

2. **Add shared types**
   ```bash
   packages/shared/src/types/your-feature.ts
   ```

3. **Create UI components**
   ```bash
   packages/ui/src/components/your-feature/
   ```

4. **Integrate in apps**
   - Web: `apps/web/src/pages/`
   - Mobile: `apps/mobile/src/screens/`
   - Desktop: `apps/desktop/src/pages/`

### Switching Frameworks

To use Fastify instead of Express:

1. Update start script in `apps/server/package.json`
2. Use `pnpm dev:fastify` for development
3. Adapter automatically handles differences

### Adding Platforms

To add new platforms (e.g., Tauri):

1. Create new app: `apps/tauri/`
2. Add to `pnpm-workspace.yaml`
3. Configure in `turbo.json`
4. Share code via packages

## Contributing

Contributions are welcome! This is a boilerplate project designed to be forked and customized for your needs.

## License

MIT License - feel free to use this for your projects.

---

**ABE Stack** - Built for developers who value type safety, code reuse, and rapid development.
