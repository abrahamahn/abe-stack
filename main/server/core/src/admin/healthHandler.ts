// main/server/core/src/admin/healthHandler.ts
/**
 * Admin Health Handler
 *
 * Aggregated system health endpoint for admin dashboards.
 */

import type { AdminAppContext, AdminRequest } from './types';

type ServiceStatus = 'up' | 'down' | 'unknown';

export interface AdminHealthBody {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: ServiceStatus;
    cache: ServiceStatus;
    queue: ServiceStatus;
    storage: ServiceStatus;
    email: ServiceStatus;
  };
}

function hasHealthCheck(value: unknown): value is { healthCheck: () => Promise<boolean> } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'healthCheck' in value &&
    typeof (value as { healthCheck?: unknown }).healthCheck === 'function'
  );
}

async function resolveStatus(value: unknown): Promise<ServiceStatus> {
  if (!hasHealthCheck(value)) {
    return 'unknown';
  }

  try {
    const healthy = await value.healthCheck();
    return healthy ? 'up' : 'down';
  } catch {
    return 'down';
  }
}

function aggregateOverallStatus(services: AdminHealthBody['services']): AdminHealthBody['status'] {
  const statuses = Object.values(services);
  if (statuses.includes('down')) {
    return 'down';
  }
  if (statuses.includes('unknown')) {
    return 'degraded';
  }
  return 'healthy';
}

export async function handleGetAdminHealth(
  ctx: AdminAppContext,
  _body: undefined,
  request: AdminRequest,
): Promise<{ status: 200; body: AdminHealthBody } | { status: 401; body: { message: string } }> {
  const user = request.user;
  if (user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  const services: AdminHealthBody['services'] = {
    database: await resolveStatus(ctx.db),
    cache: await resolveStatus(ctx.cache),
    queue: await resolveStatus(ctx.queue),
    storage: await resolveStatus(ctx.storage),
    email: await resolveStatus(ctx.email),
  };

  const status = aggregateOverallStatus(services);

  ctx.log.info({ adminId: user.userId, status, services }, 'Admin retrieved health status');

  return {
    status: 200,
    body: {
      status,
      services,
    },
  };
}
