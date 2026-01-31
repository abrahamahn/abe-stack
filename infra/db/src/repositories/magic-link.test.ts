// infra/db/src/repositories/magic-link.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createMagicLinkTokenRepository } from './magic-link';

import type { RawDb } from '../client';
import type { NewMagicLinkToken } from '../schema/index';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  raw: vi.fn(),
  healthCheck: vi.fn(),
  getClient: vi.fn(),
});

// ============================================================================
// Magic Link Token Repository Tests
// ============================================================================

describe('MagicLinkTokenRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createMagicLinkTokenRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createMagicLinkTokenRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return magic link token when found', async () => {
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        email: 'user@example.com',
        ['token_hash']: 'hash123',
        ['expires_at']: new Date('2024-12-31'),
        ['used_at']: null,
        ['created_at']: new Date('2024-01-01'),
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findById('token-123');

      expect(result).toEqual({
        id: 'token-123',
        email: 'user@example.com',
        tokenHash: 'hash123',
        expiresAt: mockToken['expires_at'],
        usedAt: null,
        createdAt: mockToken['created_at'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when token not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findValidByTokenHash', () => {
    test('should return valid token by hash', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        email: 'user@example.com',
        ['token_hash']: 'hash123',
        ['expires_at']: futureDate,
        ['used_at']: null,
        ['created_at']: new Date(),
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findValidByTokenHash('hash123');

      expect(result).toBeDefined();
      expect(result?.tokenHash).toBe('hash123');
      expect(result?.usedAt).toBeNull();
    });

    test('should return null for expired or used token', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findValidByTokenHash('expired-hash');

      expect(result).toBeNull();
    });
  });

  describe('findValidByEmail', () => {
    test('should return most recent valid token for email', async () => {
      const futureDate = new Date(Date.now() + 3600000);
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        email: 'user@example.com',
        ['token_hash']: 'hash123',
        ['expires_at']: futureDate,
        ['used_at']: null,
        ['created_at']: new Date(),
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findValidByEmail('user@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('user@example.com');
    });

    test('should return null when no valid token exists', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findValidByEmail('user@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findRecentByEmail', () => {
    test('should return recent tokens for email', async () => {
      const mockTokens: Record<string, unknown>[] = [
        {
          id: 'token-1',
          email: 'user@example.com',
          ['token_hash']: 'hash1',
          ['expires_at']: new Date(Date.now() + 3600000),
          ['used_at']: null,
          ['created_at']: new Date('2024-01-02'),
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
        },
        {
          id: 'token-2',
          email: 'user@example.com',
          ['token_hash']: 'hash2',
          ['expires_at']: new Date(Date.now() - 3600000),
          ['used_at']: new Date('2024-01-01T12:00:00'),
          ['created_at']: new Date('2024-01-01'),
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockTokens);

      const since = new Date(Date.now() - 86400000);
      const result = await repository.findRecentByEmail('user@example.com', since);

      expect(result).toHaveLength(2);
      expect(result[0]?.email).toBe('user@example.com');
    });

    test('should return empty array when no recent tokens', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const since = new Date();
      const result = await repository.findRecentByEmail('user@example.com', since);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    test('should create new magic link token', async () => {
      const newToken: NewMagicLinkToken = {
        email: 'user@example.com',
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 900000), // 15 minutes
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockCreated: Record<string, unknown> = {
        id: 'token-123',
        email: 'user@example.com',
        ['token_hash']: 'hash123',
        ['expires_at']: newToken.expiresAt,
        ['used_at']: null,
        ['created_at']: new Date(),
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newToken);

      expect(result.id).toBe('token-123');
      expect(result.email).toBe('user@example.com');
      expect(result.tokenHash).toBe('hash123');
    });

    test('should throw error when creation fails', async () => {
      const newToken: NewMagicLinkToken = {
        email: 'user@example.com',
        tokenHash: 'hash123',
        expiresAt: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newToken)).rejects.toThrow(
        'Failed to create magic link token',
      );
    });
  });

  describe('markAsUsed', () => {
    test('should mark token as used', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.markAsUsed('token-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('deleteByEmail', () => {
    test('should delete all tokens for email', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(2);

      const count = await repository.deleteByEmail('user@example.com');

      expect(count).toBe(2);
    });

    test('should return 0 when no tokens found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const count = await repository.deleteByEmail('unknown@example.com');

      expect(count).toBe(0);
    });
  });

  describe('deleteExpired', () => {
    test('should delete expired tokens', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(10);

      const count = await repository.deleteExpired();

      expect(count).toBe(10);
    });
  });

  describe('countRecentByEmail', () => {
    test('should count recent tokens by email', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue({ count: '5' });

      const since = new Date(Date.now() - 3600000);
      const count = await repository.countRecentByEmail('user@example.com', since);

      expect(count).toBe(5);
    });

    test('should return 0 when no tokens found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const since = new Date();
      const count = await repository.countRecentByEmail('user@example.com', since);

      expect(count).toBe(0);
    });
  });

  describe('countRecentByIp', () => {
    test('should count recent tokens by IP address', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue({ count: '3' });

      const since = new Date(Date.now() - 3600000);
      const count = await repository.countRecentByIp('192.168.1.1', since);

      expect(count).toBe(3);
    });

    test('should return 0 when no tokens found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const since = new Date();
      const count = await repository.countRecentByIp('192.168.1.1', since);

      expect(count).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('should handle token with null IP and user agent', async () => {
      const newToken: NewMagicLinkToken = {
        email: 'user@example.com',
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 900000),
      };

      const mockCreated: Record<string, unknown> = {
        id: 'token-123',
        email: 'user@example.com',
        ['token_hash']: 'hash123',
        ['expires_at']: newToken.expiresAt,
        ['used_at']: null,
        ['created_at']: new Date(),
        ['ip_address']: null,
        ['user_agent']: null,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newToken);

      expect(result.ipAddress).toBeNull();
      expect(result.userAgent).toBeNull();
    });

    test('should handle findRecentByEmail with no results', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const since = new Date(Date.now() - 86400000);
      const result = await repository.findRecentByEmail('user@example.com', since);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    test('should handle token with used_at timestamp', async () => {
      const usedDate = new Date('2024-01-01T12:00:00');
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        email: 'user@example.com',
        ['token_hash']: 'hash123',
        ['expires_at']: new Date('2024-12-31'),
        ['used_at']: usedDate,
        ['created_at']: new Date('2024-01-01'),
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findById('token-123');

      expect(result?.usedAt).toEqual(usedDate);
    });
  });
});
