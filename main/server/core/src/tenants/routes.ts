// main/server/core/src/tenants/routes.ts
/**
 * Tenant Routes
 *
 * Route definitions for tenants module.
 * Uses the generic router pattern from @abe-stack/server-engine.
 *
 * @module routes
 */

import {
    addMemberSchema,
    createInvitationSchema,
    createTenantSchema,
    emptyBodySchema,
    transferOwnershipSchema,
    updateMembershipRoleSchema,
    updateTenantSchema,
    type TransferOwnershipInput,
} from '@abe-stack/shared';

import {
    createRouteMap,
    protectedRoute,
    type HandlerContext,
    type RouteMap,
    type RouteResult,
} from '../../../engine/src';

import {
    handleAcceptInvitation,
    handleAddMember,
    handleCreateInvitation,
    handleCreateTenant,
    handleDeleteTenant,
    handleGetTenant,
    handleListInvitations,
    handleListMembers,
    handleListTenantAuditEvents,
    handleListTenants,
    handleRemoveMember,
    handleResendInvitation,
    handleRevokeInvitation,
    handleTransferOwnership,
    handleUpdateMemberRole,
    handleUpdateTenant,
} from './handlers';

import type { TenantsModuleDeps, TenantsRequest } from './types';
import type { FastifyRequest } from 'fastify';

// ============================================================================
// Context Bridge
// ============================================================================

/**
 * Narrow HandlerContext to TenantsModuleDeps.
 * The server composition root ensures the context implements TenantsModuleDeps.
 */
function asTenantsDeps(ctx: HandlerContext): TenantsModuleDeps {
  return ctx as unknown as TenantsModuleDeps;
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Tenant route map with all workspace management endpoints.
 *
 * Routes:
 * - `tenants` (POST, user) - Create a new workspace
 * - `tenants` (GET, user) - List user's workspaces
 * - `tenants/:id` (GET, user) - Get a workspace by ID
 * - `tenants/:id` (PATCH, user) - Update a workspace
 * - `tenants/:id` (DELETE, user) - Delete a workspace
 */
export const tenantRoutes: RouteMap = createRouteMap([
  // Create a new workspace
  [
    'tenants',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        return handleCreateTenant(
          deps,
          body as import('@abe-stack/shared').CreateTenantInput,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      createTenantSchema,
      { summary: 'Create workspace', tags: ['Tenants'] },
    ),
  ],

  // List user's workspaces
  [
    'tenants/list',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        return handleListTenants(deps, req as unknown as TenantsRequest);
      },
      'user',
      undefined,
      { summary: 'List workspaces', tags: ['Tenants'] },
    ),
  ],

  // Get a workspace by ID
  [
    'tenants/:id',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleGetTenant(deps, tenantId, req as unknown as TenantsRequest);
      },
      'user',
      undefined,
      { summary: 'Get workspace', tags: ['Tenants'] },
    ),
  ],

  // Update a workspace
  [
    'tenants/:id/update',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleUpdateTenant(
          deps,
          tenantId,
          body as {
            name?: string | undefined;
            logoUrl?: string | null | undefined;
            metadata?: Record<string, unknown> | undefined;
          },
          req as unknown as TenantsRequest,
        );
      },
      'user',
      updateTenantSchema,
      { summary: 'Update workspace', tags: ['Tenants'] },
    ),
  ],

  // Delete a workspace
  [
    'tenants/:id/delete',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleDeleteTenant(deps, tenantId, req as unknown as TenantsRequest);
      },
      'user',
      emptyBodySchema,
      { summary: 'Delete workspace', tags: ['Tenants'] },
    ),
  ],

  // Transfer workspace ownership
  [
    'tenants/:id/transfer-ownership',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleTransferOwnership(
          deps,
          tenantId,
          body as TransferOwnershipInput,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      transferOwnershipSchema,
      { summary: 'Transfer workspace ownership', tags: ['Tenants'] },
    ),
  ],

  // ============================================================================
  // Audit Events Route
  // ============================================================================

  // List workspace audit events
  [
    'tenants/:id/audit-events',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        const query = (req.query ?? {}) as Record<string, string | undefined>;
        return handleListTenantAuditEvents(
          deps,
          tenantId,
          {
            limit: query['limit'],
            action: query['action'],
            actorId: query['actorId'],
            startDate: query['startDate'],
            endDate: query['endDate'],
          },
          req as unknown as TenantsRequest,
        );
      },
      'user',
      undefined,
      { summary: 'List workspace audit events', tags: ['Tenants', 'Audit'] },
    ),
  ],

  // ============================================================================
  // Member Management Routes
  // ============================================================================

  // List workspace members
  [
    'tenants/:id/members',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleListMembers(deps, tenantId, req as unknown as TenantsRequest);
      },
      'user',
      undefined,
      { summary: 'List workspace members', tags: ['Tenants', 'Members'] },
    ),
  ],

  // Add a member to workspace
  [
    'tenants/:id/members/add',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleAddMember(
          deps,
          tenantId,
          body as import('@abe-stack/shared').AddMember,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      addMemberSchema,
      { summary: 'Add workspace member', tags: ['Tenants', 'Members'] },
    ),
  ],

  // Update a member's role
  [
    'tenants/:id/members/:userId/role',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const params = req.params as { id: string; userId: string };
        return handleUpdateMemberRole(
          deps,
          params.id,
          params.userId,
          body as import('@abe-stack/shared').UpdateMembershipRole,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      updateMembershipRoleSchema,
      { summary: 'Update member role', tags: ['Tenants', 'Members'] },
    ),
  ],

  // Remove a member from workspace
  [
    'tenants/:id/members/:userId/remove',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const params = req.params as { id: string; userId: string };
        return handleRemoveMember(deps, params.id, params.userId, req as unknown as TenantsRequest);
      },
      'user',
      emptyBodySchema,
      { summary: 'Remove workspace member', tags: ['Tenants', 'Members'] },
    ),
  ],

  // ============================================================================
  // Invitation Management Routes
  // ============================================================================

  // Create an invitation
  [
    'tenants/:id/invitations',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleCreateInvitation(
          deps,
          tenantId,
          body as import('@abe-stack/shared').CreateInvitation,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      createInvitationSchema,
      { summary: 'Create invitation', tags: ['Tenants', 'Invitations'] },
    ),
  ],

  // List workspace invitations
  [
    'tenants/:id/invitations/list',
    protectedRoute(
      'GET',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleListInvitations(deps, tenantId, req as unknown as TenantsRequest);
      },
      'user',
      undefined,
      { summary: 'List invitations', tags: ['Tenants', 'Invitations'] },
    ),
  ],

  // Accept an invitation
  [
    'invitations/:id/accept',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const invitationId = (req.params as { id: string }).id;
        return handleAcceptInvitation(deps, invitationId, req as unknown as TenantsRequest);
      },
      'user',
      emptyBodySchema,
      { summary: 'Accept invitation', tags: ['Tenants', 'Invitations'] },
    ),
  ],

  // Revoke an invitation
  [
    'tenants/:id/invitations/:invitationId/revoke',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const params = req.params as { id: string; invitationId: string };
        return handleRevokeInvitation(
          deps,
          params.id,
          params.invitationId,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      emptyBodySchema,
      { summary: 'Revoke invitation', tags: ['Tenants', 'Invitations'] },
    ),
  ],

  // Resend an invitation
  [
    'tenants/:id/invitations/:invitationId/resend',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const params = req.params as { id: string; invitationId: string };
        return handleResendInvitation(
          deps,
          params.id,
          params.invitationId,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      emptyBodySchema,
      { summary: 'Resend invitation', tags: ['Tenants', 'Invitations'] },
    ),
  ],

  // Regenerate an invitation token/expiry (alias of resend semantics)
  [
    'tenants/:id/invitations/:invitationId/regenerate',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: unknown, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const params = req.params as { id: string; invitationId: string };
        return handleResendInvitation(
          deps,
          params.id,
          params.invitationId,
          req as unknown as TenantsRequest,
        );
      },
      'user',
      emptyBodySchema,
      { summary: 'Regenerate invitation', tags: ['Tenants', 'Invitations'] },
    ),
  ],
]);
