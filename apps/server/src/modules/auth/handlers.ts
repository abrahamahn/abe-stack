// apps/server/src/modules/auth/handlers.ts
/**
 * Auth Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 */

import {
  authenticateUser,
  logoutUser,
  refreshUserTokens,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
  type RegisterResult,
} from '@auth/service';
import { getRefreshCookieOptions } from '@config';
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  ERROR_MESSAGES,
  InvalidCredentialsError,
  InvalidTokenError,
  SUCCESS_MESSAGES,
  WeakPasswordError,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '@shared';
import { REFRESH_COOKIE_NAME } from '@shared/constants';

import { extractRequestInfo } from './utils';

export type { RegisterResult } from '@auth/service';

import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
} from '@abe-stack/core';
import type { FastifyRequest } from 'fastify';

// ============================================================================
// Handlers
// ============================================================================

export async function handleRegister(
  ctx: AppContext,
  body: RegisterRequest,
  _reply: ReplyWithCookies,
): Promise<
  { status: 201; body: RegisterResult } | { status: 400 | 409 | 500; body: { message: string } }
> {
  try {
    const { email, password, name } = body;
    const baseUrl = `http://localhost:${String(ctx.config.server.port)}`;
    const result = await registerUser(
      ctx.db,
      ctx.email,
      ctx.config.auth,
      email,
      password,
      name,
      baseUrl,
    );

    // No cookies set - user must verify email first
    return {
      status: 201,
      body: result,
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
  | { status: 200; body: AuthResponse }
  | { status: 401; body: { message: string; code?: string; email?: string } }
  | { status: 400 | 429 | 500; body: { message: string } }
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

    if (error instanceof EmailNotVerifiedError) {
      return {
        status: 401,
        body: {
          message: error.message,
          code: 'EMAIL_NOT_VERIFIED',
          email: error.email,
        },
      };
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

export async function handleForgotPassword(
  ctx: AppContext,
  body: { email: string },
): Promise<
  { status: 200; body: { message: string } } | { status: 400 | 500; body: { message: string } }
> {
  try {
    const { email } = body;
    const baseUrl = `http://localhost:${String(ctx.config.server.port)}`;
    await requestPasswordReset(ctx.db, ctx.email, email, baseUrl);

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT },
    };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

export async function handleResetPassword(
  ctx: AppContext,
  body: { token: string; password: string },
): Promise<
  { status: 200; body: { message: string } } | { status: 400 | 500; body: { message: string } }
> {
  try {
    const { token, password } = body;
    await resetPassword(ctx.db, ctx.config.auth, token, password);

    return {
      status: 200,
      body: { message: 'Password reset successfully' },
    };
  } catch (error) {
    if (error instanceof WeakPasswordError) {
      ctx.log.warn({ errors: error.details?.errors }, 'Password validation failed during reset');
      return { status: 400, body: { message: ERROR_MESSAGES.WEAK_PASSWORD } };
    }

    if (error instanceof InvalidTokenError) {
      return { status: 400, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

export async function handleVerifyEmail(
  ctx: AppContext,
  body: { token: string },
  reply: ReplyWithCookies,
): Promise<
  | { status: 200; body: AuthResponse & { verified: boolean } }
  | { status: 400 | 404 | 500; body: { message: string } }
> {
  try {
    const { token } = body;
    const result = await verifyEmail(ctx.db, ctx.config.auth, token);

    // Set refresh token as HTTP-only cookie for auto-login
    reply.setCookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      getRefreshCookieOptions(ctx.config.auth),
    );

    return {
      status: 200,
      body: {
        verified: true,
        token: result.accessToken,
        user: result.user,
      },
    };
  } catch (error) {
    if (error instanceof InvalidTokenError) {
      return { status: 400, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

export async function handleResendVerification(
  ctx: AppContext,
  body: { email: string },
): Promise<
  { status: 200; body: { message: string } } | { status: 500; body: { message: string } }
> {
  try {
    const { email } = body;
    const baseUrl = `http://localhost:${String(ctx.config.server.port)}`;
    await resendVerificationEmail(ctx.db, ctx.email, email, baseUrl);

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.VERIFICATION_EMAIL_SENT },
    };
  } catch (error) {
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
