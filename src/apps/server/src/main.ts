// apps/server/src/main.ts
/**
 * Application Entry Point
 *
 * This file is the "Main method" of the Node.js process. It has three specific responsibilities:
 * 1. **Configuration**: Loading environment variables and building the config object.
 * 2. **Bootstrap**: Instantiating the `App` class (Composition Root).
 * 3. **Process Management**: Handling OS signals (`SIGTERM`, `SIGINT`) to trigger graceful shutdown.
 *
 * @remarks
 * No business logic should exist here. This file merely orchestrates the startup
 * of the `App` class.
 */

import { createApp } from '@/app';
import { loadConfig } from '@/config/index';

/**
 * Bootstraps the application.
 */
async function main(): Promise<void> {
  try {
    // Load and validate configuration
    const config = loadConfig(process.env);

    // Create app instance (synchronous wiring)
    const app = createApp(config);

    // Start app (async initialization)
    await app.start();

    // Handle graceful shutdown
    // SIGTERM is standard for orchestrators (Kubernetes, Docker)
    // SIGINT is standard for local development (Ctrl+C)
    const shutdown = async (signal: string): Promise<void> => {
      // Use fallback logger if app.log isn't available yet (unlikely here)
      const logger = app.log;
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await app.stop();
        logger.info('Server stopped successfully');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch (error) {
    process.stderr.write(`Server startup failed: ${String(error)}\n`);
    process.exit(1);
  }
}

// Start the application
void main();
