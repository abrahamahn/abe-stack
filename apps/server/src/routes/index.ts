// apps/server/src/routes/index.ts
import { users } from '@abe-stack/db';
import { apiContract } from '@abe-stack/shared';
import { initServer } from '@ts-rest/fastify';
import { eq } from 'drizzle-orm';

import { unlockAccount } from '../infra/security';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../lib/constants';
import { extractRequestInfo } from '../lib/request-utils';
import {
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  verifyToken,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '../modules/auth/handlers';

import type { ServerEnvironment } from '../infra/ctx';
import type { UnlockAccountRequest, UnlockAccountResponse, UserResponse } from '@abe-stack/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';

export function registerRoutes(app: FastifyInstance, env: ServerEnvironment): void {
  const s = initServer();

  const router = s.router(apiContract, {
    auth: {
      register: async ({ body, reply }) => handleRegister(env, body, reply as ReplyWithCookies),
      login: async ({ body, request, reply }) =>
        handleLogin(env, body, request as RequestWithCookies, reply as ReplyWithCookies),
      refresh: async ({ request, reply }) =>
        handleRefresh(env, request as RequestWithCookies, reply as ReplyWithCookies),
      logout: async ({ request, reply }) =>
        handleLogout(env, request as RequestWithCookies, reply as ReplyWithCookies),
      verifyEmail: async () =>
        Promise.resolve({
          status: 404 as const,
          body: { message: SUCCESS_MESSAGES.EMAIL_VERIFICATION_NOT_IMPLEMENTED },
        }),
    },
    users: {
      me: async ({ request }) => handleMe(env, request as RequestWithCookies),
    },
    admin: {
      unlockAccount: async ({ body, request }) =>
        handleAdminUnlock(env, body, request as RequestWithCookies),
    },
  });

  s.registerRouter(apiContract, router, app);
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
