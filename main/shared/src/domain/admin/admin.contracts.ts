// main/shared/src/domain/admin/admin.contracts.ts
/**
 * Admin Contracts
 *
 * API Contract definitions for administrative management.
 * @module Domain/Admin
 */

import { createSchema } from '../../core/schema.utils';
import { emptyBodySchema, errorResponseSchema, successResponseSchema } from '../../core/schemas';
import {
  adminPlanResponseSchema,
  adminPlansListResponseSchema,
  createPlanRequestSchema,
  syncStripeResponseSchema,
  updatePlanRequestSchema,
} from '../billing/billing.admin.schemas';
import { subscriptionActionResponseSchema } from '../billing/billing.schemas';

import {
  adminActionResponseSchema,
  adminHardBanRequestSchema,
  adminHardBanResponseSchema,
  adminLockUserRequestSchema,
  adminSuspendTenantRequestSchema,
  adminUpdateUserRequestSchema,
  adminUserListFiltersSchema,
  adminUserListResponseSchema,
  adminUserSchema,
  unlockAccountRequestSchema,
} from './admin.schemas';
import {
  securityEventDetailResponseSchema,
  securityEventsExportRequestSchema,
  securityEventsExportResponseSchema,
  securityEventsListRequestSchema,
  securityEventsListResponseSchema,
  securityMetricsResponseSchema,
} from './admin.security-schemas';

import type { Contract } from '../../core/api';

// ============================================================================
// Contract Definition
// ============================================================================

const unknownResponseSchema = createSchema((data: unknown) => data);

export const adminContract = {
  /**
   * List all users with filtering and pagination.
   */
  listUsers: {
    method: 'GET' as const,
    path: '/api/admin/users',
    query: adminUserListFiltersSchema,
    responses: {
      200: successResponseSchema(adminUserListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List all users with filtering and pagination (admin only)',
  },

  /**
   * Get a single user by ID.
   */
  getUser: {
    method: 'GET' as const,
    path: '/api/admin/users/:id',
    responses: {
      200: successResponseSchema(adminUserSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a single user by ID (admin only)',
  },

  /**
   * Update user details.
   */
  updateUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/update',
    body: adminUpdateUserRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update user details (admin only)',
  },

  /**
   * Lock a user account.
   */
  lockUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/lock',
    body: adminLockUserRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Lock a user account (admin only)',
  },

  /**
   * Unlock a locked user account (by ID).
   */
  unlockUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unlock a locked user account by ID (admin only)',
  },

  /**
   * Unlock a locked user account (by email/legacy).
   */
  unlockAccount: {
    method: 'POST' as const,
    path: '/api/admin/auth/unlock',
    body: unlockAccountRequestSchema,
    responses: {
      200: successResponseSchema(adminActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unlock a locked user account (admin only)',
  },

  searchUsers: {
    method: 'GET' as const,
    path: '/api/admin/users/search',
    query: adminUserListFiltersSchema,
    responses: {
      200: successResponseSchema(adminUserListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Search users with filtering and pagination (admin only)',
  },

  hardBanUser: {
    method: 'POST' as const,
    path: '/api/admin/users/:id/hard-ban',
    body: adminHardBanRequestSchema,
    responses: {
      200: successResponseSchema(adminHardBanResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Hard ban a user account (admin only)',
  },

  listSecurityEvents: {
    method: 'POST' as const,
    path: '/api/admin/security/events',
    body: securityEventsListRequestSchema,
    responses: {
      200: successResponseSchema(securityEventsListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List security events (admin only)',
  },

  getSecurityEvent: {
    method: 'GET' as const,
    path: '/api/admin/security/events/:id',
    responses: {
      200: successResponseSchema(securityEventDetailResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get security event details (admin only)',
  },

  getSecurityMetrics: {
    method: 'GET' as const,
    path: '/api/admin/security/metrics',
    responses: {
      200: successResponseSchema(securityMetricsResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get security metrics (admin only)',
  },

  exportSecurityEvents: {
    method: 'POST' as const,
    path: '/api/admin/security/export',
    body: securityEventsExportRequestSchema,
    responses: {
      200: successResponseSchema(securityEventsExportResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Export security events (admin only)',
  },

  listAdminTenants: {
    method: 'GET' as const,
    path: '/api/admin/tenants',
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List tenants (admin only)',
  },

  getAdminTenant: {
    method: 'GET' as const,
    path: '/api/admin/tenants/:id',
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get tenant details (admin only)',
  },

  suspendTenant: {
    method: 'POST' as const,
    path: '/api/admin/tenants/:id/suspend',
    body: adminSuspendTenantRequestSchema,
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Suspend tenant (admin only)',
  },

  unsuspendTenant: {
    method: 'POST' as const,
    path: '/api/admin/tenants/:id/unsuspend',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Unsuspend tenant (admin only)',
  },

  startImpersonation: {
    method: 'POST' as const,
    path: '/api/admin/impersonate/:userId',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Start user impersonation (admin only)',
  },

  endImpersonation: {
    method: 'POST' as const,
    path: '/api/admin/impersonate/end',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'End user impersonation (admin only)',
  },

  listAdminWebhooks: {
    method: 'GET' as const,
    path: '/api/admin/webhooks',
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List webhooks across tenants (admin only)',
  },

  listAdminWebhookDeliveries: {
    method: 'GET' as const,
    path: '/api/admin/webhooks/:id/deliveries',
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'List webhook deliveries (admin only)',
  },

  replayAdminWebhookDelivery: {
    method: 'POST' as const,
    path: '/api/admin/webhooks/:id/deliveries/:deliveryId/replay',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Replay webhook delivery (admin only)',
  },

  listAdminPlans: {
    method: 'GET' as const,
    path: '/api/admin/billing/plans',
    responses: {
      200: successResponseSchema(adminPlansListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List billing plans (admin only)',
  },

  getAdminPlan: {
    method: 'GET' as const,
    path: '/api/admin/billing/plans/:id',
    responses: {
      200: successResponseSchema(adminPlanResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get billing plan details (admin only)',
  },

  createAdminPlan: {
    method: 'POST' as const,
    path: '/api/admin/billing/plans/create',
    body: createPlanRequestSchema,
    responses: {
      201: successResponseSchema(adminPlanResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Create billing plan (admin only)',
  },

  updateAdminPlan: {
    method: 'POST' as const,
    path: '/api/admin/billing/plans/:id/update',
    body: updatePlanRequestSchema,
    responses: {
      200: successResponseSchema(adminPlanResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update billing plan (admin only)',
  },

  syncAdminPlanToStripe: {
    method: 'POST' as const,
    path: '/api/admin/billing/plans/:id/sync-stripe',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(syncStripeResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      500: errorResponseSchema,
    },
    summary: 'Sync billing plan to Stripe (admin only)',
  },

  deactivateAdminPlan: {
    method: 'POST' as const,
    path: '/api/admin/billing/plans/:id/deactivate',
    body: emptyBodySchema,
    responses: {
      200: successResponseSchema(subscriptionActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Deactivate billing plan (admin only)',
  },

  getAdminMetrics: {
    method: 'GET' as const,
    path: '/api/admin/metrics',
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get admin metrics dashboard payload',
  },

  getAdminHealth: {
    method: 'GET' as const,
    path: '/api/admin/health',
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get admin health summary',
  },

  getRouteManifest: {
    method: 'GET' as const,
    path: '/api/admin/routes',
    responses: {
      200: successResponseSchema(unknownResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get registered route manifest',
  },
} satisfies Contract;
