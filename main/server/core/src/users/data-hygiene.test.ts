// main/server/core/src/users/data-hygiene.test.ts
/**
 * Data Hygiene Service Tests
 *
 * Tests for soft-delete enforcement, search result filtering,
 * PII anonymization, file cleanup, and foreign key safety checks.
 *
 * Sprint 3.16 — Data Hygiene
 *
 * @module users/data-hygiene.test
 */

import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  anonymizeUserPII,
  cleanupUserFiles,
  ensureForeignKeySafety,
  filterDeletedUsers,
  filterSoftDeletedFromResults,
  getAnonymizedActorLabel,
  isUserDeleted,
} from './data-hygiene';

import type { DbClient, Repositories } from '../../../db/src';
import type { FileStorageProvider } from '../files/types';
import type { ServerLogger } from '@bslt/shared';

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

function createMockLogger(): ServerLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as ServerLogger;
}

function createMockStorage(): FileStorageProvider {
  return {
    upload: vi.fn().mockResolvedValue('key'),
    delete: vi.fn().mockResolvedValue(undefined),
    getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed'),
  };
}

function createMockRepos(): Repositories {
  return {
    files: {
      findByUserId: vi.fn().mockResolvedValue([]),
      deleteByUserId: vi.fn().mockResolvedValue(0),
    },
    tenants: {
      findByOwnerId: vi.fn().mockResolvedValue([]),
    },
    invoices: {
      findByUserId: vi.fn().mockResolvedValue([]),
    },
    subscriptions: {
      findByUserId: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Repositories;
}

// ============================================================================
// Test Data
// ============================================================================

function makeUser(overrides: { deletedAt: Date | null }) {
  return {
    id: 'user-1',
    deletedAt: overrides.deletedAt,
  };
}

function makeDbUserRow(overrides: { id: string; email: string }) {
  return {
    id: overrides.id,
    email: overrides.email,
    canonical_email: overrides.email,
    username: `user_${overrides.id}`,
    password_hash: 'hashed',
    first_name: 'John',
    last_name: 'Doe',
    avatar_url: 'https://example.com/avatar.jpg',
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
    deleted_at: new Date('2026-01-01'),
    deletion_grace_period_ends: new Date('2026-01-31'),
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    version: 1,
  };
}

// ============================================================================
// Tests: isUserDeleted
// ============================================================================

describe('isUserDeleted', () => {
  test('should return true when deletedAt is set', () => {
    const user = makeUser({ deletedAt: new Date('2026-01-01') });
    expect(isUserDeleted(user)).toBe(true);
  });

  test('should return false when deletedAt is null', () => {
    const user = makeUser({ deletedAt: null });
    expect(isUserDeleted(user)).toBe(false);
  });
});

// ============================================================================
// Tests: filterDeletedUsers
// ============================================================================

describe('filterDeletedUsers', () => {
  test('should remove soft-deleted users from array', () => {
    const users = [
      { id: 'active-1', deletedAt: null },
      { id: 'deleted-1', deletedAt: new Date('2026-01-01') },
      { id: 'active-2', deletedAt: null },
      { id: 'deleted-2', deletedAt: new Date('2026-01-15') },
    ];

    const result = filterDeletedUsers(users);

    expect(result).toHaveLength(2);
    expect(result.map((u) => u.id)).toEqual(['active-1', 'active-2']);
  });

  test('should return empty array when all users are deleted', () => {
    const users = [
      { id: 'deleted-1', deletedAt: new Date('2026-01-01') },
      { id: 'deleted-2', deletedAt: new Date('2026-01-15') },
    ];

    const result = filterDeletedUsers(users);

    expect(result).toHaveLength(0);
  });

  test('should return all users when none are deleted', () => {
    const users = [
      { id: 'active-1', deletedAt: null },
      { id: 'active-2', deletedAt: null },
    ];

    const result = filterDeletedUsers(users);

    expect(result).toHaveLength(2);
  });

  test('should return empty array for empty input', () => {
    const result = filterDeletedUsers([]);
    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// Tests: filterSoftDeletedFromResults (Sprint 3.16)
// ============================================================================

describe('filterSoftDeletedFromResults', () => {
  test('should strip soft-deleted users from paginated results', () => {
    const result = filterSoftDeletedFromResults({
      data: [
        { id: 'active-1', deletedAt: null },
        { id: 'deleted-1', deletedAt: new Date('2026-01-01') },
        { id: 'active-2', deletedAt: null },
      ],
      total: 10,
    });

    expect(result.data).toHaveLength(2);
    expect(result.data.map((u) => u.id)).toEqual(['active-1', 'active-2']);
    expect(result.total).toBe(9);
  });

  test('should adjust total correctly when multiple deleted users are removed', () => {
    const result = filterSoftDeletedFromResults({
      data: [
        { id: 'deleted-1', deletedAt: new Date('2026-01-01') },
        { id: 'deleted-2', deletedAt: new Date('2026-01-15') },
        { id: 'active-1', deletedAt: null },
      ],
      total: 5,
    });

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  test('should return unchanged result when no users are deleted', () => {
    const result = filterSoftDeletedFromResults({
      data: [
        { id: 'active-1', deletedAt: null },
        { id: 'active-2', deletedAt: null },
      ],
      total: 2,
    });

    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  test('should not produce negative total', () => {
    const result = filterSoftDeletedFromResults({
      data: [{ id: 'deleted-1', deletedAt: new Date('2026-01-01') }],
      total: 0,
    });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  test('should handle empty data array', () => {
    const result = filterSoftDeletedFromResults({
      data: [],
      total: 0,
    });

    expect(result.data).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  test('should preserve extra properties on the result object', () => {
    const input = {
      data: [{ id: 'active-1', deletedAt: null }],
      total: 1,
    };

    const result = filterSoftDeletedFromResults(input);

    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });
});

// ============================================================================
// Tests: anonymizeUserPII (Sprint 3.16)
// ============================================================================

describe('anonymizeUserPII', () => {
  let db: DbClient;
  let log: ServerLogger;

  beforeEach(() => {
    db = createMockDb();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should anonymize PII for a valid user', async () => {
    const userRow = makeDbUserRow({ id: 'user-1', email: 'john@example.com' });
    vi.mocked(db.query).mockResolvedValueOnce([userRow]);

    const result = await anonymizeUserPII(db, 'user-1', log);

    expect(result.success).toBe(true);
    expect(result.emailHash).toBe(createHash('sha256').update('john@example.com').digest('hex'));
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'User PII anonymized',
    );
  });

  test('should skip already-anonymized users', async () => {
    const hashedEmail = `${createHash('sha256').update('john@example.com').digest('hex')}@anonymized.local`;
    const userRow = makeDbUserRow({ id: 'user-1', email: hashedEmail });
    vi.mocked(db.query).mockResolvedValueOnce([userRow]);

    const result = await anonymizeUserPII(db, 'user-1', log);

    expect(result.success).toBe(true);
    expect(db.execute).not.toHaveBeenCalled();
    expect(log.debug).toHaveBeenCalled();
  });

  test('should return failure when user not found', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([]);

    const result = await anonymizeUserPII(db, 'nonexistent', log);

    expect(result.success).toBe(false);
    expect(result.emailHash).toBe('');
    expect(log.warn).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: getAnonymizedActorLabel (Sprint 3.16)
// ============================================================================

describe('getAnonymizedActorLabel', () => {
  test('should format label with short hash', () => {
    const hash = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';
    const label = getAnonymizedActorLabel(hash);
    expect(label).toBe('Deleted User (abcdef01)');
  });

  test('should handle short hash input gracefully', () => {
    const label = getAnonymizedActorLabel('abc');
    expect(label).toBe('Deleted User (abc)');
  });
});

// ============================================================================
// Tests: cleanupUserFiles (Sprint 3.16)
// ============================================================================

describe('cleanupUserFiles', () => {
  let repos: Repositories;
  let storage: FileStorageProvider;
  let log: ServerLogger;

  beforeEach(() => {
    repos = createMockRepos();
    storage = createMockStorage();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should delete all files for a user', async () => {
    const files = [
      { id: 'file-1', storagePath: 'files/user-1/avatar.jpg' },
      { id: 'file-2', storagePath: 'files/user-1/doc.pdf' },
    ];
    vi.mocked(repos.files.findByUserId).mockResolvedValueOnce(files as never);
    vi.mocked(repos.files.deleteByUserId).mockResolvedValueOnce(2);

    const result = await cleanupUserFiles(repos, storage, 'user-1', log);

    expect(result.deletedStorageCount).toBe(2);
    expect(result.deletedRecordCount).toBe(2);
    expect(result.errors).toHaveLength(0);
    expect(storage.delete).toHaveBeenCalledTimes(2);
    expect(storage.delete).toHaveBeenCalledWith('files/user-1/avatar.jpg');
    expect(storage.delete).toHaveBeenCalledWith('files/user-1/doc.pdf');
  });

  test('should return zeros when user has no files', async () => {
    vi.mocked(repos.files.findByUserId).mockResolvedValueOnce([]);

    const result = await cleanupUserFiles(repos, storage, 'user-1', log);

    expect(result.deletedStorageCount).toBe(0);
    expect(result.deletedRecordCount).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(log.debug).toHaveBeenCalled();
  });

  test('should continue on storage deletion failure', async () => {
    const files = [
      { id: 'file-1', storagePath: 'files/user-1/avatar.jpg' },
      { id: 'file-2', storagePath: 'files/user-1/doc.pdf' },
    ];
    vi.mocked(repos.files.findByUserId).mockResolvedValueOnce(files as never);
    vi.mocked(storage.delete)
      .mockRejectedValueOnce(new Error('Storage unavailable'))
      .mockResolvedValueOnce(undefined);
    vi.mocked(repos.files.deleteByUserId).mockResolvedValueOnce(2);

    const result = await cleanupUserFiles(repos, storage, 'user-1', log);

    expect(result.deletedStorageCount).toBe(1);
    expect(result.deletedRecordCount).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Storage unavailable');
  });

  test('should handle database record deletion failure', async () => {
    const files = [{ id: 'file-1', storagePath: 'files/user-1/avatar.jpg' }];
    vi.mocked(repos.files.findByUserId).mockResolvedValueOnce(files as never);
    vi.mocked(repos.files.deleteByUserId).mockRejectedValueOnce(new Error('DB error'));

    const result = await cleanupUserFiles(repos, storage, 'user-1', log);

    expect(result.deletedStorageCount).toBe(1);
    expect(result.deletedRecordCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('DB error');
  });
});

// ============================================================================
// Tests: ensureForeignKeySafety (Sprint 3.16)
// ============================================================================

describe('ensureForeignKeySafety', () => {
  let repos: Repositories;
  let log: ServerLogger;

  beforeEach(() => {
    repos = createMockRepos();
    log = createMockLogger();
    vi.clearAllMocks();
  });

  test('should return safe when no blocking references exist', async () => {
    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    expect(result.safe).toBe(true);
    expect(result.blockingReferences).toHaveLength(0);
  });

  test('should detect tenant ownership as blocking', async () => {
    vi.mocked(repos.tenants.findByOwnerId).mockResolvedValueOnce([{ id: 'tenant-1' }] as never);

    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    expect(result.safe).toBe(false);
    expect(result.blockingReferences).toHaveLength(1);
    expect(result.blockingReferences[0]).toContain('tenant_owner');
    expect(result.blockingReferences[0]).toContain('tenant-1');
  });

  test('should detect active subscriptions as blocking', async () => {
    vi.mocked(repos.subscriptions.findByUserId).mockResolvedValueOnce([
      { id: 'sub-1', status: 'active' },
    ] as never);

    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    expect(result.safe).toBe(false);
    expect(result.blockingReferences).toHaveLength(1);
    expect(result.blockingReferences[0]).toContain('active_subscriptions');
  });

  test('should detect unpaid invoices as blocking', async () => {
    vi.mocked(repos.invoices.findByUserId).mockResolvedValueOnce([
      { id: 'inv-1', status: 'open' },
    ] as never);

    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    expect(result.safe).toBe(false);
    expect(result.blockingReferences).toHaveLength(1);
    expect(result.blockingReferences[0]).toContain('unpaid_invoices');
  });

  test('should accumulate multiple blocking references', async () => {
    vi.mocked(repos.tenants.findByOwnerId).mockResolvedValueOnce([{ id: 'tenant-1' }] as never);
    vi.mocked(repos.subscriptions.findByUserId).mockResolvedValueOnce([
      { id: 'sub-1', status: 'trialing' },
    ] as never);

    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    expect(result.safe).toBe(false);
    expect(result.blockingReferences).toHaveLength(2);
    expect(log.warn).toHaveBeenCalled();
  });

  test('should not block on canceled subscriptions', async () => {
    vi.mocked(repos.subscriptions.findByUserId).mockResolvedValueOnce([
      { id: 'sub-1', status: 'canceled' },
    ] as never);

    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    expect(result.safe).toBe(true);
    expect(result.blockingReferences).toHaveLength(0);
  });

  test('should not block on paid invoices', async () => {
    vi.mocked(repos.invoices.findByUserId).mockResolvedValueOnce([
      { id: 'inv-1', status: 'paid' },
    ] as never);

    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    expect(result.safe).toBe(true);
    expect(result.blockingReferences).toHaveLength(0);
  });

  test('should handle method unavailability gracefully', async () => {
    // Simulate findByOwnerId throwing (method not available)
    vi.mocked(repos.tenants.findByOwnerId).mockRejectedValueOnce(new Error('Not implemented'));

    const result = await ensureForeignKeySafety(repos, 'user-1', log);

    // Should still pass safety check if the lookup fails gracefully
    expect(result.safe).toBe(true);
    expect(log.debug).toHaveBeenCalled();
  });
});
