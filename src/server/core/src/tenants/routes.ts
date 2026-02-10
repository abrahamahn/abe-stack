// src/server/core/src/tenants/routes.ts
/**
 * Tenant Routes
 *
 * Route definitions for tenants module.
 * Uses the generic router pattern from @abe-stack/server-engine.
 *
 * @module routes
 */

import {
  createRouteMap,
  protectedRoute,
  type HandlerContext,
  type RouteMap,
  type RouteResult,
} from '@abe-stack/server-engine';
import {
  addMemberSchema,
  createInvitationSchema,
  createTenantSchema,
  updateMembershipRoleSchema,
  updateTenantSchema,
} from '@abe-stack/shared';

import {
  handleAcceptInvitation,
  handleAddMember,
  handleCreateInvitation,
  handleCreateTenant,
  handleDeleteTenant,
  handleGetTenant,
  handleListInvitations,
  handleListMembers,
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
    ),
  ],

  // Delete a workspace
  [
    'tenants/:id/delete',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const tenantId = (req.params as { id: string }).id;
        return handleDeleteTenant(deps, tenantId, req as unknown as TenantsRequest);
      },
      'user',
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
          body as { newOwnerId: string },
          req as unknown as TenantsRequest,
        );
      },
      'user',
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
    ),
  ],

  // Remove a member from workspace
  [
    'tenants/:id/members/:userId/remove',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const params = req.params as { id: string; userId: string };
        return handleRemoveMember(deps, params.id, params.userId, req as unknown as TenantsRequest);
      },
      'user',
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
    ),
  ],

  // Accept an invitation
  [
    'invitations/:id/accept',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
        const deps = asTenantsDeps(ctx);
        const invitationId = (req.params as { id: string }).id;
        return handleAcceptInvitation(deps, invitationId, req as unknown as TenantsRequest);
      },
      'user',
    ),
  ],

  // Revoke an invitation
  [
    'tenants/:id/invitations/:invitationId/revoke',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
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
    ),
  ],

  // Resend an invitation
  [
    'tenants/:id/invitations/:invitationId/resend',
    protectedRoute(
      'POST',
      async (ctx: HandlerContext, _body: undefined, req: FastifyRequest): Promise<RouteResult> => {
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
    ),
  ],
]);
