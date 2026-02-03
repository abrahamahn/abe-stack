import { REQUIRED_TABLES, validateSchema } from '@abe-stack/db';
import {
  buildDetailedHealthResponse,
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkRateLimit,
  checkSchema,
  checkStorage,
  checkWebSocket,
} from '@abe-stack/shared';
import { getWebSocketStats } from '@abe-stack/realtime';

import type { SystemContext } from './types';
import type { RawDb } from '@abe-stack/db';
import type {
  DetailedHealthResponse,
  HealthCheckDatabase,
  SchemaHealth,
  ServiceHealth,
  StartupSummaryOptions,
} from '@abe-stack/shared';

type SchemaValidator = (db: HealthCheckDatabase) => Promise<{ valid: boolean; missingTables: string[] }>;

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Check database connectivity
 */
export async function checkDbStatus(ctx: SystemContext): Promise<ServiceHealth> {
  return checkDatabase(ctx.db);
}

/**
 * Check database schema completeness
 */
export async function checkSchemaStatus(ctx: SystemContext): Promise<SchemaHealth> {
  const schemaValidator: SchemaValidator = async (db) => {
    const result = await validateSchema(db as RawDb);
    return { valid: result.valid, missingTables: result.missingTables };
  };
  return checkSchema(ctx.db, schemaValidator, REQUIRED_TABLES.length);
}

/**
 * Check email service status
 */
export function checkEmailStatus(ctx: SystemContext): ServiceHealth {
  return checkEmail({ provider: ctx.config.email.provider });
}

/**
 * Check storage service status
 */
export function checkStorageStatus(ctx: SystemContext): ServiceHealth {
  return checkStorage({ provider: ctx.config.storage.provider });
}

/**
 * Check pub/sub status
 */
export function checkPubSubStatus(ctx: SystemContext): ServiceHealth {
  return checkPubSub(ctx.pubsub);
}

/**
 * Check WebSocket status using actual connection stats
 */
export function checkWebSocketStatus(): ServiceHealth {
  return checkWebSocket(getWebSocketStats());
}

/**
 * Check rate limiter status
 */
export function checkRateLimitStatus(): ServiceHealth {
  return checkRateLimit();
}

/**
 * Get detailed health status for all services
 */
export async function getDetailedHealth(ctx: SystemContext): Promise<DetailedHealthResponse> {
  const [database, schema, email, storage, pubsub, websocket, rateLimit] = await Promise.all([
    checkDbStatus(ctx),
    checkSchemaStatus(ctx),
    Promise.resolve(checkEmailStatus(ctx)),
    Promise.resolve(checkStorageStatus(ctx)),
    Promise.resolve(checkPubSubStatus(ctx)),
    Promise.resolve(checkWebSocketStatus()),
    Promise.resolve(checkRateLimitStatus()),
  ]);

  return buildDetailedHealthResponse({
    database,
    schema,
    email,
    storage,
    pubsub,
    websocket,
    rateLimit,
  });
}

/**
 * Log a formatted startup summary with service statuses
 */
export async function logStartupSummary(
  ctx: SystemContext,
  options: StartupSummaryOptions,
): Promise<void> {
  const { host, port, routeCount } = options;
  const health = await getDetailedHealth(ctx);

  ctx.log.info({
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
  }, 'Startup Summary');
}
