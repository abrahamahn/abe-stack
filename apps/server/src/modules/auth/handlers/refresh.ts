// apps/server/src/modules/auth/handlers/refresh.ts
/**
 * Refresh Handler
 *
 * Handles token refresh using HTTP-only refresh token cookie.
 */

import { refreshUserTokens } from '@auth/service';
import {
  ERROR_MESSAGES,
  InvalidTokenError,
  mapErrorToResponse,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '@shared';
import { REFRESH_COOKIE_NAME } from '@shared/constants';

import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils';

import type { RefreshResponse } from '@abe-stack/core';

export async function handleRefresh(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: RefreshResponse } | { status: number; body: { message: string } }> {
  const oldRefreshToken = request.cookies[REFRESH_COOKIE_NAME];

  if (!oldRefreshToken) {
    return { status: 401, body: { message: ERROR_MESSAGES.NO_REFRESH_TOKEN } };
  }

  const { ipAddress, userAgent } = request.requestInfo;

  try {
    const result = await refreshUserTokens(
      ctx.db,
      ctx.config.auth,
      oldRefreshToken,
      ipAddress,
      userAgent,
    );

    // Set new refresh token cookie
    setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);

    return {
      status: 200,
      body: { token: result.accessToken },
    };
  } catch (error) {
    // Clear cookie on invalid token before returning error
    if (error instanceof InvalidTokenError) {
      clearRefreshTokenCookie(reply);
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    return mapErrorToResponse(error, ctx);
  }
}
