// backend/server/src/index.ts
/**
 * Server Entry Point
 *
 * This is the single entry point for the server.
 * 1. Load environment variables
 * 2. Validate configuration
 * 3. Create ServerEnvironment (DI container)
 * 4. Start the server
 */

import path from "path";

import { loadServerEnv } from "@abe-stack/shared";
import { resolveConnectionStringWithFallback } from "@db";
import dotenvFlow from "dotenv-flow";

import { validateEnv, createEnv } from "./env";
import { createServer } from "./server";

// ============================================================================
// Load Environment Variables
// ============================================================================

dotenvFlow.config({
  node_env: process.env.NODE_ENV || "development",
  path: path.resolve(__dirname, "../../../config"),
});

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PORT = 8080;
const DEFAULT_HOST = "0.0.0.0";
const PORT_FALLBACKS = [
  DEFAULT_PORT,
  DEFAULT_PORT + 1,
  DEFAULT_PORT + 2,
  DEFAULT_PORT + 3,
];

// ============================================================================
// Helpers
// ============================================================================

function uniquePorts(ports: Array<number | undefined>): number[] {
  return Array.from(
    new Set(ports.filter((port): port is number => Number.isFinite(port))),
  );
}

function isAddrInUse(error: unknown): error is NodeJS.ErrnoException {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: string }).code === "EADDRINUSE",
  );
}

async function listenWithFallback(
  app: Awaited<ReturnType<typeof createServer>>["app"],
  host: string,
  ports: number[],
): Promise<number> {
  for (const port of ports) {
    try {
      await app.listen({ port, host });
      process.env.API_PORT = String(port);
      if (port !== ports[0]) {
        app.log.warn("Default port in use. Fallback to " + String(port) + ".");
      }
      return port;
    } catch (error) {
      if (isAddrInUse(error)) {
        app.log.warn("Port " + String(port) + " is in use, trying next...");
        continue;
      }
      throw error;
    }
  }
  throw new Error("No available ports: " + ports.join(", "));
}

// ============================================================================
// Main
// ============================================================================

async function start(): Promise<void> {
  // 1. Validate environment
  validateEnv();

  // 2. Load configuration
  const appEnv = loadServerEnv(process.env);
  const connectionString = await resolveConnectionStringWithFallback(appEnv);

  // 3. Create ServerEnvironment (single DI container)
  const env = createEnv({
    app: appEnv,
    connectionString,
  });

  // 4. Create and configure Fastify server
  const { app } = await createServer(env);

  // 5. Start listening
  const host = process.env.HOST || DEFAULT_HOST;
  const preferredPort = Number(
    process.env.API_PORT || appEnv.API_PORT || appEnv.PORT || DEFAULT_PORT,
  );
  const ports = uniquePorts([preferredPort, ...PORT_FALLBACKS]);

  try {
    const port = await listenWithFallback(app, host, ports);
    app.log.info("Server listening on http://" + host + ":" + String(port));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Failed to start server: ${message}\n`);
    process.exit(1);
  }
}

// Start server if run directly
if (require.main === module) {
  void start();
}
