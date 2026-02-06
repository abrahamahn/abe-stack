// backend/db/src/repositories/oauth/oauth-connections.test.ts
/**
 * Tests for OAuth Connections Repository
 *
 * Validates OAuth connection operations including provider lookups,
 * token management, connection CRUD operations, and user-provider relationships.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createOAuthConnectionRepository } from './oauth-connections';

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
});

// ============================================================================
// Test Data
// ============================================================================

const mockOAuthConnection = {
  id: 'oc-123',
  user_id: 'usr-123',
  provider: 'google',
  provider_user_id: 'google-uid-123',
  provider_email: 'test@gmail.com',
  access_token: 'access-token-123',
  refresh_token: 'refresh-token-123',
  expires_at: new Date('2024-02-01'),
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createOAuthConnectionRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findByProviderUserId', () => {
    it('should return connection when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockOAuthConnection);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByProviderUserId('google', 'google-uid-123');

      expect(result).toBeDefined();
      expect(result?.provider).toBe('google');
      expect(result?.providerUserId).toBe('google-uid-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('provider'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByProviderUserId('google', 'nonexistent');

      expect(result).toBeNull();
    });

    it('should filter by both provider and provider_user_id', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockOAuthConnection);

      const repo = createOAuthConnectionRepository(mockDb);
      await repo.findByProviderUserId('google', 'google-uid-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/provider.*provider_user_id/s),
        }),
      );
    });
  });

  describe('findByUserIdAndProvider', () => {
    it('should return connection when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockOAuthConnection);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByUserIdAndProvider('usr-123', 'google');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('usr-123');
      expect(result?.provider).toBe('google');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByUserIdAndProvider('usr-999', 'google');

      expect(result).toBeNull();
    });

    it('should distinguish between different providers for same user', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createOAuthConnectionRepository(mockDb);
      await repo.findByUserIdAndProvider('usr-123', 'github');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*provider/s),
        }),
      );
    });
  });

  describe('findByUserId', () => {
    it('should return array of connections for user', async () => {
      const connections = [
        mockOAuthConnection,
        { ...mockOAuthConnection, id: 'oc-456', provider: 'github' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(connections);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].provider).toBe('google');
      expect(result[1].provider).toBe('github');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('user_id'),
        }),
      );
    });

    it('should return empty array when user has no connections', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByUserId('usr-new');

      expect(result).toEqual([]);
    });

    it('should return all providers for a user', async () => {
      const connections = [
        mockOAuthConnection,
        { ...mockOAuthConnection, id: 'oc-456', provider: 'github' },
        { ...mockOAuthConnection, id: 'oc-789', provider: 'discord' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(connections);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(3);
      expect(result.map((c) => c.provider)).toEqual(['google', 'github', 'discord']);
    });
  });

  describe('create', () => {
    it('should insert and return new OAuth connection', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockOAuthConnection);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        provider: 'google',
        providerUserId: 'google-uid-123',
        providerEmail: 'test@gmail.com',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date('2024-02-01'),
      });

      expect(result.userId).toBe('usr-123');
      expect(result.provider).toBe('google');
      expect(result.accessToken).toBe('access-token-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createOAuthConnectionRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          provider: 'google',
          providerUserId: 'google-uid-123',
          providerEmail: 'test@gmail.com',
          accessToken: 'access-token-123',
          refreshToken: 'refresh-token-123',
          expiresAt: new Date('2024-02-01'),
        }),
      ).rejects.toThrow('Failed to create OAuth connection');
    });

    it('should handle optional refresh token', async () => {
      const connectionWithoutRefresh = {
        ...mockOAuthConnection,
        refresh_token: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(connectionWithoutRefresh);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        provider: 'google',
        providerUserId: 'google-uid-123',
        providerEmail: 'test@gmail.com',
        accessToken: 'access-token-123',
        expiresAt: new Date('2024-02-01'),
      });

      expect(result.refreshToken).toBeNull();
    });

    it('should handle optional expires_at', async () => {
      const connectionWithoutExpiry = {
        ...mockOAuthConnection,
        expires_at: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(connectionWithoutExpiry);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        provider: 'google',
        providerUserId: 'google-uid-123',
        providerEmail: 'test@gmail.com',
        accessToken: 'access-token-123',
      });

      expect(result.expiresAt).toBeNull();
    });
  });

  describe('update', () => {
    it('should update and return modified connection', async () => {
      const updatedConnection = {
        ...mockOAuthConnection,
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_at: new Date('2024-03-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedConnection);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.update('oc-123', {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date('2024-03-01'),
      });

      expect(result?.accessToken).toBe('new-access-token');
      expect(result?.refreshToken).toBe('new-refresh-token');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when connection not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.update('nonexistent', {
        accessToken: 'new-token',
      });

      expect(result).toBeNull();
    });

    it('should handle partial token updates', async () => {
      const partialUpdate = {
        ...mockOAuthConnection,
        access_token: 'refreshed-token',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(partialUpdate);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.update('oc-123', {
        accessToken: 'refreshed-token',
      });

      expect(result?.accessToken).toBe('refreshed-token');
    });

    it('should return updated connection with RETURNING clause', async () => {
      const updated = {
        ...mockOAuthConnection,
        access_token: 'new-token',
        updated_at: new Date('2024-01-15'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updated);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.update('oc-123', { accessToken: 'new-token' });

      expect(result?.accessToken).toBe('new-token');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('RETURNING *'),
        }),
      );
    });
  });

  describe('deleteByUserIdAndProvider', () => {
    it('should delete connection and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.deleteByUserIdAndProvider('usr-123', 'google');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when connection not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.deleteByUserIdAndProvider('usr-999', 'google');

      expect(result).toBe(false);
    });

    it('should filter by both user_id and provider', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createOAuthConnectionRepository(mockDb);
      await repo.deleteByUserIdAndProvider('usr-123', 'github');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*provider/s),
        }),
      );
    });

    it('should only delete specific provider connection', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createOAuthConnectionRepository(mockDb);
      await repo.deleteByUserIdAndProvider('usr-123', 'google');

      expect(mockDb.execute).toHaveBeenCalledTimes(1);
    });
  });

  describe('edge cases', () => {
    it('should handle connections with null provider email', async () => {
      const connectionWithoutEmail = {
        ...mockOAuthConnection,
        provider_email: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(connectionWithoutEmail);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByProviderUserId('google', 'google-uid-123');

      expect(result?.providerEmail).toBeNull();
    });

    it('should handle multiple provider types', async () => {
      const providers = ['google', 'github', 'discord', 'microsoft'];
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockOAuthConnection);

      const repo = createOAuthConnectionRepository(mockDb);
      for (const provider of providers) {
        await repo.findByUserIdAndProvider('usr-123', provider);
      }

      expect(mockDb.queryOne).toHaveBeenCalledTimes(providers.length);
    });

    it('should handle token expiration edge cases', async () => {
      const expiredConnection = {
        ...mockOAuthConnection,
        expires_at: new Date('2020-01-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(expiredConnection);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.findByProviderUserId('google', 'google-uid-123');

      expect(result?.expiresAt).toEqual(new Date('2020-01-01'));
    });

    it('should handle very long access tokens', async () => {
      const longToken = 'A'.repeat(1000);
      const connectionWithLongToken = {
        ...mockOAuthConnection,
        access_token: longToken,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(connectionWithLongToken);

      const repo = createOAuthConnectionRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        provider: 'google',
        providerUserId: 'google-uid-123',
        providerEmail: 'test@gmail.com',
        accessToken: longToken,
        expiresAt: new Date('2024-02-01'),
      });

      expect(result.accessToken).toBe(longToken);
    });
  });
});
