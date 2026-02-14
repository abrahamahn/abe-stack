// main/shared/src/domain/feature-flags/feature-flags.logic.test.ts
import { describe, expect, it } from 'vitest';

import { evaluateFlag } from './feature-flags.logic';

import type { FeatureFlag } from './feature-flags.schemas';

describe('feature-flags.logic', () => {
  // ==========================================================================
  // Global Enable/Disable
  // ==========================================================================
  describe('global toggle', () => {
    it('returns false when flag is globally disabled', () => {
      const flag: FeatureFlag = {
        key: 'new-ui',
        isEnabled: false,
      };
      expect(evaluateFlag(flag)).toBe(false);
    });

    it('returns true when flag is globally enabled with no metadata', () => {
      const flag: FeatureFlag = {
        key: 'new-ui',
        isEnabled: true,
      };
      expect(evaluateFlag(flag)).toBe(true);
    });

    it('returns true when flag is enabled and metadata is undefined', () => {
      const flag: FeatureFlag = {
        key: 'feature',
        isEnabled: true,
        metadata: undefined,
      };
      expect(evaluateFlag(flag)).toBe(true);
    });
  });

  // ==========================================================================
  // Targeted Users/Tenants
  // ==========================================================================
  describe('targeted lists', () => {
    it('returns true when userId is in allowedUserIds', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: true,
        metadata: {
          allowedUserIds: ['user-1', 'user-2'],
        },
      };
      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(true);
    });

    it('returns true when tenantId is in allowedTenantIds', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: true,
        metadata: {
          allowedTenantIds: ['tenant-1'],
        },
      };
      expect(evaluateFlag(flag, { tenantId: 'tenant-1' })).toBe(true);
    });

    it('does not match when userId is not in allowedUserIds', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: true,
        metadata: {
          allowedUserIds: ['user-1'],
        },
      };
      // Falls through to default (isEnabled = true)
      expect(evaluateFlag(flag, { userId: 'user-99' })).toBe(true);
    });
  });

  // ==========================================================================
  // Percentage Rollouts
  // ==========================================================================
  describe('percentage rollouts', () => {
    it('enables for users within rollout percentage', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 100, // 100% rollout
        },
      };
      expect(evaluateFlag(flag, { userId: 'any-user' })).toBe(true);
    });

    it('disables for users outside rollout percentage', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 0, // 0% rollout
        },
      };
      expect(evaluateFlag(flag, { userId: 'any-user' })).toBe(false);
    });

    it('uses tenantId as fallback when userId is not provided', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 100,
        },
      };
      expect(evaluateFlag(flag, { tenantId: 'tenant-1' })).toBe(true);
    });

    it('uses anonymous as fallback when neither userId nor tenantId provided', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 100,
        },
      };
      expect(evaluateFlag(flag, {})).toBe(true);
    });

    it('is deterministic for the same user', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: true,
        metadata: {
          rolloutPercentage: 50,
        },
      };

      const result1 = evaluateFlag(flag, { userId: 'consistent-user' });
      const result2 = evaluateFlag(flag, { userId: 'consistent-user' });
      expect(result1).toBe(result2);
    });
  });

  // ==========================================================================
  // Disabled Flag Overrides Everything
  // ==========================================================================
  describe('disabled flag overrides', () => {
    it('returns false even if userId is in allowedUserIds when flag is disabled', () => {
      const flag: FeatureFlag = {
        key: 'beta',
        isEnabled: false,
        metadata: {
          allowedUserIds: ['user-1'],
        },
      };
      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(false);
    });

    it('returns false even with 100% rollout when flag is disabled', () => {
      const flag: FeatureFlag = {
        key: 'experiment',
        isEnabled: false,
        metadata: {
          rolloutPercentage: 100,
        },
      };
      expect(evaluateFlag(flag, { userId: 'user-1' })).toBe(false);
    });
  });
});
