// apps/server/src/modules/users/__tests__/sessions.service.test.ts
import { listUserSessions, revokeAllSessions, revokeSession } from '@users/sessions.service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { RefreshTokenFamilyRepository } from '@abe-stack/db';
import type { Repositories } from '@infrastructure';

describe('Sessions Service', () => {
  const mockRefreshTokenFamilies: Partial<RefreshTokenFamilyRepository> = {
    findActiveByUserId: vi.fn(),
    findById: vi.fn(),
    revoke: vi.fn(),
  };

  const mockRepos = {
    refreshTokenFamilies: mockRefreshTokenFamilies,
  } as unknown as Repositories;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listUserSessions', () => {
    test('should return sessions with current session marked', async () => {
      const mockFamilies = [
        {
          id: 'family-1',
          userId: 'user-123',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date('2024-01-01'),
          revokedAt: null,
          revokeReason: null,
        },
        {
          id: 'family-2',
          userId: 'user-123',
          ipAddress: '10.0.0.1',
          userAgent: 'Chrome/120',
          createdAt: new Date('2024-01-02'),
          revokedAt: null,
          revokeReason: null,
        },
      ];
      vi.mocked(mockRefreshTokenFamilies.findActiveByUserId!).mockResolvedValue(mockFamilies);

      const result = await listUserSessions(mockRepos, 'user-123', 'family-1');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'family-1',
        createdAt: mockFamilies[0]!.createdAt,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        isCurrent: true,
      });
      expect(result[1]).toEqual({
        id: 'family-2',
        createdAt: mockFamilies[1]!.createdAt,
        ipAddress: '10.0.0.1',
        userAgent: 'Chrome/120',
        isCurrent: false,
      });
    });

    test('should return empty array when no sessions exist', async () => {
      vi.mocked(mockRefreshTokenFamilies.findActiveByUserId!).mockResolvedValue([]);

      const result = await listUserSessions(mockRepos, 'user-123');

      expect(result).toEqual([]);
    });
  });

  describe('revokeSession', () => {
    test('should revoke a session that belongs to the user', async () => {
      const mockFamily = {
        id: 'family-1',
        userId: 'user-123',
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        revokedAt: null,
        revokeReason: null,
      };
      vi.mocked(mockRefreshTokenFamilies.findById!).mockResolvedValue(mockFamily);

      await revokeSession(mockRepos, 'user-123', 'family-1');

      expect(mockRefreshTokenFamilies.revoke).toHaveBeenCalledWith('family-1', 'User revoked session');
    });

    test('should throw error when trying to revoke current session', async () => {
      await expect(
        revokeSession(mockRepos, 'user-123', 'family-1', 'family-1'),
      ).rejects.toThrow('Cannot revoke current session');
    });

    test('should throw error when session belongs to another user', async () => {
      const mockFamily = {
        id: 'family-1',
        userId: 'other-user',
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        revokedAt: null,
        revokeReason: null,
      };
      vi.mocked(mockRefreshTokenFamilies.findById!).mockResolvedValue(mockFamily);

      await expect(revokeSession(mockRepos, 'user-123', 'family-1')).rejects.toThrow(
        'Session not found',
      );
    });

    test('should throw error when session not found', async () => {
      vi.mocked(mockRefreshTokenFamilies.findById!).mockResolvedValue(null);

      await expect(revokeSession(mockRepos, 'user-123', 'family-1')).rejects.toThrow(
        'Session not found',
      );
    });
  });

  describe('revokeAllSessions', () => {
    test('should revoke all sessions except current', async () => {
      const mockFamilies = [
        {
          id: 'family-1',
          userId: 'user-123',
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
          revokeReason: null,
        },
        {
          id: 'family-2',
          userId: 'user-123',
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
          revokeReason: null,
        },
        {
          id: 'family-3',
          userId: 'user-123',
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
          revokeReason: null,
        },
      ];
      vi.mocked(mockRefreshTokenFamilies.findActiveByUserId!).mockResolvedValue(mockFamilies);

      const revokedCount = await revokeAllSessions(mockRepos, 'user-123', 'family-1');

      expect(revokedCount).toBe(2);
      expect(mockRefreshTokenFamilies.revoke).toHaveBeenCalledTimes(2);
      expect(mockRefreshTokenFamilies.revoke).toHaveBeenCalledWith(
        'family-2',
        'User logged out from all devices',
      );
      expect(mockRefreshTokenFamilies.revoke).toHaveBeenCalledWith(
        'family-3',
        'User logged out from all devices',
      );
    });

    test('should return 0 when only current session exists', async () => {
      const mockFamilies = [
        {
          id: 'family-1',
          userId: 'user-123',
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          revokedAt: null,
          revokeReason: null,
        },
      ];
      vi.mocked(mockRefreshTokenFamilies.findActiveByUserId!).mockResolvedValue(mockFamilies);

      const revokedCount = await revokeAllSessions(mockRepos, 'user-123', 'family-1');

      expect(revokedCount).toBe(0);
      expect(mockRefreshTokenFamilies.revoke).not.toHaveBeenCalled();
    });
  });
});
