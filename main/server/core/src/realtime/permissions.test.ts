// main/server/core/src/realtime/permissions.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { canReadRecord, canWriteRecord } from './permissions';

import type { MembershipRepository, PermissionRecord } from './permissions';
import type { Membership } from '@bslt/shared';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockMembershipRepo(): MembershipRepository {
  return {
    findByUserAndTenant: vi.fn(),
  };
}

function createMockMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'mem-1' as Membership['id'],
    tenantId: 'tenant-1' as Membership['tenantId'],
    userId: 'user-1' as Membership['userId'],
    role: 'member',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createMockRecord(overrides: Partial<PermissionRecord> = {}): PermissionRecord {
  return {
    id: 'rec-1',
    tenantId: 'tenant-1',
    ownerId: 'user-1',
    ...overrides,
  };
}

// ============================================================================
// Tests: canReadRecord
// ============================================================================

describe('canReadRecord', () => {
  let repo: MembershipRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockMembershipRepo();
  });

  it('should allow owner to read own records', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(createMockMembership({ role: 'owner' }));
    const record = createMockRecord();

    const result = await canReadRecord('user-1', 'tenant-1', record, repo);

    expect(result.allowed).toBe(true);
  });

  it('should allow admin to read workspace records', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ userId: 'user-2' as Membership['userId'], role: 'admin' }),
    );
    const record = createMockRecord({ ownerId: 'user-1' });

    const result = await canReadRecord('user-2', 'tenant-1', record, repo);

    expect(result.allowed).toBe(true);
  });

  it('should allow member to read workspace records', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ userId: 'user-3' as Membership['userId'], role: 'member' }),
    );
    const record = createMockRecord({ ownerId: 'user-1' });

    const result = await canReadRecord('user-3', 'tenant-1', record, repo);

    expect(result.allowed).toBe(true);
  });

  it('should allow viewer to read workspace records', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ userId: 'user-4' as Membership['userId'], role: 'viewer' }),
    );
    const record = createMockRecord({ ownerId: 'user-1' });

    const result = await canReadRecord('user-4', 'tenant-1', record, repo);

    expect(result.allowed).toBe(true);
  });

  it('should deny access to user outside workspace', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(null);
    const record = createMockRecord();

    const result = await canReadRecord('outsider-user', 'tenant-1', record, repo);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not a member');
  });

  it('should deny cross-workspace access', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(createMockMembership({ role: 'owner' }));
    const record = createMockRecord({ tenantId: 'tenant-2' });

    const result = await canReadRecord('user-1', 'tenant-1', record, repo);

    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Cross-workspace');
  });

  it('should check membership for the correct tenant', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(createMockMembership());
    const record = createMockRecord();

    await canReadRecord('user-1', 'tenant-1', record, repo);

    expect(repo.findByUserAndTenant).toHaveBeenCalledWith('user-1', 'tenant-1');
  });
});

// ============================================================================
// Tests: canWriteRecord
// ============================================================================

describe('canWriteRecord', () => {
  let repo: MembershipRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockMembershipRepo();
  });

  describe('owner role', () => {
    it('should allow owner to write own records', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ role: 'owner' }),
      );
      const record = createMockRecord({ ownerId: 'user-1' });

      const result = await canWriteRecord('user-1', 'tenant-1', record, repo);

      expect(result.allowed).toBe(true);
    });

    it('should allow owner to write any workspace record', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ role: 'owner' }),
      );
      const record = createMockRecord({ ownerId: 'other-user' });

      const result = await canWriteRecord('user-1', 'tenant-1', record, repo);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('owner');
    });
  });

  describe('admin role', () => {
    it('should allow admin to write own records', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ userId: 'admin-user' as Membership['userId'], role: 'admin' }),
      );
      const record = createMockRecord({ ownerId: 'admin-user' });

      const result = await canWriteRecord('admin-user', 'tenant-1', record, repo);

      expect(result.allowed).toBe(true);
    });

    it('should allow admin to write any workspace record', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ userId: 'admin-user' as Membership['userId'], role: 'admin' }),
      );
      const record = createMockRecord({ ownerId: 'other-user' });

      const result = await canWriteRecord('admin-user', 'tenant-1', record, repo);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('admin');
    });
  });

  describe('member role', () => {
    it('should allow member to write own records', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ userId: 'member-user' as Membership['userId'], role: 'member' }),
      );
      const record = createMockRecord({ ownerId: 'member-user' });

      const result = await canWriteRecord('member-user', 'tenant-1', record, repo);

      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('record owner');
    });

    it('should deny member from writing records owned by others', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ userId: 'member-user' as Membership['userId'], role: 'member' }),
      );
      const record = createMockRecord({ ownerId: 'other-user' });

      const result = await canWriteRecord('member-user', 'tenant-1', record, repo);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('members can only modify their own');
    });
  });

  describe('viewer role', () => {
    it('should deny viewer from writing any record', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ userId: 'viewer-user' as Membership['userId'], role: 'viewer' }),
      );
      const record = createMockRecord({ ownerId: 'viewer-user' });

      const result = await canWriteRecord('viewer-user', 'tenant-1', record, repo);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('viewers cannot modify');
    });

    it('should deny viewer from writing records they do not own', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ userId: 'viewer-user' as Membership['userId'], role: 'viewer' }),
      );
      const record = createMockRecord({ ownerId: 'other-user' });

      const result = await canWriteRecord('viewer-user', 'tenant-1', record, repo);

      expect(result.allowed).toBe(false);
    });
  });

  describe('non-member access', () => {
    it('should deny user outside workspace', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(null);
      const record = createMockRecord();

      const result = await canWriteRecord('outsider-user', 'tenant-1', record, repo);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not a member');
    });
  });

  describe('cross-workspace access', () => {
    it('should deny cross-workspace write access', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ role: 'owner' }),
      );
      const record = createMockRecord({ tenantId: 'tenant-2' });

      const result = await canWriteRecord('user-1', 'tenant-1', record, repo);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-workspace');
    });

    it('should deny access even if admin in different workspace', async () => {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ role: 'admin' }),
      );
      const record = createMockRecord({ tenantId: 'tenant-other' });

      const result = await canWriteRecord('user-1', 'tenant-1', record, repo);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Cross-workspace');
    });
  });
});
