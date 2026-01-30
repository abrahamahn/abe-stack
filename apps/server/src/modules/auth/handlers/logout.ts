// apps/server/src/modules/auth/handlers/logout.ts
/**
 * Logout Handler
 *
 * Handles user logout by revoking refresh token and clearing cookie.
 */

import { logoutUser } from '../service';
import {
  mapErrorToResponse,
  SUCCESS_MESSAGES,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '@shared';
import { REFRESH_COOKIE_NAME } from '@shared/constants';

import { clearRefreshTokenCookie } from '../utils';

import type { LogoutResponse } from '@abe-stack/core';

export async function handleLogout(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: LogoutResponse } | { status: number; body: { message: string } }> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    await logoutUser(ctx.db, ctx.repos, refreshToken);

    clearRefreshTokenCookie(reply);

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.LOGGED_OUT },
    };
  } catch (error) {
    return mapErrorToResponse(error, ctx);
  }
}
