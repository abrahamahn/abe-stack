import { refreshTokens, users } from '@db/schema';
import { apiContract } from '@contracts';
import { initServer } from '@ts-rest/fastify';
import { and, eq, gt } from 'drizzle-orm';

import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiry,
  REFRESH_TOKEN_EXPIRY_DAYS,
  verifyToken,
} from '../lib/jwt';
import { comparePassword, hashPassword } from '../lib/password';

import type {
  AuthResponse,
  LoginRequest,
  LogoutResponse,
  RefreshResponse,
  RegisterRequest,
  UserResponse,
} from '@contracts';
import type { FastifyInstance } from 'fastify';

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

// Cookie configuration for refresh token
const REFRESH_COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60, // days to seconds
};

export function registerRoutes(app: FastifyInstance): void {
  const s = initServer();

  const router = s.router(apiContract, {
    auth: {
      register: async ({ body, reply }) => handleRegister(app, body, reply),
      login: async ({ body, reply }) => handleLogin(app, body, reply),
      refresh: async ({ request, reply }) => handleRefresh(app, request, reply),
      logout: async ({ request, reply }) => handleLogout(app, request, reply),
      verifyEmail: async () =>
        Promise.resolve({
          status: 404 as const,
          body: { message: 'Email verification not implemented' },
        }),
    },
    users: {
      me: async ({ request }) => handleMe(app, request),
    },
  });

  s.registerRouter(apiContract, router, app);
}

async function handleRegister(
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

    // Create access token
    const accessToken = createAccessToken(user.id, user.email, user.role);

    // Create and store refresh token
    const refreshToken = createRefreshToken();
    await app.db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    // Set refresh token as HTTP-only cookie
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

async function handleLogin(
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

    // Create access token
    const accessToken = createAccessToken(user.id, user.email, user.role);

    // Create and store refresh token
    const refreshToken = createRefreshToken();
    await app.db.insert(refreshTokens).values({
      userId: user.id,
      token: refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    // Set refresh token as HTTP-only cookie
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

async function handleRefresh(
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

    // Find valid refresh token in database
    const storedToken = await app.db.query.refreshTokens.findFirst({
      where: and(eq(refreshTokens.token, refreshToken), gt(refreshTokens.expiresAt, new Date())),
    });

    if (!storedToken) {
      // Clear invalid cookie
      reply.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
      return { status: 401, body: { message: 'Invalid or expired refresh token' } };
    }

    // Get user
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, storedToken.userId),
    });

    if (!user) {
      return { status: 401, body: { message: 'User not found' } };
    }

    // Delete old refresh token
    await app.db.delete(refreshTokens).where(eq(refreshTokens.id, storedToken.id));

    // Create new tokens (token rotation for security)
    const newAccessToken = createAccessToken(user.id, user.email, user.role);
    const newRefreshToken = createRefreshToken();

    // Store new refresh token
    await app.db.insert(refreshTokens).values({
      userId: user.id,
      token: newRefreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    // Set new refresh token cookie
    reply.setCookie(REFRESH_COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);

    return {
      status: 200,
      body: {
        token: newAccessToken,
      },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: 'Internal server error' } };
  }
}

async function handleLogout(
  app: FastifyInstance,
  request: RequestWithCookies,
  reply: ReplyWithCookies,
): Promise<
  { status: 200; body: LogoutResponse } | { status: 401 | 500; body: { message: string } }
> {
  try {
    const refreshToken = request.cookies[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      // Delete refresh token from database
      await app.db.delete(refreshTokens).where(eq(refreshTokens.token, refreshToken));
    }

    // Clear the cookie
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

async function handleMe(
  app: FastifyInstance,
  request: RequestWithCookies,
): Promise<
  { status: 200; body: UserResponse } | { status: 401 | 404 | 500; body: { message: string } }
> {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return { status: 401, body: { message: 'Missing or invalid authorization header' } };
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);
    request.user = payload;
  } catch {
    return { status: 401, body: { message: 'Invalid or expired token' } };
  }

  try {
    const user = await app.db.query.users.findFirst({
      where: eq(users.id, request.user.userId),
    });

    if (!user) {
      return { status: 404, body: { message: 'User not found' } };
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
    app.log.error(error);
    return { status: 500, body: { message: 'Internal server error' } };
  }
}
