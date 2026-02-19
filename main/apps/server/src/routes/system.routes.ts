// main/apps/server/src/routes/system.routes.ts
/**
 * System Routes
 *
 * Health and readiness probes for infrastructure verification.
 * These routes are intentionally unprefixed (no /api).
 */

import {
  checkDbStatus,
  createRouteMap,
  getDetailedHealth,
  getMetricsCollector,
  publicRoute,
} from '@bslt/server-system';
import { HTTP_STATUS } from '@bslt/shared';
import { getWebSocketStats } from '@bslt/websocket';

import type { HandlerContext, HealthContext, RouteMap } from '@bslt/server-system';
import type { LiveResponse, ReadyResponse } from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

function asHealthContext(ctx: HandlerContext): HealthContext {
  return ctx as unknown as HealthContext;
}

export const systemRoutes: RouteMap = createRouteMap([
  [
    'health',
    publicRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, _req: FastifyRequest, reply: FastifyReply) => {
        const hCtx = asHealthContext(ctx);
        const dbStatus = await checkDbStatus(hCtx);
        if (dbStatus.status !== 'up') {
          reply.code(HTTP_STATUS.SERVICE_UNAVAILABLE);
        }
        return {
          status: dbStatus.status === 'up' ? 'ok' : 'degraded',
          timestamp: new Date().toISOString(),
          database: dbStatus,
        };
      },
      undefined,
      {
        summary: 'Health check',
        description: 'Returns server health status including database connectivity',
        tags: ['system'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['ok', 'degraded'] },
              timestamp: { type: 'string', format: 'date-time' },
              database: { type: 'object' },
            },
          },
        },
      },
    ),
  ],
  [
    'metrics',
    publicRoute(
      'GET',
      async (
        _ctx: HandlerContext,
        _body: undefined,
        _req: FastifyRequest,
        _reply: FastifyReply,
      ) => {
        return getMetricsCollector().getMetricsSummary();
      },
      undefined,
      {
        summary: 'Get metrics',
        description: 'Returns server metrics including requests, latency, jobs, and auth',
        tags: ['system'],
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
        const hCtx = asHealthContext(ctx);
        // Schema check not available at this level — DB connectivity suffices for readiness.
        const dbStatus = await checkDbStatus(hCtx);
        const ready = dbStatus.status === 'up';
        if (!ready) {
          reply.code(HTTP_STATUS.SERVICE_UNAVAILABLE);
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
      undefined,
      {
        summary: 'Liveness probe',
        description: 'Kubernetes-compatible liveness probe returning uptime',
        tags: ['system'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string', enum: ['alive'] },
              uptime: { type: 'number' },
            },
          },
        },
      },
    ),
  ],
  [
    'health/detailed',
    publicRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, _req: FastifyRequest, reply: FastifyReply) => {
        const hCtx = asHealthContext(ctx);
        const detailed = await getDetailedHealth(hCtx, { websocketStats: getWebSocketStats() });
        if (detailed.status !== 'healthy') {
          reply.code(HTTP_STATUS.SERVICE_UNAVAILABLE);
        }
        return detailed;
      },
    ),
  ],
]);
