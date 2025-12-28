# 🚀 Server Entry Point (index.ts)

## 📋 Purpose

The `index.ts` file serves as the main entry point for the server application, responsible for:

- Bootstrapping the application
- Initializing the dependency injection container
- Setting up essential services
- Starting the HTTP server
- Configuring graceful shutdown

This file is the starting point of the application's execution flow and orchestrates the initialization of all required components.

## 🧩 Key Functions

### `initializeServer()`

The core function that handles the server initialization process:

```typescript
export async function initializeServer() {
  try {
    console.log('Starting server initialization...');

    // Get the existing container
    if (!container) {
      throw new Error('DI container not initialized');
    }
    console.log('Container loaded');

    // Initialize logger first
    const logger = container.get<ILoggerService>(TYPES.LoggerService);
    console.log('Logger service initialized');
    logger.info('Logger service initialized successfully');

    // Get config from container
    const configService = container.get<ConfigService>(TYPES.ConfigService);
    const config = {
      port: configService.getNumber('PORT') || 8080,
      host: configService.getString('HOST') || 'localhost',
      isProduction: process.env.NODE_ENV === 'production',
      storagePath: path.resolve(
        process.cwd(),
        configService.getString('STORAGE_PATH') || 'uploads',
      ),
    };

    // Create and initialize server manager
    const serverManager = new ServerManager(logger, container);

    // Register shutdown handlers
    serverManager.setupGracefulShutdown();

    // Initialize the server
    await serverManager.initialize(config);

    logger.info('Server initialization completed successfully');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
```

## 🔄 Initialization Flow

The server initialization follows this sequence:

1. **DI Container Verification**
   - Ensures the dependency injection container is properly initialized

2. **Logger Initialization**
   - Gets the logger service from the DI container
   - Enables structured logging for all subsequent operations

3. **Configuration Loading**
   - Retrieves configuration settings via the config service
   - Sets up server port, host, environment mode, and storage paths
   - Provides fallback values for any missing configuration

4. **Server Manager Setup**
   - Creates the server manager instance with required dependencies
   - Sets up graceful shutdown handlers for clean termination
   - Initializes the HTTP server with the loaded configuration

5. **Error Handling**
   - Captures and logs any errors during the initialization process
   - Terminates the process with a non-zero exit code if initialization fails

## ⚙️ Configuration

The `index.ts` file uses the following configuration values:

| Setting      | Environment Variable | Default Value | Description                                             |
| ------------ | -------------------- | ------------- | ------------------------------------------------------- |
| Port         | `PORT`               | 8080          | The port on which the HTTP server listens               |
| Host         | `HOST`               | "localhost"   | The host address to bind the server                     |
| Environment  | `NODE_ENV`           | -             | Application environment (development, production, etc.) |
| Storage Path | `STORAGE_PATH`       | "uploads"     | Path for storing uploaded files                         |

## 🛠️ Usage

The file automatically executes the server initialization when imported:

```typescript
// Start the server
initializeServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
```

This design allows the server to start immediately when the entry point is executed, while still providing the ability to import the initialization function for testing or manual control.

## 🔍 Important Details

### Dependencies

The file depends on several core modules:

```typescript
import path from 'path';
import 'reflect-metadata';
import { container } from './infrastructure/di';
import { ServerManager } from './infrastructure/server';
import TYPES from './infrastructure/di/types';
import { ILoggerService } from './infrastructure/logging';
import { ConfigService } from './infrastructure/config';
```

- `reflect-metadata`: Required for the dependency injection system
- Container from the DI module
- Type definitions for service resolution
- Core infrastructure services

### Graceful Shutdown

The server is configured to shut down gracefully when receiving termination signals, allowing:

- Completion of in-flight requests
- Proper closing of database connections
- Cleanup of resources
- Saving of application state if needed

### Error Handling

Any uncaught errors during initialization will:

1. Be logged to the console
2. Cause the process to exit with a non-zero status code (indicating failure)
3. Provide diagnostic information for troubleshooting

## 🧪 Testing

When testing the server, you can import and call `initializeServer` manually:

```typescript
import { initializeServer } from '../src/server';

describe('Server Integration', () => {
  let server;

  beforeAll(async () => {
    // Initialize server for testing
    server = await initializeServer();
  });

  afterAll(async () => {
    // Shut down server after tests
    await server.shutdown();
  });

  it('should respond to health check', async () => {
    // Test API endpoints...
  });
});
```

## 🔧 Customization

To customize the server initialization:

1. **Custom Configuration**: Modify the environment variables or default values
2. **Additional Services**: Register more services with the DI container before initialization
3. **Middleware**: Add custom middleware via the `ServerManager`
4. **Startup Hooks**: Register additional startup hooks for custom initialization logic
