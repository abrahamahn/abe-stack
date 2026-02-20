// main/server/db/src/repositories/auth/trusted-devices.test.ts
/**
 * Tests for Trusted Devices Repository
 *
 * Validates trusted device operations including creation, lookup by user,
 * lookup by fingerprint, marking as trusted, revocation, and upserts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTrustedDeviceRepository } from './trusted-devices';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb =>
  ({
    query: vi.fn(),
    raw: vi.fn() as RawDb['raw'],
    transaction: vi.fn() as RawDb['transaction'],
    healthCheck: vi.fn(),
    close: vi.fn(),
    getClient: vi.fn() as RawDb['getClient'],
    queryOne: vi.fn(),
    execute: vi.fn(),
    withSession: vi.fn() as RawDb['withSession'],
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const mockTrustedDevice = {
  id: 'device-123',
  user_id: 'usr-123',
  device_fingerprint: 'abc123hash',
  label: 'Chrome on Windows',
  ip_address: '192.168.1.1',
  user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  first_seen_at: new Date('2024-01-01T00:00:00Z'),
  last_seen_at: new Date('2024-01-15T10:00:00Z'),
  trusted_at: null,
  created_at: new Date('2024-01-01T00:00:00Z'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createTrustedDeviceRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new trusted device', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTrustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        deviceFingerprint: 'abc123hash',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.deviceFingerprint).toBe('abc123hash');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTrustedDeviceRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          deviceFingerprint: 'abc123hash',
        }),
      ).rejects.toThrow('Failed to create trusted device');
    });

    it('should transform snake_case to camelCase', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTrustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        deviceFingerprint: 'abc123hash',
      });

      expect(result).toHaveProperty('userId');
      expect(result).toHaveProperty('deviceFingerprint');
      expect(result).toHaveProperty('ipAddress');
      expect(result).toHaveProperty('userAgent');
      expect(result).toHaveProperty('firstSeenAt');
      expect(result).toHaveProperty('lastSeenAt');
      expect(result).toHaveProperty('trustedAt');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('findByUser', () => {
    it('should return all devices for a user', async () => {
      const devices = [
        mockTrustedDevice,
        {
          ...mockTrustedDevice,
          id: 'device-456',
          device_fingerprint: 'def456hash',
          last_seen_at: new Date('2024-01-14T10:00:00Z'),
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(devices);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findByUser('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe('usr-123');
      expect(result[1]?.deviceFingerprint).toBe('def456hash');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no devices', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findByUser('usr-new');

      expect(result).toEqual([]);
    });

    it('should order by last_seen_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockTrustedDevice]);

      const repo = createTrustedDeviceRepository(mockDb);
      await repo.findByUser('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*last_seen_at.*DESC/i),
        }),
      );
    });
  });

  describe('findByFingerprint', () => {
    it('should return device when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTrustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findByFingerprint('usr-123', 'abc123hash');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
      expect(result?.deviceFingerprint).toBe('abc123hash');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('device_fingerprint'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findByFingerprint('usr-123', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return device when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTrustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findById('device-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('device-123');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('markTrusted', () => {
    it('should set trusted_at and return updated device', async () => {
      const trustedDevice = {
        ...mockTrustedDevice,
        trusted_at: new Date('2024-01-20T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(trustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.markTrusted('device-123');

      expect(result).toBeDefined();
      expect(result?.trustedAt).toEqual(new Date('2024-01-20T10:00:00Z'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when device not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.markTrusted('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('should delete device and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.revoke('device-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when device not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.revoke('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('updateLastSeen', () => {
    it('should update last_seen_at and return updated device', async () => {
      const updatedDevice = {
        ...mockTrustedDevice,
        last_seen_at: new Date('2024-01-20T10:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.updateLastSeen('device-123', {
        lastSeenAt: new Date('2024-01-20T10:00:00Z'),
      });

      expect(result).toBeDefined();
      expect(result?.lastSeenAt).toEqual(new Date('2024-01-20T10:00:00Z'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when device not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.updateLastSeen('nonexistent', {
        lastSeenAt: new Date(),
      });

      expect(result).toBeNull();
    });
  });

  describe('upsert', () => {
    it('should upsert and return device', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTrustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.upsert({
        userId: 'usr-123',
        deviceFingerprint: 'abc123hash',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.deviceFingerprint).toBe('abc123hash');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('ON CONFLICT'),
        }),
      );
    });

    it('should throw error if upsert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTrustedDeviceRepository(mockDb);

      await expect(
        repo.upsert({
          userId: 'usr-123',
          deviceFingerprint: 'abc123hash',
        }),
      ).rejects.toThrow('Failed to upsert trusted device');
    });
  });

  describe('edge cases', () => {
    it('should handle null label', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTrustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findById('device-123');

      expect(result?.label).toBe('Chrome on Windows');
    });

    it('should handle null trusted_at', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTrustedDevice);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findById('device-123');

      expect(result?.trustedAt).toBeNull();
    });

    it('should handle null ip_address and user_agent', async () => {
      const deviceWithNulls = {
        ...mockTrustedDevice,
        ip_address: null,
        user_agent: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(deviceWithNulls);

      const repo = createTrustedDeviceRepository(mockDb);
      const result = await repo.findById('device-123');

      expect(result?.ipAddress).toBeNull();
      expect(result?.userAgent).toBeNull();
    });
  });
});
