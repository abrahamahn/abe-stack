// main/shared/src/domain/compliance/deletion.logic.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateHardDeleteDate,
  DEFAULT_GRACE_PERIOD_DAYS,
  isSoftDeleted,
  isWithinGracePeriod,
} from './deletion.logic';

import type { SoftDeletable } from './deletion.schemas';

// ============================================================================
// calculateHardDeleteDate
// ============================================================================

describe('calculateHardDeleteDate', () => {
  it('should add default grace period (30 days) to soft delete date', () => {
    const softDeleteDate = new Date('2026-01-01T00:00:00Z');
    const result = calculateHardDeleteDate(softDeleteDate);

    expect(result.toISOString()).toBe('2026-01-31T00:00:00.000Z');
  });

  it('should add custom grace period when provided', () => {
    const softDeleteDate = new Date('2026-01-01T00:00:00Z');
    const result = calculateHardDeleteDate(softDeleteDate, 7);

    expect(result.toISOString()).toBe('2026-01-08T00:00:00.000Z');
  });

  it('should handle zero grace period', () => {
    const softDeleteDate = new Date('2026-06-15T12:00:00Z');
    const result = calculateHardDeleteDate(softDeleteDate, 0);

    expect(result.toISOString()).toBe('2026-06-15T12:00:00.000Z');
  });

  it('should handle month boundary rollover', () => {
    const softDeleteDate = new Date('2026-01-25T00:00:00Z');
    const result = calculateHardDeleteDate(softDeleteDate, 10);

    expect(result.toISOString()).toBe('2026-02-04T00:00:00.000Z');
  });

  it('should not mutate the input date', () => {
    const softDeleteDate = new Date('2026-03-01T00:00:00Z');
    const originalTime = softDeleteDate.getTime();

    calculateHardDeleteDate(softDeleteDate, 5);

    expect(softDeleteDate.getTime()).toBe(originalTime);
  });

  it('should export default grace period constant as 30', () => {
    expect(DEFAULT_GRACE_PERIOD_DAYS).toBe(30);
  });
});

// ============================================================================
// isWithinGracePeriod
// ============================================================================

describe('isWithinGracePeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return false when scheduledHardDeleteAt is null', () => {
    expect(isWithinGracePeriod(null)).toBe(false);
  });

  it('should return true when hard delete is in the future', () => {
    vi.setSystemTime(new Date('2026-01-15T00:00:00Z'));
    const futureDate = new Date('2026-02-15T00:00:00Z');

    expect(isWithinGracePeriod(futureDate)).toBe(true);
  });

  it('should return false when hard delete is in the past', () => {
    vi.setSystemTime(new Date('2026-03-01T00:00:00Z'));
    const pastDate = new Date('2026-02-15T00:00:00Z');

    expect(isWithinGracePeriod(pastDate)).toBe(false);
  });

  it('should return false when hard delete is exactly now', () => {
    const now = new Date('2026-02-01T12:00:00Z');
    vi.setSystemTime(now);

    expect(isWithinGracePeriod(now)).toBe(false);
  });
});

// ============================================================================
// isSoftDeleted
// ============================================================================

describe('isSoftDeleted', () => {
  it('should return true for "soft_deleted" state', () => {
    const resource: Partial<SoftDeletable> = { deletionState: 'soft_deleted' };
    expect(isSoftDeleted(resource)).toBe(true);
  });

  it('should return true for "pending_hard_delete" state', () => {
    const resource: Partial<SoftDeletable> = { deletionState: 'pending_hard_delete' };
    expect(isSoftDeleted(resource)).toBe(true);
  });

  it('should return false for "active" state', () => {
    const resource: Partial<SoftDeletable> = { deletionState: 'active' };
    expect(isSoftDeleted(resource)).toBe(false);
  });

  it('should return false for "hard_deleted" state', () => {
    const resource: Partial<SoftDeletable> = { deletionState: 'hard_deleted' };
    expect(isSoftDeleted(resource)).toBe(false);
  });

  it('should return false when deletionState is undefined', () => {
    const resource: Partial<SoftDeletable> = {};
    expect(isSoftDeleted(resource)).toBe(false);
  });
});
