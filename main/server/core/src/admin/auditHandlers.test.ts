// main/server/core/src/admin/auditHandlers.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleListAuditEvents } from './auditHandlers';

import type { AdminAppContext } from './types';
import type { AuditEvent } from '../../../db/src';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AdminAppContext {
  return {
    db: {},
    repos: {
      users: {} as AdminAppContext['repos']['users'],
      plans: {} as AdminAppContext['repos']['plans'],
      subscriptions: {} as AdminAppContext['repos']['subscriptions'],
      auditEvents: {
        create: vi.fn(),
        findById: vi.fn(),
        findRecent: vi.fn(),
        findByActorId: vi.fn(),
        findByTenantId: vi.fn(),
        findByAction: vi.fn(),
        findByResource: vi.fn(),
        deleteOlderThan: vi.fn(),
      },
    },
    config: { billing: {} as AdminAppContext['config']['billing'] },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    email: {} as AdminAppContext['email'],
    storage: {},
    billing: {} as AdminAppContext['billing'],
    notifications: {} as AdminAppContext['notifications'],
    pubsub: {} as AdminAppContext['pubsub'],
    cache: {} as AdminAppContext['cache'],
    queue: {},
    write: {},
    search: {},
  } as unknown as AdminAppContext;
}

function createMockAuditEvent(overrides?: Partial<AuditEvent>): AuditEvent {
  return {
    id: 'evt-1',
    action: 'user.login',
    actorId: 'user-1',
    tenantId: null,
    category: 'security',
    severity: 'info',
    resource: 'user',
    resourceId: 'user-1',
    metadata: {},
    ipAddress: '127.0.0.1',
    userAgent: 'test',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ...overrides,
  };
}

function createMockRequest(overrides?: {
  user?: { userId: string; role: string };
  query?: Record<string, string>;
}): FastifyRequest {
  return {
    user: overrides?.user,
    query: overrides?.query ?? {},
  } as unknown as FastifyRequest;
}

const mockReply = {} as FastifyReply;

// ============================================================================
// handleListAuditEvents
// ============================================================================

describe('handleListAuditEvents', () => {
  let ctx: AdminAppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should return 401 when no user', async () => {
    const request = createMockRequest();

    const result = await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: 'Unauthorized' });
  });

  it('should return 200 with events from findRecent when no filters', async () => {
    const events = [createMockAuditEvent()];
    vi.mocked(ctx.repos.auditEvents.findRecent).mockResolvedValue(events);
    const request = createMockRequest({ user: { userId: 'admin-1', role: 'admin' } });

    const result = await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ events });
    expect(ctx.repos.auditEvents.findRecent).toHaveBeenCalledWith(100);
  });

  it('should filter by tenantId when provided', async () => {
    const events = [createMockAuditEvent({ tenantId: 'tenant-1' })];
    vi.mocked(ctx.repos.auditEvents.findByTenantId).mockResolvedValue(events);
    const request = createMockRequest({
      user: { userId: 'admin-1', role: 'admin' },
      query: { tenantId: 'tenant-1' },
    });

    const result = await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(result.status).toBe(200);
    expect(ctx.repos.auditEvents.findByTenantId).toHaveBeenCalledWith('tenant-1', 100);
  });

  it('should filter by actorId when provided', async () => {
    const events = [createMockAuditEvent()];
    vi.mocked(ctx.repos.auditEvents.findByActorId).mockResolvedValue(events);
    const request = createMockRequest({
      user: { userId: 'admin-1', role: 'admin' },
      query: { actorId: 'user-1' },
    });

    const result = await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(result.status).toBe(200);
    expect(ctx.repos.auditEvents.findByActorId).toHaveBeenCalledWith('user-1', 100);
  });

  it('should filter by action when provided', async () => {
    const events = [createMockAuditEvent()];
    vi.mocked(ctx.repos.auditEvents.findByAction).mockResolvedValue(events);
    const request = createMockRequest({
      user: { userId: 'admin-1', role: 'admin' },
      query: { action: 'user.login' },
    });

    const result = await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(result.status).toBe(200);
    expect(ctx.repos.auditEvents.findByAction).toHaveBeenCalledWith('user.login', 100);
  });

  it('should prioritize tenantId over actorId and action', async () => {
    vi.mocked(ctx.repos.auditEvents.findByTenantId).mockResolvedValue([]);
    const request = createMockRequest({
      user: { userId: 'admin-1', role: 'admin' },
      query: { tenantId: 'tenant-1', actorId: 'user-1', action: 'user.login' },
    });

    await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(ctx.repos.auditEvents.findByTenantId).toHaveBeenCalledWith('tenant-1', 100);
    expect(ctx.repos.auditEvents.findByActorId).not.toHaveBeenCalled();
    expect(ctx.repos.auditEvents.findByAction).not.toHaveBeenCalled();
  });

  it('should use default limit of 100 when no limit query param', async () => {
    vi.mocked(ctx.repos.auditEvents.findRecent).mockResolvedValue([]);
    const request = createMockRequest({ user: { userId: 'admin-1', role: 'admin' } });

    await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(ctx.repos.auditEvents.findRecent).toHaveBeenCalledWith(100);
  });

  it('should use custom limit from query param', async () => {
    vi.mocked(ctx.repos.auditEvents.findRecent).mockResolvedValue([]);
    const request = createMockRequest({
      user: { userId: 'admin-1', role: 'admin' },
      query: { limit: '50' },
    });

    await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(ctx.repos.auditEvents.findRecent).toHaveBeenCalledWith(50);
  });

  it('should cap limit at 500', async () => {
    vi.mocked(ctx.repos.auditEvents.findRecent).mockResolvedValue([]);
    const request = createMockRequest({
      user: { userId: 'admin-1', role: 'admin' },
      query: { limit: '1000' },
    });

    await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(ctx.repos.auditEvents.findRecent).toHaveBeenCalledWith(500);
  });

  it('should fall back to 100 for non-numeric limit', async () => {
    vi.mocked(ctx.repos.auditEvents.findRecent).mockResolvedValue([]);
    const request = createMockRequest({
      user: { userId: 'admin-1', role: 'admin' },
      query: { limit: 'abc' },
    });

    await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(ctx.repos.auditEvents.findRecent).toHaveBeenCalledWith(100);
  });

  it('should log admin action on success', async () => {
    vi.mocked(ctx.repos.auditEvents.findRecent).mockResolvedValue([
      createMockAuditEvent(),
      createMockAuditEvent({ id: 'evt-2' }),
    ]);
    const request = createMockRequest({ user: { userId: 'admin-1', role: 'admin' } });

    await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(ctx.log.info).toHaveBeenCalledWith(
      { adminId: 'admin-1', resultCount: 2 },
      'Admin listed audit events',
    );
  });

  it('should return 500 on service error', async () => {
    vi.mocked(ctx.repos.auditEvents.findRecent).mockRejectedValue(new Error('DB failure'));
    const request = createMockRequest({ user: { userId: 'admin-1', role: 'admin' } });

    const result = await handleListAuditEvents(ctx, undefined, request, mockReply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: 'Failed to list audit events' });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});
