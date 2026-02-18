// main/server/core/src/feature-flags/middleware.ts
/**
 * Feature Flag Gating Middleware
 *
 * Fastify preHandler that gates routes behind feature flags.
 * When a route is guarded by a flag key, the middleware evaluates that flag
 * (including tenant overrides if a workspace context is present) and
 * returns 404 when the feature is disabled.
 *
 * Works both with and without tenant context: when a workspace-scoped
 * request provides a tenantId, tenant overrides and targeting apply.
 */

import { ERROR_MESSAGES, evaluateFlag, HTTP_STATUS, WORKSPACE_ID_HEADER } from '@bslt/shared';

import type { FeatureFlagRepository, TenantFeatureOverrideRepository } from '../../../db/src';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Types
// ============================================================================

/** Options for creating a feature flag guard */
interface FeatureFlagGuardOptions {
  /** Feature flag repositories */
  repos: {
    readonly featureFlags: FeatureFlagRepository;
    readonly tenantFeatureOverrides: TenantFeatureOverrideRepository;
  };
}

// ============================================================================
// Middleware Factory
// ============================================================================

/**
 * Create a Fastify preHandler hook that gates a route behind a feature flag.
 *
 * Evaluates the flag for the current request context. If a workspace header
 * is present, tenant overrides and tenant targeting are applied. If an
 * authenticated user is present, user targeting applies.
 *
 * When the flag is disabled (or does not exist), the middleware sends a
 * 404 response so the gated route behaves as if it does not exist.
 *
 * @param flagKey - The feature flag key to evaluate
 * @param options - Guard configuration with repository access
 * @returns Fastify preHandler hook
 */
export function createFeatureFlagGuard(flagKey: string, options: FeatureFlagGuardOptions) {
  const { repos } = options;

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Look up the flag definition
    let flag;
    try {
      flag = await repos.featureFlags.findByKey(flagKey);
    } catch {
      reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
        message: ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'FEATURE_FLAG_ERROR',
      });
      return;
    }

    // Unknown flags default to disabled -- return 404
    if (flag === null) {
      reply.code(HTTP_STATUS.NOT_FOUND).send({
        message: 'Feature not available',
        code: 'FEATURE_DISABLED',
      });
      return;
    }

    // Extract optional tenant context from the workspace header
    const workspaceId = request.headers[WORKSPACE_ID_HEADER];
    const tenantId =
      typeof workspaceId === 'string' && workspaceId !== '' ? workspaceId : undefined;

    // Check for tenant-level override first
    if (tenantId !== undefined) {
      try {
        const override = await repos.tenantFeatureOverrides.findByTenantAndKey(tenantId, flagKey);
        if (override !== null) {
          if (!override.isEnabled) {
            reply.code(HTTP_STATUS.NOT_FOUND).send({
              message: 'Feature not available',
              code: 'FEATURE_DISABLED',
            });
          }
          // Override exists and is enabled -- proceed
          return;
        }
      } catch {
        reply.code(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({
          message: ERROR_MESSAGES.INTERNAL_ERROR,
          code: 'FEATURE_FLAG_ERROR',
        });
        return;
      }
    }

    // Extract optional user context
    const user = (request as FastifyRequest & { user?: { userId: string } }).user;
    const userId = user?.userId;

    // Build evaluation context conditionally to satisfy exactOptionalPropertyTypes
    const evalContext: { tenantId?: string; userId?: string } = {};
    if (tenantId !== undefined) {
      evalContext.tenantId = tenantId;
    }
    if (userId !== undefined) {
      evalContext.userId = userId;
    }

    // Evaluate the flag using shared logic
    const enabled = evaluateFlag(
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

    if (!enabled) {
      reply.code(HTTP_STATUS.NOT_FOUND).send({
        message: 'Feature not available',
        code: 'FEATURE_DISABLED',
      });
    }

    // Flag enabled -- proceed (no explicit return needed; Fastify continues)
  };
}
