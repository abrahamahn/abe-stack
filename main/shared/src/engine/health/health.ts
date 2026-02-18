// main/shared/src/engine/health/health.ts
/**
 * @file Health Check Types & Logic
 * @description Framework-agnostic type definitions and logic for health monitoring.
 * @module Engine/Health
 */

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
  services: Record<string, ServiceHealth>;
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
// Response Schemas (for API contracts)
// ============================================================================

import { createSchema, parseNumber, parseString, type Schema } from '../../primitives/schema';

const serviceStatusValues = ['up', 'down', 'degraded'] as const;
const overallStatusValues = ['healthy', 'degraded', 'down'] as const;

export const detailedHealthResponseSchema: Schema<DetailedHealthResponse> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    const statusStr = parseString(obj['status'], 'status');
    if (!overallStatusValues.includes(statusStr as OverallStatus)) {
      throw new Error(`status must be one of: ${overallStatusValues.join(', ')}`);
    }

    const services: Record<string, ServiceHealth> = {};
    if (obj['services'] !== null && typeof obj['services'] === 'object') {
      const svcObj = obj['services'] as Record<string, unknown>;
      for (const key of Object.keys(svcObj)) {
        const svc = (
          svcObj[key] !== null && typeof svcObj[key] === 'object' ? svcObj[key] : {}
        ) as Record<string, unknown>;
        const svcStatus = parseString(svc['status'], `services.${key}.status`);
        if (!serviceStatusValues.includes(svcStatus as ServiceStatus)) {
          throw new Error(
            `services.${key}.status must be one of: ${serviceStatusValues.join(', ')}`,
          );
        }
        const svcEntry: ServiceHealth = { status: svcStatus as ServiceStatus };
        if (typeof svc['message'] === 'string') svcEntry.message = svc['message'];
        if (typeof svc['latencyMs'] === 'number') svcEntry.latencyMs = svc['latencyMs'];
        services[key] = svcEntry;
      }
    }

    return {
      status: statusStr as OverallStatus,
      timestamp: parseString(obj['timestamp'], 'timestamp'),
      uptime: parseNumber(obj['uptime'], 'uptime'),
      services,
    };
  },
);

export const readyResponseSchema: Schema<ReadyResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  const status = parseString(obj['status'], 'status');
  if (status !== 'ready' && status !== 'not_ready') {
    throw new Error('status must be "ready" or "not_ready"');
  }

  return {
    status: status,
    timestamp: parseString(obj['timestamp'], 'timestamp'),
  };
});

export const liveResponseSchema: Schema<LiveResponse> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  const status = parseString(obj['status'], 'status');
  if (status !== 'alive') {
    throw new Error('status must be "alive"');
  }

  return {
    status: 'alive' as const,
    uptime: parseNumber(obj['uptime'], 'uptime'),
  };
});

export interface HealthCheckDatabase {
  healthCheck(): Promise<boolean>;
}

export interface SchemaValidationResult {
  valid: boolean;
  missingTables: string[];
}

export interface HealthCheckPubSub {
  getSubscriptionCount(): number;
}

export interface HealthCheckCache {
  getStats(): Promise<{ hits: number; misses: number; size: number }>;
}

export interface HealthCheckQueue {
  getStats(): Promise<{ pending: number; failed: number }>;
}

export type SchemaValidator = (db: HealthCheckDatabase) => Promise<SchemaValidationResult>;

export interface EmailHealthConfig {
  provider: string;
}

export interface StorageHealthConfig {
  provider: string;
}

export interface WebSocketStats {
  pluginRegistered: boolean;
  activeConnections: number;
}

// ============================================================================
// Individual Health Check Functions
// ============================================================================

export async function checkDatabase(db: HealthCheckDatabase): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const isHealthy = await db.healthCheck();
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

export async function checkSchema(
  db: HealthCheckDatabase,
  validateSchema: SchemaValidator,
  expectedTableCount: number,
): Promise<ServiceHealth & { missingTables?: string[]; tableCount?: number }> {
  try {
    const result = await validateSchema(db);
    if (result.valid) {
      return {
        status: 'up',
        message: `${String(expectedTableCount)} tables present`,
        tableCount: expectedTableCount,
      };
    } else {
      return {
        status: 'down',
        message: `missing ${String(result.missingTables.length)} tables`,
        missingTables: result.missingTables,
        tableCount: expectedTableCount - result.missingTables.length,
      };
    }
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Schema validation failed',
    };
  }
}

export function checkEmail(config: EmailHealthConfig): ServiceHealth {
  return {
    status: 'up',
    message: config.provider,
  };
}

export function checkStorage(config: StorageHealthConfig): ServiceHealth {
  return {
    status: 'up',
    message: config.provider,
  };
}

export function checkPubSub(pubsub: HealthCheckPubSub): ServiceHealth {
  const subCount = pubsub.getSubscriptionCount();
  return {
    status: 'up',
    message: `${String(subCount)} active subscriptions`,
  };
}

export async function checkCache(cache: HealthCheckCache): Promise<ServiceHealth> {
  try {
    const stats = await cache.getStats();
    return {
      status: 'up',
      message: `${String(stats.size)} items in cache`,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Cache check failed',
    };
  }
}

export async function checkQueue(queue: HealthCheckQueue): Promise<ServiceHealth> {
  try {
    const stats = await queue.getStats();
    return {
      status: 'up',
      message: `${String(stats.pending)} pending, ${String(stats.failed)} failed`,
    };
  } catch (error) {
    return {
      status: 'down',
      message: error instanceof Error ? error.message : 'Queue check failed',
    };
  }
}

export function checkWebSocket(stats: WebSocketStats): ServiceHealth {
  return {
    status: stats.pluginRegistered ? 'up' : 'down',
    message: stats.pluginRegistered
      ? `${String(stats.activeConnections)} active connections`
      : 'plugin not registered',
  };
}

export function checkRateLimit(): ServiceHealth {
  return {
    status: 'up',
    message: 'sliding window active',
  };
}

// ============================================================================
// Aggregate Health
// ============================================================================

export function determineOverallStatus(services: Record<string, ServiceHealth>): OverallStatus {
  const statuses = Object.values(services).map((s) => s.status);

  if (statuses.every((s) => s === 'down')) {
    return 'down';
  }
  if (statuses.some((s) => s === 'down' || s === 'degraded')) {
    return 'degraded';
  }
  return 'healthy';
}

export function buildDetailedHealthResponse(
  services: Record<string, ServiceHealth>,
): DetailedHealthResponse {
  return {
    status: determineOverallStatus(services),
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    services,
  };
}
