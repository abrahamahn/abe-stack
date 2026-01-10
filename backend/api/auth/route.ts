/**
 * Auth API Route
 * Contract + Handler colocated in single file
 */
import { refreshTokens, users } from '@db/schema';
import { initContract } from '@ts-rest/core';
import { and, eq, gt } from 'drizzle-orm';

import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiry,
  REFRESH_TOKEN_EXPIRY_DAYS,
} from '../../server/lib/jwt';
import { comparePassword, hashPassword } from '../../server/lib/password';
import {
  authResponseSchema,
  emailVerificationRequestSchema,
  emailVerificationResponseSchema,
  errorResponseSchema,
  loginRequestSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  registerRequestSchema,
} from '../_lib/schemas';

import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
} from '../_lib/schemas';
import type { FastifyInstance } from 'fastify';

// ============================================
// Contract Definition
// ============================================

const c = initContract();

export const authContract = c.router({
  register: {
    method: 'POST',
    path: '/api/auth/register',
    body: registerRequestSchema,
    responses: {
      201: authResponseSchema,
      400: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Register a new user',
  },
  login: {
    method: 'POST',
    path: '/api/auth/login',
    body: loginRequestSchema,
    responses: {
      200: authResponseSchema,
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Login an existing user',
  },
  refresh: {
    method: 'POST',
    path: '/api/auth/refresh',
    body: c.noBody(),
    responses: {
      200: refreshResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Refresh access token using refresh token cookie',
  },
  logout: {
    method: 'POST',
    path: '/api/auth/logout',
    body: c.noBody(),
    responses: {
      200: logoutResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Logout and invalidate refresh token',
  },
  verifyEmail: {
    method: 'POST',
    path: '/api/auth/verify-email',
    body: emailVerificationRequestSchema,
    responses: {
      200: emailVerificationResponseSchema,
      400: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Verify email with a token',
  },
});

// ============================================
// Handler Types
// ============================================

interface ReplyWithCookies {
  setCookie: (name: string, value: string, options: Record<string, unknown>) => void;
  clearCookie: (name: string, options: Record<string, unknown>) => void;
}

interface RequestWithCookies {
  cookies: Record<string, string | undefined>;
  headers: { authorization?: string };
}

const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60,
};

// ============================================
// Handlers
// ============================================

export async function handleRegister(
  app: FastifyInstance,
  body: RegisterRequest,
  reply: ReplyWithCookies,
): Promise<
  { status: 201; body: AuthResponse } | { status: 400 | 409 | 500; body: { message: string } }
> {
  try {
    const existingUser = await app.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (existingUser) {
      return { status: 409, body: { message: 'Email already registered' } };
    }

    const passwordHash = await hashPassword(body.password);

    const [user] = await app.db
      .insert(users)
      .values({
        email: body.email,
        name: body.name || null,
        passwordHash,
        role: 'user',
      })
      .returning();

    if (!user) {
      return { status: 500, body: { message: 'Failed to create user' } };
    }

    const accessToken = createAccessToken(user.id, user.email, user.role);
    const refreshToken = createRefreshToken();

    await app.db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

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
    return { status: 500, body: { message: 'Internal server error' } };
  }
}

export async function handleLogin(
  app: FastifyInstance,
  body: LoginRequest,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: AuthResponse } | { status: 400 | 401 | 500; body: { message: string } }
> {
  try {
    const user = await app.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!user) {
      return { status: 401, body: { message: 'Invalid email or password' } };
    }

    const isValid = await comparePassword(body.password, user.passwordHash);

    if (!isValid) {
      return { status: 401, body: { message: 'Invalid email or password' } };
    }

    const accessToken = createAccessToken(user.id, user.email, user.role);
    const refreshToken = createRefreshToken();

    await app.db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    reply.setCookie(REFRESH_COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

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
    return { status: 500, body: { message: 'Internal server error' } };
  }
}

export async function handleRefresh(
  app: FastifyInstance,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: RefreshResponse } | { status: 401 | 500; body: { message: string } }
> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return { status: 401, body: { message: 'No refresh token provided' } };
    }

    const storedToken = await app.db.query.refreshTokens.findFirst({
      where: and(eq(refreshTokens.token, refreshToken), gt(refreshTokens.expiresAt, new Date())),
    });

    if (!storedToken) {
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return { status: 401, body: { message: 'Invalid or expired refresh token' } };
    }

    const user = await app.db.query.users.findFirst({
      where: eq(users.id, storedToken.userId),
    });

    if (!user) {
      return { status: 401, body: { message: 'User not found' } };
    }

    await app.db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

    const newAccessToken = createAccessToken(user.id, user.email, user.role);
    const newRefreshToken = createRefreshToken();

    await app.db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    reply.setCookie(REFRESH_COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);

    return {
      status: 200,
      body: { token: newAccessToken },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: 'Internal server error' } };
  }
}

export async function handleLogout(
  app: FastifyInstance,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: LogoutResponse } | { status: 401 | 500; body: { message: string } }
> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      await app.db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }

    reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });

    return {
      status: 200,
      body: { message: 'Logged out successfully' },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: 'Internal server error' } };
  }
}

// ============================================
// Router Factory
// ============================================

type RegisterResult = Awaited<ReturnType<typeof handleRegister>>;
type LoginResult = Awaited<ReturnType<typeof handleLogin>>;
type RefreshResult = Awaited<ReturnType<typeof handleRefresh>>;
type LogoutResult = Awaited<ReturnType<typeof handleLogout>>;
type VerifyEmailResult = { status: 404; body: { message: string } };

export interface AuthRouter {
  register: (args: { body: RegisterRequest; reply: ReplyWithCookies }) => Promise<RegisterResult>;
  login: (args: { body: LoginRequest; reply: ReplyWithCookies }) => Promise<LoginResult>;
  refresh: (args: {
    request: RequestWithCookies;
    reply: ReplyWithCookies;
  }) => Promise<RefreshResult>;
  logout: (args: { request: RequestWithCookies; reply: ReplyWithCookies }) => Promise<LogoutResult>;
  verifyEmail: () => Promise<VerifyEmailResult>;
}

export function createAuthRouter(app: FastifyInstance): AuthRouter {
  return {
    register: async ({ body, reply }): Promise<RegisterResult> => handleRegister(app, body, reply),
    login: async ({ body, reply }): Promise<LoginResult> => handleLogin(app, body, reply),
    refresh: async ({ request, reply }): Promise<RefreshResult> =>
      handleRefresh(app, request, reply),
    logout: async ({ request, reply }): Promise<LogoutResult> => handleLogout(app, request, reply),
    verifyEmail: async (): Promise<VerifyEmailResult> =>
      Promise.resolve({
        status: 404 as const,
        body: { message: 'Email verification not implemented' },
      }),
  };
}
