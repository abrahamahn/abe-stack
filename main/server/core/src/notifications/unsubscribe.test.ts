// main/server/core/src/notifications/unsubscribe.test.ts
/**
 * Email Unsubscribe Service Unit Tests
 *
 * Tests for:
 * - Token generation and validation (HMAC-SHA256)
 * - List-Unsubscribe header generation (RFC 8058)
 * - Unsubscribe preference persistence
 * - Email sending pipeline integration (shouldSendEmail)
 * - Constant-time comparison security
 *
 * @complexity O(1) per test
 */

import { describe, expect, test, vi } from 'vitest';

import {
  generateUnsubscribeHeaders,
  generateUnsubscribeToken,
  getUnsubscribedCategories,
  isUnsubscribed,
  NON_SUPPRESSIBLE_TYPES,
  resubscribeUser,
  shouldSendEmail,
  UNSUBSCRIBE_CATEGORIES,
  unsubscribeUser,
  validateUnsubscribeToken,
} from './unsubscribe';

import type { DbClient } from '../../../db/src';

// ============================================================================
// Mock DB Client
// ============================================================================

function createMockDb(options?: { unsubscribedCategories?: string[] }): DbClient {
  const categories = options?.unsubscribedCategories ?? [];

  return {
    queryOne: vi.fn(async (_query: { text: string; values: unknown[] }) => {
      // isUnsubscribed check
      const matchCount = categories.length;
      return { count: matchCount };
    }),
    execute: vi.fn(async () => (categories.length > 0 ? 1 : 0)),
    query: vi.fn(async () => categories.map((c) => ({ category: c }))),
  } as unknown as DbClient;
}

// ============================================================================
// Constants
// ============================================================================

const TEST_SECRET = 'test-secret-key-for-unit-tests-only';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_BASE_URL = 'https://app.example.com';

// ============================================================================
// Token Generation Tests
// ============================================================================

describe('generateUnsubscribeToken', () => {
  test('should generate a non-empty hex string', () => {
    const token = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(0);
    // Hex string check
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });

  test('should generate a 64-character hex string (SHA-256)', () => {
    const token = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);

    expect(token.length).toBe(64);
  });

  test('should be deterministic (same inputs produce same output)', () => {
    const token1 = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);
    const token2 = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);

    expect(token1).toBe(token2);
  });

  test('should produce different tokens for different categories', () => {
    const marketing = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);
    const social = generateUnsubscribeToken(TEST_USER_ID, 'social', TEST_SECRET);

    expect(marketing).not.toBe(social);
  });

  test('should produce different tokens for different users', () => {
    const user1 = generateUnsubscribeToken('user-1', 'marketing', TEST_SECRET);
    const user2 = generateUnsubscribeToken('user-2', 'marketing', TEST_SECRET);

    expect(user1).not.toBe(user2);
  });

  test('should produce different tokens for different secrets', () => {
    const token1 = generateUnsubscribeToken(TEST_USER_ID, 'marketing', 'secret-1');
    const token2 = generateUnsubscribeToken(TEST_USER_ID, 'marketing', 'secret-2');

    expect(token1).not.toBe(token2);
  });
});

// ============================================================================
// Token Validation Tests
// ============================================================================

describe('validateUnsubscribeToken', () => {
  test('should return true for a valid token', () => {
    const token = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);

    const result = validateUnsubscribeToken(token, TEST_USER_ID, 'marketing', TEST_SECRET);

    expect(result).toBe(true);
  });

  test('should return false for an invalid token', () => {
    const result = validateUnsubscribeToken(
      'invalid-token-that-is-definitely-wrong',
      TEST_USER_ID,
      'marketing',
      TEST_SECRET,
    );

    expect(result).toBe(false);
  });

  test('should return false for wrong user ID', () => {
    const token = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);

    const result = validateUnsubscribeToken(token, 'wrong-user-id', 'marketing', TEST_SECRET);

    expect(result).toBe(false);
  });

  test('should return false for wrong category', () => {
    const token = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);

    const result = validateUnsubscribeToken(token, TEST_USER_ID, 'social', TEST_SECRET);

    expect(result).toBe(false);
  });

  test('should return false for wrong secret', () => {
    const token = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);

    const result = validateUnsubscribeToken(token, TEST_USER_ID, 'marketing', 'wrong-secret');

    expect(result).toBe(false);
  });

  test('should return false for empty token', () => {
    const result = validateUnsubscribeToken('', TEST_USER_ID, 'marketing', TEST_SECRET);

    expect(result).toBe(false);
  });

  test('should validate all supported categories', () => {
    for (const category of UNSUBSCRIBE_CATEGORIES) {
      const token = generateUnsubscribeToken(TEST_USER_ID, category, TEST_SECRET);
      const result = validateUnsubscribeToken(token, TEST_USER_ID, category, TEST_SECRET);
      expect(result).toBe(true);
    }
  });
});

// ============================================================================
// Header Generation Tests (RFC 8058)
// ============================================================================

describe('generateUnsubscribeHeaders', () => {
  test('should return List-Unsubscribe header', () => {
    const headers = generateUnsubscribeHeaders(
      TEST_BASE_URL,
      TEST_USER_ID,
      'marketing',
      TEST_SECRET,
    );

    expect(headers).toHaveProperty('List-Unsubscribe');
    expect(headers['List-Unsubscribe']).toMatch(/^<https:\/\/.+>$/);
  });

  test('should return List-Unsubscribe-Post header for one-click', () => {
    const headers = generateUnsubscribeHeaders(
      TEST_BASE_URL,
      TEST_USER_ID,
      'marketing',
      TEST_SECRET,
    );

    expect(headers).toHaveProperty('List-Unsubscribe-Post');
    expect(headers['List-Unsubscribe-Post']).toBe('List-Unsubscribe=One-Click');
  });

  test('should include uid and cat query parameters in the URL', () => {
    const headers = generateUnsubscribeHeaders(
      TEST_BASE_URL,
      TEST_USER_ID,
      'marketing',
      TEST_SECRET,
    );

    const url = headers['List-Unsubscribe']!.replace(/^<|>$/g, '');
    expect(url).toContain(`uid=${TEST_USER_ID}`);
    expect(url).toContain('cat=marketing');
  });

  test('should include a valid HMAC token in the URL path', () => {
    const headers = generateUnsubscribeHeaders(
      TEST_BASE_URL,
      TEST_USER_ID,
      'marketing',
      TEST_SECRET,
    );

    const url = headers['List-Unsubscribe']!.replace(/^<|>$/g, '');
    const expectedToken = generateUnsubscribeToken(TEST_USER_ID, 'marketing', TEST_SECRET);
    expect(url).toContain(`/api/email/unsubscribe/${expectedToken}`);
  });

  test('should generate valid URL for each category', () => {
    for (const category of UNSUBSCRIBE_CATEGORIES) {
      const headers = generateUnsubscribeHeaders(
        TEST_BASE_URL,
        TEST_USER_ID,
        category,
        TEST_SECRET,
      );
      expect(headers['List-Unsubscribe']).toContain(`cat=${category}`);
    }
  });
});

// ============================================================================
// Preference Persistence Tests
// ============================================================================

describe('unsubscribeUser', () => {
  test('should call execute with INSERT...ON CONFLICT query', async () => {
    const db = createMockDb();

    await unsubscribeUser(db, TEST_USER_ID, 'marketing');

    expect(db.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('INSERT INTO email_unsubscribes'),
        values: [TEST_USER_ID, 'marketing'],
      }),
    );
  });

  test('should handle all valid categories', async () => {
    for (const category of UNSUBSCRIBE_CATEGORIES) {
      const db = createMockDb();
      await unsubscribeUser(db, TEST_USER_ID, category);
      expect(db.execute).toHaveBeenCalled();
    }
  });
});

describe('resubscribeUser', () => {
  test('should call execute with DELETE query', async () => {
    const db = createMockDb({ unsubscribedCategories: ['marketing'] });

    const result = await resubscribeUser(db, TEST_USER_ID, 'marketing');

    expect(db.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining('DELETE FROM email_unsubscribes'),
        values: [TEST_USER_ID, 'marketing'],
      }),
    );
    expect(result).toBe(true);
  });

  test('should return false when no record exists', async () => {
    const db = createMockDb({ unsubscribedCategories: [] });

    const result = await resubscribeUser(db, TEST_USER_ID, 'marketing');

    expect(result).toBe(false);
  });
});

describe('isUnsubscribed', () => {
  test('should return true when user has unsubscribed', async () => {
    const db = createMockDb({ unsubscribedCategories: ['marketing'] });

    const result = await isUnsubscribed(db, TEST_USER_ID, 'marketing');

    expect(result).toBe(true);
  });

  test('should return false when user has not unsubscribed', async () => {
    const db = createMockDb({ unsubscribedCategories: [] });

    const result = await isUnsubscribed(db, TEST_USER_ID, 'marketing');

    expect(result).toBe(false);
  });

  test('should query for both specific category and "all"', async () => {
    const db = createMockDb({ unsubscribedCategories: [] });

    await isUnsubscribed(db, TEST_USER_ID, 'marketing');

    expect(db.queryOne).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("category = 'all'"),
        values: [TEST_USER_ID, 'marketing'],
      }),
    );
  });
});

describe('getUnsubscribedCategories', () => {
  test('should return empty array when no categories unsubscribed', async () => {
    const db = createMockDb({ unsubscribedCategories: [] });

    const result = await getUnsubscribedCategories(db, TEST_USER_ID);

    expect(result).toEqual([]);
  });

  test('should return unsubscribed categories', async () => {
    const db = createMockDb({ unsubscribedCategories: ['marketing', 'social'] });

    const result = await getUnsubscribedCategories(db, TEST_USER_ID);

    expect(result).toEqual(['marketing', 'social']);
  });
});

// ============================================================================
// shouldSendEmail Tests
// ============================================================================

describe('shouldSendEmail', () => {
  test('should always allow transactional emails', async () => {
    const db = createMockDb({ unsubscribedCategories: ['all'] });

    const result = await shouldSendEmail(db, TEST_USER_ID, 'transactional');

    expect(result).toBe(true);
    // DB should NOT be queried for non-suppressible types
    expect(db.queryOne).not.toHaveBeenCalled();
  });

  test('should always allow security emails', async () => {
    const db = createMockDb({ unsubscribedCategories: ['all'] });

    const result = await shouldSendEmail(db, TEST_USER_ID, 'security');

    expect(result).toBe(true);
    expect(db.queryOne).not.toHaveBeenCalled();
  });

  test('should block marketing emails when user has unsubscribed', async () => {
    const db = createMockDb({ unsubscribedCategories: ['marketing'] });

    const result = await shouldSendEmail(db, TEST_USER_ID, 'marketing');

    expect(result).toBe(false);
  });

  test('should allow marketing emails when user has not unsubscribed', async () => {
    const db = createMockDb({ unsubscribedCategories: [] });

    const result = await shouldSendEmail(db, TEST_USER_ID, 'marketing');

    expect(result).toBe(true);
  });

  test('should allow unknown notification types by default', async () => {
    const db = createMockDb({ unsubscribedCategories: [] });

    const result = await shouldSendEmail(db, TEST_USER_ID, 'unknown_type');

    expect(result).toBe(true);
    // Unknown types should not query the DB
    expect(db.queryOne).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Constants Tests
// ============================================================================

describe('Constants', () => {
  test('UNSUBSCRIBE_CATEGORIES should include marketing, social, and all', () => {
    expect(UNSUBSCRIBE_CATEGORIES).toContain('marketing');
    expect(UNSUBSCRIBE_CATEGORIES).toContain('social');
    expect(UNSUBSCRIBE_CATEGORIES).toContain('all');
  });

  test('NON_SUPPRESSIBLE_TYPES should include transactional and security', () => {
    expect(NON_SUPPRESSIBLE_TYPES.has('transactional')).toBe(true);
    expect(NON_SUPPRESSIBLE_TYPES.has('security')).toBe(true);
  });

  test('NON_SUPPRESSIBLE_TYPES should NOT include marketing or social', () => {
    expect(NON_SUPPRESSIBLE_TYPES.has('marketing')).toBe(false);
    expect(NON_SUPPRESSIBLE_TYPES.has('social')).toBe(false);
  });
});
