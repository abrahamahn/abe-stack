// main/server/core/src/api-keys/handlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleCreateApiKey,
  handleDeleteApiKey,
  handleListApiKeys,
  handleRevokeApiKey,
} from './handlers';

import type { ApiKeyAppContext } from './types';
import type { ApiKey } from '../../../db/src';
import type { HandlerContext, HttpReply, HttpRequest } from '../../../system/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): ApiKeyAppContext {
  return {
    db: {},
    repos: {
      apiKeys: {
        create: vi.fn(),
        findByKeyHash: vi.fn(),
        findById: vi.fn(),
        findByUserId: vi.fn(),
        findByTenantId: vi.fn(),
        update: vi.fn(),
        revoke: vi.fn(),
        updateLastUsed: vi.fn(),
        delete: vi.fn(),
      },
      auditEvents: {
        create: vi.fn(),
        findById: vi.fn(),
        find: vi.fn(),
        findRecent: vi.fn(),
        findByActorId: vi.fn(),
        findByTenantId: vi.fn(),
        findByAction: vi.fn(),
        findByResource: vi.fn(),
        deleteOlderThan: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    errorTracker: {
      captureError: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUserContext: vi.fn(),
    },
  };
}

function createMockApiKey(overrides?: Partial<ApiKey>): ApiKey {
  return {
    id: 'key-1',
    tenantId: null,
    userId: 'user-1',
    name: 'Test Key',
    keyPrefix: 'abcd1234',
    keyHash: 'hash-abc',
    scopes: [],
    lastUsedAt: null,
    expiresAt: null,
    revokedAt: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    updatedAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function createMockRequest(overrides?: {
  user?: { userId: string };
  params?: Record<string, string>;
  body?: unknown;
}): HttpRequest {
  return {
    user: overrides?.user,
    params: overrides?.params ?? {},
    body: overrides?.body,
    query: {},
  } as unknown as HttpRequest;
}

const mockReply = {} as HttpReply;

// ============================================================================
// handleCreateApiKey
// ============================================================================

describe('handleCreateApiKey', () => {
  let ctx: ApiKeyAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 400 when body is null', async () => {
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Request body is required' });
  });

  it('should return 400 when name is missing', async () => {
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      {},
      request,
      mockReply,
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Name is required' });
  });

  it('should return 400 when name is empty string', async () => {
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      { name: '  ' },
      request,
      mockReply,
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Name is required' });
  });

  it('should return 201 with apiKey response and plaintext', async () => {
    const mockKey = createMockApiKey();
    vi.mocked(ctx.repos.apiKeys.create).mockResolvedValue(mockKey);
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      { name: 'Production Key' },
      request,
      mockReply,
    );

    expect(result.status).toBe(201);
    const body = result.body as unknown as { apiKey: { id: string }; plaintext: string };
    expect(body.plaintext).toHaveLength(64);
    expect(body.apiKey.id).toBe('key-1');
  });

  it('should strip keyHash from response', async () => {
    vi.mocked(ctx.repos.apiKeys.create).mockResolvedValue(createMockApiKey());
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      { name: 'My Key' },
      request,
      mockReply,
    );

    const body = result.body as unknown as { apiKey: Record<string, unknown> };
    expect(body.apiKey).not.toHaveProperty('keyHash');
  });

  it('should convert dates to ISO strings in response', async () => {
    vi.mocked(ctx.repos.apiKeys.create).mockResolvedValue(
      createMockApiKey({ createdAt: new Date('2026-02-10T12:00:00Z') }),
    );
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      { name: 'My Key' },
      request,
      mockReply,
    );

    const body = result.body as unknown as { apiKey: { createdAt: string } };
    expect(body.apiKey.createdAt).toBe('2026-02-10T12:00:00.000Z');
  });

  it('should return 500 on service error', async () => {
    vi.mocked(ctx.repos.apiKeys.create).mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleCreateApiKey(
      ctx as unknown as HandlerContext,
      { name: 'My Key' },
      request,
      mockReply,
    );

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Failed to create API key' });
  });
});

// ============================================================================
// handleListApiKeys
// ============================================================================

describe('handleListApiKeys', () => {
  let ctx: ApiKeyAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListApiKeys(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(401);
  });

  it('should return 200 with apiKeys array', async () => {
    const keys = [createMockApiKey(), createMockApiKey({ id: 'key-2', name: 'Second Key' })];
    vi.mocked(ctx.repos.apiKeys.findByUserId).mockResolvedValue(keys);
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleListApiKeys(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(200);
    const body = result.body as unknown as { apiKeys: unknown[] };
    expect(body.apiKeys).toHaveLength(2);
  });

  it('should strip keyHash from each key', async () => {
    vi.mocked(ctx.repos.apiKeys.findByUserId).mockResolvedValue([createMockApiKey()]);
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleListApiKeys(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    const body = result.body as unknown as { apiKeys: Array<Record<string, unknown>> };
    expect(body.apiKeys.at(0)).not.toHaveProperty('keyHash');
  });

  it('should return 500 on service error', async () => {
    vi.mocked(ctx.repos.apiKeys.findByUserId).mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ user: { userId: 'user-1' } });

    const result = await handleListApiKeys(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Failed to list API keys' });
  });
});

// ============================================================================
// handleRevokeApiKey
// ============================================================================

describe('handleRevokeApiKey', () => {
  let ctx: ApiKeyAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest({ params: { id: 'key-1' } });

    const result = await handleRevokeApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(401);
  });

  it('should return 404 when id param missing', async () => {
    const request = createMockRequest({ user: { userId: 'user-1' }, params: {} });

    const result = await handleRevokeApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'API key not found' });
  });

  it('should return 404 when key not found', async () => {
    vi.mocked(ctx.repos.apiKeys.findById).mockResolvedValue(null);
    const request = createMockRequest({ user: { userId: 'user-1' }, params: { id: 'key-1' } });

    const result = await handleRevokeApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'API key not found' });
  });

  it('should return 400 when key already revoked', async () => {
    vi.mocked(ctx.repos.apiKeys.findById).mockResolvedValue(
      createMockApiKey({ userId: 'user-1', revokedAt: new Date() }),
    );
    const request = createMockRequest({ user: { userId: 'user-1' }, params: { id: 'key-1' } });

    const result = await handleRevokeApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'API key is already revoked' });
  });

  it('should return 200 with revoked key', async () => {
    const revokedKey = createMockApiKey({ userId: 'user-1', revokedAt: new Date() });
    vi.mocked(ctx.repos.apiKeys.findById).mockResolvedValue(createMockApiKey({ userId: 'user-1' }));
    vi.mocked(ctx.repos.apiKeys.revoke).mockResolvedValue(revokedKey);
    const request = createMockRequest({ user: { userId: 'user-1' }, params: { id: 'key-1' } });

    const result = await handleRevokeApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(200);
    const body = result.body as unknown as { apiKey: Record<string, unknown> };
    expect(body.apiKey).not.toHaveProperty('keyHash');
  });
});

// ============================================================================
// handleDeleteApiKey
// ============================================================================

describe('handleDeleteApiKey', () => {
  let ctx: ApiKeyAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest({ params: { id: 'key-1' } });

    const result = await handleDeleteApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(401);
  });

  it('should return 404 when id param missing', async () => {
    const request = createMockRequest({ user: { userId: 'user-1' }, params: {} });

    const result = await handleDeleteApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(404);
  });

  it('should return 404 when key not found', async () => {
    vi.mocked(ctx.repos.apiKeys.findById).mockResolvedValue(null);
    const request = createMockRequest({ user: { userId: 'user-1' }, params: { id: 'key-1' } });

    const result = await handleDeleteApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'API key not found' });
  });

  it('should return 200 with success message', async () => {
    vi.mocked(ctx.repos.apiKeys.findById).mockResolvedValue(createMockApiKey({ userId: 'user-1' }));
    vi.mocked(ctx.repos.apiKeys.delete).mockResolvedValue(true);
    const request = createMockRequest({ user: { userId: 'user-1' }, params: { id: 'key-1' } });

    const result = await handleDeleteApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'API key deleted' });
  });

  it('should return 500 on unexpected service error', async () => {
    vi.mocked(ctx.repos.apiKeys.findById).mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ user: { userId: 'user-1' }, params: { id: 'key-1' } });

    const result = await handleDeleteApiKey(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Failed to delete API key' });
  });
});
