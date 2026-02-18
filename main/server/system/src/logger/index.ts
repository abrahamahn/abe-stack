// main/server/system/src/logger/index.ts
/**
 * Logger Module
 *
 * Fastify-specific logging wrappers with correlation ID support.
 * Pure utilities and types are re-exported from @bslt/shared.
 */

// Re-export shared logger constructors and types used by server infrastructure
export {
  createLogger as createBaseLogger, createRequestLogger as createBaseRequestLogger, createConsoleLogger,
  createLogRequestContext,
  getOrCreateCorrelationId,
  type BaseLogger, type Logger as BaseLoggerType, type ConsoleLoggerConfig, type ConsoleLogLevel, type LogData, type LoggerConfig, type LogLevel, type LogRequestContext
} from '@bslt/shared';

// Fastify-specific logger wrappers
export { createLogger, createRequestLogger, type Logger } from './logger';

// Middleware (Fastify-specific)
export { createJobLogger, registerLoggingMiddleware } from './middleware';
