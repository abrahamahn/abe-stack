// main/shared/src/contracts/contract.membership.ts
/**
 * Membership Contracts
 *
 * API contract definitions for workspace member and invitation management.
 * @module Contracts/Membership
 */

import {
  acceptInvitationSchema,
  createInvitationSchema,
  invitationsListResponseSchema,
  membershipActionResponseSchema,
  membersListResponseSchema,
  updateMembershipRoleSchema,
} from '../core/membership/membership.schemas';
import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../engine/http';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const membershipContract = {
  listMembers: {
    method: 'GET' as const,
    path: '/api/tenants/:tenantId/members',
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
