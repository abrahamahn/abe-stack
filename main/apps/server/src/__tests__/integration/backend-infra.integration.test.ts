// main/apps/server/src/__tests__/integration/backend-infra.integration.test.ts
/**
 * Backend Infrastructure Integration Tests
 *
 * Covers Sprint 3.18 integration verification:
 * - Scheduled jobs execute on interval
 * - IP allowlist middleware blocks/allows correctly
 */

import { createIpAllowlistMiddleware } from '@bslt/core/admin';
import { registerScheduledTasks, stopScheduledTasks } from '@bslt/core/scheduled-tasks';
import fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Repositories } from '@bslt/db';
import type { FastifyBaseLogger } from 'fastify';

function createScheduledTaskRepos(): Repositories {
  return {
    subscriptions: {
      findExpiredTrials: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(null),
    },
    paymentMethods: {
      findByUserId: vi.fn().mockResolvedValue([]),
    },
    usageSnapshots: {
      findByTenantId: vi.fn().mockResolvedValue([]),
    },
    usageMetrics: {
      findByTenantAndMetric: vi.fn().mockResolvedValue(null),
    },
    loginAttempts: {
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    authTokens: {
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    pushSubscriptions: {
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    userSessions: {
      deleteRevokedBefore: vi.fn().mockResolvedValue(0),
    },
    auditEvents: {
      findOldestTimestamp: vi.fn().mockResolvedValue(null),
      findByTimeRange: vi.fn().mockResolvedValue([]),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    billingEvents: {
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    invitations: {
      findExpiredPending: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue(null),
    },
    users: {
      listWithFilters: vi.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10000,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      }),
      update: vi.fn().mockResolvedValue(null),
      updateWithVersion: vi.fn().mockResolvedValue(null),
    },
    dataExportRequests: {
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
  } as unknown as Repositories;
}

function createMockLogger(): FastifyBaseLogger {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  logger.child.mockReturnValue(logger);
  return logger as unknown as FastifyBaseLogger;
}

describe('backend infrastructure integration', () => {
  afterEach(() => {
    stopScheduledTasks();
    vi.useRealTimers();
  });

  it('scheduled jobs execute on schedule (hourly)', async () => {
    vi.useFakeTimers();
    const repos = createScheduledTaskRepos();
    const log = createMockLogger();

    registerScheduledTasks(repos, log);

    // Immediate run on startup.
    await vi.advanceTimersByTimeAsync(0);
    expect(repos.subscriptions.findExpiredTrials).toHaveBeenCalledTimes(1);

    // Next run after one hour.
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(repos.subscriptions.findExpiredTrials).toHaveBeenCalledTimes(2);
  });

  it('IP allowlist blocks disallowed IP and allows allowed IP', async () => {
    const app = fastify({ logger: false, trustProxy: true });
    const ipAllowlist = createIpAllowlistMiddleware({
      enabled: true,
      allowedIps: ['203.0.113.10'],
      allowedCidrs: ['10.0.0.0/8'],
    });

    app.get('/admin/probe', { preHandler: [ipAllowlist] }, async () => ({ ok: true }));
    await app.ready();

    const blocked = await app.inject({
      method: 'GET',
      url: '/admin/probe',
      headers: {
        'x-forwarded-for': '198.51.100.23',
      },
    });
    expect(blocked.statusCode).toBe(403);

    const allowedByExactIp = await app.inject({
      method: 'GET',
      url: '/admin/probe',
      headers: {
        'x-forwarded-for': '203.0.113.10',
      },
    });
    expect(allowedByExactIp.statusCode).toBe(200);
    expect(allowedByExactIp.json()).toEqual({ ok: true });

    const allowedByCidr = await app.inject({
      method: 'GET',
      url: '/admin/probe',
      headers: {
        'x-forwarded-for': '10.12.8.42',
      },
    });
    expect(allowedByCidr.statusCode).toBe(200);
    expect(allowedByCidr.json()).toEqual({ ok: true });

    await app.close();
  });
});
