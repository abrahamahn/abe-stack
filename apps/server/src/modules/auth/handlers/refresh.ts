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
    mapErrorToResponse,
    REFRESH_COOKIE_NAME,
    type AppContext,
    type ReplyWithCookies,
    type RequestWithCookies,
} from '@shared';

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
    // Use error.name checks instead of instanceof for ESM compatibility
    if (error instanceof Error) {
      // Clear cookie on invalid token before returning error
      if (error.name === 'InvalidTokenError') {
        clearRefreshTokenCookie(reply);
        return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
      }

      // Handle token reuse detection - send security alert email
      if (error.name === 'TokenReuseError') {
        clearRefreshTokenCookie(reply);

        // Extract token reuse properties
        const tokenReuseError = error as Error & {
          email?: string;
          userId?: string;
          ipAddress?: string;
          userAgent?: string;
        };

        // Send email alert (fire and forget - don't block the response)
        if (tokenReuseError.email != null && tokenReuseError.email !== '') {
          sendTokenReuseAlert(ctx.email, {
            email: tokenReuseError.email,
            ipAddress: tokenReuseError.ipAddress ?? ipAddress,
            userAgent: tokenReuseError.userAgent ?? userAgent,
            timestamp: new Date(),
          }).catch((emailError: unknown) => {
            ctx.log.error(
              {
                err: emailError instanceof Error ? emailError : new Error(String(emailError)),
                userId: tokenReuseError.userId,
                email: tokenReuseError.email,
              },
              'Failed to send token reuse alert email',
            );
          });
        }

        return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
      }
    }

    return mapErrorToResponse(error, ctx);
  }
}
