// apps/server/src/routes/system.routes.ts
import { createRouteMap, protectedRoute, publicRoute } from '@abe-stack/http';

import {
  handleApiInfo,
  handleHealth,
  handleListModules,
  handleListRoutes,
  handleLive,
  handleRoot,
  handleSystemStatus,
} from './system.handlers';

import type { HandlerContext, RouteResult } from '@abe-stack/http';
import type { AppContext } from '@shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Bridge from generic HandlerContext to the server's AppContext.
 * At runtime, the router injects the full AppContext; this cast
 * is safe because the server's onRequest hook attaches it.
 *
 * @param ctx - The generic handler context from the router
 * @returns The context narrowed to AppContext
 */
function asAppContext(ctx: HandlerContext): AppContext {
  return ctx as unknown as AppContext;
}

/** Typed wrapper for public/protected route handler parameters */
type H = (ctx: HandlerContext, data: unknown, req: FastifyRequest, reply: FastifyReply) => Promise<RouteResult>;

const root: H = (ctx, data, req, reply) => handleRoot(asAppContext(ctx), data, req, reply);
const apiInfo: H = (ctx, data, req, reply) => handleApiInfo(asAppContext(ctx), data, req, reply);
const health: H = (ctx, data, req, reply) => handleHealth(asAppContext(ctx), data, req, reply);
const systemStatus: H = (ctx, data, req, reply) => handleSystemStatus(asAppContext(ctx), data, req, reply);
const listModules: H = (ctx, data, req, reply) => handleListModules(asAppContext(ctx), data, req, reply);
const listRoutes: H = (ctx, data, req, reply) => handleListRoutes(asAppContext(ctx), data, req, reply);
const live: H = (ctx, data, req, reply) => handleLive(asAppContext(ctx), data, req, reply);

export const systemRoutes = createRouteMap([
  // Root Routes
  ['', publicRoute('GET', root)],
  ['api', publicRoute('GET', apiInfo)],

  // Health Routes
  ['api/health', publicRoute('GET', health)],

  // System Verification Routes (Sensitive - Admin Only)
  ['api/system/health', protectedRoute('GET', health, 'admin')],
  ['api/system/status', protectedRoute('GET', systemStatus, 'admin')],
  ['api/system/modules', protectedRoute('GET', listModules, 'admin')],
  ['api/system/routes', protectedRoute('GET', listRoutes, 'admin')],

  // Legacy Health Routes (Aliases)
  ['api/health/detailed', protectedRoute('GET', systemStatus, 'admin')],
  ['api/health/routes', protectedRoute('GET', listRoutes, 'admin')],
  ['api/health/ready', publicRoute('GET', health)],
  ['api/health/live', publicRoute('GET', live)],
]);
