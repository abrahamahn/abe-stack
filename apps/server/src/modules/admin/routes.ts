// apps/server/src/modules/admin/routes.ts
/**
 * Admin Routes
 *
 * Route definitions for admin module.
 * All routes require admin role.
 */

import {
  adminLockUserRequestSchema,
  adminUpdateUserRequestSchema,
  createPlanRequestSchema,
  securityEventsExportRequestSchema,
  securityEventsListRequestSchema,
  unlockAccountRequestSchema,
  updatePlanRequestSchema,
  type AdminPlansListResponse,
  type AdminPlanResponse,
  type CreatePlanRequest,
  type UpdatePlanRequest,
  type SyncStripeResponse,
  type SubscriptionActionResponse, UnlockAccountRequest, UnlockAccountResponse 
 
 
 
 
 
 
 
} from '@abe-stack/core';
import { protectedRoute, type RouteMap, type RouteResult } from '@router';


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
import {
  handleExportSecurityEvents,
  handleGetSecurityEvent,
  handleGetSecurityMetrics,
  handleListSecurityEvents,
} from './securityHandlers';
import {
  handleGetUser,
  handleListUsers,
  handleLockUser,
  handleUnlockUser,
  handleUpdateUser,
} from './userHandlers';

import type { AppContext, RequestWithCookies } from '@shared';
import type { FastifyRequest } from 'fastify';

// ============================================================================
// Route Definitions
// ============================================================================

export const adminRoutes: RouteMap = {
  // ============================================================================
  // User Management Routes
  // ============================================================================

  // List users with filtering and pagination
  'admin/users': protectedRoute('GET', handleListUsers, 'admin'),

  // Get single user
  'admin/users/:id': protectedRoute('GET', handleGetUser, 'admin'),

  // Update user
  'admin/users/:id/update': protectedRoute(
    'POST',
    handleUpdateUser,
    'admin',
    adminUpdateUserRequestSchema,
  ),

  // Lock user account
  'admin/users/:id/lock': protectedRoute(
    'POST',
    handleLockUser,
    'admin',
    adminLockUserRequestSchema,
  ),

  // Unlock user account
  'admin/users/:id/unlock': protectedRoute(
    'POST',
    handleUnlockUser,
    'admin',
    unlockAccountRequestSchema,
  ),

  // ============================================================================
  // Auth Admin Routes (legacy)
  // ============================================================================

  // Legacy unlock by email
  'admin/auth/unlock': protectedRoute<
    UnlockAccountRequest,
    UnlockAccountResponse | { message: string }
  >(
    'POST',
    async (
      ctx: AppContext,
      body: UnlockAccountRequest,
      req: RequestWithCookies,
    ): Promise<RouteResult<UnlockAccountResponse | { message: string }>> => {
      return handleAdminUnlock(ctx, body, req);
    },
    'admin',
    unlockAccountRequestSchema,
  ),

  // Security audit routes
  'admin/security/events': protectedRoute(
    'POST',
    handleListSecurityEvents,
    'admin',
    securityEventsListRequestSchema,
  ),

  'admin/security/events/:id': protectedRoute('GET', handleGetSecurityEvent, 'admin'),

  'admin/security/metrics': protectedRoute('GET', handleGetSecurityMetrics, 'admin'),

  'admin/security/export': protectedRoute(
    'POST',
    handleExportSecurityEvents,
    'admin',
    securityEventsExportRequestSchema,
  ),

  // Job monitoring routes
  'admin/jobs': protectedRoute('GET', handleListJobs, 'admin'),
  'admin/jobs/stats': protectedRoute('GET', handleGetQueueStats, 'admin'),
  'admin/jobs/:jobId': protectedRoute('GET', handleGetJobDetails, 'admin'),
  'admin/jobs/:jobId/retry': protectedRoute('POST', handleRetryJob, 'admin'),
  'admin/jobs/:jobId/cancel': protectedRoute('POST', handleCancelJob, 'admin'),

  // ============================================================================
  // Billing Admin Routes
  // ============================================================================

  // List all plans (including inactive)
  'admin/billing/plans': protectedRoute(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
    ): Promise<RouteResult<AdminPlansListResponse | { message: string }>> => {
      return handleAdminListPlans(ctx, _body, req as RequestWithCookies);
    },
    'admin',
  ),

  // Create new plan
  'admin/billing/plans/create': protectedRoute(
    'POST',
    async (
      ctx: AppContext,
      body: CreatePlanRequest,
      req: FastifyRequest,
    ): Promise<RouteResult<AdminPlanResponse | { message: string }>> => {
      return handleAdminCreatePlan(ctx, body, req as RequestWithCookies);
    },
    'admin',
    createPlanRequestSchema,
  ),

  // Get single plan
  'admin/billing/plans/:id': protectedRoute(
    'GET',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
    ): Promise<RouteResult<AdminPlanResponse | { message: string }>> => {
      return handleAdminGetPlan(ctx, _body, req as RequestWithCookies, {
        id: (req.params as { id: string }).id,
      });
    },
    'admin',
  ),

  // Update plan
  'admin/billing/plans/:id/update': protectedRoute(
    'POST',
    async (
      ctx: AppContext,
      body: UpdatePlanRequest,
      req: FastifyRequest,
    ): Promise<RouteResult<AdminPlanResponse | { message: string }>> => {
      return handleAdminUpdatePlan(ctx, body, req as RequestWithCookies, {
        id: (req.params as { id: string }).id,
      });
    },
    'admin',
    updatePlanRequestSchema,
  ),

  // Sync plan to Stripe
  'admin/billing/plans/:id/sync-stripe': protectedRoute(
    'POST',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
    ): Promise<RouteResult<SyncStripeResponse | { message: string }>> => {
      return handleAdminSyncPlanToStripe(ctx, _body, req as RequestWithCookies, {
        id: (req.params as { id: string }).id,
      });
    },
    'admin',
  ),

  // Deactivate plan
  'admin/billing/plans/:id/deactivate': protectedRoute(
    'POST',
    async (
      ctx: AppContext,
      _body: undefined,
      req: FastifyRequest,
    ): Promise<RouteResult<SubscriptionActionResponse | { message: string }>> => {
      return handleAdminDeactivatePlan(ctx, _body, req as RequestWithCookies, {
        id: (req.params as { id: string }).id,
      });
    },
    'admin',
  ),
};
