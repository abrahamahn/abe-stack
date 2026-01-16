// apps/server/src/modules/index.ts
/**
 * Route Registration
 *
 * This is the single place where all modules connect to the HTTP layer.
 * Uses ts-rest for type-safe routing.
 */

import { apiContract } from '@abe-stack/core';
import { handleAdminUnlock } from '@admin/index';
import {
  createAuthGuard,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '@auth/index';
import { ERROR_MESSAGES, type AppContext } from '@shared';
import { initServer } from '@ts-rest/fastify';
import { handleMe } from '@users/index';

import type { FastifyInstance } from 'fastify';

// Re-export modules
export * as admin from './admin';
export * as auth from './auth';
export * as users from './users';

/**
 * Register all application routes
 */
export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  const s = initServer();

  // Middleware guards
  const authGuard = createAuthGuard(ctx.config.auth.jwt.secret);
  const adminGuard = createAuthGuard(ctx.config.auth.jwt.secret, 'admin');

  // 1. Auth Module (Public)
  const authRouter = s.router(apiContract.auth, {
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
        body: { message: ERROR_MESSAGES.EMAIL_VERIFICATION_NOT_IMPLEMENTED },
      }),
  });

  s.registerRouter(apiContract.auth, authRouter, app);

  // 2. Users Module (Protected)
  const usersRouter = s.router(apiContract.users, {
    me: async ({ request }) => handleMe(ctx, request as RequestWithCookies),
  });

  void app.register((instance, _opts, done) => {
    instance.addHook('preHandler', authGuard);
    s.registerRouter(apiContract.users, usersRouter, instance);
    done();
  });

  // 3. Admin Module (Protected + Admin Role)
  const adminRouter = s.router(apiContract.admin, {
    unlockAccount: async ({ body, request }) =>
      handleAdminUnlock(ctx, body, request as RequestWithCookies),
  });

  void app.register((instance, _opts, done) => {
    instance.addHook('preHandler', adminGuard);
    s.registerRouter(apiContract.admin, adminRouter, instance);
    done();
  });
}
