// backend/core/src/auth/handlers/login.ts
/**
 * Login Handler
 *
 * Handles user authentication via email/password.
 *
 * @module handlers/login
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

import { authenticateUser } from '../service';
import { createErrorMapperLogger } from '../types';
import { setRefreshTokenCookie } from '../utils';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';
import type { AuthResponse, HttpErrorResponse, LoginRequest } from '@abe-stack/shared';

/**
 * Handle user login via email and password.
 *
 * @param ctx - Application context
 * @param body - Login request body (email + password)
 * @param request - Request with cookies and request info
 * @param reply - Reply with cookie support
 * @returns Auth response with tokens or error response
 * @complexity O(1)
 */
export async function handleLogin(
  ctx: AppContext,
  body: LoginRequest,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<{ status: 200; body: AuthResponse } | HttpErrorResponse> {
  const { ipAddress, userAgent } = request.requestInfo;

  try {
    const { email, password } = body;
    const result = await authenticateUser(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      email,
      password,
      ctx.log,
      ipAddress,
      userAgent,
      (userId) => {
        // Log success - errors are already logged by the service
        ctx.log.info({ userId }, 'Password hash upgraded');
      },
    );

    // Set refresh token as HTTP-only cookie
    setRefreshTokenCookie(reply, result.refreshToken, ctx.config.auth);

    return {
      status: 200,
      body: {
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    return mapErrorToHttpResponse(error, createErrorMapperLogger(ctx.log));
  }
}
