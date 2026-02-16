// main/shared/src/logger/levels.ts
/**
 * Log Level Utilities
 *
 * Log severity ordering and comparison utilities.
 * Provides numeric severity values for log levels and
 * a comparison function for log filtering.
 */

import { LOG_LEVELS } from '../primitives/constants';

import type { LogLevel } from './types';

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
