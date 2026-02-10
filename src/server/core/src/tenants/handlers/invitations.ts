// src/server/core/src/tenants/handlers/invitations.ts
/**
 * Invitation Management Handlers
 *
 * HTTP handlers for workspace invitation operations:
 * create, list, accept, revoke, and resend invitations.
 *
 * @module handlers/invitations
 */

import {
  mapErrorToHttpResponse,
  type CreateInvitation,
  type ErrorMapperLogger,
  type HttpErrorResponse,
} from '@abe-stack/shared';

import {
  acceptInvitation,
  createInvitation,
  listInvitations,
  resendInvitation,
  revokeInvitation,
} from '../invitation-service';
import { ERROR_MESSAGES, type TenantsModuleDeps, type TenantsRequest } from '../types';

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
 * Handle creating a workspace invitation.
 * POST /api/tenants/:id/invitations
 */
export async function handleCreateInvitation(
  deps: TenantsModuleDeps,
  tenantId: string,
  body: CreateInvitation,
  request: TenantsRequest,
): Promise<{ status: 201; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const invitation = await createInvitation(deps.repos, tenantId, userId, body.email, body.role);

    // TODO: Send invitation email (D1 email integration)
    // The email would include a link to accept the invitation.
    // For now, the invitation is created and can be accepted via API.

    return { status: 201, body: invitation };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}

/**
 * Handle listing workspace invitations.
 * GET /api/tenants/:id/invitations
 */
export async function handleListInvitations(
  deps: TenantsModuleDeps,
  tenantId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const invitations = await listInvitations(deps.repos, tenantId, userId);
    return { status: 200, body: invitations };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}

/**
 * Handle accepting a workspace invitation.
 * POST /api/invitations/:id/accept
 */
export async function handleAcceptInvitation(
  deps: TenantsModuleDeps,
  invitationId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    const userEmail = request.user?.email;
    if (userId === undefined || userEmail === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const invitation = await acceptInvitation(deps.repos, invitationId, userId, userEmail);
    return { status: 200, body: invitation };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}

/**
 * Handle revoking a workspace invitation.
 * POST /api/tenants/:id/invitations/:invitationId/revoke
 */
export async function handleRevokeInvitation(
  deps: TenantsModuleDeps,
  tenantId: string,
  invitationId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: unknown } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    const invitation = await revokeInvitation(deps.repos, tenantId, invitationId, userId);
    return { status: 200, body: invitation };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}

/**
 * Handle resending a workspace invitation.
 * POST /api/tenants/:id/invitations/:invitationId/resend
 */
export async function handleResendInvitation(
  deps: TenantsModuleDeps,
  tenantId: string,
  invitationId: string,
  request: TenantsRequest,
): Promise<{ status: 200; body: { message: string } } | HttpErrorResponse> {
  try {
    const userId = request.user?.userId;
    if (userId === undefined) {
      return { status: 401, body: { message: ERROR_MESSAGES.UNAUTHORIZED } };
    }

    // Validate the invitation exists and is pending
    await resendInvitation(deps.repos, tenantId, invitationId, userId);

    // TODO: Re-send the invitation email

    return { status: 200, body: { message: 'Invitation resent' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}
