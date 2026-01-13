// apps/server/src/main.ts
/**
 * Application Entry Point
 *
 * This is the single entry point for the server.
 * It loads environment variables, creates the App, and starts it.
 */

import path from 'path';

import dotenvFlow from 'dotenv-flow';

import { createApp } from './app';
import { loadConfig } from './config';

// Load environment variables
dotenvFlow.config({
  node_env: process.env.NODE_ENV || 'development',
  path: path.resolve(__dirname, '../../../config'),
});

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
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Start the application
void main();
