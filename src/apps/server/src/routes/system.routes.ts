// src/apps/server/src/routes/system.routes.ts
/**
 * System Routes
 *
 * Health and readiness probes for infrastructure verification.
 * These routes are intentionally unprefixed (no /api).
 */

import {
  checkDbStatus,
  checkSchemaStatus,
  createRouteMap,
  getDetailedHealth,
  publicRoute,
} from '@abe-stack/server-engine';
import { getWebSocketStats } from '@abe-stack/websocket';

import type { HandlerContext, RouteMap, SystemContext } from '@abe-stack/server-engine';
import type { LiveResponse, ReadyResponse } from '@abe-stack/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

function asSystemContext(ctx: HandlerContext): SystemContext {
  return ctx as unknown as SystemContext;
}

export const systemRoutes: RouteMap = createRouteMap([
  [
    'health',
    publicRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, _req: FastifyRequest, reply: FastifyReply) => {
        const systemCtx = asSystemContext(ctx);
        const dbStatus = await checkDbStatus(systemCtx);
        if (dbStatus.status !== 'up') {
          reply.code(503);
        }
        return {
          status: dbStatus.status === 'up' ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          database: dbStatus,
        };
      },
    ),
  ],
  [
    'health/ready',
    publicRoute(
      'GET',
      async (
        ctx: HandlerContext,
        _body: undefined,
        _req: FastifyRequest,
        reply: FastifyReply,
      ): Promise<ReadyResponse> => {
        const systemCtx = asSystemContext(ctx);
        const [dbStatus, schemaStatus] = await Promise.all([
          checkDbStatus(systemCtx),
          checkSchemaStatus(systemCtx),
        ]);

        const ready = dbStatus.status === 'up' && schemaStatus.status === 'up';
        if (!ready) {
          reply.code(503);
        }
        return {
          status: ready ? 'ready' : 'not_ready',
          timestamp: new Date().toISOString(),
        };
      },
    ),
  ],
  [
    'health/live',
    publicRoute(
      'GET',
      async (
        _ctx: HandlerContext,
        _body: undefined,
        _req: FastifyRequest,
        _reply: FastifyReply,
      ): Promise<LiveResponse> => {
        return {
          status: 'alive',
          uptime: process.uptime(),
        };
      },
    ),
  ],
  [
    'health/detailed',
    publicRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, _req: FastifyRequest, reply: FastifyReply) => {
        const systemCtx = asSystemContext(ctx);
        const detailed = await getDetailedHealth(systemCtx, getWebSocketStats());
        if (detailed.status !== 'healthy') {
          reply.code(503);
        }
        return detailed;
      },
    ),
  ],
]);
