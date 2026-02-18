// main/server/core/src/tenants/membership-service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { addMember, listMembers, removeMember, updateMemberRole } from './membership-service';

import type { TenantRole } from '@bslt/shared';
import type { Repositories } from '../../../db/src';

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
    users: {
      findById: vi.fn(),
    } as unknown as Repositories['users'],
    // Stub the rest with empty objects
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
    webauthnCredentials: {} as Repositories['webauthnCredentials'],
    trustedDevices: {} as Repositories['trustedDevices'],
    files: {} as Repositories['files'],
  };
}

const mockTenantResult = {
  id: 't-1',
  name: 'Workspace',
  slug: 'ws',
  logoUrl: null,
  ownerId: 'user-1',
  isActive: true,
  metadata: {},
  allowedEmailDomains: [] as string[],
  createdAt: new Date(),
  updatedAt: new Date(),
};

function mockMembership(userId: string, role: TenantRole, id?: string) {
  return {
    id: id ?? `m-${userId}`,
    tenantId: 't-1',
    userId,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('listMembers', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('returns all members when user is a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.memberships.findByTenantId).mockResolvedValue([
      mockMembership('user-1', 'owner'),
      mockMembership('user-2', 'member'),
    ]);

    const result = await listMembers(repos, 't-1', 'user-1');
    expect(result).toHaveLength(2);
    expect(result[0]?.role).toBe('owner');
    expect(result[1]?.role).toBe('member');
  });

  it('throws NotFoundError when tenant does not exist', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue(null);

    await expect(listMembers(repos, 'missing', 'user-1')).rejects.toThrow('Workspace not found');
  });

  it('throws ForbiddenError when user is not a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(null);

    await expect(listMembers(repos, 't-1', 'user-1')).rejects.toThrow(
      'You are not a member of this workspace',
    );
  });
});

describe('addMember', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('adds a member when actor is owner', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'owner'))
      .mockResolvedValueOnce(null); // target not yet a member

    vi.mocked(repos.users.findById).mockResolvedValue({
      id: 'user-2',
      email: 'u2@test.com',
    } as ReturnType<Repositories['users']['findById']> extends Promise<infer T> ? T : never);

    vi.mocked(repos.memberships.create).mockResolvedValue(mockMembership('user-2', 'member'));

    const result = await addMember(repos, 't-1', 'user-1', 'user-2', 'member');
    expect(result.userId).toBe('user-2');
    expect(result.role).toBe('member');
  });

  it('throws ForbiddenError when actor cannot assign role', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValueOnce(
      mockMembership('user-1', 'member'),
    );

    await expect(addMember(repos, 't-1', 'user-1', 'user-2', 'member')).rejects.toThrow(
      'You cannot assign this role',
    );
  });

  it('throws NotFoundError when target user does not exist', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValueOnce(
      mockMembership('user-1', 'owner'),
    );

    vi.mocked(repos.users.findById).mockResolvedValue(null);

    await expect(addMember(repos, 't-1', 'user-1', 'user-2', 'member')).rejects.toThrow(
      'User not found',
    );
  });

  it('throws BadRequestError when user is already a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'owner'))
      .mockResolvedValueOnce(mockMembership('user-2', 'member')); // already a member

    vi.mocked(repos.users.findById).mockResolvedValue({
      id: 'user-2',
      email: 'u2@test.com',
    } as ReturnType<Repositories['users']['findById']> extends Promise<infer T> ? T : never);

    await expect(addMember(repos, 't-1', 'user-1', 'user-2', 'member')).rejects.toThrow(
      'User is already a member of this workspace',
    );
  });
});

describe('updateMemberRole', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('updates role when actor has permission', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'owner'))
      .mockResolvedValueOnce(mockMembership('user-2', 'member'));

    vi.mocked(repos.memberships.update).mockResolvedValue(mockMembership('user-2', 'admin'));

    const result = await updateMemberRole(repos, 't-1', 'user-1', 'user-2', 'admin');
    expect(result.role).toBe('admin');
  });

  it('throws ForbiddenError when actor lacks permission to change role', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'member'))
      .mockResolvedValueOnce(mockMembership('user-2', 'viewer'));

    await expect(updateMemberRole(repos, 't-1', 'user-1', 'user-2', 'admin')).rejects.toThrow(
      "You cannot change this member's role",
    );
  });

  it('throws NotFoundError when target is not a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'owner'))
      .mockResolvedValueOnce(null);

    await expect(updateMemberRole(repos, 't-1', 'user-1', 'user-2', 'admin')).rejects.toThrow(
      'Member not found in this workspace',
    );
  });
});

describe('removeMember', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('removes a member when actor has permission', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'owner'))
      .mockResolvedValueOnce(mockMembership('user-2', 'member'));

    vi.mocked(repos.memberships.delete).mockResolvedValue(true);

    await removeMember(repos, 't-1', 'user-1', 'user-2');
    expect(repos.memberships.delete).toHaveBeenCalled();
  });

  it('allows self-removal for non-owner', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValueOnce(
      mockMembership('user-2', 'member'),
    );

    vi.mocked(repos.memberships.delete).mockResolvedValue(true);

    await removeMember(repos, 't-1', 'user-2', 'user-2');
    expect(repos.memberships.delete).toHaveBeenCalled();
  });

  it('blocks sole owner from self-removal', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValueOnce(
      mockMembership('user-1', 'owner'),
    );

    vi.mocked(repos.memberships.findByTenantId).mockResolvedValue([
      mockMembership('user-1', 'owner'),
      mockMembership('user-2', 'member'),
    ]);

    await expect(removeMember(repos, 't-1', 'user-1', 'user-1')).rejects.toThrow(
      'Cannot leave workspace as sole owner',
    );
  });

  it('allows owner self-removal when there are multiple owners', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValueOnce(
      mockMembership('user-1', 'owner'),
    );

    vi.mocked(repos.memberships.findByTenantId).mockResolvedValue([
      mockMembership('user-1', 'owner'),
      mockMembership('user-3', 'owner'),
    ]);

    vi.mocked(repos.memberships.delete).mockResolvedValue(true);

    await removeMember(repos, 't-1', 'user-1', 'user-1');
    expect(repos.memberships.delete).toHaveBeenCalled();
  });

  it('throws ForbiddenError when actor cannot remove target', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'member'))
      .mockResolvedValueOnce(mockMembership('user-2', 'admin'));

    await expect(removeMember(repos, 't-1', 'user-1', 'user-2')).rejects.toThrow(
      'You cannot remove this member',
    );
  });

  it('throws NotFoundError when target is not a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser)
      .mockResolvedValueOnce(mockMembership('user-1', 'owner'))
      .mockResolvedValueOnce(null);

    await expect(removeMember(repos, 't-1', 'user-1', 'user-2')).rejects.toThrow(
      'Member not found in this workspace',
    );
  });
});
