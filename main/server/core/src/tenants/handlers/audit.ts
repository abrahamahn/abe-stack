// main/server/core/src/tenants/handlers/audit.ts
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

import type { AuditEvent } from '../../../../db/src';

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
 * Supports query filters: action, actorId, startDate, endDate, category, severity, resource.
 * Default limit 50, capped at 200.
 */
export async function handleListTenantAuditEvents(
  deps: TenantsModuleDeps,
  tenantId: string,
  query: AuditEventQuery & {
    category?: string | undefined;
    severity?: string | undefined;
    resource?: string | undefined;
    resourceId?: string | undefined;
  },
  request: TenantsRequest,
): Promise<{ status: 200; body: { events: AuditEvent[] } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    // Parse and cap limit/offset
    const parsedLimit = Number(query.limit);
    const requestedLimit = Number.isFinite(parsedLimit) ? parsedLimit : 50;
    const limit = Math.min(Math.max(requestedLimit, 1), 200);

    const parsedOffset = Number(query.offset);
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;

    // Fetch events scoped to this tenant using the generic find method
    const events = await deps.repos.auditEvents.find({
      tenantId,
      actorId: query.actorId !== '' && query.actorId !== undefined ? query.actorId : undefined,
      action: query.action !== '' && query.action !== undefined ? query.action : undefined,
      category: query.category !== '' && query.category !== undefined ? query.category : undefined,
      severity: query.severity !== '' && query.severity !== undefined ? query.severity : undefined,
      resource: query.resource !== '' && query.resource !== undefined ? query.resource : undefined,
      resourceId: query.resourceId !== '' && query.resourceId !== undefined ? query.resourceId : undefined,
      startDate: query.startDate !== undefined && query.startDate !== '' ? new Date(query.startDate) : undefined,
      endDate: query.endDate !== undefined && query.endDate !== '' ? new Date(query.endDate) : undefined,
      limit,
      offset,
    });

    deps.log.info(
      { tenantId, userId, resultCount: events.length, filters: query },
      'Listed tenant audit events',
    );

    return { status: 200, body: { events } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}
