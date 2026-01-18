// apps/server/src/modules/index.ts
/**
 * Route Registration
 *
 * Manual Fastify route registration with Zod validation.
 * Replaces @ts-rest/fastify for minimal dependencies.
 */

import {
  emailVerificationRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerRequestSchema,
  resetPasswordRequestSchema,
  unlockAccountRequestSchema,
} from '@abe-stack/core';

import { handleAdminUnlock } from './admin';
import {
  createAuthGuard,
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResetPassword,
  handleVerifyEmail,
  type ReplyWithCookies,
  type RequestWithCookies,
} from './auth';
import { handleMe } from './users';

import type { AppContext } from '@shared/index';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

// Re-export modules
export { handleAdminUnlock } from './admin';
export {
  createAuthGuard,
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResetPassword,
  handleVerifyEmail,
  type ReplyWithCookies,
  type RequestWithCookies,
} from './auth';
export { handleMe } from './users';

// Generic route registration (Chet-stack pattern)
export {
  protectedRoute,
  publicRoute,
  registerRouteMap,
  type HttpMethod,
  type ProtectedHandler,
  type PublicHandler,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type RouterOptions,
  type ValidationSchema,
} from '@infra/router';

/**
 * Register all application routes
 */
export function registerRoutes(app: FastifyInstance, ctx: AppContext): void {
  // Middleware guards
  const authGuard = createAuthGuard(ctx.config.auth.jwt.secret);
  const adminGuard = createAuthGuard(ctx.config.auth.jwt.secret, 'admin');

  // ============================================================================
  // Auth Routes (Public)
  // ============================================================================

  app.post('/api/auth/register', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const result = await handleRegister(ctx, parsed.data, reply as unknown as ReplyWithCookies);
    return reply.status(result.status).send(result.body);
  });

  app.post('/api/auth/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const result = await handleLogin(
      ctx,
      parsed.data,
      req as unknown as RequestWithCookies,
      reply as unknown as ReplyWithCookies,
    );
    return reply.status(result.status).send(result.body);
  });

  app.post('/api/auth/refresh', async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await handleRefresh(
      ctx,
      req as unknown as RequestWithCookies,
      reply as unknown as ReplyWithCookies,
    );
    return reply.status(result.status).send(result.body);
  });

  app.post('/api/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const result = await handleLogout(
      ctx,
      req as unknown as RequestWithCookies,
      reply as unknown as ReplyWithCookies,
    );
    return reply.status(result.status).send(result.body);
  });

  app.post('/api/auth/forgot-password', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = forgotPasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const result = await handleForgotPassword(ctx, parsed.data);
    return reply.status(result.status).send(result.body);
  });

  app.post('/api/auth/reset-password', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = resetPasswordRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const result = await handleResetPassword(ctx, parsed.data);
    return reply.status(result.status).send(result.body);
  });

  app.post('/api/auth/verify-email', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = emailVerificationRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
    }

    const result = await handleVerifyEmail(ctx, parsed.data);
    return reply.status(result.status).send(result.body);
  });

  // ============================================================================
  // Users Routes (Protected)
  // ============================================================================

  void app.register((instance) => {
    instance.addHook('preHandler', authGuard);

    instance.get('/api/users/me', async (req: FastifyRequest, reply: FastifyReply) => {
      const result = await handleMe(ctx, req as unknown as RequestWithCookies);
      return reply.status(result.status).send(result.body);
    });
  });

  // ============================================================================
  // Admin Routes (Protected + Admin Role)
  // ============================================================================

  void app.register((instance) => {
    instance.addHook('preHandler', adminGuard);

    instance.post('/api/admin/auth/unlock', async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = unlockAccountRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return reply
          .status(400)
          .send({ message: parsed.error.issues[0]?.message ?? 'Invalid input' });
      }

      const result = await handleAdminUnlock(
        ctx,
        parsed.data,
        req as unknown as RequestWithCookies,
      );
      return reply.status(result.status).send(result.body);
    });
  });
}
