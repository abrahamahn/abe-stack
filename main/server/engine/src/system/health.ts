// main/server/engine/src/system/health.ts

import { REQUIRED_TABLES, validateSchema } from '@bslt/db';
import {
  buildDetailedHealthResponse,
  checkCache,
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkQueue,
  checkRateLimit,
  checkSchema,
  checkStorage,
  checkWebSocket,
} from '@bslt/shared';

import type { RawDb } from '@bslt/db';
import type {
  DetailedHealthResponse,
  HealthCheckDatabase,
  SchemaHealth,
  ServiceHealth,
  StartupSummaryOptions,
  WebSocketStats,
} from '@bslt/shared';
import type { SystemContext } from './types';

/** Callback shape expected by the shared `checkSchema` utility. */
type SchemaValidator = (
  db: HealthCheckDatabase,
) => Promise<{ valid: boolean; missingTables: string[] }>;

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Check database connectivity by executing a lightweight query.
 *
 * @param ctx - System context containing the database handle
 * @returns Service health status for the database
 * @complexity O(1) - single `SELECT 1` round-trip
 */
export async function checkDbStatus(ctx: SystemContext): Promise<ServiceHealth> {
  return checkDatabase(ctx.db);
}

/**
 * Check database schema completeness against the expected table list.
 *
 * @param ctx - System context containing the database handle
 * @returns Schema health status including any missing tables
 * @complexity O(n) where n = number of expected tables
 */
export async function checkSchemaStatus(ctx: SystemContext): Promise<SchemaHealth> {
  const schemaValidator: SchemaValidator = async (db) => {
    const result = await validateSchema(db as RawDb);
    return { valid: result.valid, missingTables: result.missingTables };
  };
  return checkSchema(ctx.db, schemaValidator, REQUIRED_TABLES.length);
}

/**
 * Check cache service status.
 *
 * @param ctx - System context containing the cache handle
 * @returns Service health status for the cache
 * @complexity O(1)
 */
export async function checkCacheStatus(ctx: SystemContext): Promise<ServiceHealth> {
  return checkCache(ctx.cache);
}

/**
 * Check queue service status.
 *
 * @param ctx - System context containing the queue handle
 * @returns Service health status for the queue
 * @complexity O(1)
 */
export async function checkQueueStatus(ctx: SystemContext): Promise<ServiceHealth> {
  return checkQueue(ctx.queue);
}

/**
 * Check email service status based on the configured provider.
 *
 * @param ctx - System context containing the application configuration
 * @returns Service health status for the email provider
 * @complexity O(1)
 */
export function checkEmailStatus(ctx: SystemContext): ServiceHealth {
  return checkEmail({ provider: ctx.config.email.provider });
}

/**
 * Check storage service status based on the configured provider.
 *
 * @param ctx - System context containing the application configuration
 * @returns Service health status for the storage provider
 * @complexity O(1)
 */
export function checkStorageStatus(ctx: SystemContext): ServiceHealth {
  return checkStorage({ provider: ctx.config.storage.provider });
}

/**
 * Check pub/sub status using the subscription manager handle.
 *
 * @param ctx - System context containing the pub/sub handle
 * @returns Service health status for pub/sub
 * @complexity O(1)
 */
export function checkPubSubStatus(ctx: SystemContext): ServiceHealth {
  return checkPubSub(ctx.pubsub);
}

/**
 * Check WebSocket status using externally-provided connection stats.
 *
 * The caller must supply stats (e.g. from `@bslt/realtime`) so that
 * engine remains free of realtime/premium module dependencies.
 *
 * @param stats - Current WebSocket connection statistics
 * @returns Service health status for the WebSocket subsystem
 * @complexity O(1)
 */
export function checkWebSocketStatus(stats: WebSocketStats): ServiceHealth {
  return checkWebSocket(stats);
}

/**
 * Check rate limiter status.
 *
 * @returns Service health status for the rate limiter
 * @complexity O(1)
 */
export function checkRateLimitStatus(): ServiceHealth {
  return checkRateLimit();
}

/**
 * Get detailed health status for all services.
 *
 * Runs all individual checks in parallel and aggregates them into a
 * single {@link DetailedHealthResponse}.
 *
 * @param ctx            - System context for database, config, and pub/sub access
 * @param websocketStats - Optional WebSocket stats; omit when realtime is disabled
 * @returns Aggregated health response for every monitored service
 * @complexity O(n) dominated by the schema check
 */
export async function getDetailedHealth(
  ctx: SystemContext,
  websocketStats?: WebSocketStats,
): Promise<DetailedHealthResponse> {
  const defaultWsStats: WebSocketStats = { pluginRegistered: false, activeConnections: 0 };

  const [database, schema, cache, queue, email, storage, pubsub, websocket, rateLimit] =
    await Promise.all([
      checkDbStatus(ctx),
      checkSchemaStatus(ctx),
      checkCacheStatus(ctx),
      checkQueueStatus(ctx),
      Promise.resolve(checkEmailStatus(ctx)),
      Promise.resolve(checkStorageStatus(ctx)),
      Promise.resolve(checkPubSubStatus(ctx)),
      Promise.resolve(checkWebSocketStatus(websocketStats ?? defaultWsStats)),
      Promise.resolve(checkRateLimitStatus()),
    ]);

  return buildDetailedHealthResponse({
    database,
    schema,
    cache,
    queue,
    email,
    storage,
    pubsub,
    websocket,
    rateLimit,
  });
}

/**
 * Log a formatted startup summary with service statuses.
 *
 * Performs a full health check, then logs an INFO-level summary including
 * the server URL, route count, and per-service status.
 *
 * @param ctx            - System context for health checks and logging
 * @param options        - Startup options (host, port, routeCount)
 * @param websocketStats - Optional WebSocket stats; omit when realtime is disabled
 * @complexity O(n) dominated by `getDetailedHealth`
 */
export async function logStartupSummary(
  ctx: SystemContext,
  options: StartupSummaryOptions,
  websocketStats?: WebSocketStats,
): Promise<void> {
  const { host, port, routeCount } = options;
  const health = await getDetailedHealth(ctx, websocketStats);

  ctx.log.info('Startup Summary', {
    msg: 'Server started successfully',
    server: {
      host,
      port,
      url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${port}`,
    },
    stats: {
      routes: routeCount,
      ...health.services,
    },
    version: process.env['npm_package_version'] ?? 'unknown',
  });
}
