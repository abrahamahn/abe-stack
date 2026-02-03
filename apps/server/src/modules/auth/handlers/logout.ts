// modules/auth/src/handlers/logout.ts
/**
 * Logout Handler
 *
 * Handles user logout by revoking refresh token and clearing cookie.
 *
 * @module handlers/logout
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

import { logoutUser } from '../service';
import { createErrorMapperLogger, REFRESH_COOKIE_NAME, SUCCESS_MESSAGES } from '../types';
import { clearRefreshTokenCookie } from '../utils';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { HttpErrorResponse, LogoutResponse } from '@abe-stack/shared';

/**
 * Handle user logout.
 * Revokes the refresh token and clears the cookie.
 *
 * @param ctx - Application context
 * @param request - Request with cookies
 * @param reply - Reply with cookie support
 * @returns Success response or error
 * @complexity O(1)
 */
export async function handleLogout(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: LogoutResponse } | HttpErrorResponse> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    await logoutUser(ctx.db, ctx.repos, refreshToken);

    clearRefreshTokenCookie(reply);

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.LOGGED_OUT },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
