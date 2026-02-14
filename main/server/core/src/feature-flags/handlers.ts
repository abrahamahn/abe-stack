// main/server/core/src/feature-flags/handlers.ts
/**
 * Feature Flags Handlers
 *
 * Thin HTTP layer that calls services and formats responses.
 * Framework-agnostic: uses narrow interfaces from types.ts instead
 * of binding to Fastify or any specific HTTP framework.
 */

import {
    createFlag,
    deleteFlag,
    deleteTenantOverride,
    evaluateFlags,
    listFlags,
    listTenantOverrides,
    setTenantOverride,
    updateFlag,
} from './service';

import type { FeatureFlagAppContext, FeatureFlagRequest } from './types';
import type {
    FeatureFlag as DbFeatureFlag,
    TenantFeatureOverride as DbTenantFeatureOverride,
    NewFeatureFlag,
    UpdateFeatureFlag,
} from '../../../db/src';

// ============================================================================
// Response Types
// ============================================================================

interface FeatureFlagResponse {
  key: string;
  description: string | null;
  isEnabled: boolean;
  defaultValue: unknown;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface TenantOverrideResponse {
  tenantId: string;
  key: string;
  value: unknown;
  isEnabled: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format a database feature flag record for API response.
 * Converts Date objects to ISO strings.
 *
 * @param flag - Database feature flag record
 * @returns Formatted feature flag for API response
 * @complexity O(1)
 */
function formatFlag(flag: DbFeatureFlag): FeatureFlagResponse {
  return {
    key: flag.key,
    description: flag.description,
    isEnabled: flag.isEnabled,
    defaultValue: flag.defaultValue,
    metadata: flag.metadata,
    createdAt: flag.createdAt.toISOString(),
    updatedAt: flag.updatedAt.toISOString(),
  };
}

/**
 * Format a database tenant override record for API response.
 *
 * @param override - Database tenant feature override record
 * @returns Formatted override for API response
 * @complexity O(1)
 */
function formatOverride(override: DbTenantFeatureOverride): TenantOverrideResponse {
  return {
    tenantId: override.tenantId,
    key: override.key,
    value: override.value,
    isEnabled: override.isEnabled,
  };
}

/**
 * Map feature flag errors to appropriate HTTP status codes and messages.
 *
 * @param error - The caught error
 * @param ctx - Application context for logging
 * @returns Object with HTTP status code and error message body
 * @complexity O(1)
 */
function handleError(
  error: unknown,
  ctx: FeatureFlagAppContext,
): { status: number; body: { message: string } } {
  if (error instanceof Error) {
    if (error.message.startsWith('Feature flag not found')) {
      return { status: 404, body: { message: error.message } };
    }
    if (error.message.startsWith('Tenant feature override not found')) {
      return { status: 404, body: { message: error.message } };
    }
    if (error.message.includes('duplicate') || error.message.includes('already exists')) {
      return { status: 400, body: { message: error.message } };
    }
  }

  ctx.log.error(error instanceof Error ? error : new Error(String(error)));
  return { status: 500, body: { message: 'An error occurred processing your request' } };
}

// ============================================================================
// Admin Flag Handlers
// ============================================================================

/**
 * List all feature flags.
 *
 * @param ctx - Application context with feature flag repositories
 * @returns 200 response with array of all flags
 * @complexity O(n) where n is the number of flags
 */
export async function handleListFlags(
  ctx: FeatureFlagAppContext,
  _body: unknown,
  _request: unknown,
): Promise<{ status: number; body: { flags: FeatureFlagResponse[] } | { message: string } }> {
  try {
    const flags = await listFlags(ctx.repos.featureFlags);
    return {
      status: 200,
      body: { flags: flags.map(formatFlag) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Create a new feature flag.
 *
 * @param ctx - Application context with feature flag repositories
 * @param body - Feature flag data (key, description, isEnabled, defaultValue, metadata)
 * @returns 201 response with the created flag, or error response
 * @complexity O(1) database insert
 */
export async function handleCreateFlag(
  ctx: FeatureFlagAppContext,
  body: unknown,
  _request: unknown,
): Promise<{ status: number; body: { flag: FeatureFlagResponse } | { message: string } }> {
  try {
    const data = body as NewFeatureFlag;
    if (typeof data.key !== 'string' || data.key === '') {
      return { status: 400, body: { message: 'key is required' } };
    }
    const flag = await createFlag(ctx.repos.featureFlags, data);
    return {
      status: 201,
      body: { flag: formatFlag(flag) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Update an existing feature flag.
 *
 * @param ctx - Application context with feature flag repositories
 * @param body - Fields to update (description, isEnabled, defaultValue, metadata)
 * @param request - HTTP request (params.key extracted from path)
 * @returns 200 response with the updated flag, or error response
 * @complexity O(1) database update by primary key
 */
export async function handleUpdateFlag(
  ctx: FeatureFlagAppContext,
  body: unknown,
  request: unknown,
): Promise<{ status: number; body: { flag: FeatureFlagResponse } | { message: string } }> {
  try {
    const key = (request as { params?: { key?: string } }).params?.key ?? '';
    if (key === '') {
      return { status: 400, body: { message: 'key parameter is required' } };
    }
    const data = body as UpdateFeatureFlag;
    const flag = await updateFlag(ctx.repos.featureFlags, key, data);
    return {
      status: 200,
      body: { flag: formatFlag(flag) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Delete a feature flag.
 *
 * @param ctx - Application context with feature flag repositories
 * @param request - HTTP request (params.key extracted from path)
 * @returns 200 response with success message, or error response
 * @complexity O(1) database delete by primary key
 */
export async function handleDeleteFlag(
  ctx: FeatureFlagAppContext,
  _body: unknown,
  request: unknown,
): Promise<{ status: number; body: { success: boolean; message: string } | { message: string } }> {
  try {
    const key = (request as { params?: { key?: string } }).params?.key ?? '';
    if (key === '') {
      return { status: 400, body: { message: 'key parameter is required' } };
    }
    await deleteFlag(ctx.repos.featureFlags, key);
    return {
      status: 200,
      body: { success: true, message: `Feature flag '${key}' deleted` },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// Admin Tenant Override Handlers
// ============================================================================

/**
 * List all feature flag overrides for a tenant.
 *
 * @param ctx - Application context with override repositories
 * @param request - HTTP request (params.tenantId extracted from path)
 * @returns 200 response with array of overrides, or error response
 * @complexity O(n) where n is the number of overrides for the tenant
 */
export async function handleListTenantOverrides(
  ctx: FeatureFlagAppContext,
  _body: unknown,
  request: unknown,
): Promise<{
  status: number;
  body: { overrides: TenantOverrideResponse[] } | { message: string };
}> {
  try {
    const tenantId = (request as { params?: { tenantId?: string } }).params?.tenantId ?? '';
    if (tenantId === '') {
      return { status: 400, body: { message: 'tenantId parameter is required' } };
    }
    const overrides = await listTenantOverrides(ctx.repos.tenantFeatureOverrides, tenantId);
    return {
      status: 200,
      body: { overrides: overrides.map(formatOverride) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Set (create or update) a tenant feature override.
 *
 * @param ctx - Application context with override repositories
 * @param body - Override data (value, isEnabled)
 * @param request - HTTP request (params.tenantId, params.key extracted from path)
 * @returns 200 response with the upserted override, or error response
 * @complexity O(1) database upsert
 */
export async function handleSetTenantOverride(
  ctx: FeatureFlagAppContext,
  body: unknown,
  request: unknown,
): Promise<{ status: number; body: { override: TenantOverrideResponse } | { message: string } }> {
  try {
    const params = (request as { params?: { tenantId?: string; key?: string } }).params;
    const tenantId = params?.tenantId ?? '';
    const key = params?.key ?? '';
    if (tenantId === '' || key === '') {
      return { status: 400, body: { message: 'tenantId and key parameters are required' } };
    }
    const data = body as { value?: unknown; isEnabled?: boolean };
    const override = await setTenantOverride(ctx.repos.tenantFeatureOverrides, tenantId, key, data);
    return {
      status: 200,
      body: { override: formatOverride(override) },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

/**
 * Delete a tenant feature override.
 *
 * @param ctx - Application context with override repositories
 * @param request - HTTP request (params.tenantId, params.key extracted from path)
 * @returns 200 response with success message, or error response
 * @complexity O(1) database delete by composite key
 */
export async function handleDeleteTenantOverride(
  ctx: FeatureFlagAppContext,
  _body: unknown,
  request: unknown,
): Promise<{ status: number; body: { success: boolean; message: string } | { message: string } }> {
  try {
    const params = (request as { params?: { tenantId?: string; key?: string } }).params;
    const tenantId = params?.tenantId ?? '';
    const key = params?.key ?? '';
    if (tenantId === '' || key === '') {
      return { status: 400, body: { message: 'tenantId and key parameters are required' } };
    }
    await deleteTenantOverride(ctx.repos.tenantFeatureOverrides, tenantId, key);
    return {
      status: 200,
      body: { success: true, message: `Override '${key}' for tenant '${tenantId}' deleted` },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}

// ============================================================================
// User Handlers
// ============================================================================

/**
 * Evaluate all feature flags for the current user's context.
 *
 * Returns a map of flag key to boolean value for the authenticated user.
 * Takes into account global flags, tenant overrides, user targeting,
 * and percentage rollouts.
 *
 * @param ctx - Application context with feature flag repositories
 * @param request - HTTP request with authenticated user
 * @returns 200 response with evaluated flag map, or error response
 * @complexity O(n + m) where n = enabled flags, m = tenant overrides
 */
export async function handleEvaluateFlags(
  ctx: FeatureFlagAppContext,
  _body: unknown,
  request: unknown,
): Promise<{ status: number; body: { flags: Record<string, boolean> } | { message: string } }> {
  const req = request as FeatureFlagRequest;
  const user = req.user;
  if (user === undefined) {
    return { status: 401, body: { message: 'Unauthorized' } };
  }

  try {
    // Extract tenantId from request if available (e.g. from query params)
    const tenantId = (request as { query?: { tenantId?: string } }).query?.tenantId;

    const flagMap = await evaluateFlags(
      ctx.repos.featureFlags,
      ctx.repos.tenantFeatureOverrides,
      tenantId,
      user.userId,
    );

    // Convert Map to plain object for JSON serialization
    const flags: Record<string, boolean> = {};
    for (const [key, value] of flagMap) {
      flags[key] = value;
    }

    return {
      status: 200,
      body: { flags },
    };
  } catch (error: unknown) {
    return handleError(error, ctx);
  }
}
