// main/apps/server/src/main.ts
/**
 * Application Entry Point
 *
 * This file is the "Main method" of the Node.js process. It has three specific responsibilities:
 * 1. **Configuration**: Loading environment variables and building the config object.
 * 2. **Bootstrap**: Instantiating the `ServerManager` class (Composition Root).
 * 3. **Process Management**: Handling OS signals (`SIGTERM`, `SIGINT`) to trigger graceful shutdown.
 *
 * @remarks
 * No business logic should exist here. This file merely orchestrates the startup
 * of the `App` class via `ServerManager`.
 */

import { loadConfig } from '@/config/index';
import { ServerManager } from '@/manager';

/**
 * Bootstraps the application.
 */
async function main(): Promise<void> {
  const manager = new ServerManager(await loadConfig());
  await manager.start();
}

// Start the application
void main();
