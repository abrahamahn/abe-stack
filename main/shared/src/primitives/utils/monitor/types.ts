// main/shared/src/utils/monitor/types.ts
/**
 * Health Check Types
 *
 * Framework-agnostic type definitions for health monitoring.
 * These types define the shape of health check responses without
 * depending on any specific infrastructure (database, email, etc.).
 * Concrete health check implementations live in the server layer.
 */

/**
 * Status of an individual service component.
 * - `up` - Service is fully operational
 * - `down` - Service is not responding or failed
 * - `degraded` - Service is operational but with reduced capability
 */
export type ServiceStatus = 'up' | 'down' | 'degraded';

/**
 * Overall system health status derived from individual service statuses.
 * - `healthy` - All services are up
 * - `degraded` - One or more services are degraded or down, but system is operational
 * - `down` - All services are down, system is non-functional
 */
export type OverallStatus = 'healthy' | 'degraded' | 'down';

/**
 * Health check result for a single service.
 *
 * @example
 * ```typescript
 * const dbHealth: ServiceHealth = {
 *   status: 'up',
 *   message: 'connected',
 *   latencyMs: 12,
 * };
 * ```
 */
export interface ServiceHealth {
  /** Current operational status of the service */
  status: ServiceStatus;
  /** Human-readable status message or provider name */
  message?: string;
  /** Response time in milliseconds (for async health checks) */
  latencyMs?: number;
}

/**
 * Extended health check result for schema validation.
 * Includes details about missing database tables.
 */
export interface SchemaHealth extends ServiceHealth {
  /** Names of database tables that are missing */
  missingTables?: string[];
  /** Number of expected database tables that are present */
  tableCount?: number;
}

/**
 * Detailed health response for all monitored services.
 * Returned by the `/health/detailed` endpoint.
 */
export interface DetailedHealthResponse {
  /** Overall system health status */
  status: OverallStatus;
  /** ISO 8601 timestamp of the health check */
  timestamp: string;
  /** System uptime in seconds */
  uptime: number;
  /** Individual service health statuses */
  services: Record<string, ServiceHealth>;
}

/**
 * Readiness probe response.
 * Used by orchestrators (Kubernetes, etc.) to determine
 * if the service is ready to accept traffic.
 */
export interface ReadyResponse {
  /** Whether the service is ready to accept requests */
  status: 'ready' | 'not_ready';
  /** ISO 8601 timestamp of the readiness check */
  timestamp: string;
}

/**
 * Liveness probe response.
 * Used by orchestrators to determine if the process is alive.
 */
export interface LiveResponse {
  /** Always 'alive' if the process is responding */
  status: 'alive';
  /** Process uptime in seconds */
  uptime: number;
}

/**
 * Route listing response for debugging.
 */
export interface RoutesResponse {
  /** Formatted string of registered routes */
  routes: string;
  /** ISO 8601 timestamp */
  timestamp: string;
}

/**
 * Options for the startup summary log.
 */
export interface StartupSummaryOptions {
  /** Hostname the server is listening on */
  host: string;
  /** Port number the server is listening on */
  port: number;
  /** Number of registered routes */
  routeCount: number;
}
