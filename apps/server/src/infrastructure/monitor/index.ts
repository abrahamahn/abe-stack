// apps/server/src/infrastructure/monitor/index.ts
/**
 * Monitor Layer
 *
 * Observability and monitoring:
 * - health: Health check endpoints
 * - logger: Logging utilities
 */

// Health checks
export {
  checkDatabase,
  checkEmail,
  checkPubSub,
  checkRateLimit,
  checkStorage,
  checkWebSocket,
  getDetailedHealth,
  logStartupSummary,
  type DetailedHealthResponse,
  type LiveResponse,
  type OverallStatus,
  type ReadyResponse,
  type RoutesResponse,
  type ServiceHealth,
  type ServiceStatus,
  type StartupSummaryOptions,
} from './health';

// Logger
export {
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestContext,
  createRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  LOG_LEVELS,
  registerLoggingMiddleware,
  shouldLog,
  type LogData,
  type Logger,
  type LoggerConfig,
  type LogLevel,
  type RequestContext,
} from './logger';
