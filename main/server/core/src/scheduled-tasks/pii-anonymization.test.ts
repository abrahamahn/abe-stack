// main/server/core/src/scheduled-tasks/pii-anonymization.test.ts
/**
 * Tests for PII Anonymization Job
 *
 * Validates PII anonymization logic, grace period handling,
 * and skipping of already-anonymized users.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { anonymizeDeletedUsers } from './pii-anonymization';

import type { Repositories } from '../../../db/src';
import type { ServerLogger } from '@abe-stack/shared/core';

// ============================================================================
// Helpers
// ============================================================================

function createMockRepos(): Pick<Repositories, 'users'> {
  return {
    users: {
      listWithFilters: vi.fn(),
      update: vi.fn(),
    } as unknown as Repositories['users'],
  };
}

function createMockLogger(): ServerLogger {
  const logger: ServerLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
  return logger;
}

// ============================================================================
// Tests
// ============================================================================

describe('anonymizeDeletedUsers', () => {
  let repos: Pick<Repositories, 'users'>;
  let log: ServerLogger;

  beforeEach(() => {
    repos = createMockRepos();
    log = createMockLogger();
  });

  it('should anonymize users deleted longer than grace period', async () => {
    const oldDeletedDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000); // 45 days ago

    vi.mocked(repos.users.listWithFilters).mockResolvedValue({
      data: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          firstName: 'John',
          lastName: 'Doe',
          deletedAt: oldDeletedDate,
          bio: 'Bio text',
          phone: '123-456-7890',
          avatarUrl: 'https://example.com/avatar.jpg',
        } as unknown as Repositories['users'] extends {
          listWithFilters: (...args: unknown[]) => Promise<infer R>;
        }
          ? R extends { data: (infer T)[] }
            ? T
            : never
          : never,
      ],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const count = await anonymizeDeletedUsers(repos, 30, log);

    expect(count).toBe(1);
    expect(repos.users.update).toHaveBeenCalledWith('user-1', {
      email: expect.stringMatching(/^deleted-[a-f0-9]{16}@anonymized\.local$/),
      firstName: '',
      lastName: '',
      bio: null,
      phone: null,
      avatarUrl: null,
    });
  });

  it('should skip users within grace period', async () => {
    const recentDeletedDate = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000); // 15 days ago

    vi.mocked(repos.users.listWithFilters).mockResolvedValue({
      data: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          deletedAt: recentDeletedDate,
        } as unknown as Repositories['users'] extends {
          listWithFilters: (...args: unknown[]) => Promise<infer R>;
        }
          ? R extends { data: (infer T)[] }
            ? T
            : never
          : never,
      ],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const count = await anonymizeDeletedUsers(repos, 30, log);

    expect(count).toBe(0);
    expect(repos.users.update).not.toHaveBeenCalled();
  });

  it('should skip already anonymized users', async () => {
    const oldDeletedDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

    vi.mocked(repos.users.listWithFilters).mockResolvedValue({
      data: [
        {
          id: 'user-1',
          email: 'deleted-abc123@anonymized.local',
          deletedAt: oldDeletedDate,
        } as unknown as Repositories['users'] extends {
          listWithFilters: (...args: unknown[]) => Promise<infer R>;
        }
          ? R extends { data: (infer T)[] }
            ? T
            : never
          : never,
      ],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const count = await anonymizeDeletedUsers(repos, 30, log);

    expect(count).toBe(0);
    expect(repos.users.update).not.toHaveBeenCalled();
  });

  it('should skip users without deletedAt', async () => {
    vi.mocked(repos.users.listWithFilters).mockResolvedValue({
      data: [
        {
          id: 'user-1',
          email: 'active@example.com',
          deletedAt: null,
        } as unknown as Repositories['users'] extends {
          listWithFilters: (...args: unknown[]) => Promise<infer R>;
        }
          ? R extends { data: (infer T)[] }
            ? T
            : never
          : never,
      ],
      total: 1,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    const count = await anonymizeDeletedUsers(repos, 30, log);

    expect(count).toBe(0);
    expect(repos.users.update).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully and continue', async () => {
    const oldDeletedDate = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000);

    vi.mocked(repos.users.listWithFilters).mockResolvedValue({
      data: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          deletedAt: oldDeletedDate,
        } as unknown as Repositories['users'] extends {
          listWithFilters: (...args: unknown[]) => Promise<infer R>;
        }
          ? R extends { data: (infer T)[] }
            ? T
            : never
          : never,
        {
          id: 'user-2',
          email: 'user2@example.com',
          deletedAt: oldDeletedDate,
        } as unknown as Repositories['users'] extends {
          listWithFilters: (...args: unknown[]) => Promise<infer R>;
        }
          ? R extends { data: (infer T)[] }
            ? T
            : never
          : never,
      ],
      total: 2,
      page: 1,
      limit: 10000,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    });

    vi.mocked(repos.users.update)
      .mockRejectedValueOnce(new Error('Database error'))
      .mockResolvedValueOnce({} as never);

    const count = await anonymizeDeletedUsers(repos, 30, log);

    expect(count).toBe(1);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
      'Failed to anonymize user',
    );
  });

  it('should log when no users need anonymization', async () => {
    vi.mocked(repos.users.listWithFilters).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10000,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });

    const count = await anonymizeDeletedUsers(repos, 30, log);

    expect(count).toBe(0);
    expect(log.info).toHaveBeenCalledWith({ gracePeriodDays: 30 }, 'No users to anonymize');
  });
});
