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
import { registerRouteMap } from '@bslt/server-system';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestJwt, createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@bslt/server-system';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
        id: `key-${counter}`,
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
});
