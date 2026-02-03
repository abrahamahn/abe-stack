import { createRouteMap, protectedRoute, publicRoute } from '@abe-stack/db';

import {
  handleApiInfo,
  handleHealth,
  handleListModules,
  handleListRoutes,
  handleLive,
  handleRoot,
  handleSystemStatus,
} from './handlers';

import type { SystemContext } from './types';
import type { HandlerContext, RouteResult } from '@abe-stack/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
/**
 * Bridge from generic HandlerContext to SystemContext.
 */
function asSystemContext(ctx: HandlerContext): SystemContext {
  return ctx as unknown as SystemContext;
}

/** Typed wrapper for public/protected route handler parameters */
type H = (
  ctx: HandlerContext,
  data: unknown,
  req: FastifyRequest,
  reply: FastifyReply,
) => Promise<RouteResult>;

const root: H = (ctx, data, req, reply) => handleRoot(asSystemContext(ctx), data, req, reply);
const apiInfo: H = (ctx, data, req, reply) => handleApiInfo(asSystemContext(ctx), data, req, reply);
const health: H = (ctx, data, req, reply) => handleHealth(asSystemContext(ctx), data, req, reply);
const systemStatus: H = (ctx, data, req, reply) =>
  handleSystemStatus(asSystemContext(ctx), data, req, reply);
const listModules: H = (ctx, data, req, reply) =>
  handleListModules(asSystemContext(ctx), data, req, reply);
const listRoutes: H = (ctx, data, req, reply) =>
  handleListRoutes(asSystemContext(ctx), data, req, reply);
const live: H = (ctx, data, req, reply) => handleLive(asSystemContext(ctx), data, req, reply);

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
