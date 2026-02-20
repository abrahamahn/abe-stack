// main/server/db/src/repositories/api-keys/api-keys.test.ts
/**
 * Tests for API Keys Repository
 *
 * Validates API key operations including creation, retrieval by various identifiers,
 * updates, revocation, last-used tracking, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createApiKeyRepository } from './api-keys';

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

const mockApiKey = {
  id: 'key-123',
  tenant_id: 'ten-456',
  user_id: 'usr-123',
  name: 'Production API Key',
  key_prefix: 'ak_prod_',
  key_hash: 'sha256keyhash',
  scopes: ['read', 'write'],
  last_used_at: null,
  expires_at: new Date('2025-01-01'),
  revoked_at: null,
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createApiKeyRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new API key successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockApiKey);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.create({
        tenantId: 'ten-456',
        userId: 'usr-123',
        name: 'Production API Key',
        keyPrefix: 'ak_prod_',
        keyHash: 'sha256keyhash',
        scopes: ['read', 'write'],
        expiresAt: new Date('2025-01-01'),
      });

      expect(result.id).toBe('key-123');
      expect(result.tenantId).toBe('ten-456');
      expect(result.userId).toBe('usr-123');
      expect(result.name).toBe('Production API Key');
      expect(result.keyPrefix).toBe('ak_prod_');
      expect(result.keyHash).toBe('sha256keyhash');
      expect(result.scopes).toEqual(['read', 'write']);
      expect(result.expiresAt).toEqual(new Date('2025-01-01'));
      expect(result.revokedAt).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createApiKeyRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'ten-456',
          userId: 'usr-123',
          name: 'Production API Key',
          keyPrefix: 'ak_prod_',
          keyHash: 'sha256keyhash',
          scopes: ['read', 'write'],
          expiresAt: new Date('2025-01-01'),
        }),
      ).rejects.toThrow('Failed to create API key');
    });
  });

  describe('findByKeyHash', () => {
    it('should return API key when found and not revoked', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockApiKey);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findByKeyHash('sha256keyhash');

      expect(result).toBeDefined();
      expect(result?.id).toBe('key-123');
      expect(result?.keyHash).toBe('sha256keyhash');
      expect(result?.userId).toBe('usr-123');
      expect(result?.tenantId).toBe('ten-456');
      expect(result?.revokedAt).toBeNull();
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when API key not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findByKeyHash('nonexistent-hash');

      expect(result).toBeNull();
    });

    it('should filter by key_hash and revoked_at IS NULL', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockApiKey);

      const repo = createApiKeyRepository(mockDb);
      await repo.findByKeyHash('sha256keyhash');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/key_hash.*revoked_at/s),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return API key when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockApiKey);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findById('key-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('key-123');
      expect(result?.keyHash).toBe('sha256keyhash');
      expect(result?.userId).toBe('usr-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when API key not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findById('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should filter by id', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockApiKey);

      const repo = createApiKeyRepository(mockDb);
      await repo.findById('key-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });
  });

  describe('findByUserId', () => {
    it('should return array of API keys for user', async () => {
      const mockApiKey2 = {
        ...mockApiKey,
        id: 'key-456',
        name: 'Development API Key',
      };
      vi.mocked(mockDb.query).mockResolvedValue([mockApiKey, mockApiKey2]);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('key-123');
      expect(result[0]?.userId).toBe('usr-123');
      expect(result[1]?.id).toBe('key-456');
      expect(result[1]?.userId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no API keys found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findByUserId('usr-without-keys');

      expect(result).toEqual([]);
    });

    it('should filter by user_id and order by created_at desc', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createApiKeyRepository(mockDb);
      await repo.findByUserId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/user_id.*ORDER BY.*created_at.*DESC/s),
        }),
      );
    });
  });

  describe('findByTenantId', () => {
    it('should return array of API keys for tenant', async () => {
      const mockApiKey2 = {
        ...mockApiKey,
        id: 'key-789',
        user_id: 'usr-456',
      };
      vi.mocked(mockDb.query).mockResolvedValue([mockApiKey, mockApiKey2]);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findByTenantId('ten-456');

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('key-123');
      expect(result[0]?.tenantId).toBe('ten-456');
      expect(result[1]?.id).toBe('key-789');
      expect(result[1]?.tenantId).toBe('ten-456');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return empty array when no API keys found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.findByTenantId('ten-without-keys');

      expect(result).toEqual([]);
    });

    it('should filter by tenant_id and order by created_at desc', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createApiKeyRepository(mockDb);
      await repo.findByTenantId('ten-456');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/tenant_id.*ORDER BY.*created_at.*DESC/s),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update API key successfully', async () => {
      const updatedApiKey = {
        ...mockApiKey,
        name: 'Updated API Key Name',
        scopes: ['read'],
        updated_at: new Date('2024-02-01'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedApiKey);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.update('key-123', {
        name: 'Updated API Key Name',
        scopes: ['read'],
      });

      expect(result).toBeDefined();
      expect(result?.id).toBe('key-123');
      expect(result?.name).toBe('Updated API Key Name');
      expect(result?.scopes).toEqual(['read']);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when API key not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.update('nonexistent-id', {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });

    it('should include id in WHERE clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockApiKey);

      const repo = createApiKeyRepository(mockDb);
      await repo.update('key-123', { name: 'Updated Name' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*id/s),
        }),
      );
    });
  });

  describe('revoke', () => {
    it('should revoke API key successfully', async () => {
      const revokedApiKey = {
        ...mockApiKey,
        revoked_at: new Date('2024-01-15'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(revokedApiKey);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.revoke('key-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('key-123');
      expect(result?.revokedAt).toEqual(new Date('2024-01-15'));
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when API key not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.revoke('nonexistent-id');

      expect(result).toBeNull();
    });

    it('should set revoked_at in update query', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue({
        ...mockApiKey,
        revoked_at: new Date(),
      });

      const repo = createApiKeyRepository(mockDb);
      await repo.revoke('key-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('revoked_at'),
        }),
      );
    });
  });

  describe('updateLastUsed', () => {
    it('should update last_used_at timestamp', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createApiKeyRepository(mockDb);
      await repo.updateLastUsed('key-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should set last_used_at in update query', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createApiKeyRepository(mockDb);
      await repo.updateLastUsed('key-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('last_used_at'),
        }),
      );
    });

    it('should not throw when API key not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createApiKeyRepository(mockDb);
      await expect(repo.updateLastUsed('nonexistent-id')).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete API key and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.delete('key-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when API key not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createApiKeyRepository(mockDb);
      const result = await repo.delete('nonexistent-id');

      expect(result).toBe(false);
    });

    it('should filter by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createApiKeyRepository(mockDb);
      await repo.delete('key-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*id/s),
        }),
      );
    });
  });
});
