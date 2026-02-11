// src/server/core/src/tenants/handlers/members.ts
/**
 * Membership Management Handlers
 *
 * HTTP handlers for workspace member operations:
 * list, add, update role, and remove members.
 *
 * @module handlers/members
 */

import {
  mapErrorToHttpResponse,
  type ErrorMapperLogger,
  type HttpErrorResponse,
  type TenantRole,
} from '@abe-stack/shared';

import { logActivity } from '../../activities';
import { record } from '../../audit/service';
import { addMember, listMembers, removeMember, updateMemberRole } from '../membership-service';
import { ERROR_MESSAGES, type TenantsModuleDeps, type TenantsRequest } from '../types';

// ============================================================================
// Types
// ============================================================================

interface AddMemberBody {
  userId: string;
  role: TenantRole;
}

interface UpdateMemberRoleBody {
  role: TenantRole;
}

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
// Handlers
// ============================================================================

/**
 * Handle listing workspace members.
 * GET /api/tenants/:id/members
 */
export async function handleListMembers(
  deps: TenantsModuleDeps,
  tenantId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const members = await listMembers(deps.repos, tenantId, userId);
    return { status: 200, body: members };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}

/**
 * Handle adding a member to a workspace.
 * POST /api/tenants/:id/members
 */
export async function handleAddMember(
  deps: TenantsModuleDeps,
  tenantId: string,
  body: AddMemberBody,
  request: TenantsRequest,
): Promise<{ status: 201; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const member = await addMember(deps.repos, tenantId, userId, body.userId, body.role);

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.member_added',
        resource: 'membership',
        resourceId: body.userId,
        tenantId,
        metadata: { role: body.role },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'member.added',
      resourceType: 'membership',
      resourceId: body.userId,
      tenantId,
      metadata: { role: body.role },
    }).catch(() => {});

    return { status: 201, body: member };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}

/**
 * Handle updating a member's role.
 * POST /api/tenants/:id/members/:userId/role
 */
export async function handleUpdateMemberRole(
  deps: TenantsModuleDeps,
  tenantId: string,
  targetUserId: string,
  body: UpdateMemberRoleBody,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const member = await updateMemberRole(deps.repos, tenantId, userId, targetUserId, body.role);

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'role.changed',
        resource: 'membership',
        resourceId: targetUserId,
        tenantId,
        metadata: { newRole: body.role },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'member.role_changed',
      resourceType: 'membership',
      resourceId: targetUserId,
      tenantId,
      metadata: { newRole: body.role },
    }).catch(() => {});

    return { status: 200, body: member };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}

/**
 * Handle removing a member from a workspace.
 * POST /api/tenants/:id/members/:userId/remove
 */
export async function handleRemoveMember(
  deps: TenantsModuleDeps,
  tenantId: string,
  targetUserId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    await removeMember(deps.repos, tenantId, userId, targetUserId);

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.member_removed',
        resource: 'membership',
        resourceId: targetUserId,
        tenantId,
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'member.removed',
      resourceType: 'membership',
      resourceId: targetUserId,
      tenantId,
    }).catch(() => {});

    return { status: 200, body: { message: 'Member removed' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}
