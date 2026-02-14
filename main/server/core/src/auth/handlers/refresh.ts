// main/server/core/src/auth/handlers/refresh.ts
/**
 * Refresh Handler
 *
 * Handles token refresh using HTTP-only refresh token cookie.
 *
 * @module handlers/refresh
 */

import {
    AUTH_ERROR_MESSAGES as ERROR_MESSAGES,
    HTTP_STATUS,
    mapErrorToHttpResponse,
} from '@abe-stack/shared';

import { sendTokenReuseAlert } from '../security';
import { refreshUserTokens } from '../service';
import { createErrorMapperLogger, REFRESH_COOKIE_NAME } from '../types';
import { clearRefreshTokenCookie, setRefreshTokenCookie } from '../utils';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { HttpErrorResponse, RefreshResponse } from '@abe-stack/shared';

/**
 * Handle token refresh.
 * Rotates the refresh token and issues a new access token.
 *
 * @param ctx - Application context
 * @param request - Request with cookies
 * @param reply - Reply with cookie support
 * @returns New tokens or error response
 * @complexity O(1)
 */
export async function handleRefresh(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: RefreshResponse } | HttpErrorResponse> {
  const oldRefreshToken = request.cookies[REFRESH_COOKIE_NAME];

  ctx.log.debug(
    { hasRefreshToken: oldRefreshToken !== undefined && oldRefreshToken !== '' },
    'Refresh attempt',
  );

  if (oldRefreshToken === undefined || oldRefreshToken === '') {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: ERROR_MESSAGES.NO_REFRESH_TOKEN } };
  }

  const { ipAddress, userAgent } = request.requestInfo;

  try {
    // Idle timeout check: reject if the old token was created too long ago
    // (token creation time approximates last activity since tokens rotate on each refresh)
    const idleTimeoutMinutes = ctx.config.auth.sessions?.idleTimeoutMinutes ?? 30;
    const tokenRecord = await ctx.repos.refreshTokens.findByToken(oldRefreshToken);

    if (tokenRecord != null) {
      const idleMs = Date.now() - tokenRecord.createdAt.getTime();
      if (idleMs > idleTimeoutMinutes * 60 * 1000) {
        clearRefreshTokenCookie(reply);
        return {
          status: HTTP_STATUS.UNAUTHORIZED,
          body: { message: ERROR_MESSAGES.INVALID_TOKEN },
        };
      }
    }

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
      status: HTTP_STATUS.OK,
      body: { token: result.accessToken },
    };
  } catch (error) {
    // Use error.name checks instead of instanceof for ESM compatibility
    if (error instanceof Error) {
      // Clear cookie on invalid token before returning error
      if (error.name === 'InvalidTokenError') {
        clearRefreshTokenCookie(reply);
        return {
          status: HTTP_STATUS.UNAUTHORIZED,
          body: { message: ERROR_MESSAGES.INVALID_TOKEN },
        };
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
          sendTokenReuseAlert(ctx.email, ctx.emailTemplates, {
            email: tokenReuseError.email,
            ipAddress: tokenReuseError.ipAddress ?? ipAddress,
            userAgent: tokenReuseError.userAgent ?? userAgent,
            timestamp: new Date(),
          }).catch((emailError: unknown) => {
            const err = emailError instanceof Error ? emailError : new Error(String(emailError));
            const logData: { error: Error; userId?: string; email?: string } = { error: err };
            if (tokenReuseError.userId !== undefined) {
              logData.userId = tokenReuseError.userId;
            }
            if (tokenReuseError.email !== undefined) {
              logData.email = tokenReuseError.email;
            }
            ctx.log.error(logData, 'Failed to send token reuse alert email');
          });
        }

        return {
          status: HTTP_STATUS.UNAUTHORIZED,
          body: { message: ERROR_MESSAGES.INVALID_TOKEN },
        };
      }
    }

    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
