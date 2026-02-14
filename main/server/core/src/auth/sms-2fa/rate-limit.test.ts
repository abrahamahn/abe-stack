// main/server/core/src/auth/sms-2fa/rate-limit.test.ts
/**
 * SMS Rate Limit Tests
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { checkSmsRateLimit } from './rate-limit';

import type { DbClient } from '../../../../db/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDb(): DbClient {
  return {
    raw: vi.fn().mockResolvedValue([{ count: '0' }]),
  } as unknown as DbClient;
}

// ============================================================================
// Tests
// ============================================================================

describe('checkSmsRateLimit', () => {
  let db: DbClient;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  test('allows when under both hourly and daily limits', async () => {
    vi.mocked(db.raw)
      .mockResolvedValueOnce([{ count: '1' }]) // hourly count
      .mockResolvedValueOnce([{ count: '5' }]); // daily count

    const result = await checkSmsRateLimit(db, 'user-1');

    expect(result.allowed).toBe(true);
    expect(result.retryAfter).toBeUndefined();
  });

  test('denies when hourly limit is reached', async () => {
    const createdAt = new Date(Date.now() - 30 * 60 * 1000); // 30 min ago
    vi.mocked(db.raw)
      .mockResolvedValueOnce([{ count: '3' }]) // hourly count = limit
      .mockResolvedValueOnce([{ created_at: createdAt }]); // oldest in window

    const result = await checkSmsRateLimit(db, 'user-1');

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    // retryAfter should be ~30 min from now (1 hour after the oldest)
    expect(result.retryAfter!.getTime()).toBeGreaterThan(Date.now());
  });

  test('denies when daily limit is reached', async () => {
    const createdAt = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago
    vi.mocked(db.raw)
      .mockResolvedValueOnce([{ count: '2' }]) // hourly count (under limit)
      .mockResolvedValueOnce([{ count: '10' }]) // daily count = limit
      .mockResolvedValueOnce([{ created_at: createdAt }]); // oldest in daily window

    const result = await checkSmsRateLimit(db, 'user-1');

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    expect(result.retryAfter!.getTime()).toBeGreaterThan(Date.now());
  });

  test('allows when counts are zero', async () => {
    vi.mocked(db.raw)
      .mockResolvedValueOnce([{ count: '0' }]) // hourly count
      .mockResolvedValueOnce([{ count: '0' }]); // daily count

    const result = await checkSmsRateLimit(db, 'user-1');

    expect(result.allowed).toBe(true);
  });

  test('provides fallback retryAfter when oldest record is missing', async () => {
    vi.mocked(db.raw)
      .mockResolvedValueOnce([{ count: '3' }]) // hourly count = limit
      .mockResolvedValueOnce([]); // no oldest found (edge case)

    const result = await checkSmsRateLimit(db, 'user-1');

    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeDefined();
    // Fallback should be ~1 hour from now
    expect(result.retryAfter!.getTime()).toBeGreaterThan(Date.now());
    expect(result.retryAfter!.getTime()).toBeLessThanOrEqual(Date.now() + 60 * 60 * 1000 + 1000);
  });
});
