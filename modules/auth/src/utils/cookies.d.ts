/**
 * Cookie Helper Utilities
 *
 * Centralized cookie management for auth tokens.
 * Eliminates duplicate cookie setting/clearing logic across handlers.
 *
 * @module utils/cookies
 */
import type { ReplyWithCookies } from '../types';
import type { AuthConfig } from '@abe-stack/core';
/**
 * Set the refresh token as an HTTP-only cookie.
 * Used after successful login, registration with auto-login, or token refresh.
 *
 * @param reply - Reply object with cookie support
 * @param token - Refresh token value
 * @param config - Auth configuration for cookie options
 * @complexity O(1)
 */
export declare function setRefreshTokenCookie(reply: ReplyWithCookies, token: string, config: AuthConfig): void;
/**
 * Clear the refresh token cookie.
 * Used after logout or when a token is invalid/expired.
 *
 * @param reply - Reply object with cookie support
 * @complexity O(1)
 */
export declare function clearRefreshTokenCookie(reply: ReplyWithCookies): void;
//# sourceMappingURL=cookies.d.ts.map