# ABE Stack

> A modern TypeScript React boilerplate optimized for social media and multimedia applications

*Based on [Chet Stack](https://github.com/ccorcos/chet-stack) by Chet Corcos*

ABE Stack is a comprehensive boilerplate for building full-stack web applications with a focus on social media features and multimedia streaming. It provides everything you need to get started quickly while remaining flexible enough to scale as your application grows.

## Features

- **Modern Tech Stack**: React, TypeScript, Vite, Express, PostgreSQL
- **Media Optimized**: Built-in support for media uploads and streaming
- **Authentication**: JWT-based auth with secure cookie storage
- **Real-time Updates**: WebSocket-based pubsub system
- **Background Processing**: Task queue for handling async operations
- **Responsive UI**: Component library with dark mode support
- **End-to-End Testing**: Browser testing with Playwright
- **Single Process**: Everything runs in one process for easy development
- **Scalable Architecture**: Designed to break into microservices when needed

## Getting Started

```sh
git clone https://github.com/YOUR-USERNAME/abe-stack.git project
cd project
npm install
npm run start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8080

## Development Commands

```sh
# Start development servers
npm run start           # Start both client and server
npm run dev:client      # Start just the Vite frontend
npm run dev:server      # Start just the backend

# Building
npm run build           # Build both client and server
npm run build:client    # Build just the client
npm run build:server    # Build just the server

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests with Vitest
npm run test:e2e        # Run end-to-end tests with Playwright

# Utilities
npm run typecheck       # Check TypeScript types
npm run reset           # Reset database
```

## PostgreSQL Setup

This boilerplate requires PostgreSQL for data storage. Make sure you have PostgreSQL installed and running locally before starting development.

Default connection settings:
- Host: localhost
- Port: 5432
- Username: postgres
- Password: postgres
- Database: abe_stack

You can customize these settings through environment variables.

## Project Structure

```
src/
├── client/          # Frontend React application
├── server/          # Backend Express server
├── shared/          # Shared code and types
└── tools/           # Build and utility scripts
```

## Documentation

For more detailed documentation, please see [DOCS.md](./DOCS.md).

## Credits

This project is based on [Chet Stack](https://github.com/ccorcos/chet-stack) by Chet Corcos, which provided the core architecture and inspiration. ABE Stack extends this foundation with enhanced multimedia capabilities and modern tooling.

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## License

[MIT](LICENSE)