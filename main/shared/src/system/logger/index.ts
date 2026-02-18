// main/shared/src/system/logger/index.ts
/**
 * Logger Module
 *
 * Provides structured logging types, utilities, a console logger,
 * and a framework-agnostic base logger adapter. No dependency on
 * Fastify or other HTTP frameworks.
 */

// Types
export type { LogData, Logger, LoggerConfig, LogLevel, LogRequestContext } from './types';

// Base logger adapter (framework-agnostic wrappers)
export type { BaseLogger } from './base.logger';
export {
  createJobCorrelationId,
  createJobLogger,
  createLogger,
  createRequestLogger,
} from './base.logger';

// Correlation ID utilities
export {
  createLogRequestContext,
  generateCorrelationId,
  getOrCreateCorrelationId,
  isValidCorrelationId,
} from './correlation';

// Log level utilities
export { shouldLog } from './levels';

// Console logger
export type { ConsoleLogLevel, ConsoleLoggerConfig } from './console';
export { CONSOLE_LOG_LEVELS, createConsoleLogger } from './console';
