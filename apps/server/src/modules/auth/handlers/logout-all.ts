// apps/server/src/modules/auth/handlers/logout-all.ts
/**
 * Logout All Devices Handler
 *
 * Revokes all refresh tokens for a user, logging them out of all devices.
 */

import {
    mapErrorToResponse,
    type AppContext,
    type ReplyWithCookies,
    type RequestWithCookies,
} from '@shared';

import { clearRefreshTokenCookie, revokeAllUserTokens } from '../utils';

export async function handleLogoutAll(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: { message: string } } | { status: number; body: { message: string } }
> {
  try {
    const userId = request.user?.userId;

    if (userId === undefined || userId === '') {
      return {
        status: 401,
        body: { message: 'Unauthorized' },
      };
    }

    await revokeAllUserTokens(ctx.db, userId);
    clearRefreshTokenCookie(reply);

    return {
      status: 200,
      body: { message: 'Logged out from all devices' },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}
