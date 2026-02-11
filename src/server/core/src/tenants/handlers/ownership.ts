// src/server/core/src/tenants/handlers/ownership.ts
/**
 * Ownership Transfer Handler
 *
 * Handles transferring workspace ownership between members.
 * Prevents orphaned workspaces by validating membership before transfer.
 *
 * @module handlers/ownership
 */

import { mapErrorToHttpResponse } from '@abe-stack/shared';

import { logActivity } from '../../activities';
import { record } from '../../audit/service';
import { transferOwnership } from '../service';
import { ERROR_MESSAGES, type TenantsModuleDeps, type TenantsRequest } from '../types';

import type { HttpErrorResponse } from '@abe-stack/shared';

// ============================================================================
// Types
// ============================================================================

interface TransferOwnershipBody {
  newOwnerId: string;
}

// ============================================================================
// Handlers
// ============================================================================

/**
 * Handle transferring workspace ownership.
 * POST /api/tenants/:id/transfer-ownership
 */
export async function handleTransferOwnership(
  deps: TenantsModuleDeps,
  tenantId: string,
  body: TransferOwnershipBody,
  request: TenantsRequest,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    await transferOwnership(deps.db, deps.repos, tenantId, userId, body.newOwnerId);

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.ownership_transferred',
        resource: 'tenant',
        resourceId: tenantId,
        tenantId,
        metadata: { previousOwnerId: userId, newOwnerId: body.newOwnerId },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'ownership.transferred',
      resourceType: 'tenant',
      resourceId: tenantId,
      tenantId,
      metadata: { previousOwnerId: userId, newOwnerId: body.newOwnerId },
    }).catch(() => {});

    return { status: 200, body: { message: 'Ownership transferred successfully' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, {
      warn: (ctx: Record<string, unknown>, msg: string) => {
        deps.log.warn(ctx, msg);
      },
      error: (ctx: unknown, msg?: string) => {
        if (msg !== undefined) {
          deps.log.error(ctx as Record<string, unknown>, msg);
        } else {
          deps.log.error(ctx as Record<string, unknown>);
        }
      },
    });
  }
}
