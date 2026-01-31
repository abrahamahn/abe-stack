// core/src/infrastructure/monitor/health.ts
/**
 * Health Check Utilities
 *
 * Framework-agnostic health check functions using dependency injection.
 * Each check function accepts a narrow dependency interface rather than
 * the full AppContext, enabling reuse across server, worker, and test
 * environments without coupling to Fastify or specific database clients.
 */

import type { DetailedHealthResponse, OverallStatus, ServiceHealth } from './types';

// ============================================================================
// Dependency Interfaces (Dependency Injection)
// ============================================================================

/**
 * Minimal interface for a health-checkable database.
 * Implementations must provide a `healthCheck()` method
 * that resolves to `true` when the database is reachable.
 */
export interface HealthCheckDatabase {
  /** Returns true if the database is reachable */
  healthCheck(): Promise<boolean>;
}

/**
 * Interface for a schema validator that checks table presence.
 * Decouples from the concrete @abe-stack/db implementation.
 */
export interface SchemaValidationResult {
  /** Whether all required tables are present */
  valid: boolean;
  /** Names of tables that are missing */
  missingTables: string[];
}

/**
 * Minimal interface for a pub/sub system health check.
 */
export interface HealthCheckPubSub {
  /** Returns the number of active subscriptions */
  getSubscriptionCount(): number;
}

/**
 * Callback type for the schema validation function.
 * Accepts a database and returns the validation result.
 */
export type SchemaValidator = (db: HealthCheckDatabase) => Promise<SchemaValidationResult>;

/**
 * Configuration snapshot for the email service health check.
 */
export interface EmailHealthConfig {
  /** Email provider name (e.g. 'smtp', 'ses', 'console') */
  provider: string;
}

/**
 * Configuration snapshot for the storage service health check.
 */
export interface StorageHealthConfig {
  /** Storage provider name (e.g. 'local', 's3') */
  provider: string;
}

/**
 * WebSocket stats for the WebSocket health check.
 */
export interface WebSocketStats {
  /** Whether the WebSocket plugin has been registered */
  pluginRegistered: boolean;
  /** Number of currently active WebSocket connections */
  activeConnections: number;
}

// ============================================================================
// Individual Health Check Functions
// ============================================================================

/**
 * Check database connectivity by calling healthCheck().
 * Measures latency and returns structured health status.
 *
 * @param db - A health-checkable database instance
 * @returns Service health with status and latency
 * @complexity O(1) - single database round-trip
 */
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

/**
 * Check database schema completeness using a schema validator.
 *
 * @param db - A health-checkable database instance
 * @param validateSchema - A function that validates schema completeness
 * @param expectedTableCount - The expected number of required tables
 * @returns Service health with schema details
 * @complexity O(n) where n is the number of tables to validate
 */
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

/**
 * Check email service status based on configuration.
 *
 * @param config - Email configuration with provider name
 * @returns Service health indicating the configured provider
 * @complexity O(1)
 */
export function checkEmail(config: EmailHealthConfig): ServiceHealth {
  return {
    status: 'up',
    message: config.provider,
  };
}

/**
 * Check storage service status based on configuration.
 *
 * @param config - Storage configuration with provider name
 * @returns Service health indicating the configured provider
 * @complexity O(1)
 */
export function checkStorage(config: StorageHealthConfig): ServiceHealth {
  return {
    status: 'up',
    message: config.provider,
  };
}

/**
 * Check pub/sub service status.
 *
 * @param pubsub - A pub/sub instance with subscription count
 * @returns Service health with active subscription count
 * @complexity O(1)
 */
export function checkPubSub(pubsub: HealthCheckPubSub): ServiceHealth {
  const subCount = pubsub.getSubscriptionCount();
  return {
    status: 'up',
    message: `${String(subCount)} active subscriptions`,
  };
}

/**
 * Check WebSocket service status using connection stats.
 *
 * @param stats - WebSocket connection statistics
 * @returns Service health based on plugin registration
 * @complexity O(1)
 */
export function checkWebSocket(stats: WebSocketStats): ServiceHealth {
  return {
    status: stats.pluginRegistered ? 'up' : 'down',
    message: stats.pluginRegistered
      ? `${String(stats.activeConnections)} active connections`
      : 'plugin not registered',
  };
}

/**
 * Check rate limiter status.
 * Currently always returns "up" as the rate limiter is
 * in-process and available when the server is running.
 *
 * @returns Service health with active status
 * @complexity O(1)
 */
export function checkRateLimit(): ServiceHealth {
  return {
    status: 'up',
    message: 'token bucket active',
  };
}

// ============================================================================
// Aggregate Health
// ============================================================================

/**
 * Determine overall system status from a record of service health checks.
 * Returns 'healthy' if all services are up, 'down' if all are down,
 * and 'degraded' if there is a mix.
 *
 * @param services - Record of service name to health status
 * @returns The aggregate overall status
 * @complexity O(n) where n is the number of services
 */
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

/**
 * Build a DetailedHealthResponse from a record of service health checks.
 * Aggregates individual statuses and adds timestamp and uptime metadata.
 *
 * @param services - Record of service name to health status
 * @returns A complete DetailedHealthResponse
 * @complexity O(n) where n is the number of services
 */
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
