// main/shared/src/engine/auth/auth-helpers.ts
/**
 * Auth Configuration Helpers
 *
 * Pure utility functions that operate on AuthConfig.
 * Single source of truth — consumed by backend/core/auth and apps/server.
 *
 * @module config/auth-helpers
 */

import { MS_PER_DAY } from '../../primitives/constants';

import type { AuthConfig, AuthStrategy } from '../../config/types/auth';

/**
 * Gets refresh token cookie options based on auth config.
 *
 * @param config - Auth configuration
 * @returns Cookie options for the refresh token
 * @complexity O(1)
 */
export function getRefreshCookieOptions(config: AuthConfig): {
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'strict' | 'lax' | 'none';
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: config.cookie.httpOnly,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.refreshToken.expiryDays * MS_PER_DAY,
  };
}

/**
 * Checks if a specific auth strategy is enabled.
 *
 * @param config - Auth configuration
 * @param strategy - The strategy to check
 * @returns True if the strategy is enabled
 * @complexity O(n) where n is the number of configured strategies (typically < 10)
 */
export function isStrategyEnabled(config: AuthConfig, strategy: AuthStrategy): boolean {
  return config.strategies.includes(strategy);
}
