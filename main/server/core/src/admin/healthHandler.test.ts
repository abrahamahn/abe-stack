// main/server/core/src/admin/healthHandler.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { handleGetAdminHealth } from './healthHandler';

import type { AdminAppContext, AdminRequest } from './types';

function createCtx(overrides?: Partial<AdminAppContext>): AdminAppContext {
  const log: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };
  (log['child'] as ReturnType<typeof vi.fn>).mockReturnValue(log);

  return {
    db: { healthCheck: vi.fn().mockResolvedValue(true) },
    cache: { healthCheck: vi.fn().mockResolvedValue(true) },
    queue: { healthCheck: vi.fn().mockResolvedValue(true) },
    storage: { healthCheck: vi.fn().mockResolvedValue(true) },
    email: { send: vi.fn(), healthCheck: vi.fn().mockResolvedValue(true) },
    billing: {},
    notifications: {},
    pubsub: {},
    write: {},
    search: {},
    repos: {
      users: {} as never,
      plans: {} as never,
      subscriptions: {} as never,
      auditEvents: {} as never,
      tenants: {} as never,
      memberships: {} as never,
    },
    config: {
      billing: { enabled: false, provider: 'stripe' } as never,
    },
    log: log as never,
    ...overrides,
  } as unknown as AdminAppContext;
}

function createRequest(user?: AdminRequest['user']): AdminRequest {
  return {
    ...(user !== undefined ? { user } : {}),
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'vitest' },
    cookies: {},
    headers: {},
  };
}

describe('handleGetAdminHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is missing', async () => {
    const ctx = createCtx();
    const result = await handleGetAdminHealth(ctx, undefined, createRequest(undefined));

    expect(result.status).toBe(401);
  });

  it('returns healthy when all services are up', async () => {
    const ctx = createCtx();
    const result = await handleGetAdminHealth(
      ctx,
      undefined,
      createRequest({ userId: 'admin-1', email: 'admin@test.dev', role: 'admin' }),
    );

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe('healthy');
      expect(result.body.services.database).toBe('up');
      expect(result.body.services.cache).toBe('up');
      expect(result.body.services.queue).toBe('up');
      expect(result.body.services.storage).toBe('up');
      expect(result.body.services.email).toBe('up');
    }
  });

  it('returns down when a service fails health check', async () => {
    const ctx = createCtx({
      db: { healthCheck: vi.fn().mockResolvedValue(false) } as never,
    });

    const result = await handleGetAdminHealth(
      ctx,
      undefined,
      createRequest({ userId: 'admin-1', email: 'admin@test.dev', role: 'admin' }),
    );

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe('down');
      expect(result.body.services.database).toBe('down');
    }
  });

  it('returns degraded when service has no healthCheck', async () => {
    const ctx = createCtx({
      storage: {} as never,
    });

    const result = await handleGetAdminHealth(
      ctx,
      undefined,
      createRequest({ userId: 'admin-1', email: 'admin@test.dev', role: 'admin' }),
    );

    expect(result.status).toBe(200);
    if (result.status === 200) {
      expect(result.body.status).toBe('degraded');
      expect(result.body.services.storage).toBe('unknown');
    }
  });
});
