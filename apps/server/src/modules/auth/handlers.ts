// apps/server/src/modules/auth/handlers.ts
/**
 * Auth Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import { authenticateUser, logoutUser, refreshUserTokens, registerUser } from '@auth/service';
import { getRefreshCookieOptions } from '@config';
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  ERROR_MESSAGES,
  InvalidCredentialsError,
  InvalidTokenError,
  SUCCESS_MESSAGES,
  WeakPasswordError,
  type AppContext,
} from '@shared';
import { REFRESH_COOKIE_NAME } from '@shared/constants';
import { extractRequestInfo, verifyToken as verifyJwtToken, type TokenPayload } from './utils';

import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
} from '@abe-stack/core';
import type { FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

export interface ReplyWithCookies {
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}

export interface RequestWithCookies {
  cookies: Record<string, string | undefined>;
  headers: { authorization?: string };
  user?: { userId: string; email: string; role: string };
}

// ============================================================================
// Handlers
// ============================================================================

export async function handleRegister(
  ctx: AppContext,
  body: RegisterRequest,
  reply: ReplyWithCookies,
): Promise<
  { status: 201; body: AuthResponse } | { status: 400 | 409 | 500; body: { message: string } }
> {
  try {
    const { email, password, name } = body;
    const result = await registerUser(
      ctx.db,
      ctx.config.auth,
      email,
      password,
      name,
    );

    // Set refresh token as HTTP-only cookie
    reply.setCookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      getRefreshCookieOptions(ctx.config.auth),
    );

    return {
      status: 201,
      body: {
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    if (error instanceof EmailAlreadyExistsError) {
      return { status: 409, body: { message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED } };
    }

    if (error instanceof WeakPasswordError) {
      ctx.log.warn(
        { email: body.email, errors: error.details?.errors },
        'Password validation failed during registration',
      );
      return { status: 400, body: { message: ERROR_MESSAGES.WEAK_PASSWORD } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

export async function handleLogin(
  ctx: AppContext,
  body: LoginRequest,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: AuthResponse } | { status: 400 | 401 | 429 | 500; body: { message: string } }
> {
  const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

  try {
    const { email, password } = body;
    const result = await authenticateUser(
      ctx.db,
      ctx.config.auth,
      email,
      password,
      ipAddress,
      userAgent,
      (userId, error) => {
        if (error) {
          ctx.log.error({ userId, error }, 'Failed to upgrade password hash');
        } else {
          ctx.log.info({ userId }, 'Password hash upgraded');
        }
      },
    );

    // Set refresh token as HTTP-only cookie
    reply.setCookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      getRefreshCookieOptions(ctx.config.auth),
    );

    return {
      status: 200,
      body: {
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    if (error instanceof AccountLockedError) {
      return { status: 429, body: { message: ERROR_MESSAGES.ACCOUNT_LOCKED } };
    }

    if (error instanceof InvalidCredentialsError) {
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_CREDENTIALS } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

export async function handleRefresh(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: RefreshResponse } | { status: 401 | 500; body: { message: string } }
> {
  const oldRefreshToken = request.cookies[REFRESH_COOKIE_NAME];

  if (!oldRefreshToken) {
    return { status: 401, body: { message: ERROR_MESSAGES.NO_REFRESH_TOKEN } };
  }

  const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

  try {
    const result = await refreshUserTokens(
      ctx.db,
      ctx.config.auth,
      oldRefreshToken,
      ipAddress,
      userAgent,
    );

    // Set new refresh token cookie
    reply.setCookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      getRefreshCookieOptions(ctx.config.auth),
    );

    return {
      status: 200,
      body: { token: result.accessToken },
    };
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

export async function handleLogout(
  ctx: AppContext,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: LogoutResponse } | { status: 401 | 500; body: { message: string } }
> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];
    await logoutUser(ctx.db, refreshToken);

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.LOGGED_OUT },
    };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Token Verification (for use in other modules)
// ============================================================================

export function verifyToken(token: string, secret: string): TokenPayload {
  return verifyJwtToken(token, secret);
}
