// apps/server/src/server.ts
/**
 * Fastify Server Setup
 *
 * Creates and configures the Fastify HTTP server with plugins and core routes.
 * This module handles all Fastify-specific concerns, keeping them separate
 * from the application's DI container and lifecycle management.
 */

import { createConsoleLogger } from '@abe-stack/core';
import { registerPlugins } from '@http/index';
import Fastify from 'fastify';

import type { AppConfig } from '@/config/index';
import type { DbClient } from '@infrastructure/index';
import type { FastifyInstance } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface ServerDependencies {
  config: AppConfig;
  db: DbClient;
}

// ============================================================================
// Server Factory
// ============================================================================

/**
 * Create and configure a Fastify server instance
 */
export async function createServer(deps: ServerDependencies): Promise<FastifyInstance> {
  const { config } = deps;
  const isProd = config.env === 'production';

  // Logger configuration
  const loggerConfig = isProd
    ? { level: config.server.logLevel }
    : createConsoleLogger(config.server.logLevel);

  const server = Fastify({
    logger: loggerConfig,
    disableRequestLogging: !isProd,
    trustProxy: config.server.trustProxy,
    // Default body size limit for JSON requests (1MB)
    // This helps prevent denial-of-service attacks via large payloads.
    // Note: File upload routes should configure their own higher limits
    // (e.g., 50MB for multipart uploads) on a per-route basis.
    bodyLimit: 1024 * 1024, // 1MB
  });

  // Register plugins
  registerPlugins(server, config);

  return server;
}

// ============================================================================
// Port Binding
// ============================================================================

/**
 * Start listening on the configured port with fallback support
 */
export async function listen(server: FastifyInstance, config: AppConfig): Promise<void> {
  const { host, port, portFallbacks } = config.server;

  // Build unique port list
  const ports = [...new Set([port, ...portFallbacks])];

  for (const p of ports) {
    try {
      await server.listen({ port: p, host });

      if (p !== port) {
        server.log.warn(`Default port ${String(port)} in use. Using fallback port ${String(p)}.`);
      }

      server.log.info(`Server listening on http://${host}:${String(p)}`);
      return;
    } catch (error: unknown) {
      if (isAddrInUse(error)) {
        server.log.warn(`Port ${String(p)} is in use, trying next...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`No available ports found from: ${ports.join(', ')}`);
}

/**
 * Check if an error indicates address is already in use
 */
export function isAddrInUse(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code: string }).code === 'EADDRINUSE'
  );
}
