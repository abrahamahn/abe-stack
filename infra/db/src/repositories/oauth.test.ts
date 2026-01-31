// infra/db/src/repositories/oauth.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { createOAuthConnectionRepository } from './oauth';

import type { RawDb } from '../client';
import type { NewOAuthConnection, UpdateOAuthConnection } from '../schema/index';

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
// OAuth Connection Repository Tests
// ============================================================================

describe('OAuthConnectionRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createOAuthConnectionRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createOAuthConnectionRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return OAuth connection when found', async () => {
      const mockConnection: Record<string, unknown> = {
        id: 'conn-123',
        ['user_id']: 'user-456',
        provider: 'google',
        ['provider_user_id']: 'google-123',
        ['provider_email']: 'user@gmail.com',
        ['access_token']: 'access-token-123',
        ['refresh_token']: 'refresh-token-123',
        ['expires_at']: new Date('2024-12-31'),
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date('2024-01-01'),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockConnection);

      const result = await repository.findById('conn-123');

      expect(result).toEqual({
        id: 'conn-123',
        userId: 'user-456',
        provider: 'google',
        providerUserId: 'google-123',
        providerEmail: 'user@gmail.com',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: mockConnection['expires_at'],
        createdAt: mockConnection['created_at'],
        updatedAt: mockConnection['updated_at'],
      });
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when connection not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserIdAndProvider', () => {
    test('should return connection for user and provider', async () => {
      const mockConnection: Record<string, unknown> = {
        id: 'conn-123',
        ['user_id']: 'user-456',
        provider: 'github',
        ['provider_user_id']: 'github-789',
        ['provider_email']: 'user@github.com',
        ['access_token']: 'access-token-123',
        ['refresh_token']: null,
        ['expires_at']: null,
        ['created_at']: new Date(),
        ['updated_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockConnection);

      const result = await repository.findByUserIdAndProvider('user-456', 'github');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user-456');
      expect(result?.provider).toBe('github');
    });

    test('should return null when connection does not exist', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findByUserIdAndProvider('user-456', 'apple');

      expect(result).toBeNull();
    });
  });

  describe('findByProviderUserId', () => {
    test('should return connection by provider user ID', async () => {
      const mockConnection: Record<string, unknown> = {
        id: 'conn-123',
        ['user_id']: 'user-456',
        provider: 'google',
        ['provider_user_id']: 'google-123',
        ['provider_email']: 'user@gmail.com',
        ['access_token']: 'access-token-123',
        ['refresh_token']: 'refresh-token-123',
        ['expires_at']: new Date('2024-12-31'),
        ['created_at']: new Date(),
        ['updated_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockConnection);

      const result = await repository.findByProviderUserId('google', 'google-123');

      expect(result).toBeDefined();
      expect(result?.providerUserId).toBe('google-123');
      expect(result?.provider).toBe('google');
    });

    test('should return null when no matching connection', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findByProviderUserId('google', 'unknown-id');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    test('should return all connections for user', async () => {
      const mockConnections: Record<string, unknown>[] = [
        {
          id: 'conn-1',
          ['user_id']: 'user-456',
          provider: 'google',
          ['provider_user_id']: 'google-123',
          ['provider_email']: 'user@gmail.com',
          ['access_token']: 'access-token-1',
          ['refresh_token']: 'refresh-token-1',
          ['expires_at']: new Date('2024-12-31'),
          ['created_at']: new Date('2024-01-02'),
          ['updated_at']: new Date('2024-01-02'),
        },
        {
          id: 'conn-2',
          ['user_id']: 'user-456',
          provider: 'github',
          ['provider_user_id']: 'github-456',
          ['provider_email']: 'user@github.com',
          ['access_token']: 'access-token-2',
          ['refresh_token']: null,
          ['expires_at']: null,
          ['created_at']: new Date('2024-01-01'),
          ['updated_at']: new Date('2024-01-01'),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockConnections);

      const result = await repository.findByUserId('user-456');

      expect(result).toHaveLength(2);
      expect(result[0]?.provider).toBe('google');
      expect(result[1]?.provider).toBe('github');
    });

    test('should return empty array when user has no connections', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const result = await repository.findByUserId('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    test('should create new OAuth connection', async () => {
      const newConnection: NewOAuthConnection = {
        userId: 'user-456',
        provider: 'google',
        providerUserId: 'google-123',
        providerEmail: 'user@gmail.com',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresAt: new Date('2024-12-31'),
      };

      const mockCreated: Record<string, unknown> = {
        id: 'conn-123',
        ['user_id']: 'user-456',
        provider: 'google',
        ['provider_user_id']: 'google-123',
        ['provider_email']: 'user@gmail.com',
        ['access_token']: 'access-token-123',
        ['refresh_token']: 'refresh-token-123',
        ['expires_at']: newConnection.expiresAt,
        ['created_at']: new Date(),
        ['updated_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newConnection);

      expect(result.id).toBe('conn-123');
      expect(result.userId).toBe('user-456');
      expect(result.provider).toBe('google');
      expect(result.providerUserId).toBe('google-123');
    });

    test('should throw error when creation fails', async () => {
      const newConnection: NewOAuthConnection = {
        userId: 'user-456',
        provider: 'google',
        providerUserId: 'google-123',
        accessToken: 'access-token-123',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newConnection)).rejects.toThrow(
        'Failed to create OAuth connection',
      );
    });
  });

  describe('update', () => {
    test('should update OAuth connection', async () => {
      const updateData: UpdateOAuthConnection = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresAt: new Date('2025-01-01'),
      };

      const mockUpdated: Record<string, unknown> = {
        id: 'conn-123',
        ['user_id']: 'user-456',
        provider: 'google',
        ['provider_user_id']: 'google-123',
        ['provider_email']: 'user@gmail.com',
        ['access_token']: 'new-access-token',
        ['refresh_token']: 'new-refresh-token',
        ['expires_at']: updateData.expiresAt,
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('conn-123', updateData);

      expect(result).toBeDefined();
      expect(result?.accessToken).toBe('new-access-token');
      expect(result?.refreshToken).toBe('new-refresh-token');
    });

    test('should return null when connection not found', async () => {
      const updateData: UpdateOAuthConnection = {
        accessToken: 'new-access-token',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.update('nonexistent', updateData);

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('should delete connection and return true', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.delete('conn-123');

      expect(result).toBe(true);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return false when connection not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.delete('nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByUserId', () => {
    test('should delete all connections for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(3);

      const count = await repository.deleteByUserId('user-456');

      expect(count).toBe(3);
    });

    test('should return 0 when user has no connections', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const count = await repository.deleteByUserId('user-456');

      expect(count).toBe(0);
    });
  });

  describe('deleteByUserIdAndProvider', () => {
    test('should delete specific provider connection and return true', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const result = await repository.deleteByUserIdAndProvider('user-456', 'google');

      expect(result).toBe(true);
    });

    test('should return false when connection not found', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const result = await repository.deleteByUserIdAndProvider('user-456', 'apple');

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    test('should handle connection with null refresh token', async () => {
      const newConnection: NewOAuthConnection = {
        userId: 'user-456',
        provider: 'github',
        providerUserId: 'github-789',
        accessToken: 'access-token-123',
      };

      const mockCreated: Record<string, unknown> = {
        id: 'conn-123',
        ['user_id']: 'user-456',
        provider: 'github',
        ['provider_user_id']: 'github-789',
        ['provider_email']: null,
        ['access_token']: 'access-token-123',
        ['refresh_token']: null,
        ['expires_at']: null,
        ['created_at']: new Date(),
        ['updated_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newConnection);

      expect(result.refreshToken).toBeNull();
      expect(result.expiresAt).toBeNull();
    });

    test('should handle multiple providers for same user', async () => {
      const mockConnections: Record<string, unknown>[] = [
        {
          id: 'conn-1',
          ['user_id']: 'user-456',
          provider: 'google',
          ['provider_user_id']: 'google-123',
          ['provider_email']: 'user@gmail.com',
          ['access_token']: 'access-1',
          ['refresh_token']: 'refresh-1',
          ['expires_at']: new Date(),
          ['created_at']: new Date(),
          ['updated_at']: new Date(),
        },
        {
          id: 'conn-2',
          ['user_id']: 'user-456',
          provider: 'github',
          ['provider_user_id']: 'github-456',
          ['provider_email']: 'user@github.com',
          ['access_token']: 'access-2',
          ['refresh_token']: null,
          ['expires_at']: null,
          ['created_at']: new Date(),
          ['updated_at']: new Date(),
        },
        {
          id: 'conn-3',
          ['user_id']: 'user-456',
          provider: 'apple',
          ['provider_user_id']: 'apple-789',
          ['provider_email']: 'user@icloud.com',
          ['access_token']: 'access-3',
          ['refresh_token']: 'refresh-3',
          ['expires_at']: new Date(),
          ['created_at']: new Date(),
          ['updated_at']: new Date(),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockConnections);

      const result = await repository.findByUserId('user-456');

      expect(result).toHaveLength(3);
      const providers = result.map((conn) => conn.provider);
      expect(providers).toContain('google');
      expect(providers).toContain('github');
      expect(providers).toContain('apple');
    });

    test('should handle updating only access token', async () => {
      const updateData: UpdateOAuthConnection = {
        accessToken: 'new-access-token',
      };

      const mockUpdated: Record<string, unknown> = {
        id: 'conn-123',
        ['user_id']: 'user-456',
        provider: 'google',
        ['provider_user_id']: 'google-123',
        ['provider_email']: 'user@gmail.com',
        ['access_token']: 'new-access-token',
        ['refresh_token']: 'old-refresh-token',
        ['expires_at']: new Date('2024-12-31'),
        ['created_at']: new Date('2024-01-01'),
        ['updated_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockUpdated);

      const result = await repository.update('conn-123', updateData);

      expect(result?.accessToken).toBe('new-access-token');
      expect(result?.refreshToken).toBe('old-refresh-token');
    });
  });
});
