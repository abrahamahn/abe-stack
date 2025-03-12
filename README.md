# ABE Stack

> A modern TypeScript React boilerplate optimized for social media and multimedia applications

*Based on [Chet Stack](https://github.com/ccorcos/chet-stack) by Chet Corcos*

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
- **Single Process**: Everything runs in one process for easy development
- **Scalable Architecture**: Designed to break into microservices when needed

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

### Installation

```sh
# Clone the repository
git clone https://github.com/YOUR-USERNAME/abe-stack.git project
cd project

# Install dependencies
npm install

# Set up the database
# Make sure PostgreSQL is running and create a database named 'abe_stack'
# The default connection settings are:
# - Host: localhost
# - Port: 5432
# - Username: postgres
# - Password: postgres
# - Database: abe_stack

# Start the development server
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

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

# Testing
npm run test            # Run all tests
npm run type-check      # Check TypeScript types
```

## Environment Variables

The application can be configured using the following environment variables:

### Server Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode (development, production) | `development` |
| `PORT` | Server port | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/abe_stack` |
| `JWT_SECRET` | Secret for JWT tokens | `your-secret-key` |
| `CORS_ORIGIN` | CORS allowed origins (comma-separated) | `*` |
| `UPLOAD_DIR` | Directory for file uploads | `./uploads` |

### Client Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_URL` | API endpoint URL | `/api` |
| `WS_URL` | WebSocket URL | `ws://localhost:8080/ws` |

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
src/
├── client/                 # Frontend React application
│   ├── components/         # React components
│   │   ├── auth/           # Authentication components
│   │   ├── layouts/        # Layout components
│   │   ├── pages/          # Page components
│   │   ├── social/         # Social media components
│   │   ├── theme/          # Theme components
│   │   └── ui/             # UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom React hooks
│   ├── services/           # Frontend services
│   └── utils/              # Utility functions
│
├── server/                 # Backend Express server
│   ├── apis/               # API implementations
│   ├── controllers/        # Request controllers
│   ├── database/           # Database setup and migrations
│   ├── middleware/         # Express middleware
│   ├── models/             # Data models
│   ├── routes/             # API routes
│   ├── services/           # Backend services
│   └── utils/              # Utility functions
│
└── shared/                 # Shared code between client and server
    ├── types/              # TypeScript type definitions
    └── utils/              # Shared utility functions
```

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