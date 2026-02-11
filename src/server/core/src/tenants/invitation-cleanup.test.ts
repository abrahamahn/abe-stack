// src/server/core/src/tenants/invitation-cleanup.test.ts
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { expireStaleInvitations } from './invitation-cleanup';

import type { Repositories } from '@abe-stack/db';
import type { InvitationStatus, TenantRole } from '@abe-stack/shared';

// ============================================================================
// Helpers
// ============================================================================

function createMockInvitationRepo() {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByTenantId: vi.fn(),
    findPendingByTenantAndEmail: vi.fn(),
    findPendingByEmail: vi.fn(),
    countPendingByTenantId: vi.fn(),
    findExpiredPending: vi.fn(),
    update: vi.fn(),
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
    email: overrides.email ?? 'user@test.com',
    role: overrides.role ?? ('member' as TenantRole),
    status: overrides.status ?? ('pending' as InvitationStatus),
    invitedById: overrides.invitedById ?? 'user-1',
    expiresAt: overrides.expiresAt ?? new Date(Date.now() - 1000),
    acceptedAt: overrides.acceptedAt ?? null,
    createdAt: overrides.createdAt ?? new Date(),
  };
}

function createMockLog() {
  return {
    info: vi.fn(),
    error: vi.fn(),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('expireStaleInvitations', () => {
  let invitations: ReturnType<typeof createMockInvitationRepo>;
  let log: ReturnType<typeof createMockLog>;

  beforeEach(() => {
    invitations = createMockInvitationRepo();
    log = createMockLog();
  });

  it('returns zero when no stale invitations exist', async () => {
    invitations.findExpiredPending.mockResolvedValue([]);

    const result = await expireStaleInvitations(
      { invitations } as unknown as Pick<Repositories, 'invitations'>,
      log,
    );

    expect(result.expiredCount).toBe(0);
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ batch: 200 }),
      'No stale invitations found',
    );
  });

  it('expires stale invitations and returns count', async () => {
    const staleInvitations = [
      mockInvitation({ id: 'inv-1' }),
      mockInvitation({ id: 'inv-2' }),
      mockInvitation({ id: 'inv-3' }),
    ];
    invitations.findExpiredPending.mockResolvedValue(staleInvitations);
    invitations.update.mockResolvedValue(mockInvitation({ status: 'expired' }));

    const result = await expireStaleInvitations(
      { invitations } as unknown as Pick<Repositories, 'invitations'>,
      log,
    );

    expect(result.expiredCount).toBe(3);
    expect(invitations.update).toHaveBeenCalledTimes(3);
    expect(invitations.update).toHaveBeenCalledWith('inv-1', { status: 'expired' });
    expect(invitations.update).toHaveBeenCalledWith('inv-2', { status: 'expired' });
    expect(invitations.update).toHaveBeenCalledWith('inv-3', { status: 'expired' });
    expect(log.info).toHaveBeenCalledWith(
      expect.objectContaining({ expiredCount: 3, totalFound: 3 }),
      'Invitation cleanup completed',
    );
  });

  it('handles partial failures gracefully', async () => {
    const staleInvitations = [mockInvitation({ id: 'inv-1' }), mockInvitation({ id: 'inv-2' })];
    invitations.findExpiredPending.mockResolvedValue(staleInvitations);
    invitations.update
      .mockResolvedValueOnce(mockInvitation({ status: 'expired' }))
      .mockRejectedValueOnce(new Error('DB error'));

    const result = await expireStaleInvitations(
      { invitations } as unknown as Pick<Repositories, 'invitations'>,
      log,
    );

    expect(result.expiredCount).toBe(1);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ invitationId: 'inv-2', error: 'DB error' }),
      'Failed to expire invitation',
    );
  });

  it('calls findExpiredPending with batch size limit', async () => {
    invitations.findExpiredPending.mockResolvedValue([]);

    await expireStaleInvitations(
      { invitations } as unknown as Pick<Repositories, 'invitations'>,
      log,
    );

    expect(invitations.findExpiredPending).toHaveBeenCalledWith(200);
  });
});
