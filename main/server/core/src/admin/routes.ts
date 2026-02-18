// main/server/core/src/admin/routes.ts
/**
 * Admin Routes
 *
 * Route definitions for admin module.
 * All routes require admin role.
 */

import {
  adminHardBanRequestSchema,
  adminLockUserRequestSchema,
  adminSuspendTenantRequestSchema,
  adminUpdateUserRequestSchema,
  createPlanRequestSchema,
  createRouteMap,
  emptyBodySchema,
  protectedRoute,
  securityEventsExportRequestSchema,
  securityEventsListRequestSchema,
  unlockAccountRequestSchema,
  updatePlanRequestSchema,
  type AdminPlanResponse,
  type AdminPlansListResponse,
  type BaseRouteDefinition,
  type CreatePlanRequest,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type SubscriptionActionResponse,
  type SyncStripeResponse,
  type UnlockAccountRequest,
  type UnlockAccountResponse,
  type UpdatePlanRequest,
  type ValidationSchema,
} from '@bslt/shared';

import { handleListAuditEvents } from './auditHandlers';
import {
  handleAdminCreatePlan,
  handleAdminDeactivatePlan,
  handleAdminGetPlan,
  handleAdminListPlans,
  handleAdminSyncPlanToStripe,
  handleAdminUpdatePlan,
} from './billingHandlers';
import { handleAdminUnlock } from './handlers';
import { handleGetAdminHealth, type AdminHealthBody } from './healthHandler';
import { handleEndImpersonation, handleStartImpersonation } from './impersonationHandlers';
import {
  handleCancelJob,
  handleGetJobDetails,
  handleGetQueueStats,
  handleListJobs,
  handleRetryJob,
} from './jobsHandlers';
import { handleGetMetrics } from './metricsHandler';
import { handleGetRouteManifest } from './route-manifest';
import {
  handleExportSecurityEvents,
  handleGetSecurityEvent,
  handleGetSecurityMetrics,
  handleListSecurityEvents,
} from './securityHandlers';
import {
  handleGetTenantDetail,
  handleListAllTenants,
  handleSuspendTenant,
  handleUnsuspendTenant,
} from './tenantHandlers';
import {
  handleGetUser,
  handleHardBan,
  handleListUsers,
  handleLockUser,
  handleSearchUsers,
  handleUnlockUser,
  handleUpdateUser,
} from './userHandlers';
import {
  handleListAdminWebhookDeliveries,
  handleListAdminWebhooks,
  handleReplayAdminWebhookDelivery,
} from './webhookHandlers';

import type { AdminAppContext, AdminRequest } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Admin Route Helper
// ============================================================================

/**
 * Helper that wraps protectedRoute for admin-only routes.
 *
 * Admin handlers use `AdminAppContext` (a narrowed BaseContext) for type-safe
 * access to db, repos, and config. The server's full AppContext structurally
 * satisfies AdminAppContext, so the cast is safe at runtime.
 */
function adminProtectedRoute<TBody, TResult>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: (
    ctx: AdminAppContext,
    body: TBody,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<RouteResult<TResult>>,
  schema?: ValidationSchema<TBody>,
): BaseRouteDefinition {
  return protectedRoute<TBody, TResult>(
    method,
    handler as unknown as RouteHandler<TBody, TResult>,
    schema,
    'admin',
  );
}

// ============================================================================
// Route Definitions
// ============================================================================

export const adminRoutes: RouteMap = createRouteMap([
  // ============================================================================
  // User Management Routes
  // ============================================================================

  // List users with filtering and pagination
  ['admin/users', adminProtectedRoute('GET', handleListUsers)],

  // Search users (multi-field: email, name, UUID)
  ['admin/users/search', adminProtectedRoute('GET', handleSearchUsers)],

  // Get single user
  ['admin/users/:id', adminProtectedRoute('GET', handleGetUser)],

  // Update user
  [
    'admin/users/:id/update',
    adminProtectedRoute('POST', handleUpdateUser, adminUpdateUserRequestSchema),
  ],

  // Lock user account
  ['admin/users/:id/lock', adminProtectedRoute('POST', handleLockUser, adminLockUserRequestSchema)],

  // Unlock user account
  [
    'admin/users/:id/unlock',
    adminProtectedRoute('POST', handleUnlockUser, unlockAccountRequestSchema),
  ],

  // Hard ban user (permanent ban with session revocation and scheduled deletion)
  [
    'admin/users/:id/hard-ban',
    adminProtectedRoute('POST', handleHardBan, adminHardBanRequestSchema),
  ],

  // ============================================================================
  // Impersonation Routes
  // ============================================================================

  // End impersonation session (static route must precede parameterized)
  ['admin/impersonate/end', adminProtectedRoute('POST', handleEndImpersonation, emptyBodySchema)],

  // Start impersonating a user (returns scoped JWT)
  [
    'admin/impersonate/:userId',
    adminProtectedRoute(
      'POST',
      async (ctx: AdminAppContext, _body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleStartImpersonation(ctx, undefined, req, reply);
      },
      emptyBodySchema,
    ),
  ],

  // ============================================================================
  // Auth Admin Routes (legacy)
  // ============================================================================

  // Legacy unlock by email
  [
    'admin/auth/unlock',
    adminProtectedRoute<UnlockAccountRequest, UnlockAccountResponse | { message: string }>(
      'POST',
      async (
        ctx: AdminAppContext,
        body: UnlockAccountRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<UnlockAccountResponse | { message: string }>> => {
        return handleAdminUnlock(ctx, body, req as unknown as AdminRequest);
      },
      unlockAccountRequestSchema,
    ),
  ],

  // ============================================================================
  // Security Audit Routes
  // ============================================================================

  [
    'admin/security/events',
    adminProtectedRoute('POST', handleListSecurityEvents, securityEventsListRequestSchema),
  ],

  ['admin/security/events/:id', adminProtectedRoute('GET', handleGetSecurityEvent)],

  ['admin/security/metrics', adminProtectedRoute('GET', handleGetSecurityMetrics)],

  [
    'admin/security/export',
    adminProtectedRoute('POST', handleExportSecurityEvents, securityEventsExportRequestSchema),
  ],

  // ============================================================================
  // Audit Event Routes
  // ============================================================================

  ['admin/audit-events', adminProtectedRoute('GET', handleListAuditEvents)],

  // ============================================================================
  // Job Monitoring Routes
  // ============================================================================

  ['admin/jobs', adminProtectedRoute('GET', handleListJobs)],
  ['admin/jobs/stats', adminProtectedRoute('GET', handleGetQueueStats)],
  ['admin/jobs/:jobId', adminProtectedRoute('GET', handleGetJobDetails)],
  ['admin/jobs/:jobId/retry', adminProtectedRoute('POST', handleRetryJob, emptyBodySchema)],
  ['admin/jobs/:jobId/cancel', adminProtectedRoute('POST', handleCancelJob, emptyBodySchema)],

  // ============================================================================
  // Metrics Routes
  // ============================================================================

  // Request metrics and queue stats
  ['admin/metrics', adminProtectedRoute('GET', handleGetMetrics)],

  // System health summary
  [
    'admin/health',
    adminProtectedRoute<undefined, AdminHealthBody | { message: string }>(
      'GET',
      async (ctx: AdminAppContext, _body: undefined, req: FastifyRequest) => {
        return handleGetAdminHealth(ctx, _body, req as unknown as AdminRequest);
      },
    ),
  ],

  // ============================================================================
  // API Introspection Routes
  // ============================================================================

  // Route manifest — lists all registered API routes
  ['admin/routes', adminProtectedRoute('GET', handleGetRouteManifest)],

  // ============================================================================
  // Webhook Monitor Routes
  // ============================================================================

  ['admin/webhooks', adminProtectedRoute('GET', handleListAdminWebhooks)],
  ['admin/webhooks/:id/deliveries', adminProtectedRoute('GET', handleListAdminWebhookDeliveries)],
  [
    'admin/webhooks/:id/deliveries/:deliveryId/replay',
    adminProtectedRoute('POST', handleReplayAdminWebhookDelivery, emptyBodySchema),
  ],

  // ============================================================================
  // Tenant Management Routes
  // ============================================================================

  // List all tenants with optional search
  ['admin/tenants', adminProtectedRoute('GET', handleListAllTenants)],

  // Get tenant detail
  ['admin/tenants/:id', adminProtectedRoute('GET', handleGetTenantDetail)],

  // Suspend a tenant
  [
    'admin/tenants/:id/suspend',
    adminProtectedRoute('POST', handleSuspendTenant, adminSuspendTenantRequestSchema),
  ],

  // Unsuspend a tenant
  [
    'admin/tenants/:id/unsuspend',
    adminProtectedRoute(
      'POST',
      async (ctx: AdminAppContext, _body: unknown, req: FastifyRequest, reply: FastifyReply) => {
        return handleUnsuspendTenant(ctx, undefined, req, reply);
      },
      emptyBodySchema,
    ),
  ],

  // ============================================================================
  // Billing Admin Routes
  // ============================================================================

  // List all plans (including inactive)
  [
    'admin/billing/plans',
    adminProtectedRoute(
      'GET',
      async (
        ctx: AdminAppContext,
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<AdminPlansListResponse | { message: string }>> => {
        return handleAdminListPlans(ctx, _body, req as unknown as AdminRequest);
      },
    ),
  ],

  // Create new plan
  [
    'admin/billing/plans/create',
    adminProtectedRoute<CreatePlanRequest, AdminPlanResponse | { message: string }>(
      'POST',
      async (
        ctx: AdminAppContext,
        body: CreatePlanRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<AdminPlanResponse | { message: string }>> => {
        return handleAdminCreatePlan(ctx, body, req as unknown as AdminRequest);
      },
      createPlanRequestSchema,
    ),
  ],

  // Get single plan
  [
    'admin/billing/plans/:id',
    adminProtectedRoute(
      'GET',
      async (
        ctx: AdminAppContext,
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<AdminPlanResponse | { message: string }>> => {
        return handleAdminGetPlan(ctx, _body, req as unknown as AdminRequest, {
          id: (req.params as { id: string }).id,
        });
      },
    ),
  ],

  // Update plan
  [
    'admin/billing/plans/:id/update',
    adminProtectedRoute<UpdatePlanRequest, AdminPlanResponse | { message: string }>(
      'POST',
      async (
        ctx: AdminAppContext,
        body: UpdatePlanRequest,
        req: FastifyRequest,
      ): Promise<RouteResult<AdminPlanResponse | { message: string }>> => {
        return handleAdminUpdatePlan(ctx, body, req as unknown as AdminRequest, {
          id: (req.params as { id: string }).id,
        });
      },
      updatePlanRequestSchema,
    ),
  ],

  // Sync plan to Stripe
  [
    'admin/billing/plans/:id/sync-stripe',
    adminProtectedRoute(
      'POST',
      async (
        ctx: AdminAppContext,
        _body: unknown,
        req: FastifyRequest,
      ): Promise<RouteResult<SyncStripeResponse | { message: string }>> => {
        return handleAdminSyncPlanToStripe(ctx, undefined, req as unknown as AdminRequest, {
          id: (req.params as { id: string }).id,
        });
      },
      emptyBodySchema,
    ),
  ],

  // Deactivate plan
  [
    'admin/billing/plans/:id/deactivate',
    adminProtectedRoute(
      'POST',
      async (
        ctx: AdminAppContext,
        _body: unknown,
        req: FastifyRequest,
      ): Promise<RouteResult<SubscriptionActionResponse | { message: string }>> => {
        return handleAdminDeactivatePlan(ctx, undefined, req as unknown as AdminRequest, {
          id: (req.params as { id: string }).id,
        });
      },
      emptyBodySchema,
    ),
  ],
]);
