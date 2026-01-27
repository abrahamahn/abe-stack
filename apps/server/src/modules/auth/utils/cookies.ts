// apps/server/src/modules/auth/utils/cookies.ts
/**
 * Cookie Helper Utilities
 *
 * Centralized cookie management for auth tokens.
 * Eliminates duplicate cookie setting/clearing logic across handlers.
 */

import { REFRESH_COOKIE_NAME } from '@shared/constants';

import type { AuthConfig } from '@/config';
import type { ReplyWithCookies } from '@shared';

import { getRefreshCookieOptions } from '@/config';

/**
 * Set the refresh token as an HTTP-only cookie.
 * Used after successful login, registration with auto-login, or token refresh.
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
 */
export function clearRefreshTokenCookie(reply: ReplyWithCookies): void {
  reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
}
