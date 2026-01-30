// packages/core/src/infrastructure/logger/index.ts
/**
 * Logger Module
 *
 * Provides structured logging types, utilities, a console logger,
 * and a framework-agnostic base logger adapter. No dependency on
 * Fastify or other HTTP frameworks.
 */

// Types
export type { LogData, Logger, LoggerConfig, LogLevel, RequestContext } from './types';

// Base logger adapter (framework-agnostic wrappers)
export type { BaseLogger } from './base-logger';
export {
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestLogger,
} from './base-logger';

// Correlation ID utilities
export {
  createRequestContext,
  generateCorrelationId,
  getOrCreateCorrelationId,
} from './correlation';

// Log level utilities
export { LOG_LEVELS, shouldLog } from './levels';

// Console logger
export type { ConsoleLogLevel, ConsoleLoggerConfig } from './console';
export { CONSOLE_LOG_LEVELS, createConsoleLogger } from './console';
