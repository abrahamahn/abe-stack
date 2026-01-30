// apps/server/src/modules/auth/handlers/login.ts
/**
 * Login Handler
 *
 * Handles user authentication via email/password.
 */

import { authenticateUser } from '../service';
import {
  mapErrorToResponse,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '@shared';

import { setRefreshTokenCookie } from '../utils';

import type { AuthResponse, LoginRequest } from '@abe-stack/core';

export async function handleLogin(
  ctx: AppContext,
  body: LoginRequest,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  | { status: 200; body: AuthResponse }
  | { status: number; body: { message: string; code?: string; email?: string } }
> {
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
    return mapErrorToResponse(error, ctx);
  }
}
