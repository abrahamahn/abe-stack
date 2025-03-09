# ABE Stack - TypeScript React Boilerplate

*Based on [Chet Stack](https://github.com/ccorcos/chet-stack) by Chet Corcos. Optimized for social media and multimedia streaming applications.*

## Overview

ABE Stack is a modern, TypeScript-based full-stack boilerplate for building web applications. It features a React frontend with Vite for development, an Express backend, PostgreSQL for database storage with raw SQL queries for optimal performance, and WebSockets for real-time communication. This version has been specifically optimized for social media platforms and multimedia streaming applications, with built-in support for media uploads, streaming, and user authentication.

The original foundation comes from [Chet Stack](https://github.com/ccorcos/chet-stack) created by Chet Corcos, which has been extended with additional features and migrated to use Vite and modern tooling.

## Organization

This is a monorepo with client code in `src/client`, server code in `src/server`, and shared code in `src/shared`. The tools directory contains scripts for building, resetting, and other utilities.

The code is organized so that no files produce side-effects when imported except for the entry files: `src/server/server.ts` and `src/client/index.tsx`. All side-effects (including state) begin from these entry files and are bundled into an `environment` variable that gets passed throughout the application for dependency injection.

## Directory Structure

```
db                   # Database files and migrations
  ├── migrations     # SQL migration files
  └── seeds          # Database seed files
node_modules         # Dependencies
public               # Static files
public/service-worker.js
src
  ├── client         # Frontend code
  │   ├── components # React components
  │   ├── helpers    # Utility functions
  │   ├── hooks      # React hooks
  │   ├── services   # Client services
  │   ├── test       # Client tests
  │   ├── index.css  # Global styles
  │   ├── index.html # HTML entry point
  │   ├── index.tsx  # Client entry point
  │   └── service-worker.js
  ├── server         # Backend code
  │   ├── apis       # API endpoints
  │   ├── database   # Database configuration and repositories
  │   ├── helpers    # Server utility functions
  │   ├── models     # Data models
  │   ├── services   # Server services
  │   └── tasks      # Background tasks
  ├── shared         # Shared code between client and server
  ├── tools          # Build and utility scripts
  └── vite-env.d.ts  # Vite type definitions
uploads              # Uploaded files
```

## Build System

The project uses Vite for frontend development and TSX for running the backend:

```bash
# Start development environment
npm run start         # Runs both client (Vite) and server (TSX)
npm run dev:client    # Start just the Vite frontend server
npm run dev:server    # Start just the backend server

# Build for production
npm run build         # Build both client and server for production
npm run build:client  # Build just the client
npm run build:server  # Build just the server

# Testing
npm run test          # Run all tests
npm run test:unit     # Run unit tests
npm run test:e2e      # Run end-to-end tests

# Database
npm run db:migrate    # Run database migrations
npm run db:rollback   # Rollback last migration
npm run db:seed      # Seed the database
npm run db:reset     # Reset and reseed the database
```

## Backend Overview

The `server.ts` handles everything in a single process. Key components include:

- **Express**: Handles HTTP requests
- **Helmet**: Provides security defaults including CORS
- **Morgan**: For request logging
- **PostgreSQL**: Database for data persistence using raw SQL for optimal performance
- **WebSockets**: For real-time communication

All these components are bundled together into an `environment` object which is passed throughout the application, providing dependency injection and avoiding circular imports.

### Server Components

- **ServerConfig**: Configuration settings from environment variables
- **Database**: Connection pool and transaction management for PostgreSQL
- **QueueDatabase**: Handles background tasks
- **WebsocketPubsubClient**: Manages real-time communication
- **ApiServer**: Serves the frontend assets and API endpoints
- **FileServer**: Handles file uploads and serves media files
- **QueueServer**: Executes background jobs

### Database Access

The application uses raw SQL queries with the `pg` package for optimal performance:
- Models are defined in `src/server/models` with their own repositories
- Connection setup is in `src/server/database/config.ts`
- Migrations are plain SQL files in `db/migrations`
- Each model has its own repository class for database operations
- Transactions are handled using the `withTransaction` helper
- Connection pooling is configured for optimal performance

### API System

API endpoints are organized in the `src/server/apis` directory. Each API file exports:
- `input`: Type validation for request data using `data-type-ts`
- `handler`: The function that processes the request and returns a response

## Frontend

The frontend starts at `src/client/index.html` which references `index.css` and `index.tsx`. The application uses:

- **React**: For UI components
- **Vite**: For fast development and optimized production builds
- **CSS Variables**: For theming with dark mode support
- **ClientEnvironment**: For dependency injection

### Key Frontend Components

- **Router**: Manages client-side HTML5 routing
- **API Client**: Proxy for making API calls to the backend
- **WebsocketPubsubClient**: Connects to the server for real-time updates
- **UI Components**: Reusable interface elements like Button, ListBox, ComboBox, etc.

## Authentication

Authentication is implemented using:
- Password hashing with bcrypt
- JWT for token-based auth
- HTTP-only cookies for secure storage
- Two-factor authentication support

## Media Handling

The application includes enhanced support for multimedia content:
- File uploads with Multer for images, audio, and video content
- Media streaming with proper range request support for audio/video playback
- Content type detection and format handling
- Media metadata extraction (for audio/video files)
- Responsive media components for various screen sizes

## Development Workflow

1. Start the development servers with `npm run start`
2. Access the frontend at `http://localhost:3000`
3. The backend API is available at `http://localhost:8080`
4. Create or modify API endpoints in `src/server/apis`
5. Create or modify React components in `src/client/components`
6. Add database migrations in `db/migrations`

## Testing

There are two kinds of tests:

- **Unit tests**: Any file ending in `.test.ts` using Vitest
- **End-to-end tests**: Any file ending in `.e2e.ts` using Playwright

## Deployment

To deploy:

1. Set up a server with Node.js and PostgreSQL
2. Clone the repository and install dependencies
3. Set up environment variables
4. Run database migrations with `npm run db:migrate`
5. Build the application with `npm run build`
6. Start the server with `NODE_ENV=production node dist/server.js`

## Design Philosophy

The ABE Stack follows these principles:

1. **Performance First**: Raw SQL queries for optimal database performance
2. **Type Safety**: Comprehensive TypeScript types throughout the stack
3. **Modularity**: Components should be decoupled and replaceable
4. **Simplicity**: Keep things as simple as possible
5. **Security**: Follow best practices for authentication and data protection
6. **Media-Focused**: Optimized for media streaming and social interactions
7. **Real-Time**: Built-in support for real-time updates and notifications

## Scaling Considerations

As your application grows, consider:

- Implementing connection pooling strategies
- Using prepared statements for frequent queries
- Setting up database replication
- Implementing proper database indexing
- Setting up load balancing
- Implementing proper monitoring and logging

## Future Improvements

Planned improvements include:
- Enhanced database migration system
- Query performance monitoring
- Enhanced UI component library
- Improved documentation and examples
- Docker containerization support
- CI/CD pipeline integration