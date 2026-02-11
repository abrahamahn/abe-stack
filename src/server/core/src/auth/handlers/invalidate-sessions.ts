// src/server/core/src/auth/handlers/invalidate-sessions.ts
/**
 * Invalidate All Sessions Handler
 *
 * Increments the user's token_version (invalidating all JWTs) and revokes
 * all refresh token families, forcing re-authentication on every device.
 *
 * @module handlers/invalidate-sessions
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

import { createErrorMapperLogger } from '../types';
import { clearRefreshTokenCookie, revokeAllUserTokens } from '../utils';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { HttpErrorResponse } from '@abe-stack/shared';

/**
 * Handle session invalidation for the current user.
 * Increments token_version and revokes all refresh token families.
 *
 * @param ctx - Application context
 * @param request - Request with auth info
 * @param reply - Reply with cookie support
 * @returns Success response or error
 */
export async function handleInvalidateSessions(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;

    if (userId === undefined || userId === '') {
      return { status: 401, body: { message: 'Unauthorized' } };
    }

    // Increment token version — all existing JWTs become stale on next refresh
    await ctx.repos.users.incrementTokenVersion(userId);

    // Revoke all refresh token families — forces immediate re-auth
    await revokeAllUserTokens(ctx.db, userId);

    clearRefreshTokenCookie(reply);

    return {
      status: 200,
      body: { message: 'All sessions invalidated' },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
