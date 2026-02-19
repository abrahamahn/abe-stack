// main/server/system/src/system/health.ts
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

import type { HealthContext } from './types';
import type {
  DetailedHealthResponse,
  SchemaHealth,
  ServiceHealth,
  StartupSummaryOptions,
  WebSocketStats,
} from '@bslt/shared';

/** Callback that performs the DB-level schema validation. */
export type SchemaValidatorFn = () => Promise<{ valid: boolean; missingTables: string[] }>;

// ============================================================================
// Options
// ============================================================================

export interface DetailedHealthOptions {
  /**
   * If provided, a schema check is included in the health response.
   * Pass `() => validateSchema(db)` from @bslt/db at the composition layer.
   */
  schemaValidator?: SchemaValidatorFn;
  /**
   * Expected table count — required when schemaValidator is provided.
   * Pass `REQUIRED_TABLES.length` from @bslt/db at the composition layer.
   */
  totalTableCount?: number;
  /** Optional WebSocket stats; omit when realtime is disabled. */
  websocketStats?: WebSocketStats;
}

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Check database connectivity by executing a lightweight query.
 *
 * @param ctx - Health context containing the database handle
 * @returns Service health status for the database
 * @complexity O(1) — single `SELECT 1` round-trip
 */
export async function checkDbStatus(ctx: HealthContext): Promise<ServiceHealth> {
  return checkDatabase(ctx.db);
}

/**
 * Check database schema completeness.
 *
 * @param ctx       - Health context containing the database handle
 * @param validate  - Callback performing the actual schema validation (from @bslt/db)
 * @param tableCount - Expected number of tables
 * @returns Schema health status including any missing tables
 * @complexity O(n) where n = number of expected tables
 */
export async function checkSchemaStatus(
  ctx: HealthContext,
  validate: SchemaValidatorFn,
  tableCount: number,
): Promise<SchemaHealth> {
  return checkSchema(ctx.db, validate, tableCount);
}

/**
 * Check cache service status.
 *
 * @param ctx - Health context containing the cache handle
 * @returns Service health status for the cache
 * @complexity O(1)
 */
export async function checkCacheStatus(ctx: HealthContext): Promise<ServiceHealth> {
  return checkCache(ctx.cache);
}

/**
 * Check queue service status.
 *
 * @param ctx - Health context containing the queue handle
 * @returns Service health status for the queue
 * @complexity O(1)
 */
export async function checkQueueStatus(ctx: HealthContext): Promise<ServiceHealth> {
  return checkQueue(ctx.queue);
}

/**
 * Check email service status based on the configured provider.
 *
 * @param ctx - Health context containing the application configuration
 * @returns Service health status for the email provider
 * @complexity O(1)
 */
export function checkEmailStatus(ctx: HealthContext): ServiceHealth {
  return checkEmail({ provider: ctx.config.email.provider });
}

/**
 * Check storage service status based on the configured provider.
 *
 * @param ctx - Health context containing the application configuration
 * @returns Service health status for the storage provider
 * @complexity O(1)
 */
export function checkStorageStatus(ctx: HealthContext): ServiceHealth {
  return checkStorage({ provider: ctx.config.storage.provider });
}

/**
 * Check pub/sub status using the subscription manager handle.
 *
 * @param ctx - Health context containing the pub/sub handle
 * @returns Service health status for pub/sub
 * @complexity O(1)
 */
export function checkPubSubStatus(ctx: HealthContext): ServiceHealth {
  return checkPubSub(ctx.pubsub);
}

/**
 * Check WebSocket status using externally-provided connection stats.
 *
 * The caller must supply stats (e.g. from `@bslt/realtime`) so that
 * the system package remains free of realtime module dependencies.
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
 * @param ctx     - Health context for database, config, and pub/sub access
 * @param options - Optional: schema validator callback, table count, WebSocket stats
 * @returns Aggregated health response for every monitored service
 * @complexity O(n) — dominated by the schema check when provided
 */
export async function getDetailedHealth(
  ctx: HealthContext,
  options?: DetailedHealthOptions,
): Promise<DetailedHealthResponse> {
  const defaultWsStats: WebSocketStats = { pluginRegistered: false, activeConnections: 0 };
  const ws = options?.websocketStats ?? defaultWsStats;

  const schemaPromise: Promise<SchemaHealth> =
    options?.schemaValidator !== undefined && options.totalTableCount !== undefined
      ? checkSchemaStatus(ctx, options.schemaValidator, options.totalTableCount)
      : Promise.resolve({ status: 'up' as const, details: { valid: true, missingTables: [] } });

  const [database, schema, cache, queue, email, storage, pubsub, websocket, rateLimit] =
    await Promise.all([
      checkDbStatus(ctx),
      schemaPromise,
      checkCacheStatus(ctx),
      checkQueueStatus(ctx),
      Promise.resolve(checkEmailStatus(ctx)),
      Promise.resolve(checkStorageStatus(ctx)),
      Promise.resolve(checkPubSubStatus(ctx)),
      Promise.resolve(checkWebSocketStatus(ws)),
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
 * @param ctx     - Health context for health checks and logging
 * @param options - Startup options (host, port, routeCount)
 * @param healthOptions - Optional health check options (schemaValidator, websocketStats)
 * @complexity O(n) dominated by `getDetailedHealth`
 */
export async function logStartupSummary(
  ctx: HealthContext,
  options: StartupSummaryOptions,
  healthOptions?: DetailedHealthOptions,
): Promise<void> {
  const { host, port, routeCount } = options;
  const health = await getDetailedHealth(ctx, healthOptions);

  ctx.log.info('Startup Summary', {
    msg: 'Server started successfully',
    server: {
      host,
      port,
      url: `http://${host === '0.0.0.0' ? 'localhost' : host}:${String(port)}`,
    },
    stats: {
      routes: routeCount,
      ...health.services,
    },
    version: process.env['npm_package_version'] ?? 'unknown',
  });

  if (ctx.config.env === 'development') {
    printDevConfigSummary(ctx, options, health);
  }
}

/**
 * Prints a human-readable config summary to stdout in development/test.
 * Redacts secrets — only shows provider choices and operational settings.
 */
function printDevConfigSummary(
  ctx: HealthContext,
  options: StartupSummaryOptions,
  health: DetailedHealthResponse,
): void {
  const { config } = ctx;
  const { host, port, routeCount } = options;
  const url = `http://${host === '0.0.0.0' ? 'localhost' : host}:${String(port)}`;

  const line = '─'.repeat(52);
  const status = (s: ServiceHealth | undefined): string =>
    s === undefined ? '?' : s.status === 'up' ? 'ok' : s.status;

  const rows: Array<[string, string]> = [
    ['Environment', config.env],
    ['URL', url],
    ['Routes', String(routeCount)],
    ['Database', `${config.database.provider} [${status(health.services['database'])}]`],
    ['Cache', config.cache.useExternalProvider ? 'redis' : 'memory'],
    ['Storage', config.storage.provider],
    ['Email', config.email.provider],
    ['Queue', config.queue.provider],
    ['Search', config.search.provider],
    ['Auth', config.auth.strategies.join(', ')],
    ['Billing', config.billing.enabled ? config.billing.provider : 'disabled'],
    ['Notifications', config.notifications.enabled ? config.notifications.provider : 'disabled'],
  ];

  const out: string[] = [
    '',
    `  BSLT Server`,
    `  ${line}`,
  ];

  for (const [label, value] of rows) {
    out.push(`  ${label.padEnd(16)} ${value}`);
  }

  out.push(`  ${line}`, '');

  process.stdout.write(out.join('\n'));
}
