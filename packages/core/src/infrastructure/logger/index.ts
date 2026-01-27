// packages/core/src/infrastructure/logger/index.ts
/**
 * Logger Module
 *
 * Provides structured logging utilities for the application.
 */

export type { ConsoleLoggerConfig, LogData, LogLevel } from './console';
export { createConsoleLogger, LOG_LEVELS } from './console';
