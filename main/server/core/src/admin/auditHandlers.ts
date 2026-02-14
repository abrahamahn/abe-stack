// main/server/core/src/admin/auditHandlers.ts
/**
 * Admin Audit Event Handlers
 *
 * HTTP handlers for admin audit event listing.
 */

import { ERROR_MESSAGES } from '../auth';

import type { AdminAppContext } from './types';
import type { AuditEvent } from '../../../db/src';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// List Audit Events Handler
// ============================================================================

/**
 * Handle GET /api/admin/audit-events
 *
 * Query params:
 * - tenantId: filter by tenant
 * - actorId: filter by actor
 * - action: filter by action type
 * - limit: max results (default 100, max 500)
 */
export async function handleListAuditEvents(
  ctx: AdminAppContext,
  _body: undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: { events: AuditEvent[] } | { message: string } }> {
  const user = (request as { user?: { userId: string; role: string } }).user;
  if (user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const query = (request.query ?? {}) as Record<string, string | undefined>;
    const parsedLimit = Number(query['limit']);
    const requestedLimit = Number.isFinite(parsedLimit) ? parsedLimit : 100;
    const limit = Math.min(requestedLimit, 500);
    const tenantId = query['tenantId'];
    const actorId = query['actorId'];
    const action = query['action'];

    let events: AuditEvent[];

    if (tenantId !== undefined && tenantId !== '') {
      events = await ctx.repos.auditEvents.findByTenantId(tenantId, limit);
    } else if (actorId !== undefined && actorId !== '') {
      events = await ctx.repos.auditEvents.findByActorId(actorId, limit);
    } else if (action !== undefined && action !== '') {
      events = await ctx.repos.auditEvents.findByAction(action, limit);
    } else {
      events = await ctx.repos.auditEvents.findRecent(limit);
    }

    ctx.log.info({ adminId: user.userId, resultCount: events.length }, 'Admin listed audit events');

    return { status: 200, body: { events } };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    ctx.log.error(err, 'Failed to list audit events');
    return { status: 500, body: { message: 'Failed to list audit events' } };
  }
}
