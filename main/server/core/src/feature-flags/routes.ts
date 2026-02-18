// main/server/core/src/feature-flags/routes.ts
/**
 * Feature Flags Routes
 *
 * Route definitions for the feature flags module.
 * Uses the generic router pattern for DRY registration.
 *
 * Admin routes manage flags and tenant overrides.
 * User routes evaluate flags for the current user context.
 */

import {
  createFeatureFlagRequestSchema,
  emptyBodySchema,
  setTenantFeatureOverrideRequestSchema,
  updateFeatureFlagRequestSchema,
} from '@bslt/shared';

import {
  createRouteMap,
  protectedRoute,
  type RouteDefinition,
  type RouteHandler,
  type RouteMap,
  type ValidationSchema,
} from '../../../engine/src';

import {
  handleCreateFlag,
  handleDeleteFlag,
  handleDeleteTenantOverride,
  handleEvaluateFlags,
  handleListFlags,
  handleListTenantOverrides,
  handleSetTenantOverride,
  handleUpdateFlag,
} from './handlers';

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { FeatureFlagAppContext } from './types';

// ============================================================================
// Route Helper
// ============================================================================

/**
 * Helper that wraps protectedRoute for admin-only routes.
 *
 * Feature flag admin handlers use `FeatureFlagAppContext` (a narrowed BaseContext)
 * for type-safe access to repos. The server's full AppContext structurally
 * satisfies FeatureFlagAppContext, so the cast is safe at runtime.
 */
function adminProtectedRoute(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: (
    ctx: FeatureFlagAppContext,
    body: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>,
  schema?: ValidationSchema,
  openapi?: import('../../../engine/src').RouteOpenApiMeta,
): RouteDefinition {
  return protectedRoute(method, handler as unknown as RouteHandler, 'admin', schema, openapi);
}

/**
 * Helper that wraps protectedRoute for user routes.
 */
function userProtectedRoute(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  handler: (
    ctx: FeatureFlagAppContext,
    body: unknown,
    request: FastifyRequest,
    reply: FastifyReply,
  ) => Promise<unknown>,
  schema?: ValidationSchema,
  openapi?: import('../../../engine/src').RouteOpenApiMeta,
): RouteDefinition {
  return protectedRoute(method, handler as unknown as RouteHandler, 'user', schema, openapi);
}

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Feature flags route map.
 *
 * Admin routes (role: 'admin'):
 * - admin/feature-flags (GET) -- list all flags
 * - admin/feature-flags/create (POST) -- create a flag
 * - admin/feature-flags/:key/update (POST) -- update a flag
 * - admin/feature-flags/:key/delete (POST) -- delete a flag
 * - admin/tenants/:tenantId/feature-overrides (GET) -- list tenant overrides
 * - admin/tenants/:tenantId/feature-overrides/:key (PUT) -- set override
 * - admin/tenants/:tenantId/feature-overrides/:key/delete (POST) -- delete override
 *
 * User routes (role: 'user'):
 * - feature-flags/evaluate (GET) -- evaluate flags for current user
 */
export const featureFlagRoutes: RouteMap = createRouteMap([
  // ============================================================================
  // Admin Flag CRUD
  // ============================================================================

  // List all feature flags
  [
    'admin/feature-flags',
    adminProtectedRoute('GET', handleListFlags, undefined, {
      summary: 'List feature flags',
      tags: ['Feature Flags', 'Admin'],
    }),
  ],

  // Create a new feature flag
  [
    'admin/feature-flags/create',
    adminProtectedRoute('POST', handleCreateFlag, createFeatureFlagRequestSchema, {
      summary: 'Create feature flag',
      tags: ['Feature Flags', 'Admin'],
    }),
  ],

  // Update a feature flag by key
  [
    'admin/feature-flags/:key/update',
    adminProtectedRoute('POST', handleUpdateFlag, updateFeatureFlagRequestSchema, {
      summary: 'Update feature flag',
      tags: ['Feature Flags', 'Admin'],
    }),
  ],

  // Delete a feature flag by key
  [
    'admin/feature-flags/:key/delete',
    adminProtectedRoute('POST', handleDeleteFlag, emptyBodySchema, {
      summary: 'Delete feature flag',
      tags: ['Feature Flags', 'Admin'],
    }),
  ],

  // ============================================================================
  // Admin Tenant Override CRUD
  // ============================================================================

  // List overrides for a tenant
  [
    'admin/tenants/:tenantId/feature-overrides',
    adminProtectedRoute('GET', handleListTenantOverrides, undefined, {
      summary: 'List tenant feature overrides',
      tags: ['Feature Flags', 'Admin'],
    }),
  ],

  // Set (upsert) a tenant override
  [
    'admin/tenants/:tenantId/feature-overrides/:key',
    adminProtectedRoute('PUT', handleSetTenantOverride, setTenantFeatureOverrideRequestSchema, {
      summary: 'Set tenant feature override',
      tags: ['Feature Flags', 'Admin'],
    }),
  ],

  // Delete a tenant override
  [
    'admin/tenants/:tenantId/feature-overrides/:key/delete',
    adminProtectedRoute('POST', handleDeleteTenantOverride, emptyBodySchema, {
      summary: 'Delete tenant feature override',
      tags: ['Feature Flags', 'Admin'],
    }),
  ],

  // ============================================================================
  // User Flag Evaluation
  // ============================================================================

  // Evaluate all flags for the current user
  [
    'feature-flags/evaluate',
    userProtectedRoute('GET', handleEvaluateFlags, undefined, {
      summary: 'Evaluate feature flags',
      tags: ['Feature Flags'],
    }),
  ],
]);
