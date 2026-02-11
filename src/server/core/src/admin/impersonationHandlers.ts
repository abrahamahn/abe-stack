// src/server/core/src/admin/impersonationHandlers.ts
/**
 * Admin Impersonation Handlers
 *
 * HTTP handlers for admin impersonation operations.
 * All handlers expect admin role (enforced by route middleware).
 */

import { ERROR_MESSAGES } from '../auth';

import {
  endImpersonation,
  ImpersonationForbiddenError,
  ImpersonationRateLimitError,
  startImpersonation,
} from './impersonation';

import type {
  ImpersonationAuditLogger,
  ImpersonationEndResult,
  ImpersonationStartResult,
} from './impersonation';
import type { AdminAppContext } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

// ============================================================================
// Start Impersonation Handler
// ============================================================================

/**
 * Handle POST /api/admin/impersonate/:userId
 *
 * Starts an impersonation session for the specified user.
 * Returns a scoped JWT token with short TTL.
 */
export async function handleStartImpersonation(
  ctx: AdminAppContext,
  _body: undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: ImpersonationStartResult | { message: string } }> {
  const authUser = (request as unknown as { user?: { userId: string; role: string } }).user;
  if (authUser === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const params = request.params as { userId: string };
    const targetUserId = params.userId;

    if (targetUserId === '') {
      return { status: 400, body: { message: 'Target user ID is required' } };
    }

    // Build config from context - the JWT secret must be available via the
    // server's full AppContext which structurally satisfies AdminAppContext
    const fullConfig = ctx.config as {
      billing: AdminAppContext['config']['billing'];
      auth?: { jwt?: { secret?: string } };
    };

    const jwtSecret = fullConfig.auth?.jwt?.secret;
    if (jwtSecret === undefined || jwtSecret === '') {
      ctx.log.error('JWT secret not available for impersonation');
      return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
    }

    // Create audit logger using the repos from context
    const logAuditEvent: ImpersonationAuditLogger = async (event) => {
      await ctx.repos.auditEvents.create({
        actorId: event.actorId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        category: event.category,
        severity: event.severity,
        metadata: event.metadata,
      });
    };

    const result = await startImpersonation(
      ctx.repos,
      authUser.userId,
      targetUserId,
      { jwtSecret },
      logAuditEvent,
    );

    ctx.log.info(
      {
        adminId: authUser.userId,
        targetUserId,
        expiresAt: result.expiresAt,
      },
      'Admin started impersonation',
    );

    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof ImpersonationForbiddenError) {
      return { status: 403, body: { message: error.message } };
    }
    if (error instanceof ImpersonationRateLimitError) {
      return { status: 429, body: { message: error.message } };
    }

    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

// ============================================================================
// End Impersonation Handler
// ============================================================================

/**
 * Handle POST /api/admin/impersonate/end
 *
 * Ends an active impersonation session.
 * Expects targetUserId in query params or request body.
 */
export async function handleEndImpersonation(
  ctx: AdminAppContext,
  body: { targetUserId?: string } | undefined,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<{ status: number; body: ImpersonationEndResult | { message: string } }> {
  const authUser = (request as unknown as { user?: { userId: string; role: string } }).user;
  if (authUser === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    // Get target user ID from body or query
    const targetUserId =
      body?.targetUserId ??
      ((request.query as Record<string, unknown>)['targetUserId'] as string | undefined);

    if (targetUserId === undefined || targetUserId === '') {
      return { status: 400, body: { message: 'targetUserId is required' } };
    }

    // Create audit logger using the repos from context
    const logAuditEvent: ImpersonationAuditLogger = async (event) => {
      await ctx.repos.auditEvents.create({
        actorId: event.actorId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        category: event.category,
        severity: event.severity,
        metadata: event.metadata,
      });
    };

    const result = await endImpersonation(authUser.userId, targetUserId, logAuditEvent);

    ctx.log.info({ adminId: authUser.userId, targetUserId }, 'Admin ended impersonation');

    return { status: 200, body: result };
  } catch (error) {
    ctx.log.error(toError(error));
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
