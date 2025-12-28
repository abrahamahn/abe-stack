import { users } from '@abe-stack/db';
import { apiContract } from '@abe-stack/shared';
import { initServer } from '@ts-rest/fastify';
import { eq } from 'drizzle-orm';

import { createToken, verifyToken } from '../lib/jwt';
import { comparePassword, hashPassword } from '../lib/password';

import type { AuthResponse, LoginRequest, RegisterRequest, UserResponse } from '@abe-stack/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export function registerRoutes(app: FastifyInstance): void {
  const s = initServer();

  const router = s.router(apiContract, {
    auth: {
      register: async ({ body }) => handleRegister(app, body),
      login: async ({ body }) => handleLogin(app, body),
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
      })
      .returning();

    if (!user) {
      return { status: 500, body: { message: 'Failed to create user' } };
    }

    const token = createToken(user.id, user.email);

    return {
      status: 201,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
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

    const token = createToken(user.id, user.email);

    return {
      status: 200,
      body: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
      },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: 'Internal server error' } };
  }
}

async function handleMe(
  app: FastifyInstance,
  request: FastifyRequest,
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
        createdAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    app.log.error(error);
    return { status: 500, body: { message: 'Internal server error' } };
  }
}
