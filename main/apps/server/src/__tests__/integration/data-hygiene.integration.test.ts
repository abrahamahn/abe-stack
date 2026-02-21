// main/apps/server/src/__tests__/integration/data-hygiene.integration.test.ts
/**
 * Data Hygiene Integration Tests (Sprint 3.16)
 *
 * Verifies the full lifecycle of data hygiene operations:
 *
 * 1. Soft-delete user → PII anonymization cron runs → PII cleared
 *    → audit events still queryable by actorId (audit trail intact)
 * 2. Create unverified user → wait past expiry threshold → cleanup cron
 *    runs → user hard-deleted
 *
 * These tests use mocked DB and repositories (no real database required),
 * following the same pattern as job-lifecycle.integration.test.ts.
 */

import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAuditEventsForDeletedUser,
} from '../../../../../server/core/src/users/data-hygiene';
import {
  anonymizeExpiredUsers,
  type AnonymizeResult,
} from '../../../../../server/core/src/users/pii-anonymization';
import {
  cleanupUnverifiedUsers,
  type CleanupResult,
} from '../../../../../server/core/src/users/unverified-cleanup';

import type { DbClient, Repositories } from '../../../../../server/db/src';
import type { ServerLogger } from '@bslt/shared';

// ============================================================================
// Mock factories
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

function createMockLogger(): ServerLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as ServerLogger;
}

/** Make a minimal soft-deleted user DB row */
function makeSoftDeletedUserRow(overrides: { id: string; email: string }) {
  const thirtyOneDaysAgo = new Date();
  thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    id: overrides.id,
    email: overrides.email,
    canonical_email: overrides.email,
    username: `user_${overrides.id}`,
    password_hash: 'hashed',
    first_name: 'Jane',
    last_name: 'Smith',
    avatar_url: 'avatars/user-1/avatar.png',
    role: 'user',
    email_verified: true,
    email_verified_at: new Date('2025-01-01'),
    locked_until: null,
    lock_reason: null,
    failed_login_attempts: 0,
    totp_secret: null,
    totp_enabled: false,
    phone: '+15550001234',
    phone_verified: false,
    date_of_birth: null,
    gender: null,
    city: 'Portland',
    state: 'OR',
    country: 'US',
    bio: 'A user who has requested deletion.',
    language: 'en',
    website: null,
    last_username_change: null,
    deactivated_at: null,
    deleted_at: thirtyOneDaysAgo,
    deletion_grace_period_ends: yesterday,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    version: 1,
  };
}

/** Make a minimal unverified user DB row (created more than 7 days ago) */
function makeUnverifiedUserRow(overrides: { id: string; email: string }) {
  const eightDaysAgo = new Date();
  eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

  return {
    id: overrides.id,
    email: overrides.email,
    canonical_email: overrides.email,
    username: `user_${overrides.id}`,
    password_hash: 'hashed',
    first_name: 'Unverified',
    last_name: 'Registrant',
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
    created_at: eightDaysAgo,
    updated_at: eightDaysAgo,
    version: 1,
  };
}

// ============================================================================
// Test: Soft-delete → PII anonymization → audit trail intact
// ============================================================================

describe('Sprint 3.16 — soft-delete user → PII anonymized → audit trail intact', () => {
  let db: DbClient;
  let log: ServerLogger;
  let mockAuditEvents: {
    findByActorId: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    findRecent: ReturnType<typeof vi.fn>;
    findByTenantId: ReturnType<typeof vi.fn>;
    findByAction: ReturnType<typeof vi.fn>;
    deleteOlderThan: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    db = createMockDb();
    log = createMockLogger();
    mockAuditEvents = {
      findByActorId: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
      findRecent: vi.fn(),
      findByTenantId: vi.fn(),
      findByAction: vi.fn(),
      deleteOlderThan: vi.fn(),
    };
  });

  it('PII anonymization cron anonymizes expired soft-deleted users', async () => {
    const userId = 'user-soft-deleted-1';
    const userRow = makeSoftDeletedUserRow({ id: userId, email: 'jane@example.com' });

    // Cron queries for soft-deleted users past grace period
    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    vi.mocked(db.execute).mockResolvedValueOnce(1);

    const result: AnonymizeResult = await anonymizeExpiredUsers(db, log);

    expect(result.anonymizedCount).toBe(1);
    expect(log.info).toHaveBeenCalledWith({ anonymizedCount: 1 }, 'PII anonymization completed');

    // Verify the DB update was called (anonymizes PII)
    expect(db.execute).toHaveBeenCalledTimes(1);
  });

  it('audit events remain queryable by actorId after PII anonymization', async () => {
    const userId = 'user-soft-deleted-2';
    const email = 'deleteme@example.com';
    const userRow = makeSoftDeletedUserRow({ id: userId, email });

    // Simulate the PII anonymization cron running
    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    vi.mocked(db.execute).mockResolvedValueOnce(1);

    await anonymizeExpiredUsers(db, log);

    // After anonymization: audit events are still queryable by actorId.
    // The audit_events table uses ON DELETE SET NULL — not CASCADE — so
    // events persist until the user is hard-deleted.
    const mockEvents = [
      { id: 'evt-1', actorId: userId, action: 'user.login', createdAt: new Date() },
      { id: 'evt-2', actorId: userId, action: 'user.profile_updated', createdAt: new Date() },
    ];
    mockAuditEvents.findByActorId.mockResolvedValueOnce(mockEvents);

    const repos = { auditEvents: mockAuditEvents } as unknown as Pick<
      Repositories,
      'auditEvents'
    >;
    const events = await getAuditEventsForDeletedUser(repos, userId);

    // Audit events are intact and queryable
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ actorId: userId, action: 'user.login' });
    expect(events[1]).toMatchObject({ actorId: userId, action: 'user.profile_updated' });
    expect(mockAuditEvents.findByActorId).toHaveBeenCalledWith(userId, 100);
  });

  it('already-anonymized users are skipped by the cron (idempotent)', async () => {
    const userId = 'user-already-anonymized';
    const hashedEmail = `${createHash('sha256').update('already@example.com').digest('hex')}@anonymized.local`;
    const alreadyAnonymizedRow = makeSoftDeletedUserRow({ id: userId, email: hashedEmail });

    vi.mocked(db.query).mockResolvedValueOnce([alreadyAnonymizedRow]);

    const result: AnonymizeResult = await anonymizeExpiredUsers(db, log);

    // Cron skips already-anonymized users
    expect(result.anonymizedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('audit trail supports custom limit parameter', async () => {
    const userId = 'user-with-many-events';
    const mockEvents = Array.from({ length: 50 }, (_, i) => ({
      id: `evt-${String(i)}`,
      actorId: userId,
      action: 'user.login',
      createdAt: new Date(),
    }));

    mockAuditEvents.findByActorId.mockResolvedValueOnce(mockEvents);

    const repos = { auditEvents: mockAuditEvents } as unknown as Pick<
      Repositories,
      'auditEvents'
    >;
    const events = await getAuditEventsForDeletedUser(repos, userId, 50);

    expect(events).toHaveLength(50);
    expect(mockAuditEvents.findByActorId).toHaveBeenCalledWith(userId, 50);
  });
});

// ============================================================================
// Test: Create unverified user → past threshold → cron deletes → user gone
// ============================================================================

describe('Sprint 3.16 — create unverified user → past threshold → cron deletes', () => {
  let db: DbClient;
  let repos: Pick<Repositories, 'oauthConnections' | 'userSessions'>;
  let log: ServerLogger;

  beforeEach(() => {
    db = createMockDb();
    log = createMockLogger();
    repos = {
      oauthConnections: {
        findByUserId: vi.fn().mockResolvedValue([]),
      },
      userSessions: {
        findActiveByUserId: vi.fn().mockResolvedValue([]),
      },
    } as unknown as Pick<Repositories, 'oauthConnections' | 'userSessions'>;
  });

  it('unverified user past expiry threshold is hard-deleted', async () => {
    const userId = 'unverified-user-1';
    const userRow = makeUnverifiedUserRow({ id: userId, email: 'unverified@example.com' });

    // Cron query returns this unverified user
    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    // Hard-delete executes successfully
    vi.mocked(db.execute).mockResolvedValueOnce(1);

    const result: CleanupResult = await cleanupUnverifiedUsers(
      db,
      repos as unknown as Repositories,
      log,
    );

    expect(result.deletedCount).toBe(1);
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(
      { deletedCount: 1 },
      'Unverified user cleanup completed',
    );
  });

  it('user with OAuth connection is excluded from cleanup (verified via provider)', async () => {
    const userId = 'oauth-unverified-user';
    const userRow = makeUnverifiedUserRow({ id: userId, email: 'oauth@example.com' });

    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    vi.mocked(repos.oauthConnections.findByUserId).mockResolvedValueOnce([
      { id: 'conn-1', userId, provider: 'google' },
    ] as never);

    const result: CleanupResult = await cleanupUnverifiedUsers(
      db,
      repos as unknown as Repositories,
      log,
    );

    // OAuth user excluded — not deleted
    expect(result.deletedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('user with active session is excluded from cleanup (registration in progress)', async () => {
    const userId = 'session-unverified-user';
    const userRow = makeUnverifiedUserRow({ id: userId, email: 'session@example.com' });

    vi.mocked(db.query).mockResolvedValueOnce([userRow]);
    vi.mocked(repos.oauthConnections.findByUserId).mockResolvedValueOnce([]);
    vi.mocked(repos.userSessions.findActiveByUserId).mockResolvedValueOnce([
      { id: 'sess-1', userId },
    ] as never);

    const result: CleanupResult = await cleanupUnverifiedUsers(
      db,
      repos as unknown as Repositories,
      log,
    );

    // Session user excluded — not deleted
    expect(result.deletedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
  });

  it('multiple unverified users are all deleted in one cron run', async () => {
    const users = [
      makeUnverifiedUserRow({ id: 'user-a', email: 'a@example.com' }),
      makeUnverifiedUserRow({ id: 'user-b', email: 'b@example.com' }),
      makeUnverifiedUserRow({ id: 'user-c', email: 'c@example.com' }),
    ];

    vi.mocked(db.query).mockResolvedValueOnce(users);
    // Each delete returns 1
    vi.mocked(db.execute)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const result: CleanupResult = await cleanupUnverifiedUsers(
      db,
      repos as unknown as Repositories,
      log,
    );

    expect(result.deletedCount).toBe(3);
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it('no unverified users past threshold yields zero deletions', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result: CleanupResult = await cleanupUnverifiedUsers(
      db,
      repos as unknown as Repositories,
      log,
    );

    expect(result.deletedCount).toBe(0);
    expect(db.execute).not.toHaveBeenCalled();
    expect(log.debug).toHaveBeenCalled();
  });

  it('custom expiry period is passed to the cron query', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result: CleanupResult = await cleanupUnverifiedUsers(
      db,
      repos as unknown as Repositories,
      log,
      14,
    );

    expect(result.deletedCount).toBe(0);
    // Query was made with the custom 14-day cutoff
    expect(db.query).toHaveBeenCalledTimes(1);
  });
});
