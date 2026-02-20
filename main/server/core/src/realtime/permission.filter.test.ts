// main/server/core/src/realtime/permission.filter.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { canAccessTenant, filterRecordsForUser } from './permission.filter';

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

function createMockMembership(
  overrides: Partial<Membership> = {},
): Membership {
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
// Tests: filterRecordsForUser
// ============================================================================

describe('filterRecordsForUser', () => {
  let repo: MembershipRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockMembershipRepo();
  });

  it('should return all records when user has access to the workspace', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ role: 'member' }),
    );

    const records = [
      createMockRecord({ id: 'rec-1' }),
      createMockRecord({ id: 'rec-2' }),
      createMockRecord({ id: 'rec-3' }),
    ];

    const result = await filterRecordsForUser('user-1', 'tenant-1', records, repo);

    expect(result.allowed).toHaveLength(3);
    expect(result.deniedCount).toBe(0);
  });

  it('should return empty array when user has no workspace access', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(null);

    const records = [
      createMockRecord({ id: 'rec-1' }),
      createMockRecord({ id: 'rec-2' }),
    ];

    const result = await filterRecordsForUser('outsider', 'tenant-1', records, repo);

    expect(result.allowed).toHaveLength(0);
    expect(result.deniedCount).toBe(2);
  });

  it('should filter out cross-workspace records', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ role: 'admin' }),
    );

    const records = [
      createMockRecord({ id: 'rec-1', tenantId: 'tenant-1' }),
      createMockRecord({ id: 'rec-2', tenantId: 'tenant-2' }),
      createMockRecord({ id: 'rec-3', tenantId: 'tenant-1' }),
    ];

    const result = await filterRecordsForUser('user-1', 'tenant-1', records, repo);

    expect(result.allowed).toHaveLength(2);
    expect(result.allowed.map((r) => r.id)).toEqual(['rec-1', 'rec-3']);
    expect(result.deniedCount).toBe(1);
  });

  it('should return empty result for empty records array', async () => {
    const result = await filterRecordsForUser('user-1', 'tenant-1', [], repo);

    expect(result.allowed).toHaveLength(0);
    expect(result.deniedCount).toBe(0);
    // Should not even call the repo for empty input
    expect(repo.findByUserAndTenant).not.toHaveBeenCalled();
  });

  it('should preserve record types in output', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ role: 'viewer' }),
    );

    interface ExtendedRecord extends PermissionRecord {
      title: string;
      extra: number;
    }

    const records: ExtendedRecord[] = [
      { id: 'rec-1', tenantId: 'tenant-1', ownerId: 'user-1', title: 'Test', extra: 42 },
    ];

    const result = await filterRecordsForUser('user-1', 'tenant-1', records, repo);

    expect(result.allowed).toHaveLength(1);
    expect(result.allowed[0]?.title).toBe('Test');
    expect(result.allowed[0]?.extra).toBe(42);
  });

  it('should handle mixed access records', async () => {
    // First call for records in tenant-1, second for record in tenant-2
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ role: 'member' }),
    );

    const records = [
      createMockRecord({ id: 'rec-1', tenantId: 'tenant-1' }),
      createMockRecord({ id: 'rec-2', tenantId: 'tenant-1' }),
      createMockRecord({ id: 'rec-3', tenantId: 'different-tenant' }),
    ];

    const result = await filterRecordsForUser('user-1', 'tenant-1', records, repo);

    expect(result.allowed).toHaveLength(2);
    expect(result.deniedCount).toBe(1);
  });

  it('should evaluate all records in parallel', async () => {
    let callCount = 0;
    vi.mocked(repo.findByUserAndTenant).mockImplementation(async () => {
      callCount++;
      // Simulate async delay
      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });
      return createMockMembership({ role: 'member' });
    });

    const records = [
      createMockRecord({ id: 'rec-1' }),
      createMockRecord({ id: 'rec-2' }),
      createMockRecord({ id: 'rec-3' }),
    ];

    const result = await filterRecordsForUser('user-1', 'tenant-1', records, repo);

    expect(result.allowed).toHaveLength(3);
    expect(callCount).toBe(3);
  });
});

// ============================================================================
// Tests: canAccessTenant
// ============================================================================

describe('canAccessTenant', () => {
  let repo: MembershipRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repo = createMockMembershipRepo();
  });

  it('should return true when user is a member of the tenant', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
      createMockMembership({ role: 'viewer' }),
    );

    const result = await canAccessTenant('user-1', 'tenant-1', repo);

    expect(result).toBe(true);
  });

  it('should return false when user is not a member of the tenant', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(null);

    const result = await canAccessTenant('outsider', 'tenant-1', repo);

    expect(result).toBe(false);
  });

  it('should query the repo with the correct parameters', async () => {
    vi.mocked(repo.findByUserAndTenant).mockResolvedValue(null);

    await canAccessTenant('user-42', 'tenant-99', repo);

    expect(repo.findByUserAndTenant).toHaveBeenCalledWith('user-42', 'tenant-99');
  });

  it('should return true for all role types', async () => {
    const roles = ['owner', 'admin', 'member', 'viewer'] as const;

    for (const role of roles) {
      vi.mocked(repo.findByUserAndTenant).mockResolvedValue(
        createMockMembership({ role }),
      );

      const result = await canAccessTenant('user-1', 'tenant-1', repo);
      expect(result).toBe(true);
    }
  });
});
