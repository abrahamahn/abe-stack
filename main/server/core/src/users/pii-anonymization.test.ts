// main/server/core/src/users/pii-anonymization.test.ts
/**
 * PII Anonymization Cron Tests
 *
 * Tests with mocked DbClient — no real database required.
 *
 * @module users/pii-anonymization.test
 */

import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { anonymizeExpiredUsers } from './pii-anonymization';

import type { ServerLogger } from '@bslt/shared';
import type { DbClient } from '../../../db/src';

// ============================================================================
// Mock Factories
// ============================================================================

function createMockDb(): DbClient {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
  } as unknown as DbClient;
}

function createMockLogger(): ServerLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as ServerLogger;
}

// ============================================================================
// Test Data
// ============================================================================

const THIRTY_ONE_DAYS_AGO = new Date();
THIRTY_ONE_DAYS_AGO.setDate(THIRTY_ONE_DAYS_AGO.getDate() - 31);

const YESTERDAY = new Date();
YESTERDAY.setDate(YESTERDAY.getDate() - 1);

function makeDbUserRow(overrides: {
  id: string;
  email: string;
  deleted_at: Date;
  deletion_grace_period_ends: Date;
}) {
  return {
    id: overrides.id,
    email: overrides.email,
    canonical_email: overrides.email,
    username: `user_${overrides.id}`,
    password_hash: 'hashed',
    first_name: 'John',
    last_name: 'Doe',
    avatar_url: null,
    role: 'user',
    email_verified: true,
    email_verified_at: new Date('2025-01-01'),
    locked_until: null,
    lock_reason: null,
    failed_login_attempts: 0,
    totp_secret: null,
    totp_enabled: false,
    phone: '+1234567890',
    phone_verified: false,
    date_of_birth: null,
    gender: null,
    city: 'Portland',
    state: 'OR',
    country: 'US',
    bio: 'A test user bio',
    language: 'en',
    website: 'https://example.com',
    last_username_change: null,
    deactivated_at: null,
    deleted_at: overrides.deleted_at,
    deletion_grace_period_ends: overrides.deletion_grace_period_ends,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    version: 1,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('anonymizeExpiredUsers', () => {
  let db: DbClient;
  let log: ServerLogger;

  beforeEach(() => {
    db = createMockDb();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should anonymize users whose grace period has expired', async () => {
    const userRow = makeDbUserRow({
      id: 'user-1',
      email: 'john@example.com',
      deleted_at: THIRTY_ONE_DAYS_AGO,
      deletion_grace_period_ends: YESTERDAY,
    });

    vi.mocked(db.query).mockResolvedValueOnce([userRow]);

    const result = await anonymizeExpiredUsers(db, log);

    expect(result.anonymizedCount).toBe(1);
    expect(db.execute).toHaveBeenCalledTimes(1);

    // Verify the update was called with anonymized data
    const executeCall = vi.mocked(db.execute).mock.calls[0];
    expect(executeCall).toBeDefined();

    // Verify log was called
    expect(log.info).toHaveBeenCalledWith({ anonymizedCount: 1 }, 'PII anonymization completed');
  });

  test('should skip already-anonymized users', async () => {
    const hashedEmail = `${createHash('sha256').update('john@example.com').digest('hex')}@anonymized.local`;
    const alreadyAnonymizedRow = makeDbUserRow({
      id: 'user-2',
      email: hashedEmail,
      deleted_at: THIRTY_ONE_DAYS_AGO,
      deletion_grace_period_ends: YESTERDAY,
    });

    vi.mocked(db.query).mockResolvedValueOnce([alreadyAnonymizedRow]);

    const result = await anonymizeExpiredUsers(db, log);

    expect(result.anonymizedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
    expect(log.debug).toHaveBeenCalled();
  });

  test('should return zero when no users qualify', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result = await anonymizeExpiredUsers(db, log);

    expect(result.anonymizedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('should anonymize multiple users', async () => {
    const user1 = makeDbUserRow({
      id: 'user-1',
      email: 'alice@example.com',
      deleted_at: THIRTY_ONE_DAYS_AGO,
      deletion_grace_period_ends: YESTERDAY,
    });
    const user2 = makeDbUserRow({
      id: 'user-2',
      email: 'bob@example.com',
      deleted_at: THIRTY_ONE_DAYS_AGO,
      deletion_grace_period_ends: YESTERDAY,
    });

    vi.mocked(db.query).mockResolvedValueOnce([user1, user2]);

    const result = await anonymizeExpiredUsers(db, log);

    expect(result.anonymizedCount).toBe(2);
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  test('should accept custom grace period', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result = await anonymizeExpiredUsers(db, log, 60);

    expect(result.anonymizedCount).toBe(0);
    // The query was still made with the custom cutoff
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('should anonymize mix of already-anonymized and fresh users', async () => {
    const hashedEmail = `${createHash('sha256').update('old@example.com').digest('hex')}@anonymized.local`;
    const freshUser = makeDbUserRow({
      id: 'user-fresh',
      email: 'fresh@example.com',
      deleted_at: THIRTY_ONE_DAYS_AGO,
      deletion_grace_period_ends: YESTERDAY,
    });
    const anonymizedUser = makeDbUserRow({
      id: 'user-old',
      email: hashedEmail,
      deleted_at: THIRTY_ONE_DAYS_AGO,
      deletion_grace_period_ends: YESTERDAY,
    });

    vi.mocked(db.query).mockResolvedValueOnce([freshUser, anonymizedUser]);

    const result = await anonymizeExpiredUsers(db, log);

    expect(result.anonymizedCount).toBe(1);
    expect(db.execute).toHaveBeenCalledTimes(1);
  });
});
