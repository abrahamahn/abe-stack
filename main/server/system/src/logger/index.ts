// main/server/system/src/logger/index.ts
/**
 * Logger Module
 *
 * Framework-agnostic logging wrappers with correlation ID support.
 * registerLoggingMiddleware and createJobLogger (Fastify-specific) moved to
 * apps/server/src/middleware/logging.ts.
 */

// Re-export shared logger constructors and types used by server infrastructure
export {
  createLogger as createBaseLogger,
  createRequestLogger as createBaseRequestLogger,
  createConsoleLogger,
  createLogRequestContext,
  getOrCreateCorrelationId,
  type BaseLogger,
  type Logger as BaseLoggerType,
  type ConsoleLoggerConfig,
  type ConsoleLogLevel,
  type LogData,
  type LoggerConfig,
  type LogLevel,
  type LogRequestContext,
} from '@bslt/shared/system';

// Logger wrappers (accept BaseLogger instead of FastifyBaseLogger)
export { createLogger, createRequestLogger, type Logger } from './logger';
