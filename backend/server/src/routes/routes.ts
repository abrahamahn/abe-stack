// backend/server/src/routes/routes.ts
/**
 * Route registration with ServerEnvironment
 *
 * This file registers all routes using the ts-rest contract
 * and injects the ServerEnvironment into all handlers.
 */

import { apiContract } from '@abe-stack/shared';
import { initServer } from '@ts-rest/fastify';

import { SUCCESS_MESSAGES } from '../common/constants';
import {
  handleRegister,
  handleLogin,
  handleRefresh,
  handleLogout,
} from '../modules/auth/services/auth.service';
import { handleMe } from '../modules/user/services/user.service';
import { handleAdminUnlock } from '../modules/admin/services/admin.service';

import type { FastifyInstance } from 'fastify';
import type { ServerEnvironment } from '../infra/ctx';
import type { ReplyWithCookies, RequestWithCookies } from '../common/types';

/**
 * Register all application routes
 * All handlers receive the ServerEnvironment via closure
 */
export function registerRoutes(app: FastifyInstance, env: ServerEnvironment): void {
  const s = initServer();

  const router = s.router(apiContract, {
    auth: {
      register: async ({ body, reply }) =>
        handleRegister(env, app, body, reply as unknown as ReplyWithCookies),

      login: async ({ body, request, reply }) =>
        handleLogin(
          env,
          app,
          body,
          request as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        ),

      refresh: async ({ request, reply }) =>
        handleRefresh(
          env,
          app,
          request as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        ),

      logout: async ({ request, reply }) =>
        handleLogout(
          env,
          app,
          request as unknown as RequestWithCookies,
          reply as unknown as ReplyWithCookies,
        ),

      verifyEmail: async () =>
        Promise.resolve({
          status: 404 as const,
          body: { message: SUCCESS_MESSAGES.EMAIL_VERIFICATION_NOT_IMPLEMENTED },
        }),
    },

    users: {
      me: async ({ request }) => handleMe(env, app, request as unknown as RequestWithCookies),
    },

    admin: {
      unlockAccount: async ({ body, request }) =>
        handleAdminUnlock(env, app, body, request as unknown as RequestWithCookies),
    },
  });

  s.registerRouter(apiContract, router, app);
}
