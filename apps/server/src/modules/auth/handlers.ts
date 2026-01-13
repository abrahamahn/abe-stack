// apps/server/src/modules/auth/handlers.ts
/**
 * Auth Route Handlers
 *
 * Pure functions that handle authentication requests.
 * Each handler receives AppContext and returns a typed response.
 */

import { validatePassword } from '@abe-stack/core';
import { eq } from 'drizzle-orm';

import { getRefreshCookieOptions } from '../../config';
import { refreshTokens, users, withTransaction } from '../../infra/database';
import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  isAccountLocked,
  logLoginAttempt,
} from '../../infra/security';
import { logAccountLockedEvent } from '../../infra/security/events';
import { ERROR_MESSAGES, REFRESH_COOKIE_NAME, SUCCESS_MESSAGES } from '../../shared/constants';

import { createAccessToken, verifyToken as verifyJwtToken, type TokenPayload } from './utils/jwt';
import { hashPassword, needsRehash, verifyPasswordSafe } from './utils/password';
import { createRefreshTokenFamily, rotateRefreshToken } from './utils/refresh-token';
import { extractRequestInfo } from './utils/request';

import type { AppContext } from '../../shared/types';
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
    const existingUser = await ctx.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (existingUser) {
      return { status: 409, body: { message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED } };
    }

    // Validate password strength
    const passwordValidation = await validatePassword(body.password, [body.email, body.name || '']);

    if (!passwordValidation.isValid) {
      ctx.log.warn(
        { email: body.email, errors: passwordValidation.errors },
        'Password validation failed during registration',
      );
      return {
        status: 400,
        body: { message: ERROR_MESSAGES.WEAK_PASSWORD },
      };
    }

    const passwordHash = await hashPassword(body.password, ctx.config.auth.argon2);

    // Use transaction to ensure user + token family are created atomically
    const { user, refreshToken } = await withTransaction(ctx.db, async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          email: body.email,
          name: body.name || null,
          passwordHash,
          role: 'user',
        })
        .returning();

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      const { token } = await createRefreshTokenFamily(
        tx,
        newUser.id,
        ctx.config.auth.refreshToken.expiryDays,
      );
      return { user: newUser, refreshToken: token };
    });

    // Create access token
    const accessToken = createAccessToken(
      user.id,
      user.email,
      user.role,
      ctx.config.auth.jwt.secret,
      ctx.config.auth.jwt.accessTokenExpiry,
    );

    // Set refresh token as HTTP-only cookie
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(ctx.config.auth));

    return {
      status: 201,
      body: {
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    };
  } catch (error) {
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
    // Check if account is locked out
    const locked = await isAccountLocked(ctx.db, body.email);
    if (locked) {
      await logLoginAttempt(ctx.db, body.email, false, ipAddress, userAgent, 'Account locked');
      return {
        status: 429,
        body: { message: ERROR_MESSAGES.ACCOUNT_LOCKED },
      };
    }

    // Apply progressive delay based on recent failed attempts
    await applyProgressiveDelay(ctx.db, body.email);

    // Fetch user (may be null)
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    // Timing-safe password verification
    const isValid = await verifyPasswordSafe(body.password, user?.passwordHash);

    if (!user) {
      await logLoginAttempt(ctx.db, body.email, false, ipAddress, userAgent, 'User not found');
      const lockoutStatus = await getAccountLockoutStatus(ctx.db, body.email);
      if (lockoutStatus.isLocked) {
        await logAccountLockedEvent(
          ctx.db,
          body.email,
          lockoutStatus.failedAttempts,
          ipAddress,
          userAgent,
        );
      }
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_CREDENTIALS } };
    }

    if (!isValid) {
      await logLoginAttempt(ctx.db, body.email, false, ipAddress, userAgent, 'Invalid password');
      const lockoutStatus = await getAccountLockoutStatus(ctx.db, body.email);
      if (lockoutStatus.isLocked) {
        await logAccountLockedEvent(
          ctx.db,
          body.email,
          lockoutStatus.failedAttempts,
          ipAddress,
          userAgent,
        );
      }
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_CREDENTIALS } };
    }

    // Create tokens and log success atomically
    const { refreshToken } = await withTransaction(ctx.db, async (tx) => {
      await logLoginAttempt(tx, body.email, true, ipAddress, userAgent);
      const { token } = await createRefreshTokenFamily(
        tx,
        user.id,
        ctx.config.auth.refreshToken.expiryDays,
      );
      return { refreshToken: token };
    });

    // Check if password hash needs upgrading
    if (needsRehash(user.passwordHash)) {
      try {
        const newHash = await hashPassword(body.password, ctx.config.auth.argon2);
        await ctx.db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
        ctx.log.info({ userId: user.id }, 'Password hash upgraded');
      } catch (error) {
        ctx.log.error({ userId: user.id, error }, 'Failed to upgrade password hash');
      }
    }

    // Create access token
    const accessToken = createAccessToken(
      user.id,
      user.email,
      user.role,
      ctx.config.auth.jwt.secret,
      ctx.config.auth.jwt.accessTokenExpiry,
    );

    // Set refresh token as HTTP-only cookie
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(ctx.config.auth));

    return {
      status: 200,
      body: {
        token: accessToken,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      },
    };
  } catch (error) {
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
  try {
    const oldRefreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (!oldRefreshToken) {
      return { status: 401, body: { message: ERROR_MESSAGES.NO_REFRESH_TOKEN } };
    }

    const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

    // Rotate the refresh token with reuse detection
    const result = await rotateRefreshToken(
      ctx.db,
      oldRefreshToken,
      ipAddress,
      userAgent,
      ctx.config.auth.refreshToken.expiryDays,
      ctx.config.auth.refreshToken.gracePeriodSeconds,
    );

    if (!result) {
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    // Create new access token
    const newAccessToken = createAccessToken(
      result.userId,
      result.email,
      result.role,
      ctx.config.auth.jwt.secret,
      ctx.config.auth.jwt.accessTokenExpiry,
    );

    // Set new refresh token cookie
    reply.setCookie(REFRESH_COOKIE_NAME, result.token, getRefreshCookieOptions(ctx.config.auth));

    return {
      status: 200,
      body: { token: newAccessToken },
    };
  } catch (error) {
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

    if (refreshToken) {
      await ctx.db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }

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
