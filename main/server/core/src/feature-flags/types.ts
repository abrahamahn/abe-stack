// main/server/core/src/feature-flags/types.ts
/**
 * Feature Flags Module Types
 *
 * Narrow dependency interfaces for the feature-flags package.
 * These interfaces decouple the feature-flag logic from concrete server
 * implementations, keeping the package framework-agnostic.
 */

import type { FeatureFlagRepository, TenantFeatureOverrideRepository } from '../../../db/src';
import type { BaseContext, ContractRequestContext as RequestContext, Logger } from '@abe-stack/shared';

// ============================================================================
// Handler Context Types
// ============================================================================

/**
 * Application context for feature flag handlers.
 *
 * Extends `BaseContext` with feature-flag-specific repositories.
 * The server's `AppContext` structurally satisfies this -- no casting needed.
 */
export interface FeatureFlagAppContext extends BaseContext {
  readonly repos: {
    readonly featureFlags: FeatureFlagRepository;
    readonly tenantFeatureOverrides: TenantFeatureOverrideRepository;
  };
  readonly log: Logger;
}

/**
 * Request type used by feature flag handlers.
 */
export type FeatureFlagRequest = RequestContext;
