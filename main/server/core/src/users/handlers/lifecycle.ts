// main/server/core/src/users/handlers/lifecycle.ts
/**
 * Account Lifecycle Handlers
 *
 * Handles account deactivation, deletion request (with grace period),
 * and reactivation. Deletion requires orphan prevention checks.
 *
 * @module handlers/lifecycle
 */

import {
    BadRequestError,
    calculateDeletionGracePeriodEnd,
    canDeactivate,
    canReactivate,
    canRequestDeletion,
    getAccountStatus,
    type AccountLifecycleFields,
    type AccountLifecycleResponse,
    type AccountStatus,
    type DeactivateAccountRequest,
    type DeleteAccountRequest,
} from '@abe-stack/shared';

import { record } from '../../audit/service';
import { ERROR_MESSAGES, type UsersModuleDeps, type UsersRequest } from '../types';

import type { Repositories } from '../../../../db/src';
import type { HandlerContext, RouteResult } from '../../../../engine/src';

// ============================================================================
// Context Bridge
// ============================================================================

function asUsersDeps(ctx: HandlerContext): UsersModuleDeps {
  return ctx as unknown as UsersModuleDeps;
}

// ============================================================================
// Helpers
// ============================================================================

function toLifecycleFields(user: {
  deactivatedAt: Date | null;
  deletedAt: Date | null;
  deletionGracePeriodEnds: Date | null;
}): AccountLifecycleFields {
  return {
    deactivatedAt: user.deactivatedAt,
    deletedAt: user.deletedAt,
    deletionGracePeriodEnds: user.deletionGracePeriodEnds,
  };
}

function buildResponse(
  status: AccountStatus,
  message: string,
  gracePeriodEnds?: Date | null,
): AccountLifecycleResponse {
  const response: AccountLifecycleResponse = { message, status };
  if (gracePeriodEnds !== undefined && gracePeriodEnds !== null) {
    response.deletionGracePeriodEnds = gracePeriodEnds.toISOString();
  }
  return response;
}

/**
 * Check if the user is the sole owner of any workspace.
 * If so, they cannot delete their account without transferring ownership first.
 *
 * Uses direct DB types (not branded shared Membership) to avoid type mismatch.
 */
async function checkOrphanPrevention(repos: Repositories, userId: string): Promise<string | null> {
  const memberships = await repos.memberships.findByUserId(userId);

  for (const membership of memberships) {
    if (membership.role === 'owner') {
      const tenantMembers = await repos.memberships.findByTenantId(membership.tenantId);
      const owners = tenantMembers.filter((m) => m.role === 'owner');
      if (owners.length === 1 && owners[0]?.userId === userId) {
        return membership.tenantId;
      }
    }
  }

  return null;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle account deactivation.
 * Deactivated accounts cannot log in but data is preserved.
 */
export async function handleDeactivateAccount(
  ctx: HandlerContext,
  _body: DeactivateAccountRequest,
  request: UsersRequest,
): Promise<RouteResult> {
  const deps = asUsersDeps(ctx);

  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const user = await deps.repos.users.findById(request.user.userId);
    if (user === null) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    const fields = toLifecycleFields(user);
    if (!canDeactivate(fields)) {
      const currentStatus = getAccountStatus(fields);
      return {
        status: 400,
        body: { message: `Account cannot be deactivated (current status: ${currentStatus})` },
      };
    }

    const now = new Date();
    const updated = await deps.repos.users.update(request.user.userId, {
      deactivatedAt: now,
    });

    if (updated === null) {
      return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
    }

    deps.log.info({ userId: request.user.userId }, 'Account deactivated');

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: request.user.userId,
        action: 'user.account_deactivated',
        resource: 'user',
        resourceId: request.user.userId,
        severity: 'warn',
        category: 'security',
      },
    ).catch(() => {});

    return {
      status: 200,
      body: buildResponse('deactivated', 'Account has been deactivated'),
    };
  } catch (error) {
    if (error instanceof BadRequestError) {
      return { status: 400, body: { message: error.message } };
    }
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to deactivate account',
    );
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Handle account deletion request.
 * Initiates a 30-day grace period. After the grace period,
 * the account data is eligible for permanent removal.
 *
 * Blocked if user is sole owner of any workspace.
 */
export async function handleRequestDeletion(
  ctx: HandlerContext,
  _body: DeleteAccountRequest,
  request: UsersRequest,
): Promise<RouteResult> {
  const deps = asUsersDeps(ctx);

  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const user = await deps.repos.users.findById(request.user.userId);
    if (user === null) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    const fields = toLifecycleFields(user);
    if (!canRequestDeletion(fields)) {
      return {
        status: 400,
        body: { message: 'Account deletion has already been requested' },
      };
    }

    // Check orphan prevention — sole owner cannot delete without transferring ownership
    const orphanTenantId = await checkOrphanPrevention(deps.repos, request.user.userId);
    if (orphanTenantId !== null) {
      return {
        status: 409,
        body: {
          message: `Cannot delete account: you are the sole owner of workspace ${orphanTenantId}. Transfer ownership first.`,
        },
      };
    }

    const now = new Date();
    const gracePeriodEnds = calculateDeletionGracePeriodEnd(now);

    const updated = await deps.repos.users.update(request.user.userId, {
      deletedAt: now,
      deletionGracePeriodEnds: gracePeriodEnds,
    });

    if (updated === null) {
      return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
    }

    deps.log.info(
      { userId: request.user.userId, gracePeriodEnds: gracePeriodEnds.toISOString() },
      'Account deletion requested',
    );

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: request.user.userId,
        action: 'user.deletion_requested',
        resource: 'user',
        resourceId: request.user.userId,
        severity: 'warn',
        category: 'security',
        metadata: { gracePeriodEnds: gracePeriodEnds.toISOString() },
      },
    ).catch(() => {});

    return {
      status: 200,
      body: buildResponse(
        'pending_deletion',
        'Account deletion requested. You have 30 days to reactivate.',
        gracePeriodEnds,
      ),
    };
  } catch (error) {
    if (error instanceof BadRequestError) {
      return { status: 400, body: { message: error.message } };
    }
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to request account deletion',
    );
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}

/**
 * Handle account reactivation.
 * Can reactivate deactivated accounts or cancel pending deletion
 * (within grace period).
 */
export async function handleReactivateAccount(
  ctx: HandlerContext,
  _body: undefined,
  request: UsersRequest,
): Promise<RouteResult> {
  const deps = asUsersDeps(ctx);

  if (request.user === undefined) {
    return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
  }

  try {
    const user = await deps.repos.users.findById(request.user.userId);
    if (user === null) {
      return { status: 404, body: { message: ERROR_MESSAGES.USER_NOT_FOUND } };
    }

    const fields = toLifecycleFields(user);
    if (!canReactivate(fields)) {
      const currentStatus = getAccountStatus(fields);
      if (currentStatus === 'active') {
        return { status: 400, body: { message: 'Account is already active' } };
      }
      return {
        status: 400,
        body: { message: 'Account cannot be reactivated (grace period has expired)' },
      };
    }

    const updated = await deps.repos.users.update(request.user.userId, {
      deactivatedAt: null,
      deletedAt: null,
      deletionGracePeriodEnds: null,
    });

    if (updated === null) {
      return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
    }

    deps.log.info({ userId: request.user.userId }, 'Account reactivated');

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: request.user.userId,
        action: 'user.account_reactivated',
        resource: 'user',
        resourceId: request.user.userId,
        category: 'security',
      },
    ).catch(() => {});

    return {
      status: 200,
      body: buildResponse('active', 'Account has been reactivated'),
    };
  } catch (error) {
    if (error instanceof BadRequestError) {
      return { status: 400, body: { message: error.message } };
    }
    deps.log.error(
      error instanceof Error ? error : new Error(String(error)),
      'Failed to reactivate account',
    );
    return { status: 500, body: { message: ERROR_MESSAGES.INTERNAL_ERROR } };
  }
}
