// apps/server/src/modules/system/handlers.ts
import { getDetailedHealth } from '@infrastructure/index';
import type { RouteResult } from '@router';
import { type AppContext } from '@shared/index';
import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Handle Root request
 */
export function handleRoot(
  _ctx: AppContext,
  _data: unknown,
  _req: FastifyRequest,
  _reply: FastifyReply,
): Promise<RouteResult> {
  return Promise.resolve({
    status: 200,
    body: {
      message: 'ABE Stack API',
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Handle API Info request
 */
export function handleApiInfo(
  _ctx: AppContext,
  _data: unknown,
  _req: FastifyRequest,
  _reply: FastifyReply,
): Promise<RouteResult> {
  return Promise.resolve({
    status: 200,
    body: {
      message: 'ABE Stack API is running',
      version: '1.0.0', // TODO: Read from package.json?
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Handle Basic Health Check
 */
export async function handleHealth(
  ctx: AppContext,
  _data: unknown,
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<RouteResult> {
  // Simple check: Just DB
  let dbHealthy = true;
  try {
    await ctx.db.execute({ text: 'SELECT 1', values: [] });
  } catch (error) {
    dbHealthy = false;
    req.log.error({ err: error }, 'Database health check failed');
  }

  return {
    status: dbHealthy ? 200 : 503,
    body: {
      status: dbHealthy ? 'ok' : 'degraded',
      database: dbHealthy,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Handle Detailed System Status
 */
export async function handleSystemStatus(
  ctx: AppContext,
  _data: unknown,
  _req: FastifyRequest,
  _reply: FastifyReply,
): Promise<RouteResult> {
  const result = await getDetailedHealth(ctx);
  // Return 503 if overall status is down, otherwise 200 (even if degraded)
  const status = result.status === 'down' ? 503 : 200;

  return {
    status,
    body: result,
  };
}

/**
 * Handle List Modules
 */
export function handleListModules(
  ctx: AppContext,
  _data: unknown,
  _req: FastifyRequest,
  _reply: FastifyReply,
): Promise<RouteResult> {
  const config = ctx.config;

  // List active modules based on configuration
  const modules = [
    { name: 'auth', enabled: true },
    { name: 'users', enabled: true },
    { name: 'admin', enabled: true },
    { name: 'billing', enabled: config.billing.enabled },
    { name: 'notifications', enabled: config.notifications.enabled },
    { name: 'realtime', enabled: true },
    { name: 'system', enabled: true },
  ];

  return Promise.resolve({
    status: 200,
    body: {
      modules,
      count: modules.length,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Handle List Routes
 */
export function handleListRoutes(
  _ctx: AppContext,
  _data: unknown,
  req: FastifyRequest,
  _reply: FastifyReply,
): Promise<RouteResult> {
  return Promise.resolve({
    status: 200,
    body: {
      routes: req.server.printRoutes({ commonPrefix: false }),
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Handle Live Probe
 */
export function handleLive(
  _ctx: AppContext,
  _data: unknown,
  _req: FastifyRequest,
  _reply: FastifyReply,
): Promise<RouteResult> {
  return Promise.resolve({
    status: 200,
    body: {
      status: 'alive',
      uptime: Math.round(process.uptime()),
    },
  });
}
