// main/server/core/src/scheduled-tasks/hard-ban-anonymization.test.ts
/**
 * Tests for Hard Ban PII Anonymization Job
 *
 * Sprint 3.15: Verifies that hard-banned users past grace period
 * are properly anonymized while preserving audit structure.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { anonymizeHardBannedUsers } from './hard-ban-anonymization';

import type { ScheduledTaskLogger } from './types';
import type { User as DbUser, Repositories, UserRepository } from '../../../db/src';

// ============================================================================
// Mock Factory
// ============================================================================

function createMockUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 'user-123',
    email: 'banned@example.com',
    canonicalEmail: 'banned@example.com',
    username: 'banneduser',
    passwordHash: 'hash',
    firstName: 'Banned',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: new Date('2024-01-01'),
    lockedUntil: null,
    lockReason: null,
    failedLoginAttempts: 0,
    totpSecret: null,
    totpEnabled: false,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    city: null,
    state: null,
    country: null,
    bio: null,
    language: null,
    website: null,
    lastUsernameChange: null,
    deactivatedAt: null,
    deletedAt: null,
    deletionGracePeriodEnds: null,
    tokenVersion: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockLogger(): ScheduledTaskLogger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  } as unknown as ScheduledTaskLogger;
}

// ============================================================================
// Tests
// ============================================================================

describe('anonymizeHardBannedUsers', () => {
  let mockRepo: UserRepository;
  let mockLog: ScheduledTaskLogger;

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateWithVersion: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      listWithFilters: vi.fn(),
      existsByEmail: vi.fn(),
      incrementFailedAttempts: vi.fn(),
      resetFailedAttempts: vi.fn(),
      lockAccount: vi.fn(),
      unlockAccount: vi.fn(),
      verifyEmail: vi.fn(),
    } as unknown as UserRepository;

    mockLog = createMockLogger();
    vi.clearAllMocks();
  });

  const repos: Pick<Repositories, 'users'> = {
    get users() {
      return mockRepo;
    },
  };

  test('should return 0 when no users to anonymize', async () => {
    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10000,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });

    const result = await anonymizeHardBannedUsers(repos, mockLog);

    expect(result).toBe(0);
    expect(mockLog.info).toHaveBeenCalledWith(
      expect.objectContaining({ gracePeriodDays: 7 }),
      'No hard-banned users to anonymize',
    );
  });

  test('should anonymize hard-banned user past grace period', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const hardBannedUser = createMockUser({
      id: 'banned-user-1',
      email: 'banned@example.com',
      firstName: 'Banned',
      lastName: 'User',
      lockedUntil: new Date('2099-12-31T23:59:59.999Z'), // permanent lock
      lockReason: 'Severe ToS violation',
      deletedAt: thirtyDaysAgo, // deleted 30 days ago (well past 7-day grace)
    });

    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [hardBannedUser],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    vi.mocked(mockRepo.update).mockResolvedValue(hardBannedUser);

    const result = await anonymizeHardBannedUsers(repos, mockLog);

    expect(result).toBe(1);
    expect(mockRepo.update).toHaveBeenCalledWith(
      'banned-user-1',
      expect.objectContaining({
        email: expect.stringContaining('deleted-') as string,
        firstName: '',
        lastName: '',
        bio: null,
        phone: null,
        avatarUrl: null,
        city: null,
        state: null,
        country: null,
        gender: null,
        dateOfBirth: null,
        website: null,
        language: null,
        lockReason: null,
      }),
    );
  });

  test('should skip soft-locked users (not permanently banned)', async () => {
    const softLockedUser = createMockUser({
      lockedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000), // locked for 24h
      deletedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [softLockedUser],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const result = await anonymizeHardBannedUsers(repos, mockLog);

    expect(result).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  test('should skip already-anonymized users', async () => {
    const alreadyAnonymized = createMockUser({
      email: 'deleted-abc123@anonymized.local',
      lockedUntil: new Date('2099-12-31T23:59:59.999Z'),
      deletedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });

    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [alreadyAnonymized],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const result = await anonymizeHardBannedUsers(repos, mockLog);

    expect(result).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  test('should skip users still within grace period', async () => {
    const recentlyBanned = createMockUser({
      lockedUntil: new Date('2099-12-31T23:59:59.999Z'),
      deletedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago (within 7-day grace)
    });

    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [recentlyBanned],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const result = await anonymizeHardBannedUsers(repos, mockLog);

    expect(result).toBe(0);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });

  test('should skip non-deleted users', async () => {
    const activeUser = createMockUser({
      lockedUntil: new Date('2099-12-31T23:59:59.999Z'),
      deletedAt: null, // Not deleted
    });

    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [activeUser],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const result = await anonymizeHardBannedUsers(repos, mockLog);

    expect(result).toBe(0);
  });

  test('should continue processing if one user fails', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const user1 = createMockUser({
      id: 'fail-user',
      lockedUntil: new Date('2099-12-31T23:59:59.999Z'),
      deletedAt: thirtyDaysAgo,
    });
    const user2 = createMockUser({
      id: 'success-user',
      email: 'success@test.com',
      lockedUntil: new Date('2099-12-31T23:59:59.999Z'),
      deletedAt: thirtyDaysAgo,
    });

    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [user1, user2],
      total: 2,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    vi.mocked(mockRepo.update)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(user2);

    const result = await anonymizeHardBannedUsers(repos, mockLog);

    expect(result).toBe(1); // Only second user succeeded
    expect(mockLog.error).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'fail-user' }),
      'Failed to anonymize hard-banned user',
    );
  });

  test('should generate deterministic email hash from user ID', async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const user = createMockUser({
      id: 'deterministic-id',
      lockedUntil: new Date('2099-12-31T23:59:59.999Z'),
      deletedAt: thirtyDaysAgo,
    });

    vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
      data: [user],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });
    vi.mocked(mockRepo.update).mockResolvedValue(user);

    await anonymizeHardBannedUsers(repos, mockLog);

    const updateCall = vi.mocked(mockRepo.update).mock.calls[0]?.[1] as { email: string };
    expect(updateCall.email).toMatch(/^deleted-[a-f0-9]{16}@anonymized\.local$/);
  });
});
