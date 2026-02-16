// main/apps/server/src/routes/system.routes.ts
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
  getMetricsCollector,
  publicRoute,
} from '@abe-stack/server-engine';
import { HTTP_STATUS } from '@abe-stack/shared';
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
        const systemCtx = asSystemContext(ctx);
        const [dbStatus, schemaStatus] = await Promise.all([
          checkDbStatus(systemCtx),
          checkSchemaStatus(systemCtx),
        ]);

        const ready = dbStatus.status === 'up' && schemaStatus.status === 'up';
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
        const systemCtx = asSystemContext(ctx);
        const detailed = await getDetailedHealth(systemCtx, getWebSocketStats());
        if (detailed.status !== 'healthy') {
          reply.code(HTTP_STATUS.SERVICE_UNAVAILABLE);
        }
        return detailed;
      },
    ),
  ],
]);
