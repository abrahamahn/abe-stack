// src/server/core/src/activities/handlers.ts
/**
 * Activities Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Uses narrow context interfaces from types.ts for decoupling.
 */

import { HTTP_STATUS } from '@abe-stack/shared';

import { getActivityFeed, getTenantActivityFeed } from './service';

import type { ActivityAppContext } from './types';
import type { Activity as DbActivity } from '@abe-stack/db';
import type { HandlerContext } from '@abe-stack/server-engine';
import type { AuthenticatedUser } from '@abe-stack/shared/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Response Types
// ============================================================================

/**
 * Activity response object for API consumers.
 * Converts Date fields to ISO strings for JSON serialization.
 */
interface ActivityResponse {
  readonly id: string;
  readonly tenantId: string | null;
  readonly actorId: string | null;
  readonly actorType: string;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly description: string | null;
  readonly metadata: Record<string, unknown>;
  readonly ipAddress: string | null;
  readonly createdAt: string;
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Narrow HandlerContext to ActivityAppContext.
 * The server composition root ensures the context implements ActivityAppContext.
 *
 * @param ctx - Generic handler context from router
 * @returns Narrowed ActivityAppContext
 * @complexity O(1)
 */
function asAppContext(ctx: HandlerContext): ActivityAppContext {
  return ctx as unknown as ActivityAppContext;
}

/**
 * Convert a database activity record to a safe API response.
 * Converts Date values to ISO strings for JSON serialization.
 *
 * @param activity - Database activity record
 * @returns Serializable response object
 * @complexity O(1)
 */
function toActivityResponse(activity: DbActivity): ActivityResponse {
  const rawCreatedAt = activity.createdAt as unknown;
  const createdAt =
    rawCreatedAt instanceof Date
      ? rawCreatedAt
      : typeof rawCreatedAt === 'string'
        ? new Date(rawCreatedAt)
        : new Date(0);
  const safeCreatedAt = Number.isNaN(createdAt.getTime()) ? new Date(0) : createdAt;

  return {
    id: activity.id,
    tenantId: activity.tenantId,
    actorId: activity.actorId,
    actorType: activity.actorType,
    action: activity.action,
    resourceType: activity.resourceType,
    resourceId: activity.resourceId,
    description: activity.description,
    metadata: activity.metadata,
    ipAddress: activity.ipAddress,
    createdAt: safeCreatedAt.toISOString(),
  };
}

/**
 * Extract authenticated user from a Fastify request.
 *
 * @param request - Fastify request with user set by auth middleware
 * @returns Authenticated user or undefined
 * @complexity O(1)
 */
function getUser(request: FastifyRequest): AuthenticatedUser | undefined {
  return (request as FastifyRequest & { user?: AuthenticatedUser }).user;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * List activities for the authenticated user.
 *
 * Returns the current user's activity feed, ordered by most recent first.
 * Supports an optional `limit` query parameter (default: 50).
 *
 * @param ctx - Handler context narrowed to ActivityAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user
 * @param _reply - Fastify reply (unused)
 * @returns 200 with list of activities, or error response
 * @complexity O(n) where n is the number of activities returned
 */
export async function handleListActivities(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { activities: ActivityResponse[] } }
  | { status: 401; body: { message: string } }
  | { status: 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  try {
    const query = request.query as { limit?: string };
    const parsed = query.limit !== undefined ? parseInt(query.limit, 10) : NaN;
    const limit = Math.min(Math.max(Number.isNaN(parsed) ? 50 : parsed, 1), 200);

    const activities = await getActivityFeed(appCtx.repos.activities, user.userId, limit);

    return {
      status: HTTP_STATUS.OK,
      body: {
        activities: activities.map(toActivityResponse),
      },
    };
  } catch (error: unknown) {
    appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to list activities' },
    };
  }
}

/**
 * List activities for a specific tenant.
 *
 * Returns the tenant's activity feed, ordered by most recent first.
 * Extracts the tenant ID from the `:tenantId` route parameter.
 * Supports an optional `limit` query parameter (default: 50).
 *
 * @param ctx - Handler context narrowed to ActivityAppContext
 * @param _body - Unused request body
 * @param request - Fastify request with authenticated user and :tenantId param
 * @param _reply - Fastify reply (unused)
 * @returns 200 with list of activities, or error response
 * @complexity O(n) where n is the number of activities returned
 */
export async function handleListTenantActivities(
  ctx: HandlerContext,
  _body: unknown,
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<
  | { status: 200; body: { activities: ActivityResponse[] } }
  | { status: 400; body: { message: string } }
  | { status: 401; body: { message: string } }
  | { status: 500; body: { message: string } }
> {
  const appCtx = asAppContext(ctx);
  const user = getUser(request);

  if (user === undefined) {
    return { status: HTTP_STATUS.UNAUTHORIZED, body: { message: 'Unauthorized' } };
  }

  const params = request.params as { tenantId?: string };
  const tenantId = params.tenantId ?? '';

  if (tenantId === '') {
    return { status: HTTP_STATUS.BAD_REQUEST, body: { message: 'Tenant ID is required' } };
  }

  try {
    const query = request.query as { limit?: string };
    const parsed = query.limit !== undefined ? parseInt(query.limit, 10) : NaN;
    const limit = Math.min(Math.max(Number.isNaN(parsed) ? 50 : parsed, 1), 200);

    const activities = await getTenantActivityFeed(appCtx.repos.activities, tenantId, limit);

    return {
      status: HTTP_STATUS.OK,
      body: {
        activities: activities.map(toActivityResponse),
      },
    };
  } catch (error: unknown) {
    appCtx.log.error(error instanceof Error ? error : new Error(String(error)));
    return {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      body: { message: 'Failed to list tenant activities' },
    };
  }
}
