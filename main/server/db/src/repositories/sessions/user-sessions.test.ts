// main/server/db/src/repositories/sessions/user-sessions.test.ts
/**
 * Tests for User Sessions Repository
 *
 * Validates user session operations including session creation, lookup by ID,
 * finding active sessions, updates, revocation, and bulk operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createUserSessionRepository } from './user-sessions';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
  withSession: vi.fn() as RawDb['withSession'],
});

// ============================================================================
// Test Data
// ============================================================================

const mockUserSession = {
  id: 'sess-123',
  user_id: 'usr-123',
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  device_id: 'device-123',
  last_active_at: new Date('2024-01-15T10:00:00Z'),
  revoked_at: null,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createUserSessionRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new user session', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        deviceId: 'device-123',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(result.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(result.deviceId).toBe('device-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserSessionRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          ipAddress: '192.168.1.1',
        }),
      ).rejects.toThrow('Failed to create user session');
    });

    it('should handle optional ip address', async () => {
      const sessionWithoutIp = {
        ...mockUserSession,
        ip_address: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithoutIp);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.ipAddress).toBeNull();
    });

    it('should handle optional user agent', async () => {
      const sessionWithoutUserAgent = {
        ...mockUserSession,
        user_agent: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithoutUserAgent);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        ipAddress: '192.168.1.1',
      });

      expect(result.userAgent).toBeNull();
    });

    it('should handle optional device ID', async () => {
      const sessionWithoutDevice = {
        ...mockUserSession,
        device_id: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithoutDevice);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        ipAddress: '192.168.1.1',
      });

      expect(result.deviceId).toBeNull();
    });

    it('should transform snake_case to camelCase', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        ipAddress: '192.168.1.1',
      });

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('ipAddress');
      expect(result).toHaveProperty('userAgent');
      expect(result).toHaveProperty('deviceId');
      expect(result).toHaveProperty('lastActiveAt');
      expect(result).toHaveProperty('revokedAt');
      expect(result).toHaveProperty('createdAt');
    });

    it('should set revoked_at to null by default', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
      });

      expect(result.revokedAt).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return session when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('sess-123');
      expect(result?.userId).toBe('usr-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('WHERE'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-nonexistent');

      expect(result).toBeNull();
    });

    it('should transform snake_case to camelCase', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.userId).toBe('usr-123');
      expect(result?.ipAddress).toBe('192.168.1.1');
      expect(result?.userAgent).toBe('Mozilla/5.0 (Windows NT 10.0; Win64; x64)');
      expect(result?.lastActiveAt).toEqual(new Date('2024-01-15T10:00:00Z'));
    });

    it('should handle revoked sessions', async () => {
      const revokedSession = {
        ...mockUserSession,
        revoked_at: new Date('2024-01-10T12:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(revokedSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.revokedAt).toEqual(new Date('2024-01-10T12:00:00Z'));
    });
  });

  describe('findActiveByUserId', () => {
    it('should return array of active sessions for user', async () => {
      const activeSessions = [
        mockUserSession,
        {
          ...mockUserSession,
          id: 'sess-456',
          device_id: 'device-456',
          last_active_at: new Date('2024-01-14T10:00:00Z'),
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(activeSessions);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe('usr-123');
      expect(result[1]?.userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no active sessions', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-new');

      expect(result).toEqual([]);
    });

    it('should only return non-revoked sessions', async () => {
      const sessions = [
        mockUserSession,
        {
          ...mockUserSession,
          id: 'sess-456',
          revoked_at: null,
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(sessions);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-123');

      expect(result.every((session) => session.revokedAt === null)).toBe(true);
    });

    it('should order by last_active_at descending', async () => {
      const sessions = [
        {
          ...mockUserSession,
          id: 'sess-newest',
          last_active_at: new Date('2024-01-15T10:00:00Z'),
        },
        {
          ...mockUserSession,
          id: 'sess-oldest',
          last_active_at: new Date('2024-01-10T10:00:00Z'),
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(sessions);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-123');

      expect(result[0]?.id).toBe('sess-newest');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*last_active_at.*DESC/i),
        }),
      );
    });

    it('should handle multiple devices for same user', async () => {
      const multiDeviceSessions = [
        mockUserSession,
        { ...mockUserSession, id: 'sess-mobile', device_id: 'device-mobile' },
        { ...mockUserSession, id: 'sess-tablet', device_id: 'device-tablet' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(multiDeviceSessions);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-123');

      expect(result).toHaveLength(3);
      expect(result.map((s) => s.deviceId)).toEqual([
        'device-123',
        'device-mobile',
        'device-tablet',
      ]);
    });
  });

  describe('update', () => {
    it('should update session and return updated record', async () => {
      const updatedSession = {
        ...mockUserSession,
        last_active_at: new Date('2024-01-20T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.update('sess-123', {
        lastActiveAt: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result).toBeDefined();
      expect(result?.lastActiveAt).toEqual(new Date('2024-01-20T10:00:00Z'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when session not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.update('sess-nonexistent', {
        lastActiveAt: new Date(),
      });

      expect(result).toBeNull();
    });

    it('should update revoked_at field', async () => {
      const revokedSession = {
        ...mockUserSession,
        revoked_at: new Date('2024-01-20T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(revokedSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.update('sess-123', {
        revokedAt: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result?.revokedAt).toEqual(new Date('2024-01-20T10:00:00Z'));
    });

    it('should handle partial updates', async () => {
      const updatedSession = {
        ...mockUserSession,
        last_active_at: new Date('2024-01-20T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.update('sess-123', {
        lastActiveAt: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result?.userId).toBe('usr-123');
      expect(result?.ipAddress).toBe('192.168.1.1');
    });

    it('should transform camelCase to snake_case for updates', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockUserSession);

      const repo = createUserSessionRepository(mockDb);
      await repo.update('sess-123', {
        lastActiveAt: new Date('2024-01-20T10:00:00Z'),
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('last_active_at'),
        }),
      );
    });
  });

  describe('revoke', () => {
    it('should revoke session and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.revoke('sess-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return false when session not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.revoke('sess-nonexistent');

      expect(result).toBe(false);
    });

    it('should set revoked_at to current timestamp', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserSessionRepository(mockDb);
      await repo.revoke('sess-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/revoked_at/i),
        }),
      );
    });

    it('should only revoke non-revoked sessions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createUserSessionRepository(mockDb);
      await repo.revoke('sess-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/IS NULL/i),
        }),
      );
    });

    it('should return false when trying to revoke already revoked session', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.revoke('sess-already-revoked');

      expect(result).toBe(false);
    });
  });

  describe('revokeAllByUserId', () => {
    it('should revoke all sessions and return count', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.revokeAllByUserId('usr-123');

      expect(result).toBe(3);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return 0 when user has no active sessions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.revokeAllByUserId('usr-no-sessions');

      expect(result).toBe(0);
    });

    it('should only revoke sessions for specified user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createUserSessionRepository(mockDb);
      await repo.revokeAllByUserId('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should only revoke non-revoked sessions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(2);

      const repo = createUserSessionRepository(mockDb);
      await repo.revokeAllByUserId('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/IS NULL/i),
        }),
      );
    });

    it('should handle bulk revocation for password reset', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.revokeAllByUserId('usr-123');

      expect(result).toBe(5);
    });
  });

  describe('deleteByUserId', () => {
    it('should delete sessions and return count', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.deleteByUserId('usr-123');

      expect(result).toBe(3);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return 0 when user has no sessions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.deleteByUserId('usr-no-sessions');

      expect(result).toBe(0);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createUserSessionRepository(mockDb);
      await repo.deleteByUserId('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*user_sessions/s),
        }),
      );
    });

    it('should only delete sessions for specified user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createUserSessionRepository(mockDb);
      await repo.deleteByUserId('usr-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should delete both active and revoked sessions', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.deleteByUserId('usr-123');

      expect(result).toBe(5);
    });
  });

  describe('edge cases', () => {
    it('should handle null IP addresses', async () => {
      const sessionWithoutIp = {
        ...mockUserSession,
        ip_address: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithoutIp);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.ipAddress).toBeNull();
    });

    it('should handle null user agents', async () => {
      const sessionWithoutUserAgent = {
        ...mockUserSession,
        user_agent: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithoutUserAgent);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.userAgent).toBeNull();
    });

    it('should handle null device IDs', async () => {
      const sessionWithoutDevice = {
        ...mockUserSession,
        device_id: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithoutDevice);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.deviceId).toBeNull();
    });

    it('should handle very long user agent strings', async () => {
      const longUserAgent = 'Mozilla/5.0 ' + 'A'.repeat(500);
      const sessionWithLongUserAgent = {
        ...mockUserSession,
        user_agent: longUserAgent,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithLongUserAgent);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        userAgent: longUserAgent,
      });

      expect(result.userAgent).toBe(longUserAgent);
    });

    it('should handle IPv6 addresses', async () => {
      const sessionWithIpv6 = {
        ...mockUserSession,
        ip_address: '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(sessionWithIpv6);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.ipAddress).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    it('should handle very recent timestamps', async () => {
      const now = new Date();
      const recentSession = {
        ...mockUserSession,
        last_active_at: now,
        created_at: now,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(recentSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.lastActiveAt).toEqual(now);
      expect(result?.createdAt).toEqual(now);
    });

    it('should handle sessions created and immediately revoked', async () => {
      const revokedSession = {
        ...mockUserSession,
        revoked_at: mockUserSession.created_at,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(revokedSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-123');

      expect(result?.revokedAt).toEqual(result?.createdAt);
    });

    it('should handle different device types', async () => {
      const deviceIds = ['device-web', 'device-mobile', 'device-tablet', 'device-desktop'];

      for (const deviceId of deviceIds) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockUserSession,
          device_id: deviceId,
        });

        const repo = createUserSessionRepository(mockDb);
        const result = await repo.findById('sess-123');

        expect(result?.deviceId).toBe(deviceId);
      }
    });

    it('should handle sessions with all optional fields null', async () => {
      const minimalSession = {
        id: 'sess-minimal',
        user_id: 'usr-123',
        ip_address: null,
        user_agent: null,
        device_id: null,
        last_active_at: new Date('2024-01-01'),
        revoked_at: null,
        created_at: new Date('2024-01-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalSession);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findById('sess-minimal');

      expect(result?.ipAddress).toBeNull();
      expect(result?.userAgent).toBeNull();
      expect(result?.deviceId).toBeNull();
      expect(result?.revokedAt).toBeNull();
    });

    it('should handle concurrent sessions from same device', async () => {
      const sessions = [
        { ...mockUserSession, id: 'sess-1', device_id: 'device-123' },
        { ...mockUserSession, id: 'sess-2', device_id: 'device-123' },
        { ...mockUserSession, id: 'sess-3', device_id: 'device-123' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(sessions);

      const repo = createUserSessionRepository(mockDb);
      const result = await repo.findActiveByUserId('usr-123');

      expect(result).toHaveLength(3);
      expect(result.every((s) => s.deviceId === 'device-123')).toBe(true);
    });
  });
});
