// main/apps/server/src/__tests__/integration/webhook-delivery.integration.test.ts
/**
 * Webhook Delivery Integration Tests
 *
 * Tests the full delivery lifecycle:
 * 1. Register webhook -> trigger event -> delivery queued -> POST sent -> logged
 * 2. Endpoint failure -> retry scheduled -> eventual dead-letter
 *
 * Uses mocked repositories and the core webhook service/delivery modules.
 */

import {
  createWebhook,
  dispatchWebhookEvent,
  listDeliveries,
  recordDeliveryResult,
  replayDelivery,
} from '@bslt/core/webhooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ============================================================================
// Mock Repository Factory
// ============================================================================

function createMockRepos() {
  const webhooksStore: Map<string, Record<string, unknown>> = new Map();
  const deliveriesStore: Map<string, Record<string, unknown>> = new Map();
  let webhookIdCounter = 0;
  let deliveryIdCounter = 0;

  return {
    webhooks: {
      create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        webhookIdCounter++;
        const webhook = {
          id: `wh-${String(webhookIdCounter)}`,
          tenantId: data['tenantId'] ?? null,
          url: data['url'],
          events: data['events'],
          secret: data['secret'] ?? 'test-secret',
          isActive: data['isActive'] !== false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        webhooksStore.set(webhook.id, webhook);
        return webhook;
      }),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return webhooksStore.get(id) ?? null;
      }),
      findByTenantId: vi.fn().mockImplementation(async (tenantId: string) => {
        return Array.from(webhooksStore.values()).filter((w) => w['tenantId'] === tenantId);
      }),
      findActiveByEvent: vi.fn().mockImplementation(async (eventType: string) => {
        return Array.from(webhooksStore.values()).filter((w) => {
          if (w['isActive'] !== true) return false;
          const events = w['events'] as string[];
          return events.some(
            (e) =>
              e === eventType ||
              e === '*' ||
              (e.endsWith('.*') && eventType.startsWith(e.slice(0, -1))),
          );
        });
      }),
      update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => {
        const existing = webhooksStore.get(id);
        if (existing === undefined) return null;
        const updated = { ...existing, ...data, updatedAt: new Date() };
        webhooksStore.set(id, updated);
        return updated;
      }),
      delete: vi.fn().mockImplementation(async (id: string) => {
        return webhooksStore.delete(id);
      }),
    },
    webhookDeliveries: {
      create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => {
        deliveryIdCounter++;
        const delivery = {
          id: `wd-${String(deliveryIdCounter)}`,
          webhookId: data['webhookId'],
          eventType: data['eventType'],
          payload: data['payload'] ?? {},
          responseStatus: null,
          responseBody: null,
          status: data['status'] ?? 'pending',
          attempts: data['attempts'] ?? 0,
          nextRetryAt: null,
          deliveredAt: null,
          createdAt: new Date(),
        };
        deliveriesStore.set(delivery.id, delivery);
        return delivery;
      }),
      findById: vi.fn().mockImplementation(async (id: string) => {
        return deliveriesStore.get(id) ?? null;
      }),
      findByWebhookId: vi
        .fn()
        .mockImplementation(async (webhookId: string, limit: number = 100) => {
          return Array.from(deliveriesStore.values())
            .filter((d) => d['webhookId'] === webhookId)
            .slice(0, limit);
        }),
      findByStatus: vi.fn().mockImplementation(async (status: string, limit: number = 100) => {
        return Array.from(deliveriesStore.values())
          .filter((d) => d['status'] === status)
          .slice(0, limit);
      }),
      update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => {
        const existing = deliveriesStore.get(id);
        if (existing === undefined) return null;
        const updated = { ...existing, ...data };
        deliveriesStore.set(id, updated);
        return updated;
      }),
    },
    _webhooksStore: webhooksStore,
    _deliveriesStore: deliveriesStore,
  };
}

// ============================================================================
// Test Suite 1: Delivery Flow
// ============================================================================

describe('Webhook Delivery Integration: register -> trigger -> deliver -> log', () => {
  let repos: ReturnType<typeof createMockRepos>;

  beforeEach(() => {
    repos = createMockRepos();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a webhook, dispatch an event, and record a successful delivery', async () => {
    // Step 1: Register a webhook
    const webhook = await createWebhook(repos as never, {
      url: 'https://example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    expect(webhook.id).toBeDefined();
    expect(webhook.url).toBe('https://example.com/hook');
    expect(webhook.isActive).toBe(true);

    // Step 2: Dispatch an event -- this should create a pending delivery
    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.created', {
      userId: 'user-123',
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.webhookId).toBe(webhook.id);
    expect(results[0]!.status).toBe('pending');

    const deliveryId = results[0]!.deliveryId;

    // Step 3: Simulate the job queue worker POSTing to the endpoint and recording a 200
    const updatedDelivery = await recordDeliveryResult(
      repos as never,
      deliveryId,
      200,
      '{"ok":true}',
    );

    expect(updatedDelivery).not.toBeNull();
    expect(updatedDelivery!.status).toBe('delivered');
    expect(updatedDelivery!.attempts).toBe(1);
    expect(updatedDelivery!.responseStatus).toBe(200);
    expect(updatedDelivery!.deliveredAt).not.toBeNull();

    // Step 4: Verify the delivery shows up in the delivery log
    const deliveryList = await listDeliveries(repos as never, webhook.id, 'tenant-1');

    expect(deliveryList).toHaveLength(1);
    expect(deliveryList[0]!.status).toBe('delivered');
  });

  it('should not dispatch events for inactive webhooks', async () => {
    // Create an inactive webhook
    const webhook = await createWebhook(repos as never, {
      url: 'https://example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    // Deactivate it
    await repos.webhooks.update(webhook.id, { isActive: false });

    // Dispatch -- should not match
    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.created', {
      userId: 'user-123',
    });

    expect(results).toHaveLength(0);
  });

  it('should not dispatch events for non-matching event types', async () => {
    await createWebhook(repos as never, {
      url: 'https://example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.deleted', {
      userId: 'user-123',
    });

    expect(results).toHaveLength(0);
  });

  it('should dispatch to multiple webhooks subscribing to the same event', async () => {
    await createWebhook(repos as never, {
      url: 'https://a.example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    await createWebhook(repos as never, {
      url: 'https://b.example.com/hook',
      events: ['user.*'],
      tenantId: 'tenant-1',
    });

    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.created', {
      userId: 'user-123',
    });

    expect(results).toHaveLength(2);
  });
});

// ============================================================================
// Test Suite 2: Failure -> Retry -> Dead-Letter
// ============================================================================

describe('Webhook Delivery Integration: failure -> retry -> dead-letter', () => {
  let repos: ReturnType<typeof createMockRepos>;

  beforeEach(() => {
    repos = createMockRepos();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should schedule retries on failure and eventually dead-letter', async () => {
    // Register webhook + dispatch event
    await createWebhook(repos as never, {
      url: 'https://example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.created', {
      userId: 'user-123',
    });

    const deliveryId = results[0]!.deliveryId;

    // Attempt 1: 500 error -> should schedule retry
    let delivery = await recordDeliveryResult(repos as never, deliveryId, 500, 'Server Error');
    expect(delivery!.status).toBe('failed');
    expect(delivery!.attempts).toBe(1);
    expect(delivery!.nextRetryAt).not.toBeNull();

    // Attempt 2: 500 error -> should schedule another retry
    delivery = await recordDeliveryResult(repos as never, deliveryId, 500, 'Server Error');
    expect(delivery!.status).toBe('failed');
    expect(delivery!.attempts).toBe(2);

    // Attempt 3: 500 error
    delivery = await recordDeliveryResult(repos as never, deliveryId, 502, 'Bad Gateway');
    expect(delivery!.status).toBe('failed');
    expect(delivery!.attempts).toBe(3);

    // Attempt 4: 500 error
    delivery = await recordDeliveryResult(repos as never, deliveryId, 503, 'Service Unavailable');
    expect(delivery!.status).toBe('failed');
    expect(delivery!.attempts).toBe(4);

    // Attempt 5: 500 error -> max attempts reached, should be dead-lettered
    delivery = await recordDeliveryResult(repos as never, deliveryId, 500, 'Server Error');
    expect(delivery!.status).toBe('dead');
    expect(delivery!.attempts).toBe(5);
    expect(delivery!.nextRetryAt).toBeNull();
  });

  it('should succeed on retry after initial failure', async () => {
    await createWebhook(repos as never, {
      url: 'https://example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.created', {
      userId: 'user-123',
    });

    const deliveryId = results[0]!.deliveryId;

    // Attempt 1: Fail
    let delivery = await recordDeliveryResult(repos as never, deliveryId, 503, 'Unavailable');
    expect(delivery!.status).toBe('failed');
    expect(delivery!.attempts).toBe(1);

    // Attempt 2: Succeed
    delivery = await recordDeliveryResult(repos as never, deliveryId, 200, '{"ok":true}');
    expect(delivery!.status).toBe('delivered');
    expect(delivery!.attempts).toBe(2);
    expect(delivery!.deliveredAt).not.toBeNull();
  });

  it('should replay a dead-lettered delivery by creating a new pending delivery', async () => {
    const webhook = await createWebhook(repos as never, {
      url: 'https://example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.created', {
      userId: 'user-123',
    });

    const deliveryId = results[0]!.deliveryId;

    // Fail the delivery until dead
    for (let i = 0; i < 5; i++) {
      await recordDeliveryResult(repos as never, deliveryId, 500, 'Error');
    }

    // Verify it's dead
    const deadDelivery = await repos.webhookDeliveries.findById(deliveryId);
    expect(deadDelivery!['status']).toBe('dead');

    // Replay it
    const replayedDelivery = await replayDelivery(repos as never, deliveryId, 'tenant-1');

    expect(replayedDelivery.id).not.toBe(deliveryId); // New delivery record
    expect(replayedDelivery.webhookId).toBe(webhook.id);
    expect(replayedDelivery.eventType).toBe('user.created');
    expect(replayedDelivery.status).toBe('pending');
    expect(replayedDelivery.attempts).toBe(0);
  });

  it('should reject replay for a delivery belonging to a different tenant', async () => {
    await createWebhook(repos as never, {
      url: 'https://example.com/hook',
      events: ['user.created'],
      tenantId: 'tenant-1',
    });

    const results = await dispatchWebhookEvent(repos as never, 'tenant-1', 'user.created', {
      userId: 'user-123',
    });

    const deliveryId = results[0]!.deliveryId;

    // Attempt replay as a different tenant
    await expect(replayDelivery(repos as never, deliveryId, 'tenant-2')).rejects.toThrow(
      'Delivery not found',
    );
  });
});
