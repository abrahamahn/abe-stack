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

import { logActivity } from '../../activities';
import { record } from '../../audit/service';
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

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.invitation_created',
        resource: 'invitation',
        resourceId: (invitation as { id?: string }).id ?? null,
        tenantId,
        metadata: { email: body.email, role: body.role },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    const invId = (invitation as { id?: string }).id ?? '';
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'invitation.created',
      resourceType: 'invitation',
      resourceId: invId,
      tenantId,
      metadata: { email: body.email, role: body.role },
    }).catch(() => {});

    // Fire-and-forget notification for the inviter
    deps.repos.notifications
      .create({
        userId,
        type: 'info',
        title: 'Invitation sent',
        message: `Workspace invitation sent to ${body.email}`,
        data: { email: body.email, role: body.role, tenantId },
      })
      .catch(() => {});

    // Fire-and-forget: send invitation email
    if (deps.mailer !== undefined && deps.emailTemplates !== undefined) {
      const acceptUrl = `${deps.appBaseUrl ?? ''}/invitations/${invId}/accept`;
      const actor = await deps.repos.users.findById(userId);
      const actorName = actor !== null ? `${actor.firstName} ${actor.lastName}`.trim() : 'A team member';
      const tenant = await deps.repos.tenants.findById(tenantId);
      const workspaceName = tenant?.name ?? 'the workspace';
      const emailData = deps.emailTemplates.workspaceInvitation(
        acceptUrl,
        workspaceName,
        actorName,
        body.role,
      );
      deps.mailer.send({ ...emailData, to: body.email }).catch(() => {});
    }

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

    // Fire-and-forget audit logging
    const invTenantId = (invitation as { tenantId?: string }).tenantId;
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.invitation_accepted',
        resource: 'invitation',
        resourceId: invitationId,
        tenantId: invTenantId ?? null,
        metadata: { email: userEmail },
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'invitation.accepted',
      resourceType: 'invitation',
      resourceId: invitationId,
      tenantId: invTenantId ?? null,
    }).catch(() => {});

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

    // Fire-and-forget audit logging
    record(
      { auditEvents: deps.repos.auditEvents },
      {
        actorId: userId,
        action: 'workspace.invitation_revoked',
        resource: 'invitation',
        resourceId: invitationId,
        tenantId,
      },
    ).catch(() => {});

    // Fire-and-forget activity log
    logActivity(deps.repos.activities, {
      actorId: userId,
      actorType: 'user',
      action: 'invitation.revoked',
      resourceType: 'invitation',
      resourceId: invitationId,
      tenantId,
    }).catch(() => {});

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

    // Fire-and-forget: resend invitation email
    if (deps.mailer !== undefined && deps.emailTemplates !== undefined) {
      const inv = await deps.repos.invitations.findById(invitationId);
      if (inv !== null) {
        const acceptUrl = `${deps.appBaseUrl ?? ''}/invitations/${inv.id}/accept`;
        const actor = await deps.repos.users.findById(userId);
        const actorName = actor !== null ? `${actor.firstName} ${actor.lastName}`.trim() : 'A team member';
        const tenant = await deps.repos.tenants.findById(tenantId);
        const workspaceName = tenant?.name ?? 'the workspace';
        const emailData = deps.emailTemplates.workspaceInvitation(
          acceptUrl,
          workspaceName,
          actorName,
          inv.role,
        );
        deps.mailer.send({ ...emailData, to: inv.email }).catch(() => {});
      }
    }

    return { status: 200, body: { message: 'Invitation resent' } };
  } catch (error) {
    return mapErrorToHttpResponse(error, createLogAdapter(deps.log));
  }
}
