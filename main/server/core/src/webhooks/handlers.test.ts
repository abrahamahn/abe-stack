// main/server/core/src/webhooks/handlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    handleCreateWebhook,
    handleDeleteWebhook,
    handleGetWebhook,
    handleListWebhooks,
    handleRotateSecret,
    handleUpdateWebhook,
} from './handlers';

import type { WebhooksModuleDeps, WebhooksRequest } from './types';
import type { DbClient, Repositories } from '../../../db/src';

// ============================================================================
// Mocks
// ============================================================================

const {
  mockCreateWebhook,
  mockListWebhooks,
  mockGetWebhook,
  mockUpdateWebhook,
  mockDeleteWebhook,
  mockRotateWebhookSecret,
} = vi.hoisted(() => ({
  mockCreateWebhook: vi.fn(),
  mockListWebhooks: vi.fn(),
  mockGetWebhook: vi.fn(),
  mockUpdateWebhook: vi.fn(),
  mockDeleteWebhook: vi.fn(),
  mockRotateWebhookSecret: vi.fn(),
}));

vi.mock('./service', () => ({
  createWebhook: mockCreateWebhook,
  listWebhooks: mockListWebhooks,
  getWebhook: mockGetWebhook,
  updateWebhook: mockUpdateWebhook,
  deleteWebhook: mockDeleteWebhook,
  rotateWebhookSecret: mockRotateWebhookSecret,
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDeps(): WebhooksModuleDeps {
  return {
    db: {} as DbClient,
    repos: {} as Repositories,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    },
  } as unknown as WebhooksModuleDeps;
}

function createMockRequest(user?: { userId: string }): WebhooksRequest {
  return {
    user,
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    cookies: {},
    headers: {},
  } as WebhooksRequest;
}

// ============================================================================
// handleCreateWebhook
// ============================================================================

describe('handleCreateWebhook', () => {
  let deps: WebhooksModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleCreateWebhook(
      deps,
      'tenant-1',
      { url: 'https://example.com/hook', events: ['user.created'] },
      request,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 201 on success', async () => {
    const webhook = {
      id: 'wh-1',
      url: 'https://example.com/hook',
      events: ['user.created'],
    };
    mockCreateWebhook.mockResolvedValue(webhook);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleCreateWebhook(
      deps,
      'tenant-1',
      { url: 'https://example.com/hook', events: ['user.created'] },
      request,
    );

    expect(result.status).toBe(201);
    expect(result.body).toEqual(webhook);
    expect(mockCreateWebhook).toHaveBeenCalledWith(deps.repos, 'tenant-1', 'user-1', {
      url: 'https://example.com/hook',
      events: ['user.created'],
    });
  });

  it('should return 500 on service error', async () => {
    mockCreateWebhook.mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleCreateWebhook(
      deps,
      'tenant-1',
      { url: 'https://example.com/hook', events: ['user.created'] },
      request,
    );

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleListWebhooks
// ============================================================================

describe('handleListWebhooks', () => {
  let deps: WebhooksModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListWebhooks(deps, 'tenant-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with webhooks list', async () => {
    const webhooks = [{ id: 'wh-1', url: 'https://example.com/hook' }];
    mockListWebhooks.mockResolvedValue(webhooks);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListWebhooks(deps, 'tenant-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(webhooks);
    expect(mockListWebhooks).toHaveBeenCalledWith(deps.repos, 'tenant-1');
  });

  it('should return 500 on service error', async () => {
    mockListWebhooks.mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleListWebhooks(deps, 'tenant-1', request);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Internal server error' });
    expect(deps.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleGetWebhook
// ============================================================================

describe('handleGetWebhook', () => {
  let deps: WebhooksModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleGetWebhook(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with webhook data', async () => {
    const webhook = { id: 'wh-1', url: 'https://example.com/hook', recentDeliveries: [] };
    mockGetWebhook.mockResolvedValue(webhook);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleGetWebhook(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(webhook);
    expect(mockGetWebhook).toHaveBeenCalledWith(deps.repos, 'wh-1', 'tenant-1');
  });

  it('should return 404 when webhook not found', async () => {
    const notFoundError = new Error('Webhook not found');
    notFoundError.name = 'NotFoundError';
    mockGetWebhook.mockRejectedValue(notFoundError);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleGetWebhook(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Webhook not found' });
  });
});

// ============================================================================
// handleUpdateWebhook
// ============================================================================

describe('handleUpdateWebhook', () => {
  let deps: WebhooksModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleUpdateWebhook(
      deps,
      'tenant-1',
      'wh-1',
      { url: 'https://new.com/hook' },
      request,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with updated webhook', async () => {
    const updated = { id: 'wh-1', url: 'https://new.com/hook' };
    mockUpdateWebhook.mockResolvedValue(updated);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleUpdateWebhook(
      deps,
      'tenant-1',
      'wh-1',
      { url: 'https://new.com/hook' },
      request,
    );

    expect(result.status).toBe(200);
    expect(result.body).toEqual(updated);
    expect(mockUpdateWebhook).toHaveBeenCalledWith(deps.repos, 'wh-1', 'tenant-1', {
      url: 'https://new.com/hook',
    });
  });

  it('should return 404 when webhook not found', async () => {
    mockUpdateWebhook.mockRejectedValue(new Error('Webhook not found'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleUpdateWebhook(
      deps,
      'tenant-1',
      'wh-1',
      { url: 'https://new.com/hook' },
      request,
    );

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Webhook not found' });
  });
});

// ============================================================================
// handleDeleteWebhook
// ============================================================================

describe('handleDeleteWebhook', () => {
  let deps: WebhooksModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleDeleteWebhook(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with success message', async () => {
    mockDeleteWebhook.mockResolvedValue(undefined);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleDeleteWebhook(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Webhook deleted' });
    expect(mockDeleteWebhook).toHaveBeenCalledWith(deps.repos, 'wh-1', 'tenant-1');
  });

  it('should return 404 when webhook not found', async () => {
    mockDeleteWebhook.mockRejectedValue(new Error('Webhook not found'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleDeleteWebhook(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Webhook not found' });
  });
});

// ============================================================================
// handleRotateSecret
// ============================================================================

describe('handleRotateSecret', () => {
  let deps: WebhooksModuleDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createMockDeps();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleRotateSecret(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with rotated webhook', async () => {
    const rotated = { id: 'wh-1', secret: 'new-secret-value' };
    mockRotateWebhookSecret.mockResolvedValue(rotated);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleRotateSecret(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(200);
    expect(result.body).toEqual(rotated);
    expect(mockRotateWebhookSecret).toHaveBeenCalledWith(deps.repos, 'wh-1', 'tenant-1');
  });

  it('should return 404 when webhook not found', async () => {
    mockRotateWebhookSecret.mockRejectedValue(new Error('Webhook not found'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleRotateSecret(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Webhook not found' });
  });

  it('should return 500 on unexpected error', async () => {
    mockRotateWebhookSecret.mockRejectedValue(new Error('Unexpected DB error'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await handleRotateSecret(deps, 'tenant-1', 'wh-1', request);

    expect(result.status).toBe(500);
    expect(deps.log.error).toHaveBeenCalled();
  });
});
