// apps/server/src/modules/index.ts
/**
 * Route Registration
 *
 * This is the single place where all modules connect to the HTTP layer.
 * Uses ts-rest for type-safe routing.
 */

import { apiContract } from '@abe-stack/contracts';
import { initServer } from '@ts-rest/fastify';

import { SUCCESS_MESSAGES, type AppContext } from '../shared';

import { handleAdminUnlock } from './admin';
import {
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  type ReplyWithCookies,
  type RequestWithCookies,
} from './auth';
import { handleMe } from './users';

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
