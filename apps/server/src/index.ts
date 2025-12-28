import path from 'path';

import { loadServerEnv } from '@abe-stack/shared';
import dotenvFlow from 'dotenv-flow';

import { createServer } from './server';

// Load environment variables
dotenvFlow.config({
  node_env: process.env.NODE_ENV || 'development',
  path: path.resolve(__dirname, '../../../config'),
});

// Validate required env once at startup
const env = loadServerEnv(process.env);

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = '0.0.0.0';

/**
 * Start the server - this is the only entry point
 * Server creation logic is in ./server.ts for testability
 */
async function start(): Promise<void> {
  const port = Number(process.env.API_PORT || env.PORT || DEFAULT_PORT);
  const host = process.env.HOST || DEFAULT_HOST;

  try {
    const { app } = await createServer(env);

    await app.listen({ port, host });
    app.log.info(`Server listening on http://${host}:${String(port)}`);
  } catch (error) {
    process.stderr.write(`Failed to start server ${String(error)}\n`);
    process.exit(1);
  }
}

// Start server if this file is run directly
if (require.main === module) {
  void start();
}
