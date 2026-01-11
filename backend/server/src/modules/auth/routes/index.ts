// backend/server/src/modules/auth/routes/index.ts
/**
 * Auth module routes
 * Registers authentication endpoints with the Fastify app
 */

import { apiContract } from '@abe-stack/shared';
import { initServer } from '@ts-rest/fastify';

import { SUCCESS_MESSAGES } from '../../../common/constants';
import { handleRegister, handleLogin, handleRefresh, handleLogout } from '../services/auth.service';

import type { FastifyInstance } from 'fastify';
import type { ServerEnvironment } from '../../../infra/ctx';
import type { ReplyWithCookies, RequestWithCookies } from '../../../common/types';

/**
 * Register auth routes with dependency injection
 */
export function registerAuthRoutes(app: FastifyInstance, env: ServerEnvironment): void {
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
    // Placeholder - these will be handled by their respective modules
    users: {
      me: async () =>
        Promise.resolve({ status: 401 as const, body: { message: 'Not implemented' } }),
    },
    admin: {
      unlockAccount: async () =>
        Promise.resolve({ status: 401 as const, body: { message: 'Not implemented' } }),
    },
  });

  s.registerRouter(apiContract, router, app);
}
