// src/shared/src/utils/logger/levels.ts
/**
 * Log Level Utilities
 *
 * Log severity ordering and comparison utilities.
 * Provides numeric severity values for log levels and
 * a comparison function for log filtering.
 */

import type { LogLevel } from './types';

/**
 * Log levels mapped to numeric severity values.
 * Higher number indicates more severe level.
 * Used for comparing and filtering log output.
 *
 * @example
 * ```typescript
 * // Check if 'warn' is more severe than 'info'
 * LOG_LEVELS['warn'] > LOG_LEVELS['info']; // true (40 > 30)
 * ```
 */
export const LOG_LEVELS: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

/**
 * Check if a message at the given level should be logged
 * based on the configured minimum level.
 *
 * @param messageLevel - The level of the message to check
 * @param configuredLevel - The minimum level configured for output
 * @returns true if the message should be logged (messageLevel >= configuredLevel)
 * @complexity O(1) - two map lookups and a comparison
 *
 * @example
 * ```typescript
 * shouldLog('error', 'info');  // true  - error (50) >= info (30)
 * shouldLog('debug', 'warn');  // false - debug (20) < warn (40)
 * shouldLog('warn', 'warn');   // true  - warn (40) >= warn (40)
 * ```
 */
export function shouldLog(messageLevel: LogLevel, configuredLevel: LogLevel): boolean {
  return LOG_LEVELS[messageLevel] >= LOG_LEVELS[configuredLevel];
}
