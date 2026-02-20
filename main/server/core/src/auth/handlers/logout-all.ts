// main/server/core/src/auth/handlers/logout-all.ts
/**
 * Logout All Devices Handler
 *
 * Revokes all refresh tokens for a user, logging them out of all devices.
 *
 * @module handlers/logout-all
 */

import { HTTP_STATUS, mapErrorToHttpResponse } from '@bslt/shared';

import { createErrorMapperLogger } from '../types';
import { clearRefreshTokenCookie, revokeAllUserTokens } from '../utils';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { HttpErrorResponse } from '@bslt/shared';

/**
 * Handle logout from all devices.
 * Revokes all user tokens and clears the current cookie.
 *
 * @param ctx - Application context
 * @param request - Request with cookies and auth info
 * @param reply - Reply with cookie support
 * @returns Success response or error
 * @complexity O(1)
 */
export async function handleLogoutAll(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;

    if (userId === undefined || userId === '') {
      return {
        status: HTTP_STATUS.UNAUTHORIZED,
        body: { message: 'Unauthorized' },
      };
    }

    await revokeAllUserTokens(ctx.db, userId);
    clearRefreshTokenCookie(reply);

    return {
      status: HTTP_STATUS.OK,
      body: { message: 'Logged out from all devices' },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
