# ABE Stack

> A modern TypeScript React boilerplate optimized for social media and multimedia applications

_Based on [Chet Stack](https://github.com/ccorcos/chet-stack) by Chet Corcos_

ABE Stack is a comprehensive boilerplate for building full-stack web applications with a focus on social media features and multimedia streaming. It provides everything you need to get started quickly while remaining flexible enough to scale as your application grows.

## Features

- **Modern Tech Stack**: React 19, TypeScript, Vite, Express, PostgreSQL
- **Authentication System**: Complete JWT-based authentication with login, registration, and session management
- **Theme Support**: Light/dark mode with system preference detection
- **Media Handling**: Built-in support for media uploads, processing, and streaming
- **Social Features**: User profiles, posts, comments, and notifications
- **Real-time Updates**: WebSocket-based pubsub system for live data
- **Background Processing**: Task queue for handling async operations
- **Responsive UI**: Component library with mobile-first design
- **End-to-End Testing**: Browser testing with Playwright
- **Three Processes**: Three processes run at once for easy development
- **Scalable Architecture**: Designed to break into microservices when needed

## Database Layer

ABE Stack implements a robust database layer following the Repository pattern:

- **Domain Models**: Comprehensive domain models with validation and business logic
- **Repositories**: Specialized repositories for each domain entity providing CRUD operations
- **Transaction Support**: Built-in transaction handling for complex operations
- **Migration System**: Structured database migrations for version control
- **Seeding**: Database seeding for development and testing

The database layer includes repositories for:
- **Auth**: User, Role, Permission, Token management
- **Social**: Posts, Comments, Likes, Follows, Bookmarks, Notifications
- **Media**: Media files, Collections, Tags
- **Community**: Groups, Memberships
- **Messaging**: Conversations, Messages
- **Moderation**: Content reports, Moderation actions

## Services Layer

The services layer encapsulates business logic and orchestrates operations across multiple repositories:

- **Auth Services**: Authentication, authorization, and user management
- **Social Services**: Post creation, social interactions, content discovery
- **Media Services**: Media processing, storage, and delivery
- **Community Services**: Group management and interactions
- **Messaging Services**: Conversation and message handling
- **Moderation Services**: Content moderation workflows
- **Notification Services**: Event-based notification system
- **Analytics Services**: User activity tracking and analytics

Each service follows SOLID principles and includes:
- Proper TypeScript typing
- Comprehensive error handling
- Input validation
- Transaction management
- Logging
- Testability

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### PostgreSQL Setup

Before running the application, you need to set up PostgreSQL:

1. **Install PostgreSQL** if you haven't already:

   - [Download PostgreSQL](https://www.postgresql.org/download/)
   - Follow the installation instructions for your operating system
   - Make sure the PostgreSQL service is running

2. **Default Connection Settings**:

   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: `postgres` (default password, change if needed)
   - Database: `abe_stack` (will be created by the seed script)

3. **Create the Database**:
   You don't need to manually create the database. The seed script will create it for you if it doesn't exist.

### Installation

```sh
# Clone the repository
git clone https://github.com/YOUR-USERNAME/abe-stack.git project
cd project

# Install dependencies
npm install

# Set up environment configuration
# The application uses environment-specific configuration files:
# - .env.development for development mode
# - .env.production for production mode
# Default files are provided, but you can customize them as needed

# Create and seed the database with demo data
npm run seed:demo

# Start the development server
npm run dev
```

The application will be available at:

- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

### Environment Configuration

The application uses environment-specific configuration files:

1. `.env.development` - Used when running in development mode
2. `.env.production` - Used when running in production mode

These files contain configuration for:

- Database connection settings
- JWT secrets
- Server configuration
- Email settings
- File storage settings

You can customize these files to match your environment. The application will automatically load the appropriate file based on the `NODE_ENV` environment variable.

### Demo Database

The seed script creates a database with sample data for demonstration purposes:

```sh
# Create a database with sample users, posts, comments, and likes
npm run seed:demo
```

This will:

1. Create a PostgreSQL database named `abe_stack`
2. Run all migrations to set up the database schema
3. Insert 5 demo user accounts with the following credentials:
   - Username: `johndoe`, Password: `password123`, Role: `user`
   - Username: `janedoe`, Password: `password123`, Role: `user`
   - Username: `alexsmith`, Password: `password123`, Role: `user`
   - Username: `sarahwilson`, Password: `password123`, Role: `user`
   - Username: `admin`, Password: `admin123`, Role: `admin`
4. Create sample posts, comments, likes, and follow relationships

#### Custom Database Connection Settings

If your PostgreSQL setup uses different credentials, you can specify them using environment variables:

**Windows PowerShell:**

```sh
$env:DB_HOST="your_host"; $env:DB_PORT="your_port"; $env:DB_USER="your_username"; $env:DB_PASSWORD="your_password"; npm run seed:demo
```

**Windows Command Prompt:**

```sh
set DB_HOST=your_host && set DB_PORT=your_port && set DB_USER=your_username && set DB_PASSWORD=your_password && npm run seed:demo
```

**Linux/macOS:**

```sh
DB_HOST=your_host DB_PORT=your_port DB_USER=your_username DB_PASSWORD=your_password npm run seed:demo
```

#### Fallback Mode

If PostgreSQL is not available or the connection fails, the application will automatically fall back to an in-memory database for development purposes. This allows you to run the application without PostgreSQL, but with limited functionality.

## Development Commands

```sh
# Start development servers
npm run dev             # Start both client and server in development mode
npm run dev:client      # Start just the Vite frontend
npm run dev:server      # Start just the backend

# Building
npm run build           # Build both client and server
npm run build:client    # Build just the client
npm run build:server    # Build just the server

# Production
npm run start           # Start the production server
npm run start:dev       # Start the development server with hot reloading

# Testing
npm run test            # Run all tests
npm run type-check      # Check TypeScript types
npm run type-check:watch # Watch for TypeScript type errors

# Linting
npm run lint            # Run ESLint on all TypeScript files
npm run lint:server     # Run ESLint on server files only
npm run lint:client     # Run ESLint on client files only
npm run lint:fix        # Run ESLint with automatic fixing
npm run lint:server:fix # Fix linting issues in server files
npm run lint:client:fix # Fix linting issues in client files
npm run lint:count      # Count linting errors and warnings
npm run lint:staged     # Run linting on staged files (used by husky)

# Formatting
npm run format          # Format code with Prettier
npm run format:check    # Check formatting without changing files

# Type checking
npm run check:all       # Run all checks (linting and type checking)
npm run check:watch     # Watch for linting and type errors
npm run fix:types       # Run the type error fixer script

# Database
npm run seed:demo       # Create and seed the database with demo data
npm run db:clear        # Clear all data from the database while preserving schema
npm run migrate         # Run database migrations
npm run migrate:create  # Create a new migration
npm run migrate:rollback # Rollback the last migration
```

### Database Commands Explained

#### Seeding the Database

The `seed:demo` command:

1. Connects to PostgreSQL using environment variables from either `.env.development` or `.env.production`
2. Creates the database if it doesn't exist
3. Runs a series of SQL scripts to:
   - Create the database schema
   - Seed the database with sample users, posts, comments, etc.

Example:

```sh
# With default settings
npm run seed:demo

# With custom database connection
DB_HOST=myhost DB_PORT=5433 DB_USER=myuser DB_PASSWORD=mypassword npm run seed:demo
```

#### Clearing the Database

The `db:clear` command:

1. Connects to PostgreSQL using the same environment variables as `seed:demo`
2. Temporarily disables foreign key constraints
3. Truncates all tables in the database (except migrations)
4. Re-enables foreign key constraints

This is useful for resetting the database to a clean state without losing the schema.

Example:

```sh
# Clear all data with default settings
npm run db:clear

# With custom database connection
DB_HOST=myhost DB_PORT=5433 DB_USER=myuser DB_PASSWORD=mypassword npm run db:clear
```

## Code Quality

### ESLint Configuration

The project uses ESLint to enforce code quality and consistency. The configuration includes:

- TypeScript-specific rules
- React and React Hooks rules
- Import order and module resolution rules
- Different rule sets for frontend and backend code

ESLint runs automatically during development (via `npm run dev`) and checks for errors during the build process. You can also run it manually:

```sh
# Check all files
npm run lint

# Fix automatically fixable issues
npm run lint:fix
```

To customize the ESLint configuration, edit the `.eslintrc.js` file in the project root.

## Environment Variables

The application can be configured using the following environment variables:

### Server Environment Variables

| Variable       | Description                                | Default                                                  |
| -------------- | ------------------------------------------ | -------------------------------------------------------- |
| `NODE_ENV`     | Environment mode (development, production) | `development`                                            |
| `PORT`         | Server port                                | `8080`                                                   |
| `DATABASE_URL` | PostgreSQL connection string               | `postgresql://postgres:1083035@localhost:5432/abe_stack` |
| `DB_HOST`      | PostgreSQL host                            | `localhost`                                              |
| `DB_PORT`      | PostgreSQL port                            | `5432`                                                   |
| `DB_USER`      | PostgreSQL username                        | `postgres`                                               |
| `DB_PASSWORD`  | PostgreSQL password                        | `1083035`                                                |
| `DB_NAME`      | PostgreSQL database name                   | `abe_stack`                                              |
| `JWT_SECRET`   | Secret for JWT tokens                      | `your-secret-key`                                        |
| `CORS_ORIGIN`  | CORS allowed origins (comma-separated)     | `*`                                                      |
| `UPLOAD_DIR`   | Directory for file uploads                 | `./uploads`                                              |

### Client Environment Variables

| Variable  | Description      | Default                  |
| --------- | ---------------- | ------------------------ |
| `API_URL` | API endpoint URL | `/api`                   |
| `WS_URL`  | WebSocket URL    | `ws://localhost:8080/ws` |

## Deployment

### Deploying to a VPS or Dedicated Server

1. **Prepare your server**:

   - Install Node.js, npm, and PostgreSQL
   - Set up a PostgreSQL database

2. **Clone and build the application**:

   ```sh
   git clone https://github.com/YOUR-USERNAME/abe-stack.git
   cd abe-stack
   npm install
   npm run build
   ```

3. **Set environment variables**:
   Create a `.env` file in the root directory with your production settings:

   ```
   NODE_ENV=production
   PORT=8080
   DATABASE_URL=postgresql://username:password@localhost:5432/abe_stack
   JWT_SECRET=your-secure-secret-key
   CORS_ORIGIN=https://yourdomain.com
   ```

4. **Start the application**:

   ```sh
   npm run start
   ```

5. **Set up a process manager** (recommended):
   Use PM2 to keep your application running:

   ```sh
   npm install -g pm2
   pm2 start dist/server/index.js --name abe-stack
   pm2 save
   pm2 startup
   ```

6. **Set up a reverse proxy** (recommended):
   Configure Nginx or Apache to proxy requests to your Node.js application and serve static files.

### Deploying to a PaaS (Heroku, Render, etc.)

1. **Create a new application** on your chosen platform

2. **Configure environment variables** in the platform's dashboard

3. **Deploy the application**:

   - Connect your GitHub repository, or
   - Use the platform's CLI tools to deploy

4. **Set up a PostgreSQL database**:
   - Use the platform's database add-on or
   - Connect to an external PostgreSQL service

## Application Structure

```
.
├── src/                    # Source code
│   ├── client/             # Frontend React application
│   │   ├── components/     # React components
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
│   │   ├── api/            # API-related code
│   │   │   ├── controllers/# Request controllers
│   │   │   ├── dtos/       # Data transfer objects
│   │   │   ├── middleware/ # API-specific middleware
│   │   │   ├── routes/     # API routes definitions
│   │   │   └── validators/ # Request validators
│   │   │
│   │   ├── core/           # Core server functionality
│   │   │
│   │   ├── database/       # Database layer
│   │   │   ├── models/     # Domain models with validation logic
│   │   │   ├── repositories/# Repository implementations
│   │   │   │   ├── auth/   # Auth repositories (User, Role, etc.)
│   │   │   │   ├── social/ # Social repositories (Post, Comment, etc.)
│   │   │   │   ├── media/  # Media repositories (Media, Collection, etc.)
│   │   │   │   ├── messaging/# Messaging repositories (Conversation, Message, etc.)
│   │   │   │   ├── community/# Community repositories (Group, GroupMember, etc.)
│   │   │   │   ├── moderation/# Moderation repositories (ContentReport, etc.)
│   │   │   │   ├── analytics/# Analytics repositories (ActivityLog, etc.)
│   │   │   │   └── discovery/# Discovery repositories (SearchIndex, etc.)
│   │   │   ├── migrations/ # Database migrations
│   │   │   ├── seeds/      # Seed data for development and testing
│   │   │   └── transactions/# Transaction handling
│   │   │
│   │   ├── services/       # Business logic layer
│   │   │   ├── app/        # Application services
│   │   │   ├── shared/     # Shared service utilities
│   │   │   └── dev/        # Development utilities
│   │   │
│   │   ├── config/         # Server configuration
│   │   ├── shared/         # Shared server utilities
│   │   └── utils/          # Server utilities
│   │
│   ├── shared/             # Shared code between client and server
│   │   └── utils/          # Shared utility functions
│   │
│   ├── tools/              # Development and build tools
│   │
│   └── types/              # TypeScript type definitions
│
├── dist/                   # Compiled output
├── docs/                   # Documentation
│   └── server/             # Server documentation
│       ├── database/       # Database layer documentation
│       └── services/       # Services layer documentation
│
├── uploads/                # File uploads directory
├── node_modules/           # Dependencies
├── .env.development        # Development environment variables
├── .env.production         # Production environment variables
└── package.json            # Project manifest
```

### Key Components

#### Database Layer

The database layer follows the Repository pattern with a clear separation between domain models and data access:

- **Models**: Define data structure, validation rules, and business logic
- **Repositories**: Handle database operations (CRUD) with transaction support
- **Migrations**: Manage database schema changes with versioning
- **Seeds**: Provide sample data for development and testing
- **Transactions**: Support atomic operations across multiple repositories

#### Services Layer

The services layer orchestrates business operations and provides an abstraction over repositories:

- **Application Services**: Implement domain-specific business logic
- **Authentication Services**: Handle user authentication and authorization
- **Media Services**: Process and manage multimedia content
- **Social Services**: Implement social media interactions
- **Notification Services**: Manage user notifications
- **Caching Services**: Optimize performance through caching

#### API Layer

The API layer exposes services through HTTP endpoints:

- **Controllers**: Handle HTTP requests and responses
- **Routes**: Define API endpoints and map to controllers
- **Middleware**: Process requests (authentication, rate limiting, etc.)
- **Validators**: Validate request data
- **DTOs**: Define data structures for API requests/responses

## Key Features Explained

### Authentication

The application includes a complete authentication system with:

- User registration and login
- JWT-based authentication with secure cookie storage
- Password hashing with bcrypt
- Session management

### Theme Support

The application supports light and dark themes with:

- User preference storage
- System preference detection
- Real-time theme switching

### Media Handling

Built-in support for:

- File uploads with multer
- Image processing with sharp
- Video streaming with HLS
- Audio metadata extraction

### Social Features

Ready-to-use social media features:

- User profiles
- Posts and comments
- Likes and shares
- Notifications

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

[MIT](LICENSE)