// main/server/core/src/users/unverified-cleanup.test.ts
/**
 * Unverified User Cleanup Cron Tests
 *
 * Tests with mocked DbClient and Repositories — no real database required.
 *
 * @module users/unverified-cleanup.test
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { cleanupUnverifiedUsers } from './unverified-cleanup';

import type { DbClient, Repositories } from '../../../db/src';
import type { ServerLogger } from '@abe-stack/shared/core';

// ============================================================================
// Mock Factories
// ============================================================================

function createMockDb(): DbClient {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(1),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
  } as unknown as DbClient;
}

function createMockRepos(): Repositories {
  return {
    oauthConnections: {
      findByUserId: vi.fn().mockResolvedValue([]),
    },
    userSessions: {
      findActiveByUserId: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Repositories;
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

const EIGHT_DAYS_AGO = new Date();
EIGHT_DAYS_AGO.setDate(EIGHT_DAYS_AGO.getDate() - 8);

function makeUnverifiedUserRow(overrides: { id: string; email: string }) {
  return {
    id: overrides.id,
    email: overrides.email,
    canonical_email: overrides.email,
    username: `user_${overrides.id}`,
    password_hash: 'hashed',
    first_name: 'Unverified',
    last_name: 'User',
    avatar_url: null,
    role: 'user',
    email_verified: false,
    email_verified_at: null,
    locked_until: null,
    lock_reason: null,
    failed_login_attempts: 0,
    totp_secret: null,
    totp_enabled: false,
    phone: null,
    phone_verified: null,
    date_of_birth: null,
    gender: null,
    city: null,
    state: null,
    country: null,
    bio: null,
    language: null,
    website: null,
    last_username_change: null,
    deactivated_at: null,
    deleted_at: null,
    deletion_grace_period_ends: null,
    created_at: EIGHT_DAYS_AGO,
    updated_at: EIGHT_DAYS_AGO,
    version: 1,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('cleanupUnverifiedUsers', () => {
  let db: DbClient;
  let repos: Repositories;
  let log: ServerLogger;

  beforeEach(() => {
    db = createMockDb();
    repos = createMockRepos();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should delete unverified users older than expiry period', async () => {
    const userRow = makeUnverifiedUserRow({
      id: 'user-1',
      email: 'unverified@example.com',
    });

    vi.mocked(db.query).mockResolvedValueOnce([userRow]);

    const result = await cleanupUnverifiedUsers(db, repos, log);

    expect(result.deletedCount).toBe(1);
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith({ deletedCount: 1 }, 'Unverified user cleanup completed');
  });

  test('should exclude users with OAuth connections', async () => {
    const userRow = makeUnverifiedUserRow({
      id: 'oauth-user',
      email: 'oauth@example.com',
    });

    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    vi.mocked(repos.oauthConnections.findByUserId).mockResolvedValueOnce([
      { id: 'conn-1', userId: 'oauth-user', provider: 'google' },
    ] as never);

    const result = await cleanupUnverifiedUsers(db, repos, log);

    expect(result.deletedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('should exclude users with active sessions', async () => {
    const userRow = makeUnverifiedUserRow({
      id: 'session-user',
      email: 'session@example.com',
    });

    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    vi.mocked(repos.oauthConnections.findByUserId).mockResolvedValueOnce([]);
    vi.mocked(repos.userSessions.findActiveByUserId).mockResolvedValueOnce([
      { id: 'session-1', userId: 'session-user' },
    ] as never);

    const result = await cleanupUnverifiedUsers(db, repos, log);

    expect(result.deletedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  test('should return zero when no users qualify', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result = await cleanupUnverifiedUsers(db, repos, log);

    expect(result.deletedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
    expect(log.debug).toHaveBeenCalled();
  });

  test('should delete multiple qualifying users', async () => {
    const user1 = makeUnverifiedUserRow({ id: 'user-1', email: 'a@example.com' });
    const user2 = makeUnverifiedUserRow({ id: 'user-2', email: 'b@example.com' });

    vi.mocked(db.query).mockResolvedValueOnce([user1, user2]);

    const result = await cleanupUnverifiedUsers(db, repos, log);

    expect(result.deletedCount).toBe(2);
    expect(db.execute).toHaveBeenCalledTimes(2);
  });

  test('should accept custom expiry period', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result = await cleanupUnverifiedUsers(db, repos, log, 14);

    expect(result.deletedCount).toBe(0);
    // Query was made with the custom cutoff
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  test('should delete qualifying users and skip excluded users in same batch', async () => {
    const qualifyingUser = makeUnverifiedUserRow({
      id: 'delete-me',
      email: 'delete@example.com',
    });
    const oauthUser = makeUnverifiedUserRow({
      id: 'keep-me-oauth',
      email: 'keep-oauth@example.com',
    });
    const sessionUser = makeUnverifiedUserRow({
      id: 'keep-me-session',
      email: 'keep-session@example.com',
    });

    vi.mocked(db.query).mockResolvedValueOnce([qualifyingUser, oauthUser, sessionUser]);

    // First user: no OAuth, no sessions => delete
    vi.mocked(repos.oauthConnections.findByUserId)
      .mockResolvedValueOnce([])
      // Second user: has OAuth => skip
      .mockResolvedValueOnce([{ id: 'conn-1' }] as never)
      // Third user: no OAuth, but has sessions => skip
      .mockResolvedValueOnce([]);

    vi.mocked(repos.userSessions.findActiveByUserId)
      // First user: no sessions
      .mockResolvedValueOnce([])
      // Third user: has sessions
      .mockResolvedValueOnce([{ id: 'sess-1' }] as never);

    const result = await cleanupUnverifiedUsers(db, repos, log);

    expect(result.deletedCount).toBe(1);
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  test('should handle db.execute returning 0 (user already deleted)', async () => {
    const userRow = makeUnverifiedUserRow({
      id: 'race-user',
      email: 'race@example.com',
    });

    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    vi.mocked(db.execute).mockResolvedValueOnce(0);

    const result = await cleanupUnverifiedUsers(db, repos, log);

    // Returns 0 because the delete affected 0 rows
    expect(result.deletedCount).toBe(0);
  });
});
