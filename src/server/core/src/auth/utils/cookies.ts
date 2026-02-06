// backend/core/src/auth/utils/cookies.ts
/**
 * Cookie Helper Utilities
 *
 * Centralized cookie management for auth tokens.
 * Eliminates duplicate cookie setting/clearing logic across handlers.
 *
 * @module utils/cookies
 */

import { getRefreshCookieOptions } from '@abe-stack/shared/config';

import { REFRESH_COOKIE_NAME } from '../types';

import type { ReplyWithCookies } from '../types';
import type { AuthConfig } from '@abe-stack/shared/config';

/**
 * Set the refresh token as an HTTP-only cookie.
 * Used after successful login, registration with auto-login, or token refresh.
 *
 * @param reply - Reply object with cookie support
 * @param token - Refresh token value
 * @param config - Auth configuration for cookie options
 * @complexity O(1)
 */
export function setRefreshTokenCookie(
  reply: ReplyWithCookies,
  token: string,
  config: AuthConfig,
): void {
  reply.setCookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions(config));
}

/**
 * Clear the refresh token cookie.
 * Used after logout or when a token is invalid/expired.
 *
 * @param reply - Reply object with cookie support
 * @complexity O(1)
 */
export function clearRefreshTokenCookie(reply: ReplyWithCookies): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
}
