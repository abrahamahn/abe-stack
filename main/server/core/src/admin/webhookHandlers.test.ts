// main/server/core/src/admin/webhookHandlers.test.ts

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  handleListAdminWebhookDeliveries,
  handleListAdminWebhooks,
  handleReplayAdminWebhookDelivery,
} from './webhookHandlers';

import type { AdminAppContext } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

function createMockContext(): AdminAppContext {
  const repos = {
    webhooks: {
      findById: vi.fn(),
    },
    webhookDeliveries: {
      findById: vi.fn(),
      findByWebhookId: vi.fn(),
      create: vi.fn(),
    },
  };

  return {
    config: {} as AdminAppContext['config'],
    db: {
      raw: vi.fn(),
    } as unknown as AdminAppContext['db'],
    repos: repos as unknown as AdminAppContext['repos'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    email: { send: vi.fn(), healthCheck: vi.fn() } as unknown as AdminAppContext['email'],
    storage: {} as AdminAppContext['storage'],
    billing: {} as AdminAppContext['billing'],
    notifications: {} as AdminAppContext['notifications'],
    pubsub: {} as AdminAppContext['pubsub'],
    cache: {} as AdminAppContext['cache'],
    queue: {},
    write: {},
    search: {},
    errorTracker: {
      captureError: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUserContext: vi.fn(),
    },
  } as AdminAppContext;
}

function createRequest(
  overrides: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): FastifyRequest {
  return {
    user: { userId: 'admin-1', email: 'admin@example.com', role: 'admin' },
    params,
    query,
    ...overrides,
  } as unknown as FastifyRequest;
}

function createReply(): FastifyReply {
  return {} as FastifyReply;
}

describe('webhookHandlers', () => {
  let ctx: AdminAppContext;

  beforeEach(() => {
    ctx = createMockContext();
    vi.clearAllMocks();
  });

  describe('handleListAdminWebhooks', () => {
    it('returns 401 when unauthenticated', async () => {
      const result = await handleListAdminWebhooks(
        ctx,
        undefined,
        createRequest({ user: undefined }),
        createReply(),
      );

      expect(result.status).toBe(401);
    });

    it('returns mapped webhook rows', async () => {
      const rows = [
        {
          id: 'wh-1',
          tenant_id: 'tenant-1',
          url: 'https://example.test/webhook',
          events: ['user.created'],
          is_active: true,
          created_at: new Date('2026-01-01T00:00:00.000Z'),
          updated_at: new Date('2026-01-02T00:00:00.000Z'),
        },
      ];

      vi.mocked(ctx.db.raw).mockResolvedValue(rows);

      const result = await handleListAdminWebhooks(ctx, undefined, createRequest(), createReply());

      expect(result.status).toBe(200);
      if (result.status === 200 && 'webhooks' in result.body) {
        expect(result.body.webhooks).toHaveLength(1);
        expect(result.body.webhooks[0]?.id).toBe('wh-1');
      }
    });
  });

  describe('handleListAdminWebhookDeliveries', () => {
    it('returns 404 when webhook is missing', async () => {
      const repos = ctx.repos as unknown as {
        webhooks: { findById: ReturnType<typeof vi.fn> };
      };
      repos.webhooks.findById.mockResolvedValue(null);

      const result = await handleListAdminWebhookDeliveries(
        ctx,
        undefined,
        createRequest({}, { id: 'wh-1' }),
        createReply(),
      );

      expect(result.status).toBe(404);
    });

    it('returns filtered deliveries', async () => {
      const repos = ctx.repos as unknown as {
        webhooks: { findById: ReturnType<typeof vi.fn> };
        webhookDeliveries: { findByWebhookId: ReturnType<typeof vi.fn> };
      };
      repos.webhooks.findById.mockResolvedValue({ id: 'wh-1' });
      repos.webhookDeliveries.findByWebhookId.mockResolvedValue([
        {
          id: 'del-1',
          webhookId: 'wh-1',
          eventType: 'user.created',
          status: 'failed',
          attempts: 1,
          responseStatus: 500,
          nextRetryAt: null,
          deliveredAt: null,
          createdAt: new Date('2026-01-03T00:00:00.000Z'),
        },
        {
          id: 'del-2',
          webhookId: 'wh-1',
          eventType: 'user.updated',
          status: 'delivered',
          attempts: 1,
          responseStatus: 200,
          nextRetryAt: null,
          deliveredAt: new Date('2026-01-04T00:00:00.000Z'),
          createdAt: new Date('2026-01-04T00:00:00.000Z'),
        },
      ]);

      const result = await handleListAdminWebhookDeliveries(
        ctx,
        undefined,
        createRequest({}, { id: 'wh-1' }, { status: 'failed' }),
        createReply(),
      );

      expect(result.status).toBe(200);
      if (result.status === 200 && 'deliveries' in result.body) {
        expect(result.body.deliveries).toHaveLength(1);
        expect(result.body.deliveries[0]?.id).toBe('del-1');
      }
    });
  });

  describe('handleReplayAdminWebhookDelivery', () => {
    it('returns 404 when delivery is missing', async () => {
      const repos = ctx.repos as unknown as {
        webhooks: { findById: ReturnType<typeof vi.fn> };
        webhookDeliveries: { findById: ReturnType<typeof vi.fn> };
      };
      repos.webhooks.findById.mockResolvedValue({ id: 'wh-1' });
      repos.webhookDeliveries.findById.mockResolvedValue(null);

      const result = await handleReplayAdminWebhookDelivery(
        ctx,
        undefined,
        createRequest({}, { id: 'wh-1', deliveryId: 'del-1' }),
        createReply(),
      );

      expect(result.status).toBe(404);
    });

    it('returns 400 when delivery is not failed/dead', async () => {
      const repos = ctx.repos as unknown as {
        webhooks: { findById: ReturnType<typeof vi.fn> };
        webhookDeliveries: { findById: ReturnType<typeof vi.fn> };
      };
      repos.webhooks.findById.mockResolvedValue({ id: 'wh-1' });
      repos.webhookDeliveries.findById.mockResolvedValue({
        id: 'del-1',
        webhookId: 'wh-1',
        eventType: 'user.created',
        payload: {},
        status: 'pending',
      });

      const result = await handleReplayAdminWebhookDelivery(
        ctx,
        undefined,
        createRequest({}, { id: 'wh-1', deliveryId: 'del-1' }),
        createReply(),
      );

      expect(result.status).toBe(400);
    });

    it('creates replay delivery for failed delivery', async () => {
      const repos = ctx.repos as unknown as {
        webhooks: { findById: ReturnType<typeof vi.fn> };
        webhookDeliveries: {
          findById: ReturnType<typeof vi.fn>;
          create: ReturnType<typeof vi.fn>;
        };
      };
      repos.webhooks.findById.mockResolvedValue({ id: 'wh-1' });
      repos.webhookDeliveries.findById.mockResolvedValue({
        id: 'del-1',
        webhookId: 'wh-1',
        eventType: 'user.created',
        payload: { userId: 'user-1' },
        status: 'failed',
      });
      repos.webhookDeliveries.create.mockResolvedValue({ id: 'del-replay-1' });

      const result = await handleReplayAdminWebhookDelivery(
        ctx,
        undefined,
        createRequest({}, { id: 'wh-1', deliveryId: 'del-1' }),
        createReply(),
      );

      expect(result.status).toBe(200);
      expect(repos.webhookDeliveries.create).toHaveBeenCalledWith({
        webhookId: 'wh-1',
        eventType: 'user.created',
        payload: { userId: 'user-1' },
        status: 'pending',
        attempts: 0,
      });
      if (result.status === 200) {
        expect(result.body.success).toBe(true);
        expect(result.body.deliveryId).toBe('del-replay-1');
      }
    });
  });
});
