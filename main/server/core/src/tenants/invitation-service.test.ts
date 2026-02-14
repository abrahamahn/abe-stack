// main/server/core/src/tenants/invitation-service.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
    acceptInvitation,
    createInvitation,
    listInvitations,
    resendInvitation,
    revokeInvitation,
} from './invitation-service';

import type { Repositories } from '../../../db/src';
import type { InvitationStatus, TenantRole } from '@abe-stack/shared';

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
    invitations: {
      create: vi.fn(),
      findById: vi.fn(),
      findByTenantId: vi.fn(),
      findPendingByTenantAndEmail: vi.fn(),
      findPendingByEmail: vi.fn(),
      countPendingByTenantId: vi.fn().mockResolvedValue(0),
      findExpiredPending: vi.fn(),
      update: vi.fn(),
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

function mockMembership(userId: string, role: TenantRole) {
  return {
    id: `m-${userId}`,
    tenantId: 't-1',
    userId,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function mockInvitation(
  overrides: Partial<{
    id: string;
    tenantId: string;
    email: string;
    role: TenantRole;
    status: InvitationStatus;
    invitedById: string;
    expiresAt: Date;
    acceptedAt: Date | null;
    createdAt: Date;
  }> = {},
) {
  return {
    id: overrides.id ?? 'inv-1',
    tenantId: overrides.tenantId ?? 't-1',
    email: overrides.email ?? 'invited@test.com',
    role: overrides.role ?? ('member' as TenantRole),
    status: overrides.status ?? ('pending' as InvitationStatus),
    invitedById: overrides.invitedById ?? 'user-1',
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    acceptedAt: overrides.acceptedAt ?? null,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('createInvitation', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('creates an invitation when actor is owner', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findPendingByTenantAndEmail).mockResolvedValue(null);
    vi.mocked(repos.invitations.create).mockResolvedValue(mockInvitation());

    const result = await createInvitation(repos, 't-1', 'user-1', 'invited@test.com', 'member');
    expect(result.email).toBe('invited@test.com');
    expect(result.role).toBe('member');
    expect(result.status).toBe('pending');
  });

  it('throws NotFoundError when tenant does not exist', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue(null);

    await expect(
      createInvitation(repos, 'missing', 'user-1', 'test@test.com', 'member'),
    ).rejects.toThrow('Workspace not found');
  });

  it('throws ForbiddenError when actor is not a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(null);

    await expect(
      createInvitation(repos, 't-1', 'user-1', 'test@test.com', 'member'),
    ).rejects.toThrow('You are not a member of this workspace');
  });

  it('throws ForbiddenError when actor cannot assign the role', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'member'),
    );

    await expect(
      createInvitation(repos, 't-1', 'user-1', 'test@test.com', 'admin'),
    ).rejects.toThrow('You cannot invite with this role');
  });

  it('throws BadRequestError when email domain is restricted', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      ...mockTenantResult,
      allowedEmailDomains: ['company.com'],
    });
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );

    await expect(
      createInvitation(repos, 't-1', 'user-1', 'user@other.com', 'member'),
    ).rejects.toThrow('This email domain is not allowed for this workspace');
  });

  it('allows invitation when email matches allowed domain', async () => {
    vi.mocked(repos.tenants.findById).mockResolvedValue({
      ...mockTenantResult,
      allowedEmailDomains: ['company.com'],
    });
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findPendingByTenantAndEmail).mockResolvedValue(null);
    vi.mocked(repos.invitations.create).mockResolvedValue(
      mockInvitation({ email: 'user@company.com' }),
    );

    const result = await createInvitation(repos, 't-1', 'user-1', 'user@company.com', 'member');
    expect(result.email).toBe('user@company.com');
  });

  it('throws BadRequestError when invitation already pending', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findPendingByTenantAndEmail).mockResolvedValue(mockInvitation());

    await expect(
      createInvitation(repos, 't-1', 'user-1', 'invited@test.com', 'member'),
    ).rejects.toThrow('An invitation for this email is already pending');
  });

  it('throws BadRequestError when max pending invitations reached', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findPendingByTenantAndEmail).mockResolvedValue(null);
    vi.mocked(repos.invitations.countPendingByTenantId).mockResolvedValue(50);

    await expect(
      createInvitation(repos, 't-1', 'user-1', 'new@test.com', 'member'),
    ).rejects.toThrow('maximum of 50 pending invitations');
  });

  it('allows invitation when pending count is below the limit', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findPendingByTenantAndEmail).mockResolvedValue(null);
    vi.mocked(repos.invitations.countPendingByTenantId).mockResolvedValue(49);
    vi.mocked(repos.invitations.create).mockResolvedValue(mockInvitation());

    const result = await createInvitation(repos, 't-1', 'user-1', 'new@test.com', 'member');
    expect(result.email).toBe('invited@test.com');
  });
});

describe('listInvitations', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('returns invitations when user is a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findByTenantId).mockResolvedValue([
      mockInvitation(),
      mockInvitation({ id: 'inv-2', email: 'other@test.com' }),
    ]);

    const result = await listInvitations(repos, 't-1', 'user-1');
    expect(result).toHaveLength(2);
  });

  it('throws ForbiddenError when user is not a member', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(null);

    await expect(listInvitations(repos, 't-1', 'user-1')).rejects.toThrow(
      'You are not a member of this workspace',
    );
  });
});

describe('acceptInvitation', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
  });

  it('accepts a valid pending invitation', async () => {
    const inv = mockInvitation();
    vi.mocked(repos.invitations.findById).mockResolvedValue(inv);
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(null);
    vi.mocked(repos.memberships.create).mockResolvedValue(mockMembership('user-2', 'member'));
    vi.mocked(repos.invitations.update).mockResolvedValue(
      mockInvitation({ status: 'accepted', acceptedAt: new Date() }),
    );

    const result = await acceptInvitation(repos, 'inv-1', 'user-2', 'invited@test.com');
    expect(result.status).toBe('accepted');
    expect(repos.memberships.create).toHaveBeenCalledWith({
      tenantId: 't-1',
      userId: 'user-2',
      role: 'member',
    });
  });

  it('throws NotFoundError when invitation does not exist', async () => {
    vi.mocked(repos.invitations.findById).mockResolvedValue(null);

    await expect(acceptInvitation(repos, 'missing', 'user-2', 'test@test.com')).rejects.toThrow(
      'Invitation not found',
    );
  });

  it('throws BadRequestError when invitation is expired', async () => {
    const expired = mockInvitation({ expiresAt: new Date(Date.now() - 1000) });
    vi.mocked(repos.invitations.findById).mockResolvedValue(expired);

    await expect(acceptInvitation(repos, 'inv-1', 'user-2', 'invited@test.com')).rejects.toThrow(
      'This invitation has expired',
    );
  });

  it('throws BadRequestError when invitation is already accepted', async () => {
    const accepted = mockInvitation({ status: 'accepted' });
    vi.mocked(repos.invitations.findById).mockResolvedValue(accepted);

    await expect(acceptInvitation(repos, 'inv-1', 'user-2', 'invited@test.com')).rejects.toThrow(
      'This invitation cannot be accepted',
    );
  });

  it('throws ForbiddenError when email does not match', async () => {
    vi.mocked(repos.invitations.findById).mockResolvedValue(mockInvitation());

    await expect(acceptInvitation(repos, 'inv-1', 'user-2', 'wrong@test.com')).rejects.toThrow(
      'This invitation was sent to a different email address',
    );
  });

  it('throws BadRequestError when user is already a member', async () => {
    vi.mocked(repos.invitations.findById).mockResolvedValue(mockInvitation());
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-2', 'member'),
    );

    await expect(acceptInvitation(repos, 'inv-1', 'user-2', 'invited@test.com')).rejects.toThrow(
      'You are already a member of this workspace',
    );
  });
});

describe('revokeInvitation', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('revokes a pending invitation when actor is admin', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'admin'),
    );
    vi.mocked(repos.invitations.findById).mockResolvedValue(mockInvitation());
    vi.mocked(repos.invitations.update).mockResolvedValue(mockInvitation({ status: 'revoked' }));

    const result = await revokeInvitation(repos, 't-1', 'inv-1', 'user-1');
    expect(result.status).toBe('revoked');
  });

  it('throws ForbiddenError when actor is a member (not admin)', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'member'),
    );

    await expect(revokeInvitation(repos, 't-1', 'inv-1', 'user-1')).rejects.toThrow(
      'Only admins and owners can revoke invitations',
    );
  });

  it('throws NotFoundError when invitation belongs to different tenant', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findById).mockResolvedValue(
      mockInvitation({ tenantId: 't-other' }),
    );

    await expect(revokeInvitation(repos, 't-1', 'inv-1', 'user-1')).rejects.toThrow(
      'Invitation not found',
    );
  });

  it('throws BadRequestError when invitation is already accepted', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findById).mockResolvedValue(mockInvitation({ status: 'accepted' }));

    await expect(revokeInvitation(repos, 't-1', 'inv-1', 'user-1')).rejects.toThrow(
      'This invitation cannot be revoked',
    );
  });
});

describe('resendInvitation', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.mocked(repos.tenants.findById).mockResolvedValue(mockTenantResult);
  });

  it('returns invitation info for a pending invitation', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findById).mockResolvedValue(mockInvitation());

    const result = await resendInvitation(repos, 't-1', 'inv-1', 'user-1');
    expect(result.id).toBe('inv-1');
    expect(result.status).toBe('pending');
  });

  it('throws ForbiddenError when actor is a member (not admin)', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'viewer'),
    );

    await expect(resendInvitation(repos, 't-1', 'inv-1', 'user-1')).rejects.toThrow(
      'Only admins and owners can resend invitations',
    );
  });

  it('throws BadRequestError when invitation is not pending', async () => {
    vi.mocked(repos.memberships.findByTenantAndUser).mockResolvedValue(
      mockMembership('user-1', 'owner'),
    );
    vi.mocked(repos.invitations.findById).mockResolvedValue(mockInvitation({ status: 'revoked' }));

    await expect(resendInvitation(repos, 't-1', 'inv-1', 'user-1')).rejects.toThrow(
      'Only pending invitations can be resent',
    );
  });
});
