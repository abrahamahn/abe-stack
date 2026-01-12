// apps/server/src/routes/index.ts
import { refreshTokens, users, withTransaction } from '@abe-stack/db';
import { apiContract, validatePassword } from '@abe-stack/shared';
import { initServer } from '@ts-rest/fastify';
import { eq } from 'drizzle-orm';

import { getRefreshCookieOptions } from '../config/auth';
import { ERROR_MESSAGES, REFRESH_COOKIE_NAME, SUCCESS_MESSAGES } from '../lib/constants';
import { createAccessToken, verifyToken } from '../lib/jwt';
import { hashPassword, needsRehash, verifyPasswordSafe } from '../lib/password';
import { createRefreshTokenFamily, rotateRefreshToken } from '../lib/refresh-token';
import { extractRequestInfo } from '../lib/request-utils';
import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  isAccountLocked,
  logLoginAttempt,
  unlockAccount,
} from '../lib/security';
import { logAccountLockedEvent } from '../lib/security-events';

import type { ServerEnvironment } from '../services';
import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
  UnlockAccountRequest,
  UnlockAccountResponse,
  UserResponse,
} from '@abe-stack/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';

// Reply type that supports cookie operations
interface ReplyWithCookies {
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}

// Request type that supports cookie reading
interface RequestWithCookies {
  cookies: Record<string, string | undefined>;
  headers: { authorization?: string };
  user?: { userId: string; email: string; role: string };
}

// Cookie options helper
const getCookieOptions = (): ReturnType<typeof getRefreshCookieOptions> =>
  getRefreshCookieOptions();

export function registerRoutes(app: FastifyInstance, env: ServerEnvironment): void {
  const s = initServer();

  const router = s.router(apiContract, {
    auth: {
      register: async ({ body, reply }) => handleRegister(env, body, reply),
      login: async ({ body, request, reply }) => handleLogin(env, body, request, reply),
      refresh: async ({ request, reply }) => handleRefresh(env, request, reply),
      logout: async ({ request, reply }) => handleLogout(env, request, reply),
      verifyEmail: async () =>
        Promise.resolve({
          status: 404 as const,
          body: { message: SUCCESS_MESSAGES.EMAIL_VERIFICATION_NOT_IMPLEMENTED },
        }),
    },
    users: {
      me: async ({ request }) => handleMe(env, request),
    },
    admin: {
      unlockAccount: async ({ body, request }) => handleAdminUnlock(env, body, request),
    },
  });

  s.registerRouter(apiContract, router, app);
}

async function handleRegister(
  env: ServerEnvironment,
  body: RegisterRequest,
  reply: ReplyWithCookies,
): Promise<
  { status: 201; body: AuthResponse } | { status: 400 | 409 | 500; body: { message: string } }
> {
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
      // Don't leak password policy details to potential attackers
      // Log detailed errors server-side, return generic message to client
      env.log.warn(
        { email: body.email, errors: passwordValidation.errors },
        'Password validation failed during registration',
      );
      return {
        status: 400,
        body: {
          message: ERROR_MESSAGES.WEAK_PASSWORD,
        },
      };
    }

    const passwordHash = await hashPassword(body.password);

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
      const { token } = await createRefreshTokenFamily(tx, newUser.id);

      return { user: newUser, refreshToken: token };
    });

    // Create access token
    const accessToken = createAccessToken(user.id, user.email, user.role);

    // Set refresh token as HTTP-only cookie
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

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
    env.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

async function handleLogin(
  env: ServerEnvironment,
  body: LoginRequest,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: AuthResponse } | { status: 400 | 401 | 429 | 500; body: { message: string } }
> {
  // Extract request info for security logging
  const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

  try {
    // Check if account is locked out
    const locked = await isAccountLocked(env.db, body.email);
    if (locked) {
      await logLoginAttempt(env.db, body.email, false, ipAddress, userAgent, 'Account locked');
      return {
        status: 429,
        body: {
          message: ERROR_MESSAGES.ACCOUNT_LOCKED,
        },
      };
    }

    // Apply progressive delay based on recent failed attempts
    await applyProgressiveDelay(env.db, body.email);

    // Fetch user (may be null)
    const user = await env.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    // Timing-safe password verification (always performs hash even if user doesn't exist)
    const isValid = await verifyPasswordSafe(body.password, user?.passwordHash);

    if (!user) {
      await logLoginAttempt(env.db, body.email, false, ipAddress, userAgent, 'User not found');

      // Check if this failure caused account lockout
      const lockoutStatus = await getAccountLockoutStatus(env.db, body.email);
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
      await logLoginAttempt(env.db, body.email, false, ipAddress, userAgent, 'Invalid password');

      // Check if this failure caused account lockout
      const lockoutStatus = await getAccountLockoutStatus(env.db, body.email);
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
      // Log successful login
      await logLoginAttempt(tx, body.email, true, ipAddress, userAgent);

      // Create refresh token family within transaction
      const { token } = await createRefreshTokenFamily(tx, user.id);

      return { refreshToken: token };
    });

    // Check if password hash needs upgrading (e.g., from bcrypt to Argon2, or old Argon2 params)
    // Done outside transaction since it's non-critical
    if (needsRehash(user.passwordHash)) {
      try {
        const newHash = await hashPassword(body.password);
        await env.db.update(users).set({ passwordHash: newHash }).where(eq(users.id, user.id));
        env.log.info({ userId: user.id }, 'Password hash upgraded');
      } catch (error) {
        // Non-critical - log but don't fail login
        env.log.error({ userId: user.id, error }, 'Failed to upgrade password hash');
      }
    }

    // Create access token
    const accessToken = createAccessToken(user.id, user.email, user.role);

    // Set refresh token as HTTP-only cookie
    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, getCookieOptions());

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
    env.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

async function handleRefresh(
  env: ServerEnvironment,
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

    // Extract request info for security logging
    const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

    // Rotate the refresh token with reuse detection
    const result = await rotateRefreshToken(env.db, oldRefreshToken, ipAddress, userAgent);

    if (!result) {
      // Token invalid, expired, or reuse detected
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return { status: 401, body: { message: ERROR_MESSAGES.INVALID_TOKEN } };
    }

    // Create new access token
    const newAccessToken = createAccessToken(result.userId, result.email, result.role);

    // Set new refresh token cookie
    reply.setCookie(REFRESH_COOKIE_NAME, result.token, getCookieOptions());

    return {
      status: 200,
      body: {
        token: newAccessToken,
      },
    };
  } catch (error) {
    env.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

async function handleLogout(
  env: ServerEnvironment,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: LogoutResponse } | { status: 401 | 500; body: { message: string } }
> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      // Delete refresh token from database
      await env.db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }

    // Clear the cookie
    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    return {
      status: 200,
      body: { message: SUCCESS_MESSAGES.LOGGED_OUT },
    };
  } catch (error) {
    env.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

async function handleMe(
  env: ServerEnvironment,
  request: RequestWithCookies,
): Promise<
  { status: 200; body: UserResponse } | { status: 401 | 404 | 500; body: { message: string } }
> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { status: 401, body: { message: ERROR_MESSAGES.MISSING_AUTH_HEADER } };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    request.user = payload;
  } catch {
    return { status: 401, body: { message: ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN } };
  }

  try {
    const user = await env.db.query.users.findFirst({
      where: eq(users.id, request.user.userId),
    });

    if (!user) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    return {
      status: 200,
      body: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    env.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

async function handleAdminUnlock(
  env: ServerEnvironment,
  body: UnlockAccountRequest,
  request: RequestWithCookies,
): Promise<
  | { status: 200; body: UnlockAccountResponse }
  | { status: 401 | 403 | 404 | 500; body: { message: string } }
> {
  try {
    // Verify admin authentication
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    // Check if user is admin
    if (payload.role !== 'admin') {
      return { status: 403, body: { message: ERROR_MESSAGES.FORBIDDEN } };
    }

    // Check if the target user exists
    const targetUser = await env.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!targetUser) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    // Extract request info for audit logging
    const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

    // Unlock the account
    await unlockAccount(env.db, body.email, payload.userId, ipAddress, userAgent);

    env.log.info(
      { adminId: payload.userId, targetEmail: body.email },
      'Admin unlocked user account',
    );

    return {
      status: 200,
      body: {
        message: SUCCESS_MESSAGES.ACCOUNT_UNLOCKED,
        email: body.email,
      },
    };
  } catch (error) {
    env.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
