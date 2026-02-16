// main/server/core/src/webhooks/delivery.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  calculateRetryDelay,
  dispatchWebhookEvent,
  recordDeliveryResult,
  signPayload,
  verifySignature,
} from './delivery';

import type { Repositories } from '../../../db/src';

// ============================================================================
// Helpers
// ============================================================================

function createMockRepos(): Repositories {
  return {
    webhooks: {
      create: vi.fn(),
      findById: vi.fn(),
      findByTenantId: vi.fn(),
      findActiveByEvent: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    webhookDeliveries: {
      create: vi.fn(),
      findById: vi.fn(),
      findByWebhookId: vi.fn(),
      findByStatus: vi.fn(),
      update: vi.fn(),
    },
    // Stub remaining repos -- not used by delivery service
    tenants: {} as Repositories['tenants'],
    memberships: {} as Repositories['memberships'],
    users: {} as Repositories['users'],
    refreshTokens: {} as Repositories['refreshTokens'],
    refreshTokenFamilies: {} as Repositories['refreshTokenFamilies'],
    loginAttempts: {} as Repositories['loginAttempts'],
    passwordResetTokens: {} as Repositories['passwordResetTokens'],
    emailVerificationTokens: {} as Repositories['emailVerificationTokens'],
    securityEvents: {} as Repositories['securityEvents'],
    totpBackupCodes: {} as Repositories['totpBackupCodes'],
    emailChangeTokens: {} as Repositories['emailChangeTokens'],
    emailChangeRevertTokens: {} as Repositories['emailChangeRevertTokens'],
    magicLinkTokens: {} as Repositories['magicLinkTokens'],
    oauthConnections: {} as Repositories['oauthConnections'],
    apiKeys: {} as Repositories['apiKeys'],
    pushSubscriptions: {} as Repositories['pushSubscriptions'],
    notificationPreferences: {} as Repositories['notificationPreferences'],
    plans: {} as Repositories['plans'],
    subscriptions: {} as Repositories['subscriptions'],
    customerMappings: {} as Repositories['customerMappings'],
    invoices: {} as Repositories['invoices'],
    paymentMethods: {} as Repositories['paymentMethods'],
    billingEvents: {} as Repositories['billingEvents'],
    userSessions: {} as Repositories['userSessions'],
    invitations: {} as Repositories['invitations'],
    notifications: {} as Repositories['notifications'],
    auditEvents: {} as Repositories['auditEvents'],
    jobs: {} as Repositories['jobs'],
    featureFlags: {} as Repositories['featureFlags'],
    tenantFeatureOverrides: {} as Repositories['tenantFeatureOverrides'],
    usageMetrics: {} as Repositories['usageMetrics'],
    usageSnapshots: {} as Repositories['usageSnapshots'],
    legalDocuments: {} as Repositories['legalDocuments'],
    userAgreements: {} as Repositories['userAgreements'],
    consentLogs: {} as Repositories['consentLogs'],
    dataExportRequests: {} as Repositories['dataExportRequests'],
    activities: {} as Repositories['activities'],
    webauthnCredentials: {} as Repositories['webauthnCredentials'],
    trustedDevices: {} as Repositories['trustedDevices'],
    files: {} as Repositories['files'],
  };
}

// ============================================================================
// signPayload / verifySignature
// ============================================================================

describe('signPayload', () => {
  it('produces a hex-encoded HMAC-SHA256 signature', () => {
    const signature = signPayload('{"event":"test"}', 'my-secret');

    expect(typeof signature).toBe('string');
    expect(signature).toMatch(/^[0-9a-f]+$/);
    expect(signature.length).toBe(64); // SHA-256 produces 32 bytes = 64 hex chars
  });

  it('produces the same signature for same payload and secret', () => {
    const sig1 = signPayload('same-payload', 'same-secret');
    const sig2 = signPayload('same-payload', 'same-secret');

    expect(sig1).toBe(sig2);
  });

  it('produces different signatures for different payloads', () => {
    const sig1 = signPayload('payload-a', 'secret');
    const sig2 = signPayload('payload-b', 'secret');

    expect(sig1).not.toBe(sig2);
  });

  it('produces different signatures for different secrets', () => {
    const sig1 = signPayload('payload', 'secret-a');
    const sig2 = signPayload('payload', 'secret-b');

    expect(sig1).not.toBe(sig2);
  });
});

describe('verifySignature', () => {
  it('returns true for valid signature', () => {
    const payload = '{"event":"user.created"}';
    const secret = 'webhook-secret';
    const signature = signPayload(payload, secret);

    expect(verifySignature(payload, signature, secret)).toBe(true);
  });

  it('returns false for invalid signature', () => {
    const payload = '{"event":"user.created"}';
    const secret = 'webhook-secret';

    expect(verifySignature(payload, 'invalid-signature', secret)).toBe(false);
  });

  it('returns false for tampered payload', () => {
    const secret = 'webhook-secret';
    const signature = signPayload('original-payload', secret);

    expect(verifySignature('tampered-payload', signature, secret)).toBe(false);
  });

  it('returns false for wrong secret', () => {
    const payload = '{"event":"test"}';
    const signature = signPayload(payload, 'correct-secret');

    expect(verifySignature(payload, signature, 'wrong-secret')).toBe(false);
  });

  it('returns false for empty signature', () => {
    expect(verifySignature('payload', '', 'secret')).toBe(false);
  });
});

// ============================================================================
// calculateRetryDelay
// ============================================================================

describe('calculateRetryDelay', () => {
  it('returns 1 minute delay for attempt 1', () => {
    expect(calculateRetryDelay(1)).toBe(1 * 60 * 1000);
  });

  it('returns 5 minute delay for attempt 2', () => {
    expect(calculateRetryDelay(2)).toBe(5 * 60 * 1000);
  });

  it('returns 30 minute delay for attempt 3', () => {
    expect(calculateRetryDelay(3)).toBe(30 * 60 * 1000);
  });

  it('returns 2 hour delay for attempt 4', () => {
    expect(calculateRetryDelay(4)).toBe(120 * 60 * 1000);
  });

  it('returns 12 hour delay for attempt 5', () => {
    expect(calculateRetryDelay(5)).toBe(720 * 60 * 1000);
  });

  it('returns null for attempt 0', () => {
    expect(calculateRetryDelay(0)).toBeNull();
  });

  it('returns null for attempts beyond maximum', () => {
    expect(calculateRetryDelay(6)).toBeNull();
    expect(calculateRetryDelay(10)).toBeNull();
  });

  it('returns null for negative attempts', () => {
    expect(calculateRetryDelay(-1)).toBeNull();
  });
});

// ============================================================================
// dispatchWebhookEvent
// ============================================================================

describe('dispatchWebhookEvent', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('creates delivery records for matching webhooks', async () => {
    vi.mocked(repos.webhooks.findActiveByEvent).mockResolvedValue([
      {
        id: 'wh-1',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook1',
        events: ['user.created'],
        secret: 'secret-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'wh-2',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook2',
        events: ['user.created'],
        secret: 'secret-2',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    vi.mocked(repos.webhookDeliveries.create)
      .mockResolvedValueOnce({
        id: 'del-1',
        webhookId: 'wh-1',
        eventType: 'user.created',
        payload: { userId: 'u-1' },
        responseStatus: null,
        responseBody: null,
        status: 'pending',
        attempts: 0,
        nextRetryAt: null,
        deliveredAt: null,
        createdAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'del-2',
        webhookId: 'wh-2',
        eventType: 'user.created',
        payload: { userId: 'u-1' },
        responseStatus: null,
        responseBody: null,
        status: 'pending',
        attempts: 0,
        nextRetryAt: null,
        deliveredAt: null,
        createdAt: new Date(),
      });

    const results = await dispatchWebhookEvent(repos, 'tenant-1', 'user.created', {
      userId: 'u-1',
    });

    expect(results).toHaveLength(2);
    expect(results[0]?.deliveryId).toBe('del-1');
    expect(results[0]?.status).toBe('pending');
    expect(results[1]?.deliveryId).toBe('del-2');
  });

  it('returns empty array when no webhooks match', async () => {
    vi.mocked(repos.webhooks.findActiveByEvent).mockResolvedValue([]);

    const results = await dispatchWebhookEvent(repos, 'tenant-1', 'user.created', {
      userId: 'u-1',
    });

    expect(results).toEqual([]);
    expect(repos.webhookDeliveries.create).not.toHaveBeenCalled();
  });

  it('filters webhooks by tenant ID', async () => {
    vi.mocked(repos.webhooks.findActiveByEvent).mockResolvedValue([
      {
        id: 'wh-1',
        tenantId: 'tenant-1',
        url: 'https://example.com/hook1',
        events: ['user.created'],
        secret: 'secret-1',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'wh-other',
        tenantId: 'other-tenant',
        url: 'https://other.com/hook',
        events: ['user.created'],
        secret: 'secret-other',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    vi.mocked(repos.webhookDeliveries.create).mockResolvedValueOnce({
      id: 'del-1',
      webhookId: 'wh-1',
      eventType: 'user.created',
      payload: {},
      responseStatus: null,
      responseBody: null,
      status: 'pending',
      attempts: 0,
      nextRetryAt: null,
      deliveredAt: null,
      createdAt: new Date(),
    });

    const results = await dispatchWebhookEvent(repos, 'tenant-1', 'user.created', {});

    // Only wh-1 belongs to tenant-1; wh-other should be filtered out
    expect(results).toHaveLength(1);
    expect(results[0]?.webhookId).toBe('wh-1');
    expect(repos.webhookDeliveries.create).toHaveBeenCalledTimes(1);
  });
});

// ============================================================================
// recordDeliveryResult
// ============================================================================

describe('recordDeliveryResult', () => {
  let repos: Repositories;

  const baseDelivery = {
    id: 'del-1',
    webhookId: 'wh-1',
    eventType: 'user.created',
    payload: {},
    responseStatus: null,
    responseBody: null,
    status: 'pending' as const,
    attempts: 0,
    nextRetryAt: null,
    deliveredAt: null,
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('marks as delivered on 2xx response', async () => {
    vi.mocked(repos.webhookDeliveries.findById).mockResolvedValue(baseDelivery);
    vi.mocked(repos.webhookDeliveries.update).mockResolvedValue({
      ...baseDelivery,
      status: 'delivered',
      responseStatus: 200,
      responseBody: 'ok',
      attempts: 1,
      deliveredAt: new Date(),
    });

    const result = await recordDeliveryResult(repos, 'del-1', 200, 'ok');

    expect(result?.status).toBe('delivered');
    expect(repos.webhookDeliveries.update).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({
        status: 'delivered',
        responseStatus: 200,
        attempts: 1,
      }),
    );
  });

  it('schedules retry on non-2xx response with attempts remaining', async () => {
    vi.mocked(repos.webhookDeliveries.findById).mockResolvedValue(baseDelivery);
    vi.mocked(repos.webhookDeliveries.update).mockResolvedValue({
      ...baseDelivery,
      status: 'failed',
      responseStatus: 500,
      attempts: 1,
      nextRetryAt: new Date(),
    });

    const result = await recordDeliveryResult(repos, 'del-1', 500, 'server error');

    expect(result?.status).toBe('failed');
    expect(repos.webhookDeliveries.update).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({
        status: 'failed',
        responseStatus: 500,
        attempts: 1,
      }),
    );

    // Verify nextRetryAt was set
    const updateCall = vi.mocked(repos.webhookDeliveries.update).mock.calls[0];
    const updateArg = updateCall?.[1] as Record<string, unknown> | undefined;
    expect(updateArg?.['nextRetryAt']).toBeDefined();
    expect(updateArg?.['nextRetryAt']).not.toBeNull();
  });

  it('marks as dead when max attempts reached', async () => {
    const maxedDelivery = { ...baseDelivery, attempts: 4 };
    vi.mocked(repos.webhookDeliveries.findById).mockResolvedValue(maxedDelivery);
    vi.mocked(repos.webhookDeliveries.update).mockResolvedValue({
      ...maxedDelivery,
      status: 'dead',
      responseStatus: 500,
      attempts: 5,
      nextRetryAt: null,
    });

    const result = await recordDeliveryResult(repos, 'del-1', 500, 'still failing');

    expect(result?.status).toBe('dead');
    expect(repos.webhookDeliveries.update).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({
        status: 'dead',
        attempts: 5,
        nextRetryAt: null,
      }),
    );
  });

  it('returns null when delivery not found', async () => {
    vi.mocked(repos.webhookDeliveries.findById).mockResolvedValue(null);

    const result = await recordDeliveryResult(repos, 'missing', 200, 'ok');

    expect(result).toBeNull();
    expect(repos.webhookDeliveries.update).not.toHaveBeenCalled();
  });

  it('truncates response body to 4096 characters', async () => {
    vi.mocked(repos.webhookDeliveries.findById).mockResolvedValue(baseDelivery);
    vi.mocked(repos.webhookDeliveries.update).mockResolvedValue({
      ...baseDelivery,
      status: 'delivered',
      responseStatus: 200,
      attempts: 1,
    });

    const longBody = 'x'.repeat(10000);
    await recordDeliveryResult(repos, 'del-1', 200, longBody);

    const updateCall = vi.mocked(repos.webhookDeliveries.update).mock.calls[0];
    const updateArg = updateCall?.[1] as Record<string, unknown> | undefined;
    const savedBody = updateArg?.['responseBody'] as string;
    expect(savedBody).toHaveLength(4096);
  });
});
