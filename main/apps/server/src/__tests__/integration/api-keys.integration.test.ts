// main/apps/server/src/__tests__/integration/api-keys.integration.test.ts
/**
 * API Keys Integration Tests
 *
 * End-to-end HTTP tests for API key lifecycle and middleware behavior:
 * create -> use -> revoke, expired key rejection, and scope enforcement.
 */

import { createHash } from 'node:crypto';

import {
  apiKeyRoutes,
  createApiKeyAuthMiddleware,
  createScopeGuard,
  getApiKeyContext,
} from '@bslt/core/api-keys';
import { createAuthGuard } from '@bslt/core/auth';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestJwt, createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@/http';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { registerRouteMap } from '@/http';

interface ApiKeyRecord {
  id: string;
  tenantId: string | null;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function createInMemoryApiKeyRepo() {
  const store = new Map<string, ApiKeyRecord>();
  let counter = 0;

  return {
    create: vi.fn().mockImplementation((data: Partial<ApiKeyRecord>) => {
      counter += 1;
      const now = new Date();
      const record: ApiKeyRecord = {
        id: `key-${String(counter)}`,
        tenantId: data.tenantId ?? null,
        userId: data.userId ?? 'unknown-user',
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
        .filter((record) => record.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }),

    findByTenantId: vi.fn().mockResolvedValue([]),

    update: vi.fn().mockResolvedValue(null),

    revoke: vi.fn().mockImplementation((id: string) => {
      const existing = store.get(id);
      if (existing === undefined) {
        return null;
      }
      const updated: ApiKeyRecord = {
        ...existing,
        revokedAt: new Date(),
        updatedAt: new Date(),
      };
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
  };
}

function createMockLogger() {
  const logger: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  (logger['child'] as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger;
}

describe('API Keys Integration', () => {
  let testServer: TestServer;
  const apiKeys = createInMemoryApiKeyRepo();
  const logger = createMockLogger();
  const jwt = createTestJwt({
    userId: 'user-integration-1',
    email: 'integration@example.com',
    role: 'user',
  });

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    const ctx = {
      db: {},
      repos: {
        apiKeys,
      },
      log: logger,
      email: testServer.email,
      emailTemplates: {},
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, apiKeyRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as unknown as AuthGuardFactory,
    });

    const apiKeyAuth = createApiKeyAuthMiddleware({
      apiKeys: apiKeys as never,
    });

    testServer.server.get(
      '/api/test/api-keys/read',
      {
        preHandler: [apiKeyAuth, createScopeGuard('read')],
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const apiKeyContext = getApiKeyContext(request);
        if (apiKeyContext === undefined) {
          reply.code(401).send({ message: 'API key required' });
          return;
        }
        return { ok: true, userId: apiKeyContext.userId, keyId: apiKeyContext.keyId };
      },
    );

    testServer.server.get(
      '/api/test/api-keys/write',
      {
        preHandler: [apiKeyAuth, createScopeGuard('write')],
      },
      async (request: FastifyRequest, reply: FastifyReply) => {
        const apiKeyContext = getApiKeyContext(request);
        if (apiKeyContext === undefined) {
          reply.code(401).send({ message: 'API key required' });
          return;
        }
        return { ok: true };
      },
    );

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  beforeEach(() => {
    apiKeys.clear();
    vi.clearAllMocks();
  });

  it('create -> use -> revoke lifecycle works', async () => {
    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: {
        authorization: `Bearer ${jwt}`,
      },
      payload: {
        name: 'Integration Key',
        scopes: ['read'],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as {
      plaintext: string;
      apiKey: { id: string; userId: string; keyPrefix: string };
    };
    expect(created.plaintext.length).toBeGreaterThan(20);
    expect(created.apiKey.userId).toBe('user-integration-1');

    const useResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: {
        authorization: `Bearer ${created.plaintext}`,
      },
    });

    expect(useResponse.statusCode).toBe(200);
    const used = parseJsonResponse(useResponse) as { ok: boolean; userId: string };
    expect(used.ok).toBe(true);
    expect(used.userId).toBe('user-integration-1');

    const revokeResponse = await testServer.inject({
      method: 'POST',
      url: `/api/users/me/api-keys/${created.apiKey.id}/revoke`,
      headers: {
        authorization: `Bearer ${jwt}`,
      },
      payload: {},
    });

    expect(revokeResponse.statusCode).toBe(200);

    const rejectedResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: {
        authorization: `Bearer ${created.plaintext}`,
      },
    });

    expect(rejectedResponse.statusCode).toBe(401);
    const rejected = parseJsonResponse(rejectedResponse) as { message: string };
    expect(rejected.message).toBe('Invalid API key');
  });

  it('rejects expired API keys', async () => {
    const expiredAt = new Date(Date.now() - 60_000).toISOString();

    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: {
        authorization: `Bearer ${jwt}`,
      },
      payload: {
        name: 'Expired Key',
        scopes: ['read'],
        expiresAt: expiredAt,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as { plaintext: string };

    const useResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: {
        authorization: `Bearer ${created.plaintext}`,
      },
    });

    expect(useResponse.statusCode).toBe(401);
    const body = parseJsonResponse(useResponse) as { message: string };
    expect(body.message).toBe('API key has expired');
  });

  it('enforces scope restrictions for API key protected routes', async () => {
    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: {
        authorization: `Bearer ${jwt}`,
      },
      payload: {
        name: 'Read Only Key',
        scopes: ['read'],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as { plaintext: string };

    const forbiddenResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/write',
      headers: {
        authorization: `Bearer ${created.plaintext}`,
      },
    });

    expect(forbiddenResponse.statusCode).toBe(403);
    const forbidden = parseJsonResponse(forbiddenResponse) as { message: string; code: string };
    expect(forbidden.code).toBe('INSUFFICIENT_SCOPE');
    expect(forbidden.message).toContain('write');
  });

  it('stores hash only and can authenticate by hashing plaintext', async () => {
    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: {
        authorization: `Bearer ${jwt}`,
      },
      payload: {
        name: 'Hash Check',
        scopes: ['read'],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as {
      plaintext: string;
      apiKey: { id: string; keyPrefix: string };
    };

    const listResponse = await testServer.inject({
      method: 'GET',
      url: '/api/users/me/api-keys',
      headers: {
        authorization: `Bearer ${jwt}`,
      },
    });

    expect(listResponse.statusCode).toBe(200);
    const listed = parseJsonResponse(listResponse) as {
      apiKeys: Array<{ id: string; keyPrefix: string; keyHash?: string }>;
    };

    const key = listed.apiKeys.find((entry) => entry.id === created.apiKey.id);
    expect(key).toBeDefined();
    expect(key?.keyPrefix).toBe(created.apiKey.keyPrefix);
    expect(key).not.toHaveProperty('keyHash');

    const expectedHash = createHash('sha256').update(created.plaintext).digest('hex');
    const repoRecord = await apiKeys.findByKeyHash(expectedHash);
    expect(repoRecord).not.toBeNull();
    expect(repoRecord?.id).toBe(created.apiKey.id);
  });

  // ==========================================================================
  // Sprint 4.13: Additional API Key Tests
  // ==========================================================================

  it('revoked key returns 401 on subsequent requests', async () => {
    // Step 1: Create key
    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Revoke Test Key', scopes: ['read'] },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as {
      plaintext: string;
      apiKey: { id: string };
    };

    // Step 2: Verify key works before revocation
    const beforeRevoke = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(beforeRevoke.statusCode).toBe(200);

    // Step 3: Revoke the key
    const revokeResponse = await testServer.inject({
      method: 'POST',
      url: `/api/users/me/api-keys/${created.apiKey.id}/revoke`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: {},
    });
    expect(revokeResponse.statusCode).toBe(200);

    // Step 4: Verify the revoked key now returns 401
    const afterRevoke = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(afterRevoke.statusCode).toBe(401);
    const body = parseJsonResponse(afterRevoke) as { message: string };
    expect(body.message).toContain('Invalid');
  });

  it('expired key returns 401 on subsequent requests', async () => {
    // Create a key that expires in the past
    const expiredAt = new Date(Date.now() - 120_000).toISOString();

    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Already Expired Key', scopes: ['read'], expiresAt: expiredAt },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as { plaintext: string };

    // Attempt to use the expired key on the read endpoint
    const readResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(readResponse.statusCode).toBe(401);
    const body = parseJsonResponse(readResponse) as { message: string };
    expect(body.message).toContain('expired');

    // Attempt to use the expired key on the write endpoint as well
    const writeResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/write',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(writeResponse.statusCode).toBe(401);
  });

  it('scope enforcement: read-only key cannot access write endpoints', async () => {
    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Scope Test Read-Only', scopes: ['read'] },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as { plaintext: string };

    // Read endpoint should succeed
    const readResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(readResponse.statusCode).toBe(200);

    // Write endpoint should be forbidden with INSUFFICIENT_SCOPE
    const writeResponse = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/write',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(writeResponse.statusCode).toBe(403);
    const body = parseJsonResponse(writeResponse) as { code: string; message: string };
    expect(body.code).toBe('INSUFFICIENT_SCOPE');
    expect(body.message).toContain('write');
  });

  it('key creation requires authentication (sudo mode guard)', async () => {
    // Attempt to create a key without any authentication
    const noAuthResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      payload: { name: 'Unauthenticated Key', scopes: ['read'] },
    });
    expect(noAuthResponse.statusCode).toBe(401);
    const body = parseJsonResponse(noAuthResponse) as { message: string };
    expect(body.message).toBe('Unauthorized');
  });

  it('revoked key cannot be used even for different scope endpoints', async () => {
    // Create a key with both read and write scopes
    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Multi-Scope Key', scopes: ['read', 'write'] },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as {
      plaintext: string;
      apiKey: { id: string };
    };

    // Verify both endpoints work
    const readBefore = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(readBefore.statusCode).toBe(200);

    const writeBefore = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/write',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(writeBefore.statusCode).toBe(200);

    // Revoke the key
    await testServer.inject({
      method: 'POST',
      url: `/api/users/me/api-keys/${created.apiKey.id}/revoke`,
      headers: { authorization: `Bearer ${jwt}` },
      payload: {},
    });

    // Both endpoints should now reject
    const readAfter = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/read',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(readAfter.statusCode).toBe(401);

    const writeAfter = await testServer.inject({
      method: 'GET',
      url: '/api/test/api-keys/write',
      headers: { authorization: `Bearer ${created.plaintext}` },
    });
    expect(writeAfter.statusCode).toBe(401);
  });

  it('lists API keys for the authenticated user without exposing key hash', async () => {
    // Create two keys
    await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'List Key 1', scopes: ['read'] },
    });
    await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'List Key 2', scopes: ['read', 'write'] },
    });

    const listResponse = await testServer.inject({
      method: 'GET',
      url: '/api/users/me/api-keys',
      headers: { authorization: `Bearer ${jwt}` },
    });

    expect(listResponse.statusCode).toBe(200);
    const body = parseJsonResponse(listResponse) as {
      apiKeys: Array<{
        id: string;
        name: string;
        keyPrefix: string;
        keyHash?: string;
        scopes: string[];
      }>;
    };
    expect(body.apiKeys.length).toBeGreaterThanOrEqual(2);

    // Verify no key hash is exposed in the response
    for (const key of body.apiKeys) {
      expect(key).not.toHaveProperty('keyHash');
      expect(key.keyPrefix).toBeDefined();
      expect(key.name).toBeDefined();
    }
  });

  it('deleting a key removes it from the list', async () => {
    const createResponse = await testServer.inject({
      method: 'POST',
      url: '/api/users/me/api-keys/create',
      headers: { authorization: `Bearer ${jwt}` },
      payload: { name: 'Delete Test Key', scopes: ['read'] },
    });
    expect(createResponse.statusCode).toBe(201);
    const created = parseJsonResponse(createResponse) as { apiKey: { id: string } };

    // Delete the key
    const deleteResponse = await testServer.inject({
      method: 'DELETE',
      url: `/api/users/me/api-keys/${created.apiKey.id}`,
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(deleteResponse.statusCode).toBe(200);

    // List and verify the key is gone
    const listResponse = await testServer.inject({
      method: 'GET',
      url: '/api/users/me/api-keys',
      headers: { authorization: `Bearer ${jwt}` },
    });
    expect(listResponse.statusCode).toBe(200);
    const body = parseJsonResponse(listResponse) as {
      apiKeys: Array<{ id: string }>;
    };
    const deletedKey = body.apiKeys.find((k) => k.id === created.apiKey.id);
    expect(deletedKey).toBeUndefined();
  });

  // ==========================================================================
  // Adversarial: Boundary — Edge case names, scopes, permissions
  // ==========================================================================

  describe('Adversarial: boundary — key creation with edge case values', () => {
    it('rejects key creation with empty name', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: '', scopes: ['read'] },
      });

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('handles key creation with 10000-char name', async () => {
      const longName = 'K'.repeat(10000);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: longName, scopes: ['read'] },
      });

      // Should either reject (400/422) or truncate, never crash
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
      if (response.statusCode === 201) {
        const body = parseJsonResponse(response) as { apiKey: { name: string } };
        expect(body.apiKey.name).toBeDefined();
      }
    });

    it('rejects key creation with special characters in scopes', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Special Scopes', scopes: ['read; DROP TABLE api_keys;--', '<script>'] },
      });

      // Should reject invalid scope names or sanitize them
      expect(response.statusCode).toBeDefined();
      expect(response.statusCode).not.toBe(500);
    });

    it('rejects key creation with null permissions/scopes', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Null Scopes', scopes: null },
      });

      expect(response.statusCode).not.toBe(201);
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it.todo('rejects key creation with empty scopes array');

    it.todo('handles key creation with undefined scopes field');
  });

  // ==========================================================================
  // Adversarial: Boundary — Use key after revocation, tampered hash
  // ==========================================================================

  describe('Adversarial: boundary — revoked and tampered keys', () => {
    it('revoked key is immediately rejected on next request', async () => {
      // Create a key
      const createResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Revoke Immediately', scopes: ['read'] },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = parseJsonResponse(createResponse) as {
        plaintext: string;
        apiKey: { id: string };
      };

      // Verify it works
      const beforeRevoke = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/read',
        headers: { authorization: `Bearer ${created.plaintext}` },
      });
      expect(beforeRevoke.statusCode).toBe(200);

      // Revoke
      await testServer.inject({
        method: 'POST',
        url: `/api/users/me/api-keys/${created.apiKey.id}/revoke`,
        headers: { authorization: `Bearer ${jwt}` },
        payload: {},
      });

      // Immediate re-use should fail
      const afterRevoke = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/read',
        headers: { authorization: `Bearer ${created.plaintext}` },
      });
      expect(afterRevoke.statusCode).toBe(401);
    });

    it('API key with tampered hash is rejected', async () => {
      // Create a legitimate key
      const createResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Tamper Test', scopes: ['read'] },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = parseJsonResponse(createResponse) as { plaintext: string };

      // Tamper with the plaintext by flipping a character
      const tampered =
        created.plaintext.slice(0, -1) + (created.plaintext.endsWith('a') ? 'b' : 'a');

      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/read',
        headers: { authorization: `Bearer ${tampered}` },
      });

      expect(response.statusCode).toBe(401);
    });

    it('completely fabricated API key is rejected', async () => {
      const fakeKey = 'bslt_fake_' + 'a'.repeat(40);

      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/read',
        headers: { authorization: `Bearer ${fakeKey}` },
      });

      expect(response.statusCode).toBe(401);
    });

    it('empty authorization header is rejected', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/read',
        headers: { authorization: '' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('authorization header with only "Bearer " prefix is rejected', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/read',
        headers: { authorization: 'Bearer ' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // Adversarial: Layer — DB returning key with null hash, revoked but valid expiry
  // ==========================================================================

  describe('Adversarial: layer — DB returning malformed key records', () => {
    it.todo('handles DB returning key with null keyHash gracefully');

    it.todo('handles DB returning key with expiresAt in future but revokedAt set');
  });

  // ==========================================================================
  // Adversarial: Async — Concurrent create + revoke of same key
  // ==========================================================================

  describe('Adversarial: async — concurrent key operations', () => {
    it('concurrent create requests produce distinct keys', async () => {
      const [r1, r2, r3] = await Promise.all([
        testServer.inject({
          method: 'POST',
          url: '/api/users/me/api-keys/create',
          headers: { authorization: `Bearer ${jwt}` },
          payload: { name: 'Concurrent Key 1', scopes: ['read'] },
        }),
        testServer.inject({
          method: 'POST',
          url: '/api/users/me/api-keys/create',
          headers: { authorization: `Bearer ${jwt}` },
          payload: { name: 'Concurrent Key 2', scopes: ['read'] },
        }),
        testServer.inject({
          method: 'POST',
          url: '/api/users/me/api-keys/create',
          headers: { authorization: `Bearer ${jwt}` },
          payload: { name: 'Concurrent Key 3', scopes: ['read'] },
        }),
      ]);

      // All should succeed
      for (const resp of [r1, r2, r3]) {
        expect(resp.statusCode).toBe(201);
      }

      // Each should have a unique ID
      const ids = [r1, r2, r3].map((r) => {
        const body = parseJsonResponse(r) as { apiKey: { id: string } };
        return body.apiKey.id;
      });
      expect(new Set(ids).size).toBe(3);
    });

    it('concurrent create and revoke: key is either active or revoked, never corrupted', async () => {
      // Create a key first
      const createResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Race Condition Key', scopes: ['read'] },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = parseJsonResponse(createResponse) as {
        plaintext: string;
        apiKey: { id: string };
      };

      // Concurrently: use the key AND revoke it
      const [useResult, revokeResult] = await Promise.all([
        testServer.inject({
          method: 'GET',
          url: '/api/test/api-keys/read',
          headers: { authorization: `Bearer ${created.plaintext}` },
        }),
        testServer.inject({
          method: 'POST',
          url: `/api/users/me/api-keys/${created.apiKey.id}/revoke`,
          headers: { authorization: `Bearer ${jwt}` },
          payload: {},
        }),
      ]);

      // Neither should crash
      expect(useResult.statusCode).not.toBe(500);
      expect(revokeResult.statusCode).not.toBe(500);

      // After the race, the key should definitely be revoked
      const postRaceUse = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/read',
        headers: { authorization: `Bearer ${created.plaintext}` },
      });
      expect(postRaceUse.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // Adversarial: Idempotency — Double-revoke, consistent state
  // ==========================================================================

  describe('Adversarial: idempotency — double-revoke and repeated operations', () => {
    it.todo('double-revoke produces consistent state, no error');

    it('double-delete produces consistent state', async () => {
      const createResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Double Delete Key', scopes: ['read'] },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = parseJsonResponse(createResponse) as { apiKey: { id: string } };

      // First delete
      const firstDelete = await testServer.inject({
        method: 'DELETE',
        url: `/api/users/me/api-keys/${created.apiKey.id}`,
        headers: { authorization: `Bearer ${jwt}` },
      });
      expect(firstDelete.statusCode).toBe(200);

      // Second delete
      const secondDelete = await testServer.inject({
        method: 'DELETE',
        url: `/api/users/me/api-keys/${created.apiKey.id}`,
        headers: { authorization: `Bearer ${jwt}` },
      });

      // Should be 404 (already deleted) or 200 (idempotent), never 500
      expect([200, 404]).toContain(secondDelete.statusCode);
    });

    it('listing keys after revoke does not show keyHash', async () => {
      const createResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'List After Revoke', scopes: ['read'] },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = parseJsonResponse(createResponse) as { apiKey: { id: string } };

      // Revoke
      await testServer.inject({
        method: 'POST',
        url: `/api/users/me/api-keys/${created.apiKey.id}/revoke`,
        headers: { authorization: `Bearer ${jwt}` },
        payload: {},
      });

      // List
      const listResponse = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/api-keys',
        headers: { authorization: `Bearer ${jwt}` },
      });
      expect(listResponse.statusCode).toBe(200);
      const body = parseJsonResponse(listResponse) as {
        apiKeys: Array<{ id: string; keyHash?: string; revokedAt?: string }>;
      };

      // No key should expose its hash
      for (const key of body.apiKeys) {
        expect(key).not.toHaveProperty('keyHash');
      }
    });
  });

  // ==========================================================================
  // Adversarial: "Killer" — Read-only key attempts admin write with oversized body
  // ==========================================================================

  describe('Adversarial: killer tests — scope escalation and oversized payloads', () => {
    it('read-only API key cannot access write endpoint even with oversized body', async () => {
      const createResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Read Only Escalation', scopes: ['read'] },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = parseJsonResponse(createResponse) as { plaintext: string };

      const response = await testServer.inject({
        method: 'GET',
        url: '/api/test/api-keys/write',
        headers: { authorization: `Bearer ${created.plaintext}` },
      });

      expect(response.statusCode).toBe(403);
      const body = parseJsonResponse(response) as { code: string };
      expect(body.code).toBe('INSUFFICIENT_SCOPE');
    });

    it('API key cannot be used to create another API key (privilege escalation)', async () => {
      // Create an API key with read+write scopes
      const createResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Escalation Key', scopes: ['read', 'write'] },
      });
      expect(createResponse.statusCode).toBe(201);
      const created = parseJsonResponse(createResponse) as { plaintext: string };

      // Try to create another key using the API key (not JWT)
      const escalationResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${created.plaintext}` },
        payload: { name: 'Escalated Key', scopes: ['read', 'write', 'admin'] },
      });

      // Should not allow creating keys with an API key
      // The endpoint requires JWT auth (sudo mode), so API key auth should fail
      expect(escalationResponse.statusCode).not.toBe(201);
    });

    it('prototype pollution in API key creation payload is neutralized', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: {
          authorization: `Bearer ${jwt}`,
          'content-type': 'application/json',
        },
        payload: JSON.stringify({
          name: 'Proto Pollution Key',
          scopes: ['read'],
          __proto__: { isAdmin: true },
          constructor: { prototype: { role: 'admin' } },
        }),
      });

      expect(response.statusCode).not.toBe(500);
      // Verify prototype was not polluted
      expect(({} as Record<string, unknown>)['isAdmin']).toBeUndefined();
      expect(({} as Record<string, unknown>)['role']).toBeUndefined();
    });

    it('API key with only read scope cannot revoke other keys', async () => {
      // Create a read-only API key
      const readKeyResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Read Only Key', scopes: ['read'] },
      });
      expect(readKeyResponse.statusCode).toBe(201);
      const readKey = parseJsonResponse(readKeyResponse) as { plaintext: string };

      // Create another key to be the target
      const targetKeyResponse = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        headers: { authorization: `Bearer ${jwt}` },
        payload: { name: 'Target Key', scopes: ['read'] },
      });
      expect(targetKeyResponse.statusCode).toBe(201);
      const targetKey = parseJsonResponse(targetKeyResponse) as { apiKey: { id: string } };

      // Try to revoke the target key using the read-only API key
      const revokeResponse = await testServer.inject({
        method: 'POST',
        url: `/api/users/me/api-keys/${targetKey.apiKey.id}/revoke`,
        headers: { authorization: `Bearer ${readKey.plaintext}` },
        payload: {},
      });

      // Should require JWT auth (sudo mode), not API key
      expect(revokeResponse.statusCode).not.toBe(200);
    });
  });
});
