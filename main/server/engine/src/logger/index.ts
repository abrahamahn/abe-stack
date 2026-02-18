// main/server/engine/src/logger/index.ts
/**
 * Logger Module
 *
 * Fastify-specific logging wrappers with correlation ID support.
 * Pure utilities and types are re-exported from @abe-stack/shared.
 */

// Re-export all pure utilities and types from shared
export {
  CONSOLE_LOG_LEVELS,
  LOG_LEVELS,
  createConsoleLogger,
  createJobCorrelationId,
  createLogger as createBaseLogger,
  createRequestContext,
  createRequestLogger as createBaseRequestLogger,
  generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId,
  shouldLog,
  type BaseLogger,
  type ConsoleLogLevel,
  type ConsoleLoggerConfig,
  type LogData,
  type LogLevel,
  type Logger as BaseLoggerType,
  type LoggerConfig,
  type RequestContext,
} from '@abe-stack/shared';

// Fastify-specific logger wrappers
export { createLogger, createRequestLogger, type Logger } from './logger';

// Middleware (Fastify-specific)
export { createJobLogger, registerLoggingMiddleware } from './middleware';
