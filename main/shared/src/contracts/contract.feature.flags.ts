// main/shared/src/contracts/contract.feature.flags.ts
/**
 * Feature Flags Contracts
 *
 * API contract definitions for admin feature flag management.
 * @module Contracts/FeatureFlags
 */

import {
  createFeatureFlagRequestSchema,
  featureFlagActionResponseSchema,
  featureFlagSchema,
  featureFlagsListResponseSchema,
  setTenantFeatureOverrideRequestSchema,
  updateFeatureFlagRequestSchema,
} from '../engine/feature-flags';
import { errorResponseSchema, successResponseSchema } from '../engine/http';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const featureFlagsContract = {
  list: {
    method: 'GET' as const,
    path: '/api/admin/feature-flags',
    responses: {
      200: successResponseSchema(featureFlagsListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List all feature flags (admin only)',
  },

  get: {
    method: 'GET' as const,
    path: '/api/admin/feature-flags/:key',
    responses: {
      200: successResponseSchema(featureFlagSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get a feature flag by key (admin only)',
  },

  create: {
    method: 'POST' as const,
    path: '/api/admin/feature-flags',
    body: createFeatureFlagRequestSchema,
    responses: {
      201: successResponseSchema(featureFlagActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      409: errorResponseSchema,
    },
    summary: 'Create a feature flag (admin only)',
  },

  update: {
    method: 'POST' as const,
    path: '/api/admin/feature-flags/:key',
    body: updateFeatureFlagRequestSchema,
    responses: {
      200: successResponseSchema(featureFlagActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Update a feature flag (admin only)',
  },

  delete: {
    method: 'DELETE' as const,
    path: '/api/admin/feature-flags/:key',
    responses: {
      200: successResponseSchema(featureFlagActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Delete a feature flag (admin only)',
  },

  setTenantOverride: {
    method: 'POST' as const,
    path: '/api/admin/feature-flags/:key/tenants/:tenantId',
    body: setTenantFeatureOverrideRequestSchema,
    responses: {
      200: successResponseSchema(featureFlagActionResponseSchema),
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Set a tenant-specific feature flag override (admin only)',
  },

  deleteTenantOverride: {
    method: 'DELETE' as const,
    path: '/api/admin/feature-flags/:key/tenants/:tenantId',
    responses: {
      200: successResponseSchema(featureFlagActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Remove a tenant-specific feature flag override (admin only)',
  },
} satisfies Contract;
