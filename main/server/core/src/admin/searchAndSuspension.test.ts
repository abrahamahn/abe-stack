// main/server/core/src/admin/searchAndSuspension.test.ts
/**
 * Sprint 3.13 - Unit Tests for Multi-Field Search and Tenant Suspension Logic
 *
 * Comprehensive tests for:
 * - Multi-field user search across email, username, firstName, lastName, UUID
 * - Tenant suspension and unsuspension edge cases
 * - SearchUsers UUID detection and fallback
 * - Pagination in search results
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  getTenantDetail,
  listAllTenants,
  suspendTenant,
  TenantNotFoundError,
  unsuspendTenant,
} from './tenantService';
import { searchUsers } from './userService';

import type { DbClient, Repositories, User as DbUser, UserRepository } from '../../../db/src';

// ============================================================================
// Mock Factories
// ============================================================================

function createMockUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'testuser',
    passwordHash: 'hash',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    emailVerified: true,
    emailVerifiedAt: new Date('2024-01-01'),
    lockedUntil: null,
    lockReason: null,
    failedLoginAttempts: 0,
    totpSecret: null,
    totpEnabled: false,
    phone: null,
    phoneVerified: null,
    dateOfBirth: null,
    gender: null,
    city: null,
    state: null,
    country: null,
    bio: null,
    language: null,
    website: null,
    lastUsernameChange: null,
    deactivatedAt: null,
    deletedAt: null,
    deletionGracePeriodEnds: null,
    tokenVersion: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    version: 1,
    ...overrides,
  };
}

function createMockUserRepository(): UserRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateWithVersion: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
    listWithFilters: vi.fn(),
    existsByEmail: vi.fn(),
    incrementFailedAttempts: vi.fn(),
    resetFailedAttempts: vi.fn(),
    lockAccount: vi.fn(),
    unlockAccount: vi.fn(),
    verifyEmail: vi.fn(),
  } as unknown as UserRepository;
}

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
// Multi-Field Search Tests
// ============================================================================

describe('Multi-Field User Search', () => {
  let mockRepo: ReturnType<typeof createMockUserRepository>;

  beforeEach(() => {
    mockRepo = createMockUserRepository();
    vi.clearAllMocks();
  });

  describe('text-based multi-field search', () => {
    test('should search by email fragment', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [createMockUser({ email: 'john@company.com' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'john@company');

      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.email).toBe('john@company.com');
      expect(mockRepo.listWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'john@company' }),
      );
    });

    test('should search by username fragment', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [createMockUser({ username: 'johndoe' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'johnd');

      expect(result.users).toHaveLength(1);
      expect(mockRepo.listWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'johnd' }),
      );
    });

    test('should search by first name fragment', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [
          createMockUser({ firstName: 'Jonathan' }),
          createMockUser({ id: 'user-456', firstName: 'John' }),
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'John');

      expect(result.users).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    test('should search by last name fragment', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [createMockUser({ lastName: 'Smith' })],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'Smi');

      expect(result.users).toHaveLength(1);
      expect(mockRepo.listWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'Smi' }),
      );
    });

    test('should return empty for no matches', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'nonexistentquery12345');

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    test('should handle special characters in search query', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, "O'Brien");

      expect(result.users).toHaveLength(0);
      expect(mockRepo.listWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({ search: "O'Brien" }),
      );
    });
  });

  describe('UUID-based search', () => {
    test('should detect UUID v4 and search by ID', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const mockUser = createMockUser({ id: uuid });
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);

      const result = await searchUsers(mockRepo, uuid);

      expect(result.users).toHaveLength(1);
      expect(result.users[0]?.id).toBe(uuid);
      expect(mockRepo.findById).toHaveBeenCalledWith(uuid);
      expect(mockRepo.listWithFilters).not.toHaveBeenCalled();
    });

    test('should detect UUID in uppercase', async () => {
      const uuid = '550E8400-E29B-41D4-A716-446655440000';
      const mockUser = createMockUser({ id: uuid });
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser);

      const result = await searchUsers(mockRepo, uuid);

      expect(result.users).toHaveLength(1);
      expect(mockRepo.findById).toHaveBeenCalledWith(uuid);
    });

    test('should return empty for UUID that does not match any user', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440999';
      vi.mocked(mockRepo.findById).mockResolvedValue(null);

      const result = await searchUsers(mockRepo, uuid);

      expect(result.users).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    test('should NOT treat non-UUID hex strings as UUID', async () => {
      // Too short
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      await searchUsers(mockRepo, '550e8400-e29b');

      expect(mockRepo.findById).not.toHaveBeenCalled();
      expect(mockRepo.listWithFilters).toHaveBeenCalled();
    });
  });

  describe('search pagination', () => {
    test('should paginate with default limit 20 and offset 0', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [],
        total: 100,
        page: 1,
        limit: 20,
        totalPages: 5,
        hasNext: true,
        hasPrev: false,
      });

      const result = await searchUsers(mockRepo, 'test');

      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    test('should correctly convert offset to page for second page', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [],
        total: 50,
        page: 2,
        limit: 20,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });

      await searchUsers(mockRepo, 'test', { limit: 20, offset: 20 });

      expect(mockRepo.listWithFilters).toHaveBeenCalledWith({
        search: 'test',
        page: 2,
        limit: 20,
      });
    });

    test('should correctly convert offset to page for large offset', async () => {
      vi.mocked(mockRepo.listWithFilters).mockResolvedValue({
        data: [],
        total: 500,
        page: 11,
        limit: 10,
        totalPages: 50,
        hasNext: true,
        hasPrev: true,
      });

      await searchUsers(mockRepo, 'admin', { limit: 10, offset: 100 });

      expect(mockRepo.listWithFilters).toHaveBeenCalledWith({
        search: 'admin',
        page: 11,
        limit: 10,
      });
    });
  });
});

// ============================================================================
// Tenant Suspension Logic Tests
// ============================================================================

describe('Tenant Suspension Logic', () => {
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockDb: ReturnType<typeof createMockDbClient>;

  beforeEach(() => {
    mockRepos = createMockRepos();
    mockDb = createMockDbClient();
    vi.clearAllMocks();
  });

  describe('suspendTenant', () => {
    test('should suspend an active tenant', async () => {
      const tenant = createMockTenant({ isActive: true });
      const suspendedTenant = createMockTenant({ isActive: false });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);
      vi.mocked(mockRepos.tenants.update).mockResolvedValue(suspendedTenant);

      const result = await suspendTenant(mockRepos, 'tenant-123', 'Terms violation');

      expect(result.message).toBe('Tenant suspended successfully');
      expect(result.tenant.isActive).toBe(false);
      expect(mockRepos.tenants.update).toHaveBeenCalledWith('tenant-123', { isActive: false });
    });

    test('should return already-suspended message for inactive tenant', async () => {
      const tenant = createMockTenant({ isActive: false });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await suspendTenant(mockRepos, 'tenant-123', 'Terms violation');

      expect(result.message).toBe('Tenant is already suspended');
      expect(result.tenant.isActive).toBe(false);
      expect(mockRepos.tenants.update).not.toHaveBeenCalled();
    });

    test('should throw TenantNotFoundError for nonexistent tenant', async () => {
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(null);

      await expect(suspendTenant(mockRepos, 'nonexistent', 'Reason')).rejects.toThrow(
        TenantNotFoundError,
      );
    });

    test('should throw TenantNotFoundError with tenant ID in message', async () => {
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(null);

      await expect(suspendTenant(mockRepos, 'tenant-xyz', 'Reason')).rejects.toThrow(
        'Tenant not found: tenant-xyz',
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

    test('should throw TenantNotFoundError for nonexistent tenant', async () => {
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(null);

      await expect(unsuspendTenant(mockRepos, 'nonexistent')).rejects.toThrow(TenantNotFoundError);
    });
  });

  describe('getTenantDetail with suspension state', () => {
    test('should return correct isActive status for active tenant', async () => {
      const tenant = createMockTenant({ isActive: true });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await getTenantDetail(mockRepos, 'tenant-123');

      expect(result.isActive).toBe(true);
      expect(result.memberCount).toBe(2);
    });

    test('should return correct isActive status for suspended tenant', async () => {
      const tenant = createMockTenant({ isActive: false });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await getTenantDetail(mockRepos, 'tenant-123');

      expect(result.isActive).toBe(false);
    });

    test('should throw TenantNotFoundError for nonexistent tenant', async () => {
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(null);

      await expect(getTenantDetail(mockRepos, 'nonexistent')).rejects.toThrow(TenantNotFoundError);
    });
  });

  describe('listAllTenants with suspension filtering', () => {
    test('should list tenants including suspended ones', async () => {
      const activeTenant = createMockTenant({ id: 'tenant-1', isActive: true });
      const suspendedTenant = createMockTenant({ id: 'tenant-2', isActive: false });
      vi.mocked(mockDb.query).mockResolvedValue([
        {
          id: activeTenant.id,
          name: activeTenant.name,
          slug: activeTenant.slug,
          logo_url: activeTenant.logoUrl,
          owner_id: activeTenant.ownerId,
          is_active: activeTenant.isActive,
          metadata: activeTenant.metadata,
          allowed_email_domains: activeTenant.allowedEmailDomains,
          created_at: activeTenant.createdAt,
          updated_at: activeTenant.updatedAt,
        },
        {
          id: suspendedTenant.id,
          name: suspendedTenant.name,
          slug: suspendedTenant.slug,
          logo_url: suspendedTenant.logoUrl,
          owner_id: suspendedTenant.ownerId,
          is_active: suspendedTenant.isActive,
          metadata: suspendedTenant.metadata,
          allowed_email_domains: suspendedTenant.allowedEmailDomains,
          created_at: suspendedTenant.createdAt,
          updated_at: suspendedTenant.updatedAt,
        },
      ]);
      vi.mocked(mockDb.queryOne).mockResolvedValue({ count: '2' });

      const result = await listAllTenants(mockDb, mockRepos);

      expect(result.tenants).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    test('should return empty list when no tenants exist', async () => {
      const result = await listAllTenants(mockDb, mockRepos);

      expect(result.tenants).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('suspension idempotency', () => {
    test('suspending an already-suspended tenant should be safe', async () => {
      const tenant = createMockTenant({ isActive: false });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await suspendTenant(mockRepos, 'tenant-123', 'Double suspension');

      expect(result.message).toBe('Tenant is already suspended');
      expect(mockRepos.tenants.update).not.toHaveBeenCalled();
    });

    test('unsuspending an already-active tenant should be safe', async () => {
      const tenant = createMockTenant({ isActive: true });
      vi.mocked(mockRepos.tenants.findById).mockResolvedValue(tenant);

      const result = await unsuspendTenant(mockRepos, 'tenant-123');

      expect(result.message).toBe('Tenant is already active');
      expect(mockRepos.tenants.update).not.toHaveBeenCalled();
    });
  });
});
