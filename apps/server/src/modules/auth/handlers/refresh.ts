// apps/server/src/modules/auth/handlers/refresh.ts
/**
 * Refresh Handler
 *
 * Handles token refresh using HTTP-only refresh token cookie.
 */

import { sendTokenReuseAlert } from '@auth/security';
import { refreshUserTokens } from '@auth/service';
import {
    ERROR_MESSAGES,
    InvalidTokenError,
    mapErrorToResponse,
    TokenReuseError,
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

  if (oldRefreshToken === undefined || oldRefreshToken === '') {
    return { status: 401, body: { message: ERROR_MESSAGES.NO_REFRESH_TOKEN } };
  }

  const { ipAddress, userAgent } = request.requestInfo;

  try {
    const result = await refreshUserTokens(
      ctx.db,
      ctx.repos,
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

    // Handle token reuse detection - send security alert email
    if (error instanceof TokenReuseError) {
      clearRefreshTokenCookie(reply);

      // Send email alert (fire and forget - don't block the response)
      if (error.email != null && error.email !== '') {
        sendTokenReuseAlert(ctx.email, {
          email: error.email,
          ipAddress: error.ipAddress ?? ipAddress,
          userAgent: error.userAgent ?? userAgent,
          timestamp: new Date(),
        }).catch((emailError: unknown) => {
          ctx.log.error(
            {
              err: emailError instanceof Error ? emailError : new Error(String(emailError)),
              userId: error.userId,
              email: error.email,
            },
            'Failed to send token reuse alert email',
          );
        });
      }

      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    return mapErrorToResponse(error, ctx);
  }
}
