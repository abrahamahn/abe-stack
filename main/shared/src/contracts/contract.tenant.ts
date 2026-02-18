// main/shared/src/contracts/contract.tenant.ts
/**
 * Tenant/Workspace Contracts
 *
 * API contract definitions for workspace management (CRUD, settings, ownership)
 * and membership (members, invitations, roles).
 * @module Contracts/Tenant
 */

import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationsListResponseSchema,
  membershipActionResponseSchema,
  membersListResponseSchema,
  updateMembershipRoleSchema,
} from '../core/tenant/membership.schemas';
import {
  createTenantSchema,
  tenantActionResponseSchema,
  tenantListResponseSchema,
  tenantSchema,
  transferOwnershipSchema,
  updateTenantSchema,
} from '../core/tenant/tenant.schemas';
import {
  tenantSettingSchema,
  updateTenantSettingSchema,
} from '../core/tenant/tenant.settings.schemas';
import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../system/http';
import { inviteIdSchema, tenantIdSchema, userIdSchema } from '../primitives/schema/ids';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const tenantContract = {
  create: {
    method: 'POST' as const,
    path: '/api/tenants',
    body: createTenantSchema,
    responses: {
      201: successResponseSchema(tenantActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
    },
    summary: 'Create a new workspace',
  },

  list: {
    method: 'GET' as const,
    path: '/api/tenants',
    responses: {
      200: successResponseSchema(tenantListResponseSchema),
      401: errorResponseSchema,
    },
    summary: 'List workspaces for the authenticated user',
  },

  get: {
    method: 'GET' as const,
    path: '/api/tenants/:id',
    pathParams: { id: tenantIdSchema },
    responses: {
      200: successResponseSchema(tenantSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get workspace details',
  },

  update: {
    method: 'POST' as const,
    path: '/api/tenants/:id/update',
    pathParams: { id: tenantIdSchema },
    body: updateTenantSchema,
    responses: {
      200: successResponseSchema(tenantActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update workspace details',
  },

  delete: {
    method: 'DELETE' as const,
    path: '/api/tenants/:id',
    pathParams: { id: tenantIdSchema },
    responses: {
      200: successResponseSchema(tenantActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Delete a workspace',
  },

  transferOwnership: {
    method: 'POST' as const,
    path: '/api/tenants/:id/transfer',
    pathParams: { id: tenantIdSchema },
    body: transferOwnershipSchema,
    responses: {
      200: successResponseSchema(tenantActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Transfer workspace ownership to another member',
  },

  getSetting: {
    method: 'GET' as const,
    path: '/api/tenants/:id/settings/:key',
    pathParams: { id: tenantIdSchema },
    responses: {
      200: successResponseSchema(tenantSettingSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a workspace setting by key',
  },

  updateSetting: {
    method: 'POST' as const,
    path: '/api/tenants/:id/settings/:key',
    pathParams: { id: tenantIdSchema },
    body: updateTenantSettingSchema,
    responses: {
      200: successResponseSchema(tenantSettingSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update a workspace setting',
  },

  // ========================================================================
  // Membership
  // ========================================================================

  listMembers: {
    method: 'GET' as const,
    path: '/api/tenants/:tenantId/members',
    pathParams: { tenantId: tenantIdSchema },
    responses: {
      200: successResponseSchema(membersListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'List workspace members',
  },

  removeMember: {
    method: 'DELETE' as const,
    path: '/api/tenants/:tenantId/members/:userId',
    pathParams: { tenantId: tenantIdSchema, userId: userIdSchema },
    responses: {
      200: successResponseSchema(membershipActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Remove a member from the workspace',
  },

  updateRole: {
    method: 'POST' as const,
    path: '/api/tenants/:tenantId/members/:userId/role',
    pathParams: { tenantId: tenantIdSchema, userId: userIdSchema },
    body: updateMembershipRoleSchema,
    responses: {
      200: successResponseSchema(membershipActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update a member role',
  },

  inviteMember: {
    method: 'POST' as const,
    path: '/api/tenants/:tenantId/invitations',
    pathParams: { tenantId: tenantIdSchema },
    body: createInvitationSchema,
    responses: {
      201: successResponseSchema(membershipActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Invite a member to the workspace',
  },

  listInvitations: {
    method: 'GET' as const,
    path: '/api/tenants/:tenantId/invitations',
    pathParams: { tenantId: tenantIdSchema },
    responses: {
      200: successResponseSchema(invitationsListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'List pending invitations',
  },

  acceptInvitation: {
    method: 'POST' as const,
    path: '/api/invitations/accept',
    body: acceptInvitationSchema,
    responses: {
      200: successResponseSchema(membershipActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      404: errorResponseSchema,
      410: errorResponseSchema,
    },
    summary: 'Accept a workspace invitation',
  },

  revokeInvitation: {
    method: 'DELETE' as const,
    path: '/api/tenants/:tenantId/invitations/:invitationId',
    pathParams: { tenantId: tenantIdSchema, invitationId: inviteIdSchema },
    responses: {
      200: successResponseSchema(membershipActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Revoke a pending invitation',
  },

  resendInvitation: {
    method: 'POST' as const,
    path: '/api/tenants/:tenantId/invitations/:invitationId/resend',
    pathParams: { tenantId: tenantIdSchema, invitationId: inviteIdSchema },
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(membershipActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Resend an invitation email',
  },

  leave: {
    method: 'POST' as const,
    path: '/api/tenants/:tenantId/leave',
    pathParams: { tenantId: tenantIdSchema },
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(membershipActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Leave a workspace',
  },
} satisfies Contract;
