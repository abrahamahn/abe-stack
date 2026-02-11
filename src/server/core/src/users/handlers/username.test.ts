// src/server/core/src/users/handlers/username.test.ts
import { BadRequestError, ConflictError, NotFoundError } from '@abe-stack/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleUpdateUsername } from './username';

import type { UsersRequest } from '../types';
import type { HandlerContext } from '@abe-stack/server-engine';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): HandlerContext {
  return {
    repos: {
      users: {
        findById: vi.fn(),
        findByUsername: vi.fn(),
        update: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      child: vi.fn(),
    },
  } as unknown as HandlerContext;
}

function createMockRequest(user?: { userId: string }): UsersRequest {
  return {
    user,
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'test' },
    cookies: {},
    headers: {},
  } as UsersRequest;
}

function getMockRepos(ctx: HandlerContext) {
  return (
    ctx as unknown as {
      repos: {
        users: {
          findById: ReturnType<typeof vi.fn>;
          findByUsername: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
      };
    }
  ).repos.users;
}

function getMockLog(ctx: HandlerContext) {
  return (ctx as unknown as { log: { error: ReturnType<typeof vi.fn> } }).log;
}

type UsernameHandlerResult = { status: number; body: unknown };

async function callHandleUpdateUsername(
  ctx: HandlerContext,
  username: string,
  request: UsersRequest,
): Promise<UsernameHandlerResult> {
  return (await handleUpdateUsername(ctx, { username }, request)) as UsernameHandlerResult;
}

// ============================================================================
// handleUpdateUsername
// ============================================================================

describe('handleUpdateUsername', () => {
  let ctx: HandlerContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await callHandleUpdateUsername(ctx, 'admin', request);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 404 when user not found', async () => {
    getMockRepos(ctx).findById.mockResolvedValue(null);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'myname', request);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'User not found' });
  });

  it('should return 429 when cooldown is active', async () => {
    const recentChange = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: recentChange,
    });
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(429);
    const body = result.body as { message: string };
    expect(body.message).toContain('Username can only be changed once every 30 days');
  });

  it('should include next allowed date in 429 response', async () => {
    const recentChange = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: recentChange,
    });
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    const body = result.body as { message: string };
    // The message should contain an ISO date string
    expect(body.message).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should return 400 for reserved username', async () => {
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: null,
    });
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'admin', request);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'This username is reserved' });
  });

  it('should return 400 when same as current username', async () => {
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'myname',
      lastUsernameChange: null,
    });
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'myname', request);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'New username is the same as current username' });
  });

  it('should return 409 when username already taken', async () => {
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: null,
    });
    getMockRepos(ctx).findByUsername.mockResolvedValue({ id: 'user-2', username: 'newname' });
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ message: 'Username is already taken' });
  });

  it('should allow username if owned by the same user', async () => {
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: null,
    });
    // findByUsername returns the same user (edge case: case change or re-claim)
    getMockRepos(ctx).findByUsername.mockResolvedValue({ id: 'user-1', username: 'newname' });
    const updated = { id: 'user-1', username: 'newname' };
    getMockRepos(ctx).update.mockResolvedValue(updated);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(200);
  });

  it('should return 200 with username and nextChangeAllowedAt on success', async () => {
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: null,
    });
    getMockRepos(ctx).findByUsername.mockResolvedValue(null);
    getMockRepos(ctx).update.mockResolvedValue({ id: 'user-1', username: 'newname' });
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(200);
    const body = result.body as { username: string; nextChangeAllowedAt: string };
    expect(body.username).toBe('newname');
    expect(body.nextChangeAllowedAt).toBeDefined();
    expect(body.nextChangeAllowedAt).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('should call update with username and lastUsernameChange', async () => {
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: null,
    });
    getMockRepos(ctx).findByUsername.mockResolvedValue(null);
    getMockRepos(ctx).update.mockResolvedValue({ id: 'user-1', username: 'newname' });
    const request = createMockRequest({ userId: 'user-1' });

    await callHandleUpdateUsername(ctx, 'newname', request);

    expect(getMockRepos(ctx).update).toHaveBeenCalledWith('user-1', {
      username: 'newname',
      lastUsernameChange: expect.any(Date),
    });
  });

  it('should return 500 when update returns null', async () => {
    getMockRepos(ctx).findById.mockResolvedValue({
      id: 'user-1',
      username: 'oldname',
      lastUsernameChange: null,
    });
    getMockRepos(ctx).findByUsername.mockResolvedValue(null);
    getMockRepos(ctx).update.mockResolvedValue(null);
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Internal server error' });
  });

  it('should return 400 on BadRequestError', async () => {
    getMockRepos(ctx).findById.mockRejectedValue(new BadRequestError('Invalid input'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Invalid input' });
  });

  it('should return 404 on NotFoundError', async () => {
    getMockRepos(ctx).findById.mockRejectedValue(new NotFoundError('Not found'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(404);
    expect(result.body).toEqual({ message: 'Not found' });
  });

  it('should return 409 on ConflictError', async () => {
    getMockRepos(ctx).findById.mockRejectedValue(new ConflictError('Conflict'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ message: 'Conflict' });
  });

  it('should return 500 and log on unexpected error', async () => {
    getMockRepos(ctx).findById.mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ userId: 'user-1' });

    const result = await callHandleUpdateUsername(ctx, 'newname', request);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Internal server error' });
    expect(getMockLog(ctx).error).toHaveBeenCalled();
  });
});
