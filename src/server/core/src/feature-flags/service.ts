// src/server/core/src/feature-flags/service.ts
/**
 * Feature Flags Service
 *
 * Pure business logic for feature flag operations.
 * No HTTP awareness - returns domain objects or throws errors.
 * All functions accept repositories as explicit parameters
 * for testability and decoupled architecture.
 */

import { evaluateFlag } from '@abe-stack/shared';

import type {
  FeatureFlag as DbFeatureFlag,
  FeatureFlagRepository,
  NewFeatureFlag,
  TenantFeatureOverride as DbTenantFeatureOverride,
  TenantFeatureOverrideRepository,
  UpdateFeatureFlag,
} from '@abe-stack/db';

// ============================================================================
// Feature Flag Operations
// ============================================================================

/**
 * List all feature flags.
 *
 * @param repo - Feature flag repository
 * @returns Array of all feature flags, ordered by key
 * @complexity O(n) where n is the number of flags
 */
export async function listFlags(repo: FeatureFlagRepository): Promise<DbFeatureFlag[]> {
  return repo.findAll();
}

/**
 * Create a new feature flag.
 *
 * @param repo - Feature flag repository
 * @param data - Feature flag data to insert
 * @returns The created feature flag
 * @throws Error if insert fails (e.g. duplicate key)
 * @complexity O(1) database insert
 */
export async function createFlag(
  repo: FeatureFlagRepository,
  data: NewFeatureFlag,
): Promise<DbFeatureFlag> {
  return repo.create(data);
}

/**
 * Update an existing feature flag by its key.
 *
 * @param repo - Feature flag repository
 * @param key - Feature flag key to update
 * @param data - Fields to update
 * @returns The updated feature flag
 * @throws Error if the flag does not exist
 * @complexity O(1) database update by primary key
 */
export async function updateFlag(
  repo: FeatureFlagRepository,
  key: string,
  data: UpdateFeatureFlag,
): Promise<DbFeatureFlag> {
  const updated = await repo.update(key, data);
  if (updated === null) {
    throw new Error(`Feature flag not found: ${key}`);
  }
  return updated;
}

/**
 * Delete a feature flag by its key.
 *
 * @param repo - Feature flag repository
 * @param key - Feature flag key to delete
 * @throws Error if the flag does not exist
 * @complexity O(1) database delete by primary key
 */
export async function deleteFlag(repo: FeatureFlagRepository, key: string): Promise<void> {
  const deleted = await repo.delete(key);
  if (!deleted) {
    throw new Error(`Feature flag not found: ${key}`);
  }
}

// ============================================================================
// Tenant Override Operations
// ============================================================================

/**
 * List all feature flag overrides for a tenant.
 *
 * @param overrideRepo - Tenant feature override repository
 * @param tenantId - Tenant ID to list overrides for
 * @returns Array of overrides for the tenant
 * @complexity O(n) where n is the number of overrides for the tenant
 */
export async function listTenantOverrides(
  overrideRepo: TenantFeatureOverrideRepository,
  tenantId: string,
): Promise<DbTenantFeatureOverride[]> {
  return overrideRepo.findByTenantId(tenantId);
}

/**
 * Set (create or update) a tenant feature override.
 *
 * Uses upsert to handle both creation and update in a single operation.
 *
 * @param overrideRepo - Tenant feature override repository
 * @param tenantId - Tenant ID for the override
 * @param key - Feature flag key for the override
 * @param data - Override data (value and/or isEnabled)
 * @returns The created or updated override
 * @complexity O(1) database upsert
 */
export async function setTenantOverride(
  overrideRepo: TenantFeatureOverrideRepository,
  tenantId: string,
  key: string,
  data: { value?: unknown; isEnabled?: boolean },
): Promise<DbTenantFeatureOverride> {
  return overrideRepo.upsert({
    tenantId,
    key,
    value: data.value,
    isEnabled: data.isEnabled ?? true,
  });
}

/**
 * Delete a tenant feature override.
 *
 * @param overrideRepo - Tenant feature override repository
 * @param tenantId - Tenant ID for the override
 * @param key - Feature flag key for the override
 * @throws Error if the override does not exist
 * @complexity O(1) database delete by composite key
 */
export async function deleteTenantOverride(
  overrideRepo: TenantFeatureOverrideRepository,
  tenantId: string,
  key: string,
): Promise<void> {
  const deleted = await overrideRepo.delete(tenantId, key);
  if (!deleted) {
    throw new Error(`Tenant feature override not found: ${tenantId}/${key}`);
  }
}

// ============================================================================
// Flag Evaluation
// ============================================================================

/**
 * Evaluate all enabled feature flags for a given context.
 *
 * Loads all enabled flags, loads tenant overrides if tenantId is provided,
 * applies overrides, and evaluates each flag using the shared evaluateFlag logic.
 *
 * @param flagRepo - Feature flag repository
 * @param overrideRepo - Tenant feature override repository
 * @param tenantId - Optional tenant ID for tenant-specific overrides
 * @param userId - Optional user ID for user-targeted flags
 * @returns Map of flag key to evaluated boolean value
 * @complexity O(n + m) where n = enabled flags, m = tenant overrides
 */
export async function evaluateFlags(
  flagRepo: FeatureFlagRepository,
  overrideRepo: TenantFeatureOverrideRepository,
  tenantId?: string,
  userId?: string,
): Promise<Map<string, boolean>> {
  const enabledFlags = await flagRepo.findEnabled();

  // Load tenant overrides if tenantId is provided
  const overrides = tenantId !== undefined ? await overrideRepo.findByTenantId(tenantId) : [];

  // Build override lookup
  const overrideMap = new Map<string, DbTenantFeatureOverride>();
  for (const override of overrides) {
    overrideMap.set(override.key, override);
  }

  // Evaluate each flag
  const result = new Map<string, boolean>();
  for (const flag of enabledFlags) {
    const override = overrideMap.get(flag.key);

    // If there's a tenant override, apply it
    if (override !== undefined) {
      result.set(flag.key, override.isEnabled);
      continue;
    }

    // Otherwise, evaluate using the shared logic
    // Build context conditionally to satisfy exactOptionalPropertyTypes
    const evalContext: { tenantId?: string; userId?: string } = {};
    if (tenantId !== undefined) {
      evalContext.tenantId = tenantId;
    }
    if (userId !== undefined) {
      evalContext.userId = userId;
    }

    const evaluated = evaluateFlag(
      {
        key: flag.key,
        description: flag.description ?? undefined,
        isEnabled: flag.isEnabled,
        defaultValue: flag.defaultValue,
        metadata: flag.metadata as
          | { allowedUserIds?: string[]; allowedTenantIds?: string[]; rolloutPercentage?: number }
          | undefined,
      },
      evalContext,
    );
    result.set(flag.key, evaluated);
  }

  return result;
}
