// src/server/core/src/tenants/service.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  createTenant,
  deleteTenant,
  getTenantById,
  getUserTenants,
  transferOwnership,
  updateTenant,
} from './service';

import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Helpers
// ============================================================================

function createMockRepos(): Repositories {
  return {
    tenants: {
      create: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findByOwnerId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    memberships: {
      create: vi.fn(),
      findByTenantAndUser: vi.fn(),
      findByTenantId: vi.fn(),
      findByUserId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    // Stub the rest with empty objects - not used by tenant service
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
    webhooks: {} as Repositories['webhooks'],
    webhookDeliveries: {} as Repositories['webhookDeliveries'],
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

function createMockDb(): DbClient {
  const mockDb = {
    query: vi.fn(),
    queryOne: vi.fn(),
    execute: vi.fn(),
    raw: vi.fn(),
    transaction: vi.fn(((callback: (tx: DbClient) => Promise<unknown>) =>
      callback(mockDb as DbClient)) as DbClient['transaction']),
    healthCheck: vi.fn(),
    close: vi.fn(),
    getClient: vi.fn(),
  };
  return mockDb as unknown as DbClient;
}

const mockTenant = {
  id: 'tenant-1',
  name: 'My Workspace',
  slug: 'my-workspace',
  logo_url: null,
  owner_id: 'user-1',
  is_active: true,
  metadata: '{}',
  allowed_email_domains: '{}',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

const mockMembership = {
  id: 'membership-1',
  tenant_id: 'tenant-1',
  user_id: 'user-1',
  role: 'owner',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createTenant', () => {
  let repos: Repositories;
  let db: DbClient;

  beforeEach(() => {
    repos = createMockRepos();
    db = createMockDb();
    vi.mocked(repos.tenants.findBySlug).mockResolvedValue(null);
  });

  it('creates a tenant with auto-generated slug and owner membership', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([mockTenant]);
    vi.mocked(db.query).mockResolvedValueOnce([mockMembership]);

    const result = await createTenant(db, repos, 'user-1', { name: 'My Workspace' });

    expect(result.name).toBe('My Workspace');
    expect(result.slug).toBe('my-workspace');
    expect(result.ownerId).toBe('user-1');
    expect(result.role).toBe('owner');
  });

  it('uses provided slug when given', async () => {
    vi.mocked(db.query).mockResolvedValueOnce([{ ...mockTenant, slug: 'custom-slug' }]);
    vi.mocked(db.query).mockResolvedValueOnce([mockMembership]);

    const result = await createTenant(db, repos, 'user-1', {
      name: 'My Workspace',
      slug: 'custom-slug',
    });

    expect(result.slug).toBe('custom-slug');
  });

  it('appends random suffix when slug is taken', async () => {
    vi.mocked(repos.tenants.findBySlug)
      .mockResolvedValueOnce({
        id: 'other',
        name: 'Other',
        slug: 'my-workspace',
        logoUrl: null,
        ownerId: 'other-user',
        isActive: true,
        metadata: {},
        allowedEmailDomains: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce(null); // suffixed slug is available

    vi.mocked(db.query).mockResolvedValueOnce([{ ...mockTenant, slug: 'my-workspace-abc123' }]);
    vi.mocked(db.query).mockResolvedValueOnce([mockMembership]);

    const result = await createTenant(db, repos, 'user-1', { name: 'My Workspace' });

    expect(result.slug).toContain('my-workspace');
  });
});

describe('getUserTenants', () => {
  let db: DbClient;

  beforeEach(() => {
    db = createMockDb();
  });

  it('returns empty array when user has no memberships', async () => {
    vi.mocked(db.query).mockResolvedValue([]);

    const result = await getUserTenants(db, 'user-1');
    expect(result).toEqual([]);
  });

  it('returns tenants with roles from joined query', async () => {
    const now = new Date();
    vi.mocked(db.query).mockResolvedValue([
      {
        id: 't-1',
        name: 'Workspace 1',
        slug: 'ws-1',
        logo_url: null,
        owner_id: 'user-1',
        is_active: true,
        metadata: {},
        created_at: now,
        updated_at: now,
        role: 'owner',
      },
      {
        id: 't-2',
        name: 'Workspace 2',
        slug: 'ws-2',
        logo_url: null,
        owner_id: 'other-user',
        is_active: true,
        metadata: {},
        created_at: now,
        updated_at: now,
        role: 'member',
      },
    ]);

    const result = await getUserTenants(db, 'user-1');
    expect(result).toHaveLength(2);
    expect(result[0]?.name).toBe('Workspace 1');
    expect(result[0]?.role).toBe('owner');
    expect(result[1]?.name).toBe('Workspace 2');
    expect(result[1]?.role).toBe('member');
  });
});

describe('getTenantById', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('returns tenant with role when user is a member', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getTenantById(repos, 't-1', 'user-1');
    expect(result.id).toBe('t-1');
    expect(result.role).toBe('admin');
  });

  it('throws NotFoundError when tenant does not exist', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue(null);

    await expect(getTenantById(repos, 'missing', 'user-1')).rejects.toThrow('Workspace not found');
  });

  it('throws ForbiddenError when user is not a member', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'other-user',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(null);

    await expect(getTenantById(repos, 't-1', 'user-1')).rejects.toThrow(
      'You are not a member of this workspace',
    );
  });
});

describe('updateTenant', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('updates tenant when user is owner', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Old Name',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.tenants.update).mockResolvedValue({
      id: 't-1',
      name: 'New Name',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateTenant(repos, 't-1', 'user-1', { name: 'New Name' });
    expect(result.name).toBe('New Name');
    expect(result.role).toBe('owner');
  });

  it('updates tenant when user is admin', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Name',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'other-user',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.tenants.update).mockResolvedValue({
      id: 't-1',
      name: 'Updated',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'other-user',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateTenant(repos, 't-1', 'user-1', { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('throws ForbiddenError for member role', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Name',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'other-user',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'member',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(updateTenant(repos, 't-1', 'user-1', { name: 'x' })).rejects.toThrow(
      'Only owners and admins can update workspace settings',
    );
  });

  it('returns unchanged tenant when no update data provided', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Name',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateTenant(repos, 't-1', 'user-1', {});
    expect(result.name).toBe('Name');
    expect(repos.tenants.update).not.toHaveBeenCalled();
  });
});

describe('deleteTenant', () => {
  let repos: Repositories;
  let db: DbClient;

  beforeEach(() => {
    repos = createMockRepos();
    db = createMockDb();
  });

  it('deletes tenant when user is owner', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(db.execute).mockResolvedValue(1);

    await deleteTenant(db, repos, 't-1', 'user-1');

    // Verify transaction was called (which calls execute for delete)
    expect(db.transaction).toHaveBeenCalled();
  });

  it('throws ForbiddenError when user is not owner', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'other-user',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(deleteTenant(db, repos, 't-1', 'user-1')).rejects.toThrow(
      'Only the workspace owner can delete it',
    );
  });

  it('throws NotFoundError when tenant does not exist', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue(null);

    await expect(deleteTenant(db, repos, 'missing', 'user-1')).rejects.toThrow(
      'Workspace not found',
    );
  });

  it('throws ForbiddenError when user is not a member', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'other-user',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(null);

    await expect(deleteTenant(db, repos, 't-1', 'user-1')).rejects.toThrow(
      'Only the workspace owner can delete it',
    );
  });
});

describe('transferOwnership', () => {
  let repos: Repositories;
  let db: DbClient;

  beforeEach(() => {
    repos = createMockRepos();
    db = createMockDb();
  });

  it('transfers ownership atomically in a transaction', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce({
        id: 'm-1',
        tenantId: 't-1',
        userId: 'user-1',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce({
        id: 'm-2',
        tenantId: 't-1',
        userId: 'user-2',
        role: 'admin',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    vi.mocked(db.execute).mockResolvedValue(1);

    await transferOwnership(db, repos, 't-1', 'user-1', 'user-2');

    expect(db.transaction).toHaveBeenCalled();
    // Three execute calls: promote new owner, demote current owner, update tenant owner_id
    expect(db.execute).toHaveBeenCalledTimes(3);
  });

  it('throws NotFoundError when tenant does not exist', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue(null);

    await expect(transferOwnership(db, repos, 't-1', 'user-1', 'user-2')).rejects.toThrow(
      'Workspace not found',
    );
  });

  it('throws ForbiddenError when current user is not owner', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValueOnce({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(transferOwnership(db, repos, 't-1', 'user-1', 'user-2')).rejects.toThrow(
      'Only the workspace owner can transfer ownership',
    );
  });

  it('throws BadRequestError when transferring to self', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValueOnce({
      id: 'm-1',
      tenantId: 't-1',
      userId: 'user-1',
      role: 'owner',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(transferOwnership(db, repos, 't-1', 'user-1', 'user-1')).rejects.toThrow(
      'Cannot transfer ownership to yourself',
    );
  });

  it('throws BadRequestError when new owner is not a member', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      id: 't-1',
      name: 'Workspace',
      slug: 'ws',
      logoUrl: null,
      ownerId: 'user-1',
      isActive: true,
      metadata: {},
      allowedEmailDomains: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce({
        id: 'm-1',
        tenantId: 't-1',
        userId: 'user-1',
        role: 'owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .mockResolvedValueOnce(null);

    await expect(transferOwnership(db, repos, 't-1', 'user-1', 'user-2')).rejects.toThrow(
      'The target user is not a member of this workspace',
    );
  });
});
