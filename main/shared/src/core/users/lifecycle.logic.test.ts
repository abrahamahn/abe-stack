// main/shared/src/core/users/lifecycle.logic.test.ts

/**
 * @file Unit Tests for Account Lifecycle Logic
 * @description Tests for account status derivation, grace period, and lifecycle validation.
 * @module Core/Users/Tests
 */

import { describe, expect, it } from 'vitest';

import {
  calculateDeletionGracePeriodEnd,
  canDeactivate,
  canReactivate,
  canRequestDeletion,
  getAccountStatus,
  isAccountActive,
  isAccountDeactivated,
  isAccountPendingDeletion,
  isWithinDeletionGracePeriod,
} from './lifecycle.logic';

import type { AccountLifecycleFields } from './lifecycle.schemas';

// ============================================================================
// Helpers
// ============================================================================

function makeFields(overrides: Partial<AccountLifecycleFields> = {}): AccountLifecycleFields {
  return {
    deactivatedAt: null,
    deletedAt: null,
    deletionGracePeriodEnds: null,
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('getAccountStatus', () => {
  it('returns active when all lifecycle fields are null', () => {
    expect(getAccountStatus(makeFields())).toBe('active');
  });

  it('returns deactivated when deactivatedAt is set', () => {
    expect(getAccountStatus(makeFields({ deactivatedAt: new Date() }))).toBe('deactivated');
  });

  it('returns pending_deletion when deletedAt is set', () => {
    expect(
      getAccountStatus(
        makeFields({
          deletedAt: new Date(),
          deletionGracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ),
    ).toBe('pending_deletion');
  });

  it('returns pending_deletion even if deactivatedAt is also set', () => {
    expect(
      getAccountStatus(
        makeFields({
          deactivatedAt: new Date(),
          deletedAt: new Date(),
          deletionGracePeriodEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }),
      ),
    ).toBe('pending_deletion');
  });
});

describe('isAccountActive', () => {
  it('returns true for active account', () => {
    expect(isAccountActive(makeFields())).toBe(true);
  });

  it('returns false for deactivated account', () => {
    expect(isAccountActive(makeFields({ deactivatedAt: new Date() }))).toBe(false);
  });
});

describe('isAccountDeactivated', () => {
  it('returns true when deactivated only', () => {
    expect(isAccountDeactivated(makeFields({ deactivatedAt: new Date() }))).toBe(true);
  });

  it('returns false when also deleted', () => {
    expect(
      isAccountDeactivated(makeFields({ deactivatedAt: new Date(), deletedAt: new Date() })),
    ).toBe(false);
  });

  it('returns false for active account', () => {
    expect(isAccountDeactivated(makeFields())).toBe(false);
  });
});

describe('isAccountPendingDeletion', () => {
  it('returns true when deletedAt is set', () => {
    expect(isAccountPendingDeletion(makeFields({ deletedAt: new Date() }))).toBe(true);
  });

  it('returns false for active account', () => {
    expect(isAccountPendingDeletion(makeFields())).toBe(false);
  });
});

describe('calculateDeletionGracePeriodEnd', () => {
  it('adds 30 days by default', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const end = calculateDeletionGracePeriodEnd(now);
    expect(end.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it('uses custom grace period', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const end = calculateDeletionGracePeriodEnd(now, 7);
    expect(end.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });
});

describe('isWithinDeletionGracePeriod', () => {
  it('returns true when grace period is in the future', () => {
    expect(
      isWithinDeletionGracePeriod(
        makeFields({
          deletionGracePeriodEnds: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      ),
    ).toBe(true);
  });

  it('returns false when grace period has passed', () => {
    expect(
      isWithinDeletionGracePeriod(
        makeFields({
          deletionGracePeriodEnds: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }),
      ),
    ).toBe(false);
  });

  it('returns false when no grace period end set', () => {
    expect(isWithinDeletionGracePeriod(makeFields())).toBe(false);
  });
});

describe('canDeactivate', () => {
  it('allows active account', () => {
    expect(canDeactivate(makeFields())).toBe(true);
  });

  it('denies already deactivated account', () => {
    expect(canDeactivate(makeFields({ deactivatedAt: new Date() }))).toBe(false);
  });

  it('denies pending deletion account', () => {
    expect(canDeactivate(makeFields({ deletedAt: new Date() }))).toBe(false);
  });
});

describe('canRequestDeletion', () => {
  it('allows active account', () => {
    expect(canRequestDeletion(makeFields())).toBe(true);
  });

  it('allows deactivated account', () => {
    expect(canRequestDeletion(makeFields({ deactivatedAt: new Date() }))).toBe(true);
  });

  it('denies already pending deletion account', () => {
    expect(canRequestDeletion(makeFields({ deletedAt: new Date() }))).toBe(false);
  });
});

describe('canReactivate', () => {
  it('allows deactivated account', () => {
    expect(canReactivate(makeFields({ deactivatedAt: new Date() }))).toBe(true);
  });

  it('allows pending deletion within grace period', () => {
    expect(
      canReactivate(
        makeFields({
          deletedAt: new Date(),
          deletionGracePeriodEnds: new Date(Date.now() + 24 * 60 * 60 * 1000),
        }),
      ),
    ).toBe(true);
  });

  it('denies pending deletion past grace period', () => {
    expect(
      canReactivate(
        makeFields({
          deletedAt: new Date(),
          deletionGracePeriodEnds: new Date(Date.now() - 24 * 60 * 60 * 1000),
        }),
      ),
    ).toBe(false);
  });

  it('denies active account', () => {
    expect(canReactivate(makeFields())).toBe(false);
  });
});
