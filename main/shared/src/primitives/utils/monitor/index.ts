// main/shared/src/utils/monitor/index.ts
/**
 * Monitor Module
 *
 * Framework-agnostic health check types and utilities.
 * Uses dependency injection to decouple from specific infrastructure
 * implementations (database, email, storage, etc.).
 */

// Types
export type {
  DetailedHealthResponse,
  LiveResponse,
  OverallStatus,
  ReadyResponse,
  RoutesResponse,
  SchemaHealth,
  ServiceHealth,
  ServiceStatus,
  StartupSummaryOptions,
} from './types';

// Health check functions
export {
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
  determineOverallStatus,
} from './health';

// Health check dependency interfaces
export type {
  EmailHealthConfig,
  HealthCheckCache,
  HealthCheckDatabase,
  HealthCheckPubSub,
  HealthCheckQueue,
  SchemaValidationResult,
  SchemaValidator,
  StorageHealthConfig,
  WebSocketStats,
} from './health';
