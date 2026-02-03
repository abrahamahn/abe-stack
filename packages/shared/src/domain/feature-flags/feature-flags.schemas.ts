// shared/src/domain/feature-flags/feature-flags.schemas.ts

/**
 * @file Feature Flags Contracts
 * @description Types for feature flag configuration and overrides.
 * @module Domain/FeatureFlags
 */

import { z } from 'zod';

import { tenantIdSchema } from '../../types/ids';

// ============================================================================
// Schemas
// ============================================================================

export const featureFlagSchema = z.object({
  key: z.string(),
  description: z.string().optional(),
  isEnabled: z.boolean().default(false),
  defaultValue: z.unknown().optional(),
  metadata: z
    .object({
      allowedUserIds: z.array(z.string()).optional(),
      allowedTenantIds: z.array(z.string()).optional(),
      rolloutPercentage: z.number().min(0).max(100).optional(),
    })
    .optional(),
});
export type FeatureFlag = z.infer<typeof featureFlagSchema>;

export const tenantFeatureOverrideSchema = z.object({
  tenantId: tenantIdSchema,
  key: z.string(),
  value: z.unknown(),
  isEnabled: z.boolean(),
});
export type TenantFeatureOverride = z.infer<typeof tenantFeatureOverrideSchema>;

// ============================================================================
// Utilities
// ============================================================================
