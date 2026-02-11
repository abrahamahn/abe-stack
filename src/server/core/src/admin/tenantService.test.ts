// src/server/core/src/admin/tenantService.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getTenantDetail,
  listAllTenants,
  suspendTenant,
  TenantNotFoundError,
  unsuspendTenant,
} from './tenantService';

import type { DbClient, Repositories } from '@abe-stack/db';

// ============================================================================
// Mock Factories
// ============================================================================

interface MockTenant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  ownerId: string;
  isActive: boolean;
  metadata: Record<string, unknown>;
  allowedEmailDomains: string[];
  createdAt: Date;
  updatedAt: Date;
}

function createMockTenant(overrides: Partial<MockTenant> = {}): MockTenant {
  return {
    id: 'tenant-123',
    name: 'Test Workspace',
    slug: 'test-workspace',
    logoUrl: null,
    ownerId: 'owner-123',
    isActive: true,
    metadata: {},
    allowedEmailDomains: [],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
}

function createMockRepos(): Pick<Repositories, 'tenants' | 'memberships'> {
  return {
    tenants: {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findByOwnerId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    memberships: {
      findByTenantId: vi.fn().mockResolvedValue([
        { id: 'mem-1', tenantId: 'tenant-123', userId: 'user-1', role: 'owner' },
        { id: 'mem-2', tenantId: 'tenant-123', userId: 'user-2', role: 'member' },
      ]),
      findByTenantAndUser: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as Pick<Repositories, 'tenants' | 'memberships'>;
}

function createMockDbClient(): DbClient {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({ count: '0' }),
    execute: vi.fn(),
  } as unknown as DbClient;
}

// ============================================================================
// Tests
// ============================================================================

describe('Admin Tenant Service', () => {
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockDb: ReturnType<typeof createMockDbClient>;

  beforeEach(() => {
    mockRepos = createMockRepos();
    mockDb = createMockDbClient();
    vi.clearAllMocks();
  });

  describe('listAllTenants', () => {
    test('should return empty list when no tenants exist', async () => {
      const result = await listAllTenants(mockDb, mockRepos);

      expect(result.tenants).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    test('should return tenants with member counts', async () => {
      const tenant = createMockTenant();
      vi.mocked(mockDb.query).mockResolvedValue([
        {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logo_url: tenant.logoUrl,
          owner_id: tenant.ownerId,
          is_active: tenant.isActive,
          metadata: tenant.metadata,
          allowed_email_domains: tenant.allowedEmailDomains,
          created_at: tenant.createdAt,
          updated_at: tenant.updatedAt,
        },
      ]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '1' });

      const result = await listAllTenants(mockDb, mockRepos);

      expect(result.tenants).toHaveLength(1);
      expect(result.tenants[0]?.name).toBe('Test Workspace');
      expect(result.tenants[0]?.memberCount).toBe(2);
      expect(result.total).toBe(1);
    });

    test('should respect pagination options', async () => {
      const result = await listAllTenants(mockDb, mockRepos, { limit: 10, offset: 5 });

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
    });
  });

  describe('getTenantDetail', () => {
    test('should return tenant detail with member count', async () => {
      const tenant = createMockTenant();
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await getTenantDetail(mockRepos, 'tenant-123');

      expect(result.id).toBe('tenant-123');
      expect(result.name).toBe('Test Workspace');
      expect(result.memberCount).toBe(2);
      expect(result.metadata).toEqual({});
      expect(result.allowedEmailDomains).toEqual([]);
      expect(result.createdAt).toBe(tenant.createdAt.toISOString());
    });

    test('should throw TenantNotFoundError when tenant not found', async () => {
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(null);

      await expect(getTenantDetail(mockRepos, 'nonexistent')).rejects.toThrow(TenantNotFoundError);
      await expect(getTenantDetail(mockRepos, 'nonexistent')).rejects.toThrow(
        'Tenant not found: nonexistent',
      );
    });
  });

  describe('suspendTenant', () => {
    test('should suspend an active tenant', async () => {
      const tenant = createMockTenant({ isActive: true });
      const suspendedTenant = createMockTenant({ isActive: false });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);
      vi.mocked(mockRepos.tenants.update).mockResolvedValue(suspendedTenant);

      const result = await suspendTenant(mockRepos, 'tenant-123', 'Violation');

      expect(result.message).toBe('Tenant suspended successfully');
      expect(result.tenant.isActive).toBe(false);
      expect(mockRepos.tenants.update).toHaveBeenCalledWith('tenant-123', { isActive: false });
    });

    test('should return already-suspended message for inactive tenant', async () => {
      const tenant = createMockTenant({ isActive: false });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await suspendTenant(mockRepos, 'tenant-123', 'Violation');

      expect(result.message).toBe('Tenant is already suspended');
      expect(result.tenant.isActive).toBe(false);
      expect(mockRepos.tenants.update).not.toHaveBeenCalled();
    });

    test('should throw TenantNotFoundError when tenant not found', async () => {
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(null);

      await expect(suspendTenant(mockRepos, 'nonexistent', 'Reason')).rejects.toThrow(
        TenantNotFoundError,
      );
    });
  });

  describe('unsuspendTenant', () => {
    test('should unsuspend a suspended tenant', async () => {
      const tenant = createMockTenant({ isActive: false });
      const activeTenant = createMockTenant({ isActive: true });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);
      vi.mocked(mockRepos.tenants.update).mockResolvedValue(activeTenant);

      const result = await unsuspendTenant(mockRepos, 'tenant-123');

      expect(result.message).toBe('Tenant unsuspended successfully');
      expect(result.tenant.isActive).toBe(true);
      expect(mockRepos.tenants.update).toHaveBeenCalledWith('tenant-123', { isActive: true });
    });

    test('should return already-active message for active tenant', async () => {
      const tenant = createMockTenant({ isActive: true });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await unsuspendTenant(mockRepos, 'tenant-123');

      expect(result.message).toBe('Tenant is already active');
      expect(result.tenant.isActive).toBe(true);
      expect(mockRepos.tenants.update).not.toHaveBeenCalled();
    });

    test('should throw TenantNotFoundError when tenant not found', async () => {
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(null);

      await expect(unsuspendTenant(mockRepos, 'nonexistent')).rejects.toThrow(TenantNotFoundError);
    });
  });
});
