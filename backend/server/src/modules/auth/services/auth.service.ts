// backend/server/src/modules/auth/services/auth.service.ts
/**
 * Authentication service
 * Business logic for user authentication
 */

import { refreshTokens, users, withTransaction } from '@db';
import { validatePassword } from '@abe-stack/shared';
import { eq } from 'drizzle-orm';

import { ERROR_MESSAGES, SUCCESS_MESSAGES, REFRESH_COOKIE_NAME } from '../../../common/constants';
import { logAccountLockedEvent } from '../../../infra/logger/security-events';
import { getRefreshCookieOptions } from '../../../env';
import { extractRequestInfo } from '../../../common/middleware/request-utils';
import { createRefreshTokenFamily, rotateRefreshToken } from '../utils/refresh-token';

import type { FastifyRequest, FastifyInstance } from 'fastify';
import type { ServerEnvironment } from '../../../env';
import type { ReplyWithCookies, RequestWithCookies } from '../../../common/types';
import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
} from '@abe-stack/shared';

type AuthResult<T> =
  | { status: 200 | 201; body: T }
  | { status: 400 | 401 | 403 | 404 | 409 | 429 | 500; body: { message: string } };

/**
 * Handle user registration
 */
export async function handleRegister(
  env: ServerEnvironment,
  app: FastifyInstance,
  body: RegisterRequest,
  reply: ReplyWithCookies,
): Promise<AuthResult<AuthResponse>> {
  try {
    const existingUser = await env.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (existingUser) {
      return { status: 409, body: { message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED } };
    }

    // Validate password strength
    const passwordValidation = await validatePassword(body.password, [body.email, body.name || '']);

    if (!passwordValidation.isValid) {
      app.log.warn(
        { email: body.email, errors: passwordValidation.errors },
        'Password validation failed during registration',
      );
      return {
        status: 400,
        body: { message: ERROR_MESSAGES.WEAK_PASSWORD },
      };
    }

    const passwordHash = await env.security.hashPassword(body.password);

    // Use transaction to ensure user + token family are created atomically
    const { user, refreshToken } = await withTransaction(env.db, async (tx) => {
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

      // Create refresh token family within same transaction
      const { token } = await createRefreshTokenFamily(tx, env.security, newUser.id);

      return { user: newUser, refreshToken: token };
    });

    // Create access token
    const accessToken = env.security.createAccessToken(user.id, user.email, user.role);

    // Set refresh token as HTTP-only cookie
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(env.config));

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
    app.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Handle user login
 */
export async function handleLogin(
  env: ServerEnvironment,
  app: FastifyInstance,
  body: LoginRequest,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<AuthResult<AuthResponse>> {
  // Extract request info for security logging
  const { ipAddress, userAgent } = extractRequestInfo(
    request as unknown as FastifyRequest,
    env.config,
  );

  try {
    // Check if account is locked out
    const locked = await env.security.isAccountLocked(env.db, body.email);
    if (locked) {
      await env.security.logLoginAttempt(
        env.db,
        body.email,
        false,
        ipAddress,
        userAgent,
        'Account locked',
      );
      return {
        status: 429,
        body: { message: ERROR_MESSAGES.ACCOUNT_LOCKED },
      };
    }

    // Apply progressive delay based on recent failed attempts
    await env.security.applyProgressiveDelay(env.db, body.email);

    // Fetch user (may be null)
    const user = await env.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    // Timing-safe password verification
    const isValid = await env.security.verifyPasswordSafe(body.password, user?.passwordHash);

    if (!user) {
      await env.security.logLoginAttempt(
        env.db,
        body.email,
        false,
        ipAddress,
        userAgent,
        'User not found',
      );

      const lockoutStatus = await env.security.getAccountLockoutStatus(env.db, body.email);
      if (lockoutStatus.isLocked) {
        await logAccountLockedEvent(
          env.db,
          body.email,
          lockoutStatus.failedAttempts,
          ipAddress,
          userAgent,
        );
      }

      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_CREDENTIALS } };
    }

    if (!isValid) {
      await env.security.logLoginAttempt(
        env.db,
        body.email,
        false,
        ipAddress,
        userAgent,
        'Invalid password',
      );

      const lockoutStatus = await env.security.getAccountLockoutStatus(env.db, body.email);
      if (lockoutStatus.isLocked) {
        await logAccountLockedEvent(
          env.db,
          body.email,
          lockoutStatus.failedAttempts,
          ipAddress,
          userAgent,
        );
      }

      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_CREDENTIALS } };
    }

    // Create tokens and log success atomically
    const { refreshToken } = await withTransaction(env.db, async (tx) => {
      await env.security.logLoginAttempt(tx, body.email, true, ipAddress, userAgent);
      const { token } = await createRefreshTokenFamily(tx, env.security, user.id);
      return { refreshToken: token };
    });

    // Check if password hash needs upgrading
    if (env.security.needsRehash(user.passwordHash)) {
      try {
        const newHash = await env.security.hashPassword(body.password);
        await env.db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
        app.log.info({ userId: user.id }, 'Password hash upgraded');
      } catch (error) {
        app.log.error({ userId: user.id, error }, 'Failed to upgrade password hash');
      }
    }

    // Create access token
    const accessToken = env.security.createAccessToken(user.id, user.email, user.role);

    // Set refresh token as HTTP-only cookie
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, getRefreshCookieOptions(env.config));

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
    app.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Handle token refresh
 */
export async function handleRefresh(
  env: ServerEnvironment,
  app: FastifyInstance,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<AuthResult<RefreshResponse>> {
  try {
    const oldRefreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (!oldRefreshToken) {
      return { status: 401, body: { message: ERROR_MESSAGES.NO_REFRESH_TOKEN } };
    }

    const { ipAddress, userAgent } = extractRequestInfo(
      request as unknown as FastifyRequest,
      env.config,
    );

    // Rotate the refresh token with reuse detection
    const result = await rotateRefreshToken(
      env.db,
      env.config,
      env.security,
      oldRefreshToken,
      ipAddress,
      userAgent,
    );

    if (!result) {
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    // Create new access token
    const newAccessToken = env.security.createAccessToken(result.userId, result.email, result.role);

    // Set new refresh token cookie
    reply.setCookie(REFRESH_COOKIE_NAME, result.token, getRefreshCookieOptions(env.config));

    return {
      status: 200,
      body: { token: newAccessToken },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Handle user logout
 */
export async function handleLogout(
  env: ServerEnvironment,
  app: FastifyInstance,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<AuthResult<LogoutResponse>> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await env.db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.LOGGED_OUT },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
