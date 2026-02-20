// main/apps/server/src/__tests__/integration/api-keys-lifecycle.integration.test.ts
/**
 * API Keys Lifecycle Integration Tests
 *
 * Comprehensive integration tests for the full API key lifecycle:
 *   create key -> authenticate with bearer token -> revoke -> bearer rejected
 *
 * Tests the service layer functions directly with mock repositories,
 * verifying the cryptographic pipeline (generate -> hash -> store -> lookup -> verify).
 */

import { createHash } from 'node:crypto';

import {
  createApiKeyAuthMiddleware,
  createScopeGuard,
  getApiKeyContext,
} from '@bslt/core/api-keys/middleware';
import {
  createApiKey,
  deleteApiKey,
  generateApiKey,
  listApiKeys,
  revokeApiKey,
} from '@bslt/core/api-keys/service';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiKey, ApiKeyRepository } from '@bslt/core/db';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// In-Memory API Key Repository
// ============================================================================

interface InMemoryApiKeyRecord extends ApiKey {
  keyHash: string;
}

function createInMemoryApiKeyRepo() {
  const store = new Map<string, InMemoryApiKeyRecord>();
  let counter = 0;

  return {
    create: vi.fn().mockImplementation((data: Partial<InMemoryApiKeyRecord>) => {
      counter += 1;
      const now = new Date();
      const record: InMemoryApiKeyRecord = {
        id: `key-${String(counter)}`,
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? 'unknown',
        name: data.name ?? 'API Key',
        keyPrefix: data.keyPrefix ?? '00000000',
        keyHash: data.keyHash ?? '',
        scopes: data.scopes ?? [],
        lastUsedAt: null,
        expiresAt: data.expiresAt ?? null,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      store.set(record.id, record);
      return record;
    }),

    findByKeyHash: vi.fn().mockImplementation((hash: string) => {
      for (const record of store.values()) {
        if (record.keyHash === hash && record.revokedAt === null) {
          return record;
        }
      }
      return null;
    }),

    findById: vi.fn().mockImplementation((id: string) => {
      return store.get(id) ?? null;
    }),

    findByUserId: vi.fn().mockImplementation((userId: string) => {
      return [...store.values()]
        .filter((r) => r.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),

    findByTenantId: vi.fn().mockResolvedValue([]),

    update: vi.fn().mockResolvedValue(null),

    revoke: vi.fn().mockImplementation((id: string) => {
      const existing = store.get(id);
      if (existing === undefined) return null;
      const updated = { ...existing, revokedAt: new Date(), updatedAt: new Date() };
      store.set(id, updated);
      return updated;
    }),

    updateLastUsed: vi.fn().mockImplementation((id: string) => {
      const existing = store.get(id);
      if (existing !== undefined) {
        store.set(id, { ...existing, lastUsedAt: new Date(), updatedAt: new Date() });
      }
      return Promise.resolve(undefined);
    }),

    delete: vi.fn().mockImplementation((id: string) => {
      return store.delete(id);
    }),

    clear: () => {
      store.clear();
      counter = 0;
    },

    getStore: () => store,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('API Keys Lifecycle Integration', () => {
  let repo: ReturnType<typeof createInMemoryApiKeyRepo>;

  beforeEach(() => {
    repo = createInMemoryApiKeyRepo();
    vi.clearAllMocks();
  });

  afterEach(() => {
    repo.clear();
  });

  // ==========================================================================
  // Create -> Authenticate -> Revoke -> Rejected
  // ==========================================================================

  describe('create key -> authenticate with bearer token -> revoke -> bearer rejected', () => {
    it('should complete the full lifecycle', async () => {
      const userId = 'user-lifecycle-1';

      // Step 1: Create an API key
      const { apiKey, plaintext } = await createApiKey(
        repo as unknown as ApiKeyRepository,
        userId,
        {
          name: 'Lifecycle Test Key',
          scopes: ['read', 'write'],
        },
      );

      expect(apiKey.id).toBeDefined();
      expect(apiKey.userId).toBe(userId);
      expect(apiKey.name).toBe('Lifecycle Test Key');
      expect(apiKey.scopes).toEqual(['read', 'write']);
      expect(apiKey.revokedAt).toBeNull();
      expect(plaintext).toHaveLength(64);

      // Step 2: Verify the plaintext hashes to the stored hash
      const computedHash = createHash('sha256').update(plaintext).digest('hex');
      const foundByHash = await repo.findByKeyHash(computedHash);
      expect(foundByHash).not.toBeNull();
      expect(foundByHash?.id).toBe(apiKey.id);

      // Step 3: Simulate middleware authentication with the bearer token
      const middleware = createApiKeyAuthMiddleware({
        apiKeys: repo as unknown as ApiKeyRepository,
      });

      // Create mock request/reply for authentication
      const mockRequest = {
        headers: { authorization: `Bearer ${plaintext}` },
      } as unknown as FastifyRequest;
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      await middleware(mockRequest, mockReply);

      // Should have attached apiKeyContext to request
      const apiKeyContext = getApiKeyContext(mockRequest);
      expect(apiKeyContext).toBeDefined();
      expect(apiKeyContext?.userId).toBe(userId);
      expect(apiKeyContext?.keyId).toBe(apiKey.id);
      expect(apiKeyContext?.scopes).toEqual(['read', 'write']);

      // Step 4: Revoke the key
      const revokedKey = await revokeApiKey(repo as unknown as ApiKeyRepository, userId, apiKey.id);
      expect(revokedKey.revokedAt).not.toBeNull();

      // Step 5: Attempt to authenticate with the revoked key
      const mockRequest2 = {
        headers: { authorization: `Bearer ${plaintext}` },
      } as unknown as FastifyRequest;
      const mockReply2 = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      await middleware(mockRequest2, mockReply2);

      // Should have been rejected (findByKeyHash excludes revoked keys)
      expect(mockReply2.code).toHaveBeenCalledWith(401);
      expect(mockReply2.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Invalid API key' }),
      );
    });
  });

  // ==========================================================================
  // Key Generation Integrity
  // ==========================================================================

  describe('key generation integrity', () => {
    it('should generate unique keys on each call', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();

      expect(key1.plaintext).not.toBe(key2.plaintext);
      expect(key1.hash).not.toBe(key2.hash);
      expect(key1.prefix).not.toBe(key2.prefix);
    });

    it('should produce prefix that matches first 8 chars of plaintext', () => {
      const key = generateApiKey();
      expect(key.prefix).toBe(key.plaintext.slice(0, 8));
    });

    it('should produce hash that matches SHA-256 of plaintext', () => {
      const key = generateApiKey();
      const expectedHash = createHash('sha256').update(key.plaintext).digest('hex');
      expect(key.hash).toBe(expectedHash);
    });
  });

  // ==========================================================================
  // Scope Enforcement
  // ==========================================================================

  describe('scope enforcement via middleware', () => {
    it('should allow requests when key has required scope', async () => {
      const userId = 'user-scope-1';
      const { plaintext } = await createApiKey(repo as unknown as ApiKeyRepository, userId, {
        name: 'Scoped Key',
        scopes: ['read', 'write'],
      });

      const authMiddleware = createApiKeyAuthMiddleware({
        apiKeys: repo as unknown as ApiKeyRepository,
      });
      const scopeGuard = createScopeGuard('read');

      const mockRequest = {
        headers: { authorization: `Bearer ${plaintext}` },
      } as unknown as FastifyRequest;
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      await authMiddleware(mockRequest, mockReply);
      await scopeGuard(mockRequest, mockReply);

      // Should NOT have sent a 403
      expect(mockReply.code).not.toHaveBeenCalledWith(403);
    });

    it('should reject requests when key lacks required scope', async () => {
      const userId = 'user-scope-2';
      const { plaintext } = await createApiKey(repo as unknown as ApiKeyRepository, userId, {
        name: 'Read Only Key',
        scopes: ['read'],
      });

      const authMiddleware = createApiKeyAuthMiddleware({
        apiKeys: repo as unknown as ApiKeyRepository,
      });
      const scopeGuard = createScopeGuard('admin');

      const mockRequest = {
        headers: { authorization: `Bearer ${plaintext}` },
      } as unknown as FastifyRequest;
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      await authMiddleware(mockRequest, mockReply);
      await scopeGuard(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(403);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'INSUFFICIENT_SCOPE' }),
      );
    });

    it('should allow all scopes when key has empty scopes array (full access)', async () => {
      const userId = 'user-scope-3';
      const { plaintext } = await createApiKey(repo as unknown as ApiKeyRepository, userId, {
        name: 'Full Access Key',
        // no scopes = full access
      });

      const authMiddleware = createApiKeyAuthMiddleware({
        apiKeys: repo as unknown as ApiKeyRepository,
      });
      const scopeGuard = createScopeGuard('admin');

      const mockRequest = {
        headers: { authorization: `Bearer ${plaintext}` },
      } as unknown as FastifyRequest;
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      await authMiddleware(mockRequest, mockReply);
      await scopeGuard(mockRequest, mockReply);

      // Empty scopes = full access, so no 403
      expect(mockReply.code).not.toHaveBeenCalledWith(403);
    });
  });

  // ==========================================================================
  // Expired Key Rejection
  // ==========================================================================

  describe('expired key handling', () => {
    it('should reject expired keys during middleware authentication', async () => {
      const userId = 'user-expired-1';
      const pastDate = new Date(Date.now() - 60_000); // 1 minute ago

      const { plaintext } = await createApiKey(repo as unknown as ApiKeyRepository, userId, {
        name: 'Expired Key',
        expiresAt: pastDate,
      });

      const middleware = createApiKeyAuthMiddleware({
        apiKeys: repo as unknown as ApiKeyRepository,
      });

      const mockRequest = {
        headers: { authorization: `Bearer ${plaintext}` },
      } as unknown as FastifyRequest;
      const mockReply = {
        code: vi.fn().mockReturnThis(),
        send: vi.fn().mockReturnThis(),
      } as unknown as FastifyReply;

      await middleware(mockRequest, mockReply);

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'API key has expired' }),
      );
    });
  });

  // ==========================================================================
  // Key Deletion
  // ==========================================================================

  describe('key deletion', () => {
    it('should permanently delete a key', async () => {
      const userId = 'user-delete-1';
      const { apiKey, plaintext } = await createApiKey(
        repo as unknown as ApiKeyRepository,
        userId,
        { name: 'Deletable Key' },
      );

      const deleted = await deleteApiKey(repo as unknown as ApiKeyRepository, userId, apiKey.id);
      expect(deleted).toBe(true);

      // Verify key no longer exists
      const found = await repo.findById(apiKey.id);
      expect(found).toBeNull();

      // Verify authentication fails
      const computedHash = createHash('sha256').update(plaintext).digest('hex');
      const foundByHash = await repo.findByKeyHash(computedHash);
      expect(foundByHash).toBeNull();
    });

    it('should reject deletion by non-owner', async () => {
      const { apiKey } = await createApiKey(repo as unknown as ApiKeyRepository, 'user-owner', {
        name: 'Owner Key',
      });

      await expect(
        deleteApiKey(repo as unknown as ApiKeyRepository, 'user-other', apiKey.id),
      ).rejects.toThrow('API key not found');
    });
  });

  // ==========================================================================
  // Listing Keys
  // ==========================================================================

  describe('listing keys', () => {
    it('should list all keys for a user', async () => {
      const userId = 'user-list-1';

      await createApiKey(repo as unknown as ApiKeyRepository, userId, { name: 'Key 1' });
      await createApiKey(repo as unknown as ApiKeyRepository, userId, { name: 'Key 2' });
      await createApiKey(repo as unknown as ApiKeyRepository, 'other-user', { name: 'Other Key' });

      const keys = await listApiKeys(repo as unknown as ApiKeyRepository, userId);

      expect(keys).toHaveLength(2);
      expect(keys.every((k) => k.userId === userId)).toBe(true);
    });
  });
});
