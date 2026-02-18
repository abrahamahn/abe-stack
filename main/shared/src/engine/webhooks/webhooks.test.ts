// main/shared/src/engine/webhooks/webhooks.test.ts

import { describe, expect, it } from 'vitest';

import { WEBHOOK_DELIVERY_STATUSES } from '../constants/platform';
import {
  calculateRetryDelay,
  createWebhookDeliverySchema,
  createWebhookSchema,
  isDeliveryTerminal,
  matchesEventFilter,
  shouldRetryDelivery,
  updateWebhookDeliverySchema,
  updateWebhookSchema,
  webhookDeliverySchema,
  webhookSchema,
} from './webhooks';

import type { WebhookDeliveryStatus } from './webhooks';

// ============================================================================
// Test Data Helpers
// ============================================================================

const VALID_UUID = '12345678-1234-4abc-8abc-123456789001';
const VALID_WEBHOOK_ID = '12345678-1234-4abc-8abc-123456789002';
const VALID_DELIVERY_ID = '12345678-1234-4abc-8abc-123456789003';
const VALID_URL = 'https://example.com/webhook';

// ============================================================================
// matchesEventFilter
// ============================================================================

describe('matchesEventFilter', () => {
  it('matches exact event type', () => {
    expect(matchesEventFilter('user.created', { events: ['user.created'] })).toBe(true);
  });

  it('does not match different event type', () => {
    expect(matchesEventFilter('user.deleted', { events: ['user.created'] })).toBe(false);
  });

  it('matches wildcard "*" to any event', () => {
    expect(matchesEventFilter('user.created', { events: ['*'] })).toBe(true);
    expect(matchesEventFilter('billing.invoice.paid', { events: ['*'] })).toBe(true);
  });

  it('matches prefix wildcard "billing.*" to billing events', () => {
    expect(matchesEventFilter('billing.invoice.created', { events: ['billing.*'] })).toBe(true);
    expect(matchesEventFilter('billing.payment.failed', { events: ['billing.*'] })).toBe(true);
  });

  it('does not match prefix wildcard to unrelated events', () => {
    expect(matchesEventFilter('user.created', { events: ['billing.*'] })).toBe(false);
  });

  it('matches if any filter in the array matches', () => {
    expect(
      matchesEventFilter('user.created', {
        events: ['billing.invoice.paid', 'user.created'],
      }),
    ).toBe(true);
  });

  it('returns false for empty events array', () => {
    expect(matchesEventFilter('user.created', { events: [] })).toBe(false);
  });

  it('handles nested event types with prefix wildcard', () => {
    expect(matchesEventFilter('billing.subscription.renewed', { events: ['billing.*'] })).toBe(
      true,
    );
  });

  it('does not treat non-trailing wildcard as glob', () => {
    // "*.created" should not be treated as a wildcard prefix pattern
    expect(matchesEventFilter('user.created', { events: ['*.created'] })).toBe(false);
  });

  it('matches exact string even if it contains a dot', () => {
    expect(
      matchesEventFilter('billing.invoice.paid', {
        events: ['billing.invoice.paid'],
      }),
    ).toBe(true);
  });
});

// ============================================================================
// isDeliveryTerminal
// ============================================================================

describe('isDeliveryTerminal', () => {
  it('returns true for "delivered"', () => {
    expect(isDeliveryTerminal({ status: 'delivered' })).toBe(true);
  });

  it('returns true for "dead"', () => {
    expect(isDeliveryTerminal({ status: 'dead' })).toBe(true);
  });

  it('returns false for "pending"', () => {
    expect(isDeliveryTerminal({ status: 'pending' })).toBe(false);
  });

  it('returns false for "failed"', () => {
    expect(isDeliveryTerminal({ status: 'failed' })).toBe(false);
  });

  it('identifies all terminal statuses correctly', () => {
    const allStatuses: WebhookDeliveryStatus[] = ['pending', 'delivered', 'failed', 'dead'];
    const terminal = allStatuses.filter((s) => isDeliveryTerminal({ status: s }));
    expect(terminal).toEqual(['delivered', 'dead']);
  });
});

// ============================================================================
// shouldRetryDelivery
// ============================================================================

describe('shouldRetryDelivery', () => {
  it('returns true when not terminal and under max attempts', () => {
    expect(shouldRetryDelivery({ status: 'pending', attempts: 1 }, 5)).toBe(true);
  });

  it('returns true for failed delivery under max attempts', () => {
    expect(shouldRetryDelivery({ status: 'failed', attempts: 3 }, 5)).toBe(true);
  });

  it('returns false for terminal delivery even under max attempts', () => {
    expect(shouldRetryDelivery({ status: 'delivered', attempts: 1 }, 5)).toBe(false);
    expect(shouldRetryDelivery({ status: 'dead', attempts: 1 }, 5)).toBe(false);
  });

  it('returns false when attempts >= maxAttempts', () => {
    expect(shouldRetryDelivery({ status: 'failed', attempts: 5 }, 5)).toBe(false);
  });

  it('returns false when attempts exceed maxAttempts', () => {
    expect(shouldRetryDelivery({ status: 'failed', attempts: 10 }, 5)).toBe(false);
  });

  it('uses default maxAttempts of 5', () => {
    expect(shouldRetryDelivery({ status: 'failed', attempts: 4 })).toBe(true);
    expect(shouldRetryDelivery({ status: 'failed', attempts: 5 })).toBe(false);
  });
});

// ============================================================================
// calculateRetryDelay
// ============================================================================

describe('calculateRetryDelay', () => {
  it('returns baseDelayMs for first attempt', () => {
    expect(calculateRetryDelay(1, 5000)).toBe(5000);
  });

  it('doubles delay for each subsequent attempt', () => {
    expect(calculateRetryDelay(1, 5000)).toBe(5000);
    expect(calculateRetryDelay(2, 5000)).toBe(10_000);
    expect(calculateRetryDelay(3, 5000)).toBe(20_000);
    expect(calculateRetryDelay(4, 5000)).toBe(40_000);
  });

  it('uses default base delay of 5000ms', () => {
    expect(calculateRetryDelay(1)).toBe(5000);
    expect(calculateRetryDelay(2)).toBe(10_000);
  });

  it('throws RangeError for attempts < 1', () => {
    expect(() => calculateRetryDelay(0)).toThrow(RangeError);
    expect(() => calculateRetryDelay(-1)).toThrow(RangeError);
  });

  it('handles large attempt counts', () => {
    expect(calculateRetryDelay(10, 5000)).toBe(5000 * Math.pow(2, 9));
  });
});

// ============================================================================
// webhookSchema
// ============================================================================

describe('webhookSchema', () => {
  it('should parse valid webhook with all fields', () => {
    const input = {
      id: VALID_UUID,
      tenantId: VALID_UUID,
      url: VALID_URL,
      events: ['user.created', 'user.updated'],
      secret: 'webhook-secret-key',
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z'),
    };

    const result = webhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VALID_UUID);
      expect(result.data.tenantId).toBe(VALID_UUID);
      expect(result.data.url).toBe(VALID_URL);
      expect(result.data.events).toEqual(['user.created', 'user.updated']);
      expect(result.data.secret).toBe('webhook-secret-key');
      expect(result.data.isActive).toBe(true);
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.updatedAt).toBeInstanceOf(Date);
    }
  });

  it('should accept null tenantId', () => {
    const input = {
      id: VALID_UUID,
      tenantId: null,
      url: VALID_URL,
      events: ['event.type'],
      secret: 'secret',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = webhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBeNull();
    }
  });

  it('should validate url format', () => {
    const input = {
      id: VALID_UUID,
      tenantId: null,
      url: 'not-a-url',
      events: ['event'],
      secret: 'secret',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = webhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('url');
    }
  });

  it('should require events to be an array of strings', () => {
    const input = {
      id: VALID_UUID,
      tenantId: null,
      url: VALID_URL,
      events: 'not-an-array',
      secret: 'secret',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = webhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('array');
    }
  });

  it('should reject empty string in events array', () => {
    const input = {
      id: VALID_UUID,
      tenantId: null,
      url: VALID_URL,
      events: ['valid.event', ''],
      secret: 'secret',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = webhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('events[1]');
    }
  });

  it('should coerce date strings to Date objects', () => {
    const input = {
      id: VALID_UUID,
      tenantId: null,
      url: VALID_URL,
      events: ['event'],
      secret: 'secret',
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
    };

    const result = webhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.updatedAt).toBeInstanceOf(Date);
    }
  });

  it('should require secret to be non-empty', () => {
    const input = {
      id: VALID_UUID,
      tenantId: null,
      url: VALID_URL,
      events: ['event'],
      secret: '',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = webhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('secret');
    }
  });

  it('should parse boolean isActive', () => {
    const inputTrue = {
      id: VALID_UUID,
      tenantId: null,
      url: VALID_URL,
      events: ['event'],
      secret: 'secret',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const resultTrue = webhookSchema.safeParse(inputTrue);
    expect(resultTrue.success).toBe(true);
    if (resultTrue.success) {
      expect(resultTrue.data.isActive).toBe(true);
    }

    const inputFalse = {
      id: VALID_UUID,
      tenantId: null,
      url: VALID_URL,
      events: ['event'],
      secret: 'secret',
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const resultFalse = webhookSchema.safeParse(inputFalse);
    expect(resultFalse.success).toBe(true);
    if (resultFalse.success) {
      expect(resultFalse.data.isActive).toBe(false);
    }
  });
});

// ============================================================================
// createWebhookSchema
// ============================================================================

describe('createWebhookSchema', () => {
  it('should parse valid webhook creation input', () => {
    const input = {
      tenantId: VALID_UUID,
      url: VALID_URL,
      events: ['user.created', 'user.updated'],
      secret: 'webhook-secret',
      isActive: true,
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBe(VALID_UUID);
      expect(result.data.url).toBe(VALID_URL);
      expect(result.data.events).toEqual(['user.created', 'user.updated']);
      expect(result.data.secret).toBe('webhook-secret');
      expect(result.data.isActive).toBe(true);
    }
  });

  it('should allow optional tenantId', () => {
    const input = {
      url: VALID_URL,
      events: ['event'],
      secret: 'secret',
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBeUndefined();
    }
  });

  it('should allow null tenantId', () => {
    const input = {
      tenantId: null,
      url: VALID_URL,
      events: ['event'],
      secret: 'secret',
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tenantId).toBeNull();
    }
  });

  it('should require at least one event', () => {
    const input = {
      url: VALID_URL,
      events: [],
      secret: 'secret',
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('at least 1');
    }
  });

  it('should reject empty strings in events array', () => {
    const input = {
      url: VALID_URL,
      events: ['valid.event', ''],
      secret: 'secret',
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('events[1]');
    }
  });

  it('should validate url format', () => {
    const input = {
      url: 'invalid-url',
      events: ['event'],
      secret: 'secret',
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('url');
    }
  });

  it('should require non-empty secret', () => {
    const input = {
      url: VALID_URL,
      events: ['event'],
      secret: '',
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('secret');
    }
  });

  it('should allow optional isActive', () => {
    const input = {
      url: VALID_URL,
      events: ['event'],
      secret: 'secret',
    };

    const result = createWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBeUndefined();
    }
  });
});

// ============================================================================
// updateWebhookSchema
// ============================================================================

describe('updateWebhookSchema', () => {
  it('should accept empty update object', () => {
    const input = {};

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBeUndefined();
      expect(result.data.events).toBeUndefined();
      expect(result.data.secret).toBeUndefined();
      expect(result.data.isActive).toBeUndefined();
    }
  });

  it('should accept partial url update', () => {
    const input = {
      url: VALID_URL,
    };

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe(VALID_URL);
      expect(result.data.events).toBeUndefined();
    }
  });

  it('should accept partial events update', () => {
    const input = {
      events: ['new.event'],
    };

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events).toEqual(['new.event']);
    }
  });

  it('should validate events when provided', () => {
    const input = {
      events: [],
    };

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('at least 1');
    }
  });

  it('should validate url format when provided', () => {
    const input = {
      url: 'not-a-url',
    };

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('url');
    }
  });

  it('should accept partial secret update', () => {
    const input = {
      secret: 'new-secret',
    };

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.secret).toBe('new-secret');
    }
  });

  it('should accept partial isActive update', () => {
    const input = {
      isActive: false,
    };

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(false);
    }
  });

  it('should accept multiple partial fields', () => {
    const input = {
      url: VALID_URL,
      isActive: true,
    };

    const result = updateWebhookSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe(VALID_URL);
      expect(result.data.isActive).toBe(true);
      expect(result.data.secret).toBeUndefined();
    }
  });
});

// ============================================================================
// webhookDeliverySchema
// ============================================================================

describe('webhookDeliverySchema', () => {
  it('should parse valid webhook delivery with all fields', () => {
    const input = {
      id: VALID_DELIVERY_ID,
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'user.created',
      payload: { userId: '123', email: 'test@example.com' },
      responseStatus: 200,
      responseBody: 'OK',
      status: 'delivered',
      attempts: 1,
      nextRetryAt: new Date('2024-01-01T01:00:00Z'),
      deliveredAt: new Date('2024-01-01T00:30:00Z'),
      createdAt: new Date('2024-01-01T00:00:00Z'),
    };

    const result = webhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe(VALID_DELIVERY_ID);
      expect(result.data.webhookId).toBe(VALID_WEBHOOK_ID);
      expect(result.data.eventType).toBe('user.created');
      expect(result.data.payload).toEqual({ userId: '123', email: 'test@example.com' });
      expect(result.data.responseStatus).toBe(200);
      expect(result.data.responseBody).toBe('OK');
      expect(result.data.status).toBe('delivered');
      expect(result.data.attempts).toBe(1);
      expect(result.data.nextRetryAt).toBeInstanceOf(Date);
      expect(result.data.deliveredAt).toBeInstanceOf(Date);
      expect(result.data.createdAt).toBeInstanceOf(Date);
    }
  });

  it('should accept null for nullable fields', () => {
    const input = {
      id: VALID_DELIVERY_ID,
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'user.created',
      payload: {},
      responseStatus: null,
      responseBody: null,
      status: 'pending',
      attempts: 0,
      nextRetryAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    };

    const result = webhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseStatus).toBeNull();
      expect(result.data.responseBody).toBeNull();
      expect(result.data.nextRetryAt).toBeNull();
      expect(result.data.deliveredAt).toBeNull();
    }
  });

  it('should validate delivery status enum', () => {
    for (const status of WEBHOOK_DELIVERY_STATUSES) {
      const input = {
        id: VALID_DELIVERY_ID,
        webhookId: VALID_WEBHOOK_ID,
        eventType: 'event',
        payload: {},
        responseStatus: null,
        responseBody: null,
        status,
        attempts: 0,
        nextRetryAt: null,
        deliveredAt: null,
        createdAt: new Date(),
      };

      const result = webhookDeliverySchema.safeParse(input);
      expect(result.success).toBe(true);
    }
  });

  it('should reject invalid delivery status', () => {
    const input = {
      id: VALID_DELIVERY_ID,
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'event',
      payload: {},
      responseStatus: null,
      responseBody: null,
      status: 'invalid-status',
      attempts: 0,
      nextRetryAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    };

    const result = webhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('delivery status');
    }
  });

  it('should require eventType to be non-empty', () => {
    const input = {
      id: VALID_DELIVERY_ID,
      webhookId: VALID_WEBHOOK_ID,
      eventType: '',
      payload: {},
      responseStatus: null,
      responseBody: null,
      status: 'pending',
      attempts: 0,
      nextRetryAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    };

    const result = webhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('eventType');
    }
  });

  it('should require attempts to be non-negative', () => {
    const input = {
      id: VALID_DELIVERY_ID,
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'event',
      payload: {},
      responseStatus: null,
      responseBody: null,
      status: 'pending',
      attempts: -1,
      nextRetryAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    };

    const result = webhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('attempts');
    }
  });

  it('should require responseStatus to be an integer when provided', () => {
    const input = {
      id: VALID_DELIVERY_ID,
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'event',
      payload: {},
      responseStatus: 200.5,
      responseBody: null,
      status: 'delivered',
      attempts: 1,
      nextRetryAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    };

    const result = webhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('integer');
    }
  });

  it('should coerce date strings for date fields', () => {
    const input = {
      id: VALID_DELIVERY_ID,
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'event',
      payload: {},
      responseStatus: null,
      responseBody: null,
      status: 'pending',
      attempts: 0,
      nextRetryAt: '2024-01-01T01:00:00Z',
      deliveredAt: '2024-01-01T00:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
    };

    const result = webhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextRetryAt).toBeInstanceOf(Date);
      expect(result.data.deliveredAt).toBeInstanceOf(Date);
      expect(result.data.createdAt).toBeInstanceOf(Date);
    }
  });
});

// ============================================================================
// createWebhookDeliverySchema
// ============================================================================

describe('createWebhookDeliverySchema', () => {
  it('should parse valid webhook delivery creation with minimal fields', () => {
    const input = {
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'user.created',
    };

    const result = createWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.webhookId).toBe(VALID_WEBHOOK_ID);
      expect(result.data.eventType).toBe('user.created');
      expect(result.data.payload).toBeUndefined();
    }
  });

  it('should parse valid webhook delivery creation with payload', () => {
    const input = {
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'user.created',
      payload: { userId: '123', email: 'test@example.com' },
    };

    const result = createWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.webhookId).toBe(VALID_WEBHOOK_ID);
      expect(result.data.eventType).toBe('user.created');
      expect(result.data.payload).toEqual({ userId: '123', email: 'test@example.com' });
    }
  });

  it('should allow empty payload object', () => {
    const input = {
      webhookId: VALID_WEBHOOK_ID,
      eventType: 'event',
      payload: {},
    };

    const result = createWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.payload).toEqual({});
    }
  });

  it('should require webhookId', () => {
    const input = {
      eventType: 'user.created',
    };

    const result = createWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it('should require eventType to be non-empty', () => {
    const input = {
      webhookId: VALID_WEBHOOK_ID,
      eventType: '',
    };

    const result = createWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('eventType');
    }
  });

  it('should validate webhookId format', () => {
    const input = {
      webhookId: 'not-a-uuid',
      eventType: 'event',
    };

    const result = createWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateWebhookDeliverySchema
// ============================================================================

describe('updateWebhookDeliverySchema', () => {
  it('should accept empty update object', () => {
    const input = {};

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseStatus).toBeUndefined();
      expect(result.data.responseBody).toBeUndefined();
      expect(result.data.status).toBeUndefined();
      expect(result.data.attempts).toBeUndefined();
      expect(result.data.nextRetryAt).toBeUndefined();
      expect(result.data.deliveredAt).toBeUndefined();
    }
  });

  it('should accept partial responseStatus update', () => {
    const input = {
      responseStatus: 200,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseStatus).toBe(200);
    }
  });

  it('should accept null responseStatus', () => {
    const input = {
      responseStatus: null,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseStatus).toBeNull();
    }
  });

  it('should accept partial responseBody update', () => {
    const input = {
      responseBody: 'Error message',
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseBody).toBe('Error message');
    }
  });

  it('should accept null responseBody', () => {
    const input = {
      responseBody: null,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseBody).toBeNull();
    }
  });

  it('should accept status update', () => {
    const input = {
      status: 'delivered',
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('delivered');
    }
  });

  it('should validate status enum when provided', () => {
    const input = {
      status: 'invalid-status',
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('delivery status');
    }
  });

  it('should accept attempts update', () => {
    const input = {
      attempts: 3,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.attempts).toBe(3);
    }
  });

  it('should validate attempts is non-negative when provided', () => {
    const input = {
      attempts: -1,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain('attempts');
    }
  });

  it('should accept nextRetryAt update', () => {
    const date = new Date('2024-01-01T01:00:00Z');
    const input = {
      nextRetryAt: date,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextRetryAt).toBeInstanceOf(Date);
    }
  });

  it('should accept null nextRetryAt', () => {
    const input = {
      nextRetryAt: null,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextRetryAt).toBeNull();
    }
  });

  it('should accept deliveredAt update', () => {
    const date = new Date('2024-01-01T00:30:00Z');
    const input = {
      deliveredAt: date,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveredAt).toBeInstanceOf(Date);
    }
  });

  it('should accept null deliveredAt', () => {
    const input = {
      deliveredAt: null,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deliveredAt).toBeNull();
    }
  });

  it('should accept multiple partial fields', () => {
    const input = {
      responseStatus: 500,
      status: 'failed',
      attempts: 3,
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.responseStatus).toBe(500);
      expect(result.data.status).toBe('failed');
      expect(result.data.attempts).toBe(3);
      expect(result.data.deliveredAt).toBeUndefined();
    }
  });

  it('should coerce date strings when provided', () => {
    const input = {
      nextRetryAt: '2024-01-01T01:00:00Z',
      deliveredAt: '2024-01-01T00:30:00Z',
    };

    const result = updateWebhookDeliverySchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextRetryAt).toBeInstanceOf(Date);
      expect(result.data.deliveredAt).toBeInstanceOf(Date);
    }
  });
});

// ============================================================================
// WEBHOOK_DELIVERY_STATUSES
// ============================================================================

describe('WEBHOOK_DELIVERY_STATUSES', () => {
  it('should contain all expected delivery statuses', () => {
    expect(WEBHOOK_DELIVERY_STATUSES).toEqual(['pending', 'delivered', 'failed', 'dead']);
  });

  it('should be readonly', () => {
    // TypeScript ensures this at compile-time, but we can verify the array exists
    expect(Array.isArray(WEBHOOK_DELIVERY_STATUSES)).toBe(true);
    expect(WEBHOOK_DELIVERY_STATUSES.length).toBe(4);
  });
});
