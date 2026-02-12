// src/server/core/src/activities/handlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleListActivities, handleListTenantActivities } from './handlers';

import type { ActivityAppContext } from './types';
import type { Activity } from '@abe-stack/db';
import type { HandlerContext } from '@abe-stack/server-engine';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): ActivityAppContext {
  return {
    db: {},
    repos: {
      activities: {
        findById: vi.fn(),
        findRecent: vi.fn(),
        findByActorId: vi.fn(),
        findByTenantId: vi.fn(),
        findByResource: vi.fn(),
        create: vi.fn(),
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  };
}

function createMockActivity(overrides?: Partial<Activity>): Activity {
  return {
    id: 'act-1',
    tenantId: null,
    actorId: 'user-1',
    actorType: 'user',
    action: 'created',
    resourceType: 'project',
    resourceId: 'proj-1',
    description: null,
    metadata: {},
    ipAddress: null,
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function createMockRequest(overrides?: {
  user?: { userId: string };
  query?: Record<string, string>;
  params?: Record<string, string>;
}): FastifyRequest {
  return {
    user: overrides?.user,
    query: overrides?.query ?? {},
    params: overrides?.params ?? {},
  } as unknown as FastifyRequest;
}

const mockReply = {} as FastifyReply;

// ============================================================================
// handleListActivities
// ============================================================================

describe('handleListActivities', () => {
  let ctx: ActivityAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with activities mapped to response format', async () => {
    const activities = [
      createMockActivity(),
      createMockActivity({ id: 'act-2', description: 'Updated project' }),
    ];
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue(activities);

    const request = createMockRequest({ user: { userId: 'user-1' } });
    const result = await handleListActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(200);
    expect((result.body as { activities: unknown[] }).activities).toHaveLength(2);
  });

  it('should convert Date to ISO string in response', async () => {
    const activity = createMockActivity({ createdAt: new Date('2026-02-10T12:00:00Z') });
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue([activity]);

    const request = createMockRequest({ user: { userId: 'user-1' } });
    const result = await handleListActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    const body = result.body as { activities: Array<{ createdAt: string }> };
    expect(body.activities.at(0)?.createdAt).toBe('2026-02-10T12:00:00.000Z');
  });

  it('should handle string createdAt values from repository rows', async () => {
    const activity = createMockActivity({
      createdAt: '2026-02-10T12:00:00.000Z' as unknown as Date,
    });
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue([activity]);

    const request = createMockRequest({ user: { userId: 'user-1' } });
    const result = await handleListActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    const body = result.body as { activities: Array<{ createdAt: string }> };
    expect(body.activities.at(0)?.createdAt).toBe('2026-02-10T12:00:00.000Z');
  });

  it('should fall back when createdAt is invalid', async () => {
    const activity = createMockActivity({
      createdAt: 'not-a-date' as unknown as Date,
    });
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue([activity]);

    const request = createMockRequest({ user: { userId: 'user-1' } });
    const result = await handleListActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    const body = result.body as { activities: Array<{ createdAt: string }> };
    expect(body.activities.at(0)?.createdAt).toBe('1970-01-01T00:00:00.000Z');
  });

  it('should use default limit=50 when no query param', async () => {
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue([]);

    const request = createMockRequest({ user: { userId: 'user-1' } });
    await handleListActivities(ctx as unknown as HandlerContext, null, request, mockReply);

    expect(ctx.repos.activities.findByActorId).toHaveBeenCalledWith('user-1', 50);
  });

  it('should parse limit from query param', async () => {
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue([]);

    const request = createMockRequest({ user: { userId: 'user-1' }, query: { limit: '25' } });
    await handleListActivities(ctx as unknown as HandlerContext, null, request, mockReply);

    expect(ctx.repos.activities.findByActorId).toHaveBeenCalledWith('user-1', 25);
  });

  it('should clamp limit to max 200', async () => {
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue([]);

    const request = createMockRequest({ user: { userId: 'user-1' }, query: { limit: '999' } });
    await handleListActivities(ctx as unknown as HandlerContext, null, request, mockReply);

    expect(ctx.repos.activities.findByActorId).toHaveBeenCalledWith('user-1', 200);
  });

  it('should clamp limit to min 1', async () => {
    vi.mocked(ctx.repos.activities.findByActorId).mockResolvedValue([]);

    const request = createMockRequest({ user: { userId: 'user-1' }, query: { limit: '0' } });
    await handleListActivities(ctx as unknown as HandlerContext, null, request, mockReply);

    expect(ctx.repos.activities.findByActorId).toHaveBeenCalledWith('user-1', 1);
  });

  it('should return 500 on service error', async () => {
    vi.mocked(ctx.repos.activities.findByActorId).mockRejectedValue(new Error('DB failure'));

    const request = createMockRequest({ user: { userId: 'user-1' } });
    const result = await handleListActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Failed to list activities' });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// handleListTenantActivities
// ============================================================================

describe('handleListTenantActivities', () => {
  let ctx: ActivityAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest({ params: { tenantId: 'tenant-1' } });

    const result = await handleListTenantActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(401);
  });

  it('should return 400 when tenantId missing', async () => {
    const request = createMockRequest({ user: { userId: 'user-1' }, params: {} });

    const result = await handleListTenantActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: 'Tenant ID is required' });
  });

  it('should return 200 with tenant activities', async () => {
    const activities = [createMockActivity({ tenantId: 'tenant-1' })];
    vi.mocked(ctx.repos.activities.findByTenantId).mockResolvedValue(activities);

    const request = createMockRequest({
      user: { userId: 'user-1' },
      params: { tenantId: 'tenant-1' },
    });
    const result = await handleListTenantActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(200);
    expect((result.body as { activities: unknown[] }).activities).toHaveLength(1);
  });

  it('should parse limit query param', async () => {
    vi.mocked(ctx.repos.activities.findByTenantId).mockResolvedValue([]);

    const request = createMockRequest({
      user: { userId: 'user-1' },
      params: { tenantId: 'tenant-1' },
      query: { limit: '10' },
    });
    await handleListTenantActivities(ctx as unknown as HandlerContext, null, request, mockReply);

    expect(ctx.repos.activities.findByTenantId).toHaveBeenCalledWith('tenant-1', 10);
  });

  it('should return 500 on service error', async () => {
    vi.mocked(ctx.repos.activities.findByTenantId).mockRejectedValue(new Error('DB failure'));

    const request = createMockRequest({
      user: { userId: 'user-1' },
      params: { tenantId: 'tenant-1' },
    });
    const result = await handleListTenantActivities(
      ctx as unknown as HandlerContext,
      null,
      request,
      mockReply,
    );

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Failed to list tenant activities' });
  });
});
