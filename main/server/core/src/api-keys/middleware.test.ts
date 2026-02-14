// main/server/core/src/api-keys/middleware.test.ts
import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createApiKeyAuthMiddleware, createScopeGuard, getApiKeyContext } from './middleware';

import type { ApiKeyAuthenticatedRequest } from './middleware';
import type { ApiKey, ApiKeyRepository } from '../../../db/src';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockRepo(): ApiKeyRepository {
  return {
    create: vi.fn(),
    findByKeyHash: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByTenantId: vi.fn(),
    update: vi.fn(),
    revoke: vi.fn(),
    updateLastUsed: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn(),
  };
}

function createMockApiKey(overrides?: Partial<ApiKey>): ApiKey {
  const plaintext = 'a'.repeat(64);
  const keyHash = createHash('sha256').update(plaintext).digest('hex');

  return {
    id: 'key-1',
    tenantId: null,
    userId: 'user-1',
    name: 'Test Key',
    keyPrefix: plaintext.slice(0, 8),
    keyHash,
    scopes: [],
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

/** The known plaintext that matches createMockApiKey's default hash */
const VALID_TOKEN = 'a'.repeat(64);

function createMockRequest(headers: Record<string, string | undefined>): FastifyRequest {
  return {
    headers,
  } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply & { _statusCode: number; _body: unknown } {
  const reply = {
    _statusCode: 200,
    _body: undefined as unknown,
    code(status: number) {
      reply._statusCode = status;
      return reply;
    },
    send(body: unknown) {
      reply._body = body;
      return reply;
    },
  };
  return reply as unknown as FastifyReply & { _statusCode: number; _body: unknown };
}

// ============================================================================
// createApiKeyAuthMiddleware
// ============================================================================

describe('createApiKeyAuthMiddleware', () => {
  let repo: ApiKeyRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockRepo();
  });

  it('should skip when no Authorization header is present', async () => {
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({});
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(200); // unchanged
    expect(repo.findByKeyHash).not.toHaveBeenCalled();
  });

  it('should skip when Authorization header is not Bearer', async () => {
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: 'Basic abc123' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(200);
    expect(repo.findByKeyHash).not.toHaveBeenCalled();
  });

  it('should skip when Bearer token is empty', async () => {
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: 'Bearer ' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(200);
    expect(repo.findByKeyHash).not.toHaveBeenCalled();
  });

  it('should return 401 when key is not found', async () => {
    vi.mocked(repo.findByKeyHash).mockResolvedValue(null);
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: 'Bearer invalidkey123' });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(401);
    expect(reply._body).toEqual({ message: 'Invalid API key' });
  });

  it('should return 401 when key is expired', async () => {
    const expiredKey = createMockApiKey({
      expiresAt: new Date('2020-01-01T00:00:00Z'),
    });
    vi.mocked(repo.findByKeyHash).mockResolvedValue(expiredKey);
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: `Bearer ${VALID_TOKEN}` });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(401);
    expect(reply._body).toEqual({ message: 'API key has expired' });
  });

  it('should attach apiKeyContext for a valid key', async () => {
    const validKey = createMockApiKey({
      scopes: ['read', 'write'],
      tenantId: 'tenant-1',
    });
    vi.mocked(repo.findByKeyHash).mockResolvedValue(validKey);
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: `Bearer ${VALID_TOKEN}` });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(reply._statusCode).toBe(200); // no error sent
    const ctx = (request as ApiKeyAuthenticatedRequest).apiKeyContext;
    expect(ctx).toEqual({
      keyId: 'key-1',
      userId: 'user-1',
      tenantId: 'tenant-1',
      scopes: ['read', 'write'],
    });
  });

  it('should attach user object for downstream handlers', async () => {
    const validKey = createMockApiKey();
    vi.mocked(repo.findByKeyHash).mockResolvedValue(validKey);
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: `Bearer ${VALID_TOKEN}` });
    const reply = createMockReply();

    await middleware(request, reply);

    const user = (request as FastifyRequest & { user?: { userId: string } }).user;
    expect(user).toEqual({ userId: 'user-1' });
  });

  it('should call updateLastUsed for a valid key', async () => {
    const validKey = createMockApiKey();
    vi.mocked(repo.findByKeyHash).mockResolvedValue(validKey);
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: `Bearer ${VALID_TOKEN}` });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(repo.updateLastUsed).toHaveBeenCalledWith('key-1');
  });

  it('should not fail when updateLastUsed rejects', async () => {
    const validKey = createMockApiKey();
    vi.mocked(repo.findByKeyHash).mockResolvedValue(validKey);
    vi.mocked(repo.updateLastUsed).mockRejectedValue(new Error('DB error'));
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const request = createMockRequest({ authorization: `Bearer ${VALID_TOKEN}` });
    const reply = createMockReply();

    // Should not throw
    await middleware(request, reply);

    expect(reply._statusCode).toBe(200);
    const ctx = (request as ApiKeyAuthenticatedRequest).apiKeyContext;
    expect(ctx).toBeDefined();
  });

  it('should hash the token and look up by hash', async () => {
    vi.mocked(repo.findByKeyHash).mockResolvedValue(null);
    const middleware = createApiKeyAuthMiddleware({ apiKeys: repo });
    const token = 'mytesttoken';
    const expectedHash = createHash('sha256').update(token).digest('hex');
    const request = createMockRequest({ authorization: `Bearer ${token}` });
    const reply = createMockReply();

    await middleware(request, reply);

    expect(repo.findByKeyHash).toHaveBeenCalledWith(expectedHash);
  });
});

// ============================================================================
// createScopeGuard
// ============================================================================

describe('createScopeGuard', () => {
  it('should pass when request has no apiKeyContext (JWT auth)', async () => {
    const guard = createScopeGuard('read');
    const request = createMockRequest({});
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200); // unchanged
  });

  it('should pass when key has no scopes (full access)', async () => {
    const guard = createScopeGuard('read');
    const request = createMockRequest({}) as ApiKeyAuthenticatedRequest;
    request.apiKeyContext = {
      keyId: 'key-1',
      userId: 'user-1',
      tenantId: null,
      scopes: [],
    };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
  });

  it('should pass when key has the required scope', async () => {
    const guard = createScopeGuard('read');
    const request = createMockRequest({}) as ApiKeyAuthenticatedRequest;
    request.apiKeyContext = {
      keyId: 'key-1',
      userId: 'user-1',
      tenantId: null,
      scopes: ['read', 'write'],
    };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(200);
  });

  it('should return 403 when key lacks the required scope', async () => {
    const guard = createScopeGuard('admin');
    const request = createMockRequest({}) as ApiKeyAuthenticatedRequest;
    request.apiKeyContext = {
      keyId: 'key-1',
      userId: 'user-1',
      tenantId: null,
      scopes: ['read', 'write'],
    };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(403);
    expect(reply._body).toEqual({
      message: 'API key lacks required scope: admin',
      code: 'INSUFFICIENT_SCOPE',
    });
  });

  it('should check the exact scope string', async () => {
    const guard = createScopeGuard('write');
    const request = createMockRequest({}) as ApiKeyAuthenticatedRequest;
    request.apiKeyContext = {
      keyId: 'key-1',
      userId: 'user-1',
      tenantId: null,
      scopes: ['read'],
    };
    const reply = createMockReply();

    await guard(request, reply);

    expect(reply._statusCode).toBe(403);
  });
});

// ============================================================================
// getApiKeyContext
// ============================================================================

describe('getApiKeyContext', () => {
  it('should return apiKeyContext when present', () => {
    const request = createMockRequest({}) as ApiKeyAuthenticatedRequest;
    request.apiKeyContext = {
      keyId: 'key-1',
      userId: 'user-1',
      tenantId: null,
      scopes: ['read'],
    };

    const ctx = getApiKeyContext(request);
    expect(ctx).toEqual({
      keyId: 'key-1',
      userId: 'user-1',
      tenantId: null,
      scopes: ['read'],
    });
  });

  it('should return undefined when context is not set', () => {
    const request = createMockRequest({});

    const ctx = getApiKeyContext(request);
    expect(ctx).toBeUndefined();
  });
});
