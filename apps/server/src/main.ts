// apps/server/src/main.ts
/**
 * Application Entry Point
 *
 * This is the single entry point for the server.
 * Environment variables are loaded via Node's native --env-file flag in package.json scripts.
 */

import { loadConfig } from '@config/index';

import { createApp } from '@/app';

async function main(): Promise<void> {
  try {
    // Load and validate configuration
    const config = loadConfig(process.env);

    // Create and start the application
    const app = createApp(config);
    await app.start();

    // Handle graceful shutdown
    const shutdown = async (signal: string): Promise<void> => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      await app.stop();
      process.exit(0);
    };

    process.on('SIGTERM', () => void shutdown('SIGTERM'));
    process.on('SIGINT', () => void shutdown('SIGINT'));
  } catch {
    process.exit(1);
  }
}

// Start the application
void main();
