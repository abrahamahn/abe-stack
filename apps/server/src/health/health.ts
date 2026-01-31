// apps/server/src/health/health.ts
/**
 * Health Check Infrastructure
 *
 * Provides health check utilities for monitoring service status:
 * - Individual service health checks
 * - Detailed health report
 * - Startup validation summary
 */

import { REQUIRED_TABLES, validateSchema } from '@abe-stack/db';
import { getWebSocketStats } from '@abe-stack/realtime';

import type { AppContext } from '@shared';

// ============================================================================
// Types
// ============================================================================

export type ServiceStatus = 'up' | 'down' | 'degraded';
export type OverallStatus = 'healthy' | 'degraded' | 'down';

export interface ServiceHealth {
  status: ServiceStatus;
  message?: string;
  latencyMs?: number;
}

export interface SchemaHealth extends ServiceHealth {
  missingTables?: string[];
  tableCount?: number;
}

export interface DetailedHealthResponse {
  status: OverallStatus;
  timestamp: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    schema: SchemaHealth;
    email: ServiceHealth;
    storage: ServiceHealth;
    pubsub: ServiceHealth;
    websocket: ServiceHealth;
    rateLimit: ServiceHealth;
  };
}

export interface ReadyResponse {
  status: 'ready' | 'not_ready';
  timestamp: string;
}

export interface LiveResponse {
  status: 'alive';
  uptime: number;
}

export interface RoutesResponse {
  routes: string;
  timestamp: string;
}

export interface StartupSummaryOptions {
  host: string;
  port: number;
  routeCount: number;
}

// ============================================================================
// Health Check Functions
// ============================================================================

/**
 * Check database connectivity
 */
export async function checkDatabase(ctx: AppContext): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const isHealthy = await ctx.db.healthCheck();
    return {
      status: isHealthy ? 'up' : 'down',
      message: isHealthy ? 'connected' : 'health check failed',
      latencyMs: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Connection failed',
      latencyMs: Date.now() - start,
    };
  }
}

/**
 * Check database schema completeness
 */
export async function checkSchema(ctx: AppContext): Promise<SchemaHealth> {
  try {
    const result = await validateSchema(ctx.db);
    if (result.valid) {
      return {
        status: 'up',
        message: `${String(REQUIRED_TABLES.length)} tables present`,
        tableCount: REQUIRED_TABLES.length,
      };
    } else {
      return {
        status: 'down',
        message: `missing ${String(result.missingTables.length)} tables`,
        missingTables: result.missingTables,
        tableCount: REQUIRED_TABLES.length - result.missingTables.length,
      };
    }
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Schema validation failed',
    };
  }
}

/**
 * Check email service status
 */
export function checkEmail(ctx: AppContext): ServiceHealth {
  const provider = ctx.config.email.provider;
  return {
    status: 'up',
    message: provider,
  };
}

/**
 * Check storage service status
 */
export function checkStorage(ctx: AppContext): ServiceHealth {
  const provider = ctx.config.storage.provider;
  return {
    status: 'up',
    message: provider,
  };
}

/**
 * Check pub/sub status
 */
export function checkPubSub(ctx: AppContext): ServiceHealth {
  const subCount = ctx.pubsub.getSubscriptionCount();
  return {
    status: 'up',
    message: `${String(subCount)} active subscriptions`,
  };
}

/**
 * Check WebSocket status using actual connection stats
 */
export function checkWebSocket(): ServiceHealth {
  const stats = getWebSocketStats();
  return {
    status: stats.pluginRegistered ? 'up' : 'down',
    message: stats.pluginRegistered
      ? `${String(stats.activeConnections)} active connections`
      : 'plugin not registered',
  };
}

/**
 * Check rate limiter status
 */
export function checkRateLimit(): ServiceHealth {
  return {
    status: 'up',
    message: 'token bucket active',
  };
}

/**
 * Get detailed health status for all services
 */
export async function getDetailedHealth(ctx: AppContext): Promise<DetailedHealthResponse> {
  const [database, schema, email, storage, pubsub, websocket, rateLimit] = await Promise.all([
    checkDatabase(ctx),
    checkSchema(ctx),
    Promise.resolve(checkEmail(ctx)),
    Promise.resolve(checkStorage(ctx)),
    Promise.resolve(checkPubSub(ctx)),
    Promise.resolve(checkWebSocket()),
    Promise.resolve(checkRateLimit()),
  ]);

  const services = { database, schema, email, storage, pubsub, websocket, rateLimit };

  // Determine overall status
  const statuses = Object.values(services).map((s) => s.status);
  let status: OverallStatus = 'healthy';

  if (statuses.every((s) => s === 'down')) {
    status = 'down';
  } else if (statuses.some((s) => s === 'down' || s === 'degraded')) {
    status = 'degraded';
  }

  return {
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    services,
  };
}

// ============================================================================
// Startup Summary
// ============================================================================

/**
 * Log a formatted startup summary with service statuses
 */
export async function logStartupSummary(
  _ctx: AppContext,
  _options: StartupSummaryOptions,
): Promise<void> {
  // Health status display removed - function kept for future use
}
