// apps/server/src/modules/index.ts
/**
 * Domain Modules
 *
 * Business logic organized by feature.
 * Each module contains:
 * - routes: HTTP handlers
 * - service: Business logic (if complex)
 * - utils: Module-specific utilities
 */

import { apiContract } from '@abe-stack/shared';
import { initServer } from '@ts-rest/fastify';
import { eq } from 'drizzle-orm';

import { users } from '../infra/database';
import { unlockAccount } from '../infra/security';
import { ERROR_MESSAGES, SUCCESS_MESSAGES } from '../shared/constants';

import {
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  verifyToken,
} from './auth/handlers';
import { extractRequestInfo } from './auth/utils/request';

import type { ReplyWithCookies, RequestWithCookies } from './auth/handlers';
import type { AppContext } from '../shared/types';
import type { UnlockAccountRequest, UnlockAccountResponse, UserResponse } from '@abe-stack/shared';
import type { FastifyInstance, FastifyRequest } from 'fastify';

// Re-export modules
export * as auth from './auth';

/**
 * Register all application routes
 *
 * This is the single place where all modules connect to the HTTP layer.
 * Uses ts-rest for type-safe routing.
 */
export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  const s = initServer();

  const router = s.router(apiContract, {
    auth: {
      register: async ({ body, reply }) => handleRegister(ctx, body, reply as ReplyWithCookies),
      login: async ({ body, request, reply }) =>
        handleLogin(ctx, body, request as RequestWithCookies, reply as ReplyWithCookies),
      refresh: async ({ request, reply }) =>
        handleRefresh(ctx, request as RequestWithCookies, reply as ReplyWithCookies),
      logout: async ({ request, reply }) =>
        handleLogout(ctx, request as RequestWithCookies, reply as ReplyWithCookies),
      verifyEmail: async () =>
        Promise.resolve({
          status: 404 as const,
          body: { message: SUCCESS_MESSAGES.EMAIL_VERIFICATION_NOT_IMPLEMENTED },
        }),
    },
    users: {
      me: async ({ request }) => handleMe(ctx, request as RequestWithCookies),
    },
    admin: {
      unlockAccount: async ({ body, request }) =>
        handleAdminUnlock(ctx, body, request as RequestWithCookies),
    },
  });

  s.registerRouter(apiContract, router, app);
}

// ============================================================================
// User Handlers
// ============================================================================

async function handleMe(
  ctx: AppContext,
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
    const payload = verifyToken(token, ctx.config.auth.jwt.secret);
    request.user = payload;
  } catch {
    return { status: 401, body: { message: ERROR_MESSAGES.INVALID_OR_EXPIRED_TOKEN } };
  }

  try {
    const user = await ctx.db.query.users.findFirst({
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
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// Admin Handlers
// ============================================================================

async function handleAdminUnlock(
  ctx: AppContext,
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
    const payload = verifyToken(token, ctx.config.auth.jwt.secret);

    // Check if user is admin
    if (payload.role !== 'admin') {
      return { status: 403, body: { message: ERROR_MESSAGES.FORBIDDEN } };
    }

    // Check if the target user exists
    const targetUser = await ctx.db.query.users.findFirst({
      where: eq(users.email, body.email),
    });

    if (!targetUser) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    // Extract request info for audit logging
    const { ipAddress, userAgent } = extractRequestInfo(request as unknown as FastifyRequest);

    // Unlock the account
    await unlockAccount(ctx.db, body.email, payload.userId, ipAddress, userAgent);

    ctx.log.info(
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
    ctx.log.error(error);
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
