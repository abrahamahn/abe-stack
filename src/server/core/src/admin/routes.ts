// src/server/core/src/admin/routes.ts
/**
 * Admin Routes
 *
 * Route definitions for admin module.
 * All routes require admin role.
 */

import {
  createRouteMap,
  protectedRoute,
  type BaseRouteDefinition,
  type RouteHandler,
  type RouteMap,
  type RouteResult,
  type ValidationSchema,
  adminHardBanRequestSchema,
  adminLockUserRequestSchema,
  adminSuspendTenantRequestSchema,
  adminUpdateUserRequestSchema,
  createPlanRequestSchema,
  securityEventsExportRequestSchema,
  securityEventsListRequestSchema,
  unlockAccountRequestSchema,
  updatePlanRequestSchema,
  type AdminPlansListResponse,
  type AdminPlanResponse,
  type CreatePlanRequest,
  type SubscriptionActionResponse,
  type SyncStripeResponse,
  type UnlockAccountRequest,
  type UnlockAccountResponse,
  type UpdatePlanRequest,
} from '@abe-stack/shared';

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
  ['admin/jobs/:jobId/retry', adminProtectedRoute('POST', handleRetryJob)],
  ['admin/jobs/:jobId/cancel', adminProtectedRoute('POST', handleCancelJob)],

  // ============================================================================
  // Metrics Routes
  // ============================================================================

  // Request metrics and queue stats
  ['admin/metrics', adminProtectedRoute('GET', handleGetMetrics)],

  // ============================================================================
  // API Introspection Routes
  // ============================================================================

  // Route manifest — lists all registered API routes
  ['admin/routes', adminProtectedRoute('GET', handleGetRouteManifest)],

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
  ['admin/tenants/:id/unsuspend', adminProtectedRoute('POST', handleUnsuspendTenant)],

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
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<SyncStripeResponse | { message: string }>> => {
        return handleAdminSyncPlanToStripe(ctx, _body, req as unknown as AdminRequest, {
          id: (req.params as { id: string }).id,
        });
      },
    ),
  ],

  // Deactivate plan
  [
    'admin/billing/plans/:id/deactivate',
    adminProtectedRoute(
      'POST',
      async (
        ctx: AdminAppContext,
        _body: undefined,
        req: FastifyRequest,
      ): Promise<RouteResult<SubscriptionActionResponse | { message: string }>> => {
        return handleAdminDeactivatePlan(ctx, _body, req as unknown as AdminRequest, {
          id: (req.params as { id: string }).id,
        });
      },
    ),
  ],
]);
