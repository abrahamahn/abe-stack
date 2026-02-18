// main/server/engine/src/logger/index.ts
/**
 * Logger Module
 *
 * Fastify-specific logging wrappers with correlation ID support.
 * Pure utilities and types are re-exported from @bslt/shared.
 */

// Re-export all pure utilities and types from shared
export {
  CONSOLE_LOG_LEVELS, createLogger as createBaseLogger, createRequestLogger as createBaseRequestLogger, createConsoleLogger,
  createJobCorrelationId, createRequestContext, generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId, LOG_LEVELS, shouldLog,
  type BaseLogger, type Logger as BaseLoggerType, type ConsoleLoggerConfig, type ConsoleLogLevel, type LogData, type LoggerConfig, type LogLevel, type RequestContext
} from '@bslt/shared';

// Fastify-specific logger wrappers
export { createLogger, createRequestLogger, type Logger } from './logger';

// Middleware (Fastify-specific)
export { createJobLogger, registerLoggingMiddleware } from './middleware';
