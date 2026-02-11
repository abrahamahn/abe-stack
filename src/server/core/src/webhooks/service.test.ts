// src/server/core/src/webhooks/service.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createWebhook,
  deleteWebhook,
  generateWebhookSecret,
  getWebhook,
  listWebhooks,
  rotateWebhookSecret,
  updateWebhook,
} from './service';

import type { Repositories } from '@abe-stack/db';

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
    // Stub remaining repos -- not used by webhook service
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
    trustedDevices: {} as Repositories['trustedDevices'],
    files: {} as Repositories['files'],
  };
}

const mockWebhook = {
  id: 'wh-1',
  tenantId: 'tenant-1',
  url: 'https://example.com/webhook',
  events: ['user.created', 'user.updated'],
  secret: 'abc123secret',
  isActive: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('generateWebhookSecret', () => {
  it('generates a 64-character hex string', () => {
    const secret = generateWebhookSecret();
    expect(secret).toHaveLength(64);
    expect(secret).toMatch(/^[0-9a-f]+$/);
  });

  it('generates unique secrets each time', () => {
    const secret1 = generateWebhookSecret();
    const secret2 = generateWebhookSecret();
    expect(secret1).not.toBe(secret2);
  });
});

describe('createWebhook', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('creates a webhook with auto-generated secret', async () => {
    vi.mocked(repos.webhooks.create).mockResolvedValue(mockWebhook);

    const result = await createWebhook(repos, 'tenant-1', 'user-1', {
      url: 'https://example.com/webhook',
      events: ['user.created', 'user.updated'],
    });

    expect(result.id).toBe('wh-1');
    expect(result.url).toBe('https://example.com/webhook');
    expect(repos.webhooks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        url: 'https://example.com/webhook',
        events: ['user.created', 'user.updated'],
        isActive: true,
      }),
    );

    // Verify a secret was generated and passed
    const createCall = vi.mocked(repos.webhooks.create).mock.calls[0];
    expect(createCall).toBeDefined();
    const createArg = createCall?.[0];
    expect(typeof createArg?.secret).toBe('string');
    expect(createArg?.secret).toHaveLength(64);
  });
});

describe('listWebhooks', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('returns webhooks for the specified tenant', async () => {
    vi.mocked(repos.webhooks.findByTenantId).mockResolvedValue([mockWebhook]);

    const result = await listWebhooks(repos, 'tenant-1');

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('wh-1');
    expect(repos.webhooks.findByTenantId).toHaveBeenCalledWith('tenant-1');
  });

  it('returns empty array when no webhooks exist', async () => {
    vi.mocked(repos.webhooks.findByTenantId).mockResolvedValue([]);

    const result = await listWebhooks(repos, 'tenant-1');

    expect(result).toEqual([]);
  });
});

describe('getWebhook', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('returns webhook with delivery stats', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(mockWebhook);
    vi.mocked(repos.webhookDeliveries.findByWebhookId).mockResolvedValue([
      {
        id: 'del-1',
        webhookId: 'wh-1',
        eventType: 'user.created',
        payload: {},
        responseStatus: 200,
        responseBody: 'ok',
        status: 'delivered',
        attempts: 1,
        nextRetryAt: null,
        deliveredAt: new Date('2024-01-02'),
        createdAt: new Date('2024-01-02'),
      },
    ]);

    const result = await getWebhook(repos, 'wh-1', 'tenant-1');

    expect(result.id).toBe('wh-1');
    expect(result.recentDeliveries).toHaveLength(1);
    expect(result.recentDeliveries[0]?.status).toBe('delivered');
  });

  it('throws NotFoundError when webhook does not exist', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(null);

    await expect(getWebhook(repos, 'missing', 'tenant-1')).rejects.toThrow('Webhook not found');
  });

  it('throws NotFoundError when webhook belongs to different tenant', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue({
      ...mockWebhook,
      tenantId: 'other-tenant',
    });

    await expect(getWebhook(repos, 'wh-1', 'tenant-1')).rejects.toThrow('Webhook not found');
  });
});

describe('updateWebhook', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('updates webhook URL', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(mockWebhook);
    vi.mocked(repos.webhooks.update).mockResolvedValue({
      ...mockWebhook,
      url: 'https://new-url.com/hook',
    });

    const result = await updateWebhook(repos, 'wh-1', 'tenant-1', {
      url: 'https://new-url.com/hook',
    });

    expect(result.url).toBe('https://new-url.com/hook');
    expect(repos.webhooks.update).toHaveBeenCalledWith(
      'wh-1',
      expect.objectContaining({ url: 'https://new-url.com/hook' }),
    );
  });

  it('returns unchanged webhook when no update data provided', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(mockWebhook);

    const result = await updateWebhook(repos, 'wh-1', 'tenant-1', {});

    expect(result.url).toBe(mockWebhook.url);
    expect(repos.webhooks.update).not.toHaveBeenCalled();
  });

  it('throws NotFoundError when webhook does not exist', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(null);

    await expect(
      updateWebhook(repos, 'missing', 'tenant-1', { url: 'https://x.com' }),
    ).rejects.toThrow('Webhook not found');
  });

  it('throws NotFoundError when webhook belongs to different tenant', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue({
      ...mockWebhook,
      tenantId: 'other-tenant',
    });

    await expect(
      updateWebhook(repos, 'wh-1', 'tenant-1', { url: 'https://x.com' }),
    ).rejects.toThrow('Webhook not found');
  });
});

describe('deleteWebhook', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('soft-deletes by disabling and clearing events', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(mockWebhook);
    vi.mocked(repos.webhooks.update).mockResolvedValue({
      ...mockWebhook,
      isActive: false,
      events: [],
    });

    await deleteWebhook(repos, 'wh-1', 'tenant-1');

    expect(repos.webhooks.update).toHaveBeenCalledWith('wh-1', {
      isActive: false,
      events: [],
    });
  });

  it('throws NotFoundError when webhook does not exist', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(null);

    await expect(deleteWebhook(repos, 'missing', 'tenant-1')).rejects.toThrow('Webhook not found');
  });

  it('throws NotFoundError when webhook belongs to different tenant', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue({
      ...mockWebhook,
      tenantId: 'other-tenant',
    });

    await expect(deleteWebhook(repos, 'wh-1', 'tenant-1')).rejects.toThrow('Webhook not found');
  });
});

describe('rotateWebhookSecret', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('generates a new secret and updates the webhook', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(mockWebhook);
    vi.mocked(repos.webhooks.update).mockResolvedValue({
      ...mockWebhook,
      secret: 'new-secret-value',
    });

    const result = await rotateWebhookSecret(repos, 'wh-1', 'tenant-1');

    expect(result.secret).toBe('new-secret-value');

    // Verify update was called with a new secret
    const updateCall = vi.mocked(repos.webhooks.update).mock.calls[0];
    expect(updateCall).toBeDefined();
    const updateArg = updateCall?.[1] as Record<string, unknown> | undefined;
    expect(typeof updateArg?.['secret']).toBe('string');
    expect(updateArg?.['secret']).not.toBe(mockWebhook.secret);
  });

  it('throws NotFoundError when webhook does not exist', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue(null);

    await expect(rotateWebhookSecret(repos, 'missing', 'tenant-1')).rejects.toThrow(
      'Webhook not found',
    );
  });

  it('throws NotFoundError when webhook belongs to different tenant', async () => {
    vi.mocked(repos.webhooks.findById).mockResolvedValue({
      ...mockWebhook,
      tenantId: 'other-tenant',
    });

    await expect(rotateWebhookSecret(repos, 'wh-1', 'tenant-1')).rejects.toThrow(
      'Webhook not found',
    );
  });
});
