// apps/server/src/modules/users/sessions.service.test.ts
/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/modules/users/sessions.service.test.ts
/**
 * Sessions Service Tests
 *
 * Comprehensive unit tests for user session management functionality.
 * Tests session listing, revoking, and bulk operations with proper mocking.
 *
 * @complexity O(n) for all operations where n is session count
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getSessionCount,
  listUserSessions,
  revokeAllSessions,
  revokeSession,
  type UserSession,
} from './sessions.service';

import type { RefreshTokenFamily } from '@abe-stack/db';
import type { Repositories } from '@/infrastructure';

// ============================================================================
// Test Data Factories
// ============================================================================

/**
 * Create a mock refresh token family
 */
function createMockFamily(
  overrides: Partial<RefreshTokenFamily> = {},
): RefreshTokenFamily {
  return {
    id: 'family-1',
    userId: 'user-1',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    revokedAt: null,
    revokeReason: null,
    ...overrides,
  };
}

/**
 * Create mock repositories with spies
 */
function createMockRepos(): Repositories {
  return {
    users: {} as never,
    refreshTokens: {} as never,
    refreshTokenFamilies: {
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
      create: vi.fn(),
      revoke: vi.fn(),
      revokeAllForUser: vi.fn(),
    },
    loginAttempts: {} as never,
    passwordResetTokens: {} as never,
    emailVerificationTokens: {} as never,
    securityEvents: {} as never,
    magicLinkTokens: {} as never,
    oauthConnections: {} as never,
    pushSubscriptions: {} as never,
    notificationPreferences: {} as never,
    plans: {} as never,
    subscriptions: {} as never,
    customerMappings: {} as never,
    invoices: {} as never,
    paymentMethods: {} as never,
    billingEvents: {} as never,
  } as Repositories;
}

// ============================================================================
// Tests: listUserSessions
// ============================================================================

describe('listUserSessions', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  describe('when user has multiple sessions', () => {
    it('should return all active sessions with correct mapping', async () => {
      const mockFamilies = [
        createMockFamily({
          id: 'family-1',
          createdAt: new Date('2026-01-15T10:00:00Z'),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 (Windows)',
        }),
        createMockFamily({
          id: 'family-2',
          createdAt: new Date('2026-01-14T10:00:00Z'),
          ipAddress: '10.0.0.1',
          userAgent: 'Mozilla/5.0 (Mac)',
        }),
        createMockFamily({
          id: 'family-3',
          createdAt: new Date('2026-01-13T10:00:00Z'),
          ipAddress: null,
          userAgent: null,
        }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const result = await listUserSessions(repos, 'user-1');

      expect(repos.refreshTokenFamilies.findActiveByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        id: 'family-1',
        createdAt: new Date('2026-01-15T10:00:00Z'),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows)',
        isCurrent: false,
      });
      expect(result[1]).toEqual({
        id: 'family-2',
        createdAt: new Date('2026-01-14T10:00:00Z'),
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 (Mac)',
        isCurrent: false,
      });
    });

    it('should mark current session when familyId provided', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
        createMockFamily({ id: 'family-3' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const result = await listUserSessions(repos, 'user-1', 'family-2');

      expect(result[0]?.isCurrent).toBe(false);
      expect(result[1]?.isCurrent).toBe(true);
      expect(result[2]?.isCurrent).toBe(false);
    });

    it('should handle null ipAddress and userAgent', async () => {
      const mockFamilies = [
        createMockFamily({
          id: 'family-1',
          ipAddress: null,
          userAgent: null,
        }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const result = await listUserSessions(repos, 'user-1');

      expect(result[0]?.ipAddress).toBeNull();
      expect(result[0]?.userAgent).toBeNull();
    });
  });

  describe('when user has no sessions', () => {
    it('should return empty array', async () => {
      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue([]);

      const result = await listUserSessions(repos, 'user-1');

      expect(result).toEqual([]);
      expect(repos.refreshTokenFamilies.findActiveByUserId).toHaveBeenCalledWith('user-1');
    });
  });

  describe('when currentFamilyId does not match any session', () => {
    it('should return all sessions with isCurrent false', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const result = await listUserSessions(repos, 'user-1', 'non-existent-family');

      expect(result.every((s) => !s.isCurrent)).toBe(true);
    });
  });

  describe('when currentFamilyId is undefined', () => {
    it('should mark all sessions as not current', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const result = await listUserSessions(repos, 'user-1', undefined);

      expect(result.every((s) => !s.isCurrent)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle single session', async () => {
      const mockFamilies = [createMockFamily({ id: 'family-1' })];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const result = await listUserSessions(repos, 'user-1', 'family-1');

      expect(result).toHaveLength(1);
      expect(result[0]?.isCurrent).toBe(true);
    });

    it('should preserve date objects', async () => {
      const testDate = new Date('2026-01-20T15:30:00Z');
      const mockFamilies = [createMockFamily({ createdAt: testDate })];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const result = await listUserSessions(repos, 'user-1');

      expect(result[0]?.createdAt).toEqual(testDate);
      expect(result[0]?.createdAt).toBeInstanceOf(Date);
    });
  });
});

// ============================================================================
// Tests: revokeSession
// ============================================================================

describe('revokeSession', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  describe('when session exists and belongs to user', () => {
    it('should revoke the session', async () => {
      const mockFamily = createMockFamily({
        id: 'session-1',
        userId: 'user-1',
      });

      vi.mocked(repos.refreshTokenFamilies.findById).mockResolvedValue(mockFamily);
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      await revokeSession(repos, 'user-1', 'session-1');

      expect(repos.refreshTokenFamilies.findById).toHaveBeenCalledWith('session-1');
      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
        'session-1',
        'User revoked session',
      );
    });

    it('should not revoke if already revoked', async () => {
      const mockFamily = createMockFamily({
        id: 'session-1',
        userId: 'user-1',
        revokedAt: new Date('2026-01-15T10:00:00Z'),
        revokeReason: 'Previously revoked',
      });

      vi.mocked(repos.refreshTokenFamilies.findById).mockResolvedValue(mockFamily);

      await revokeSession(repos, 'user-1', 'session-1');

      expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
    });
  });

  describe('when trying to revoke current session', () => {
    it('should throw NotFoundError', async () => {
      await expect(
        revokeSession(repos, 'user-1', 'current-session', 'current-session'),
      ).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'Cannot revoke current session. Use logout instead.',
        statusCode: 404,
      });

      expect(repos.refreshTokenFamilies.findById).not.toHaveBeenCalled();
      expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
    });
  });

  describe('when session does not exist', () => {
    it('should throw NotFoundError', async () => {
      vi.mocked(repos.refreshTokenFamilies.findById).mockResolvedValue(null);

      await expect(revokeSession(repos, 'user-1', 'non-existent')).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'Session not found',
        statusCode: 404,
      });

      expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
    });
  });

  describe('when session belongs to different user', () => {
    it('should throw NotFoundError', async () => {
      const mockFamily = createMockFamily({
        id: 'session-1',
        userId: 'user-2',
      });

      vi.mocked(repos.refreshTokenFamilies.findById).mockResolvedValue(mockFamily);

      await expect(revokeSession(repos, 'user-1', 'session-1')).rejects.toMatchObject({
        name: 'NotFoundError',
        message: 'Session not found',
        statusCode: 404,
      });

      expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle undefined currentFamilyId', async () => {
      const mockFamily = createMockFamily({
        id: 'session-1',
        userId: 'user-1',
      });

      vi.mocked(repos.refreshTokenFamilies.findById).mockResolvedValue(mockFamily);
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      await revokeSession(repos, 'user-1', 'session-1', undefined);

      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
        'session-1',
        'User revoked session',
      );
    });

    it('should handle different session than current', async () => {
      const mockFamily = createMockFamily({
        id: 'session-1',
        userId: 'user-1',
      });

      vi.mocked(repos.refreshTokenFamilies.findById).mockResolvedValue(mockFamily);
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      await revokeSession(repos, 'user-1', 'session-1', 'current-session');

      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// Tests: revokeAllSessions
// ============================================================================

describe('revokeAllSessions', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  describe('when user has multiple sessions', () => {
    it('should revoke all sessions except current', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
        createMockFamily({ id: 'family-3' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      const count = await revokeAllSessions(repos, 'user-1', 'family-2');

      expect(count).toBe(2);
      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledTimes(2);
      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
        'family-1',
        'User logged out from all devices',
      );
      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
        'family-3',
        'User logged out from all devices',
      );
    });

    it('should revoke all sessions when no current session specified', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
        createMockFamily({ id: 'family-3' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      const count = await revokeAllSessions(repos, 'user-1', undefined);

      expect(count).toBe(3);
      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledTimes(3);
    });

    it('should process sessions sequentially', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
      ];

      const callOrder: string[] = [];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );
      vi.mocked(repos.refreshTokenFamilies.revoke).mockImplementation((id: string) => {
        callOrder.push(id);
        return Promise.resolve();
      });

      await revokeAllSessions(repos, 'user-1', 'current-family');

      expect(callOrder).toEqual(['family-1', 'family-2']);
    });
  });

  describe('when user has no sessions', () => {
    it('should return zero', async () => {
      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue([]);

      const count = await revokeAllSessions(repos, 'user-1');

      expect(count).toBe(0);
      expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
    });
  });

  describe('when user has only current session', () => {
    it('should return zero and not revoke current session', async () => {
      const mockFamilies = [createMockFamily({ id: 'current-family' })];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const count = await revokeAllSessions(repos, 'user-1', 'current-family');

      expect(count).toBe(0);
      expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle single non-current session', async () => {
      const mockFamilies = [createMockFamily({ id: 'old-session' })];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      const count = await revokeAllSessions(repos, 'user-1', 'current-session');

      expect(count).toBe(1);
      expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
        'old-session',
        'User logged out from all devices',
      );
    });

    it('should filter correctly when currentFamilyId does not match any session', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      const count = await revokeAllSessions(repos, 'user-1', 'non-existent');

      expect(count).toBe(2);
    });

    it('should increment count correctly for each revocation', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
        createMockFamily({ id: 'family-3' }),
        createMockFamily({ id: 'family-4' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );
      vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(undefined);

      const count = await revokeAllSessions(repos, 'user-1', 'family-2');

      expect(count).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should propagate repository errors', async () => {
      const mockFamilies = [createMockFamily({ id: 'family-1' })];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );
      vi.mocked(repos.refreshTokenFamilies.revoke).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(revokeAllSessions(repos, 'user-1')).rejects.toThrow(
        'Database error',
      );
    });
  });
});

// ============================================================================
// Tests: getSessionCount
// ============================================================================

describe('getSessionCount', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  describe('when user has sessions', () => {
    it('should return correct count for multiple sessions', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1' }),
        createMockFamily({ id: 'family-2' }),
        createMockFamily({ id: 'family-3' }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const count = await getSessionCount(repos, 'user-1');

      expect(count).toBe(3);
      expect(repos.refreshTokenFamilies.findActiveByUserId).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('should return 1 for single session', async () => {
      const mockFamilies = [createMockFamily({ id: 'family-1' })];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const count = await getSessionCount(repos, 'user-1');

      expect(count).toBe(1);
    });

    it('should return correct count for large number of sessions', async () => {
      const mockFamilies = Array.from({ length: 50 }, (_, i) =>
        createMockFamily({ id: `family-${i}` }),
      );

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const count = await getSessionCount(repos, 'user-1');

      expect(count).toBe(50);
    });
  });

  describe('when user has no sessions', () => {
    it('should return zero', async () => {
      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue([]);

      const count = await getSessionCount(repos, 'user-1');

      expect(count).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle different user IDs', async () => {
      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue([
        createMockFamily({ id: 'family-1' }),
      ]);

      await getSessionCount(repos, 'user-123');

      expect(repos.refreshTokenFamilies.findActiveByUserId).toHaveBeenCalledWith(
        'user-123',
      );
    });

    it('should only count active sessions', async () => {
      const mockFamilies = [
        createMockFamily({ id: 'family-1', revokedAt: null }),
        createMockFamily({ id: 'family-2', revokedAt: null }),
      ];

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const count = await getSessionCount(repos, 'user-1');

      expect(count).toBe(2);
    });
  });

  describe('performance', () => {
    it('should complete in O(1) time after repository call', async () => {
      const mockFamilies = Array.from({ length: 1000 }, (_, i) =>
        createMockFamily({ id: `family-${i}` }),
      );

      vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
        mockFamilies,
      );

      const startTime = performance.now();
      const count = await getSessionCount(repos, 'user-1');
      const endTime = performance.now();

      expect(count).toBe(1000);
      // Array.length is O(1), so entire operation should be very fast
      expect(endTime - startTime).toBeLessThan(10);
    });
  });
});

// ============================================================================
// Tests: Type Safety
// ============================================================================

describe('type safety', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('should return properly typed UserSession objects', async () => {
    const mockFamilies = [createMockFamily({ id: 'family-1' })];

    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
      mockFamilies,
    );

    const result = await listUserSessions(repos, 'user-1', 'family-1');

    // Type assertion to verify UserSession interface compliance
    const session: UserSession = result[0]!;
    expect(session.id).toBeTypeOf('string');
    expect(session.createdAt).toBeInstanceOf(Date);
    expect(session.isCurrent).toBeTypeOf('boolean');
  });

  it('should handle nullable fields correctly', async () => {
    const mockFamilies = [
      createMockFamily({
        ipAddress: null,
        userAgent: null,
      }),
    ];

    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(
      mockFamilies,
    );

    const result = await listUserSessions(repos, 'user-1');

    expect(result[0]?.ipAddress).toBeNull();
    expect(result[0]?.userAgent).toBeNull();
  });
});
