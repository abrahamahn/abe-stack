// src/server/core/src/tenants/handlers/audit.ts
/**
 * Workspace Audit Event Handler
 *
 * HTTP handler for listing audit events scoped to a specific tenant/workspace.
 * Allows workspace members to view their workspace audit log.
 *
 * @module handlers/audit
 */

import {
  mapErrorToHttpResponse,
  type ErrorMapperLogger,
  type HttpErrorResponse,
} from '@abe-stack/shared';

import { ERROR_MESSAGES, type TenantsModuleDeps, type TenantsRequest } from '../types';

import type { AuditEvent } from '@abe-stack/db';

// ============================================================================
// Logger Adapter
// ============================================================================

function createLogAdapter(log: TenantsModuleDeps['log']): ErrorMapperLogger {
  return {
    warn: (ctx: Record<string, unknown>, msg: string): void => {
      log.warn(ctx, msg);
    },
    error: (ctx: unknown, msg?: string): void => {
      if (msg !== undefined) {
        log.error(ctx as Record<string, unknown>, msg);
      } else {
        log.error(ctx as Record<string, unknown>);
      }
    },
  };
}

// ============================================================================
// Query Interface
// ============================================================================

interface AuditEventQuery {
  limit?: string | undefined;
  offset?: string | undefined;
  action?: string | undefined;
  actorId?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

// ============================================================================
// Handler
// ============================================================================

/**
 * Handle listing workspace-scoped audit events.
 * GET /api/tenants/:id/audit-events
 *
 * Supports query filters: action, actorId, startDate, endDate.
 * Default limit 50, capped at 200.
 */
export async function handleListTenantAuditEvents(
  deps: TenantsModuleDeps,
  tenantId: string,
  query: AuditEventQuery,
  request: TenantsRequest,
): Promise<{ status: 200; body: { events: AuditEvent[] } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    // Parse and cap limit
    const parsedLimit = Number(query.limit);
    const requestedLimit = Number.isFinite(parsedLimit) ? parsedLimit : 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 200);

    // Fetch events scoped to this tenant
    let events: AuditEvent[];

    if (query.action !== undefined && query.action !== '') {
      // Filter by action within tenant: fetch by action then filter client-side
      // The repo findByTenantId is the primary tenant-scoped query
      const allByAction = await deps.repos.auditEvents.findByAction(query.action, limit);
      events = allByAction.filter((e) => e.tenantId === tenantId);
    } else if (query.actorId !== undefined && query.actorId !== '') {
      // Filter by actor within tenant
      const allByActor = await deps.repos.auditEvents.findByActorId(query.actorId, limit);
      events = allByActor.filter((e) => e.tenantId === tenantId);
    } else {
      events = await deps.repos.auditEvents.findByTenantId(tenantId, limit);
    }

    // Apply date filters if provided
    if (query.startDate !== undefined && query.startDate !== '') {
      const start = new Date(query.startDate);
      if (!isNaN(start.getTime())) {
        events = events.filter((e) => e.createdAt >= start);
      }
    }

    if (query.endDate !== undefined && query.endDate !== '') {
      const end = new Date(query.endDate);
      if (!isNaN(end.getTime())) {
        events = events.filter((e) => e.createdAt <= end);
      }
    }

    deps.log.info({ tenantId, userId, resultCount: events.length }, 'Listed tenant audit events');

    return { status: 200, body: { events } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}
