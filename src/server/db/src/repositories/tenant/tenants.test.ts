// backend/db/src/repositories/tenant/tenants.test.ts
/**
 * Tests for Tenants Repository
 *
 * Validates tenant workspace operations including creation, lookups by ID/slug/owner,
 * updates, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTenantRepository } from './tenants';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockTenant = {
  id: 'tenant-123',
  owner_id: 'usr-123',
  name: 'Acme Corp',
  slug: 'acme-corp',
  settings: { theme: 'dark' },
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createTenantRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new tenant', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.create({
        ownerId: 'usr-123',
        name: 'Acme Corp',
        slug: 'acme-corp',
      });

      expect(result.id).toBe('tenant-123');
      expect(result.ownerId).toBe('usr-123');
      expect(result.name).toBe('Acme Corp');
      expect(result.slug).toBe('acme-corp');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantRepository(mockDb);

      await expect(
        repo.create({
          ownerId: 'usr-123',
          name: 'Acme Corp',
          slug: 'acme-corp',
        }),
      ).rejects.toThrow('Failed to create tenant');
    });

    it('should handle optional settings', async () => {
      const tenantWithSettings = {
        ...mockTenant,
        settings: { theme: 'light', notifications: true },
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tenantWithSettings);

      const repo = createTenantRepository(mockDb);
      const result = await repo.create({
        ownerId: 'usr-123',
        name: 'Acme Corp',
        slug: 'acme-corp',
        settings: { theme: 'light', notifications: true },
      });

      expect(result.settings).toEqual({ theme: 'light', notifications: true });
    });

    it('should handle tenant creation with minimal data', async () => {
      const minimalTenant = {
        ...mockTenant,
        name: 'Minimal Corp',
        slug: 'minimal-corp',
        settings: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(minimalTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.create({
        ownerId: 'usr-123',
        name: 'Minimal Corp',
        slug: 'minimal-corp',
      });

      expect(result.ownerId).toBe('usr-123');
      expect(result.name).toBe('Minimal Corp');
      expect(result.slug).toBe('minimal-corp');
    });

    it('should generate SQL with tenants table', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      await repo.create({
        ownerId: 'usr-123',
        name: 'Acme Corp',
        slug: 'acme-corp',
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT INTO.*tenants/s),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return tenant when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findById('tenant-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('tenant-123');
      expect(result?.name).toBe('Acme Corp');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should query tenants table with WHERE clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      await repo.findById('tenant-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/SELECT.*FROM.*tenants.*WHERE/s),
        }),
      );
    });

    it('should pass tenant ID as parameter', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      await repo.findById('tenant-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['tenant-123']),
        }),
      );
    });
  });

  describe('findBySlug', () => {
    it('should return tenant when found by slug', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findBySlug('acme-corp');

      expect(result).toBeDefined();
      expect(result?.slug).toBe('acme-corp');
      expect(result?.name).toBe('Acme Corp');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('slug'),
        }),
      );
    });

    it('should return null when slug not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findBySlug('nonexistent-slug');

      expect(result).toBeNull();
    });

    it('should handle slug with special characters', async () => {
      const specialSlugTenant = {
        ...mockTenant,
        slug: 'acme-corp-2024',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(specialSlugTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findBySlug('acme-corp-2024');

      expect(result?.slug).toBe('acme-corp-2024');
    });

    it('should pass slug as parameter', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      await repo.findBySlug('acme-corp');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['acme-corp']),
        }),
      );
    });
  });

  describe('findByOwnerId', () => {
    it('should return array of tenants for owner', async () => {
      const tenants = [
        mockTenant,
        { ...mockTenant, id: 'tenant-456', name: 'Second Corp', slug: 'second-corp' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(tenants);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findByOwnerId('usr-123');

      expect(result).toHaveLength(2);
      expect(result[0].ownerId).toBe('usr-123');
      expect(result[1].ownerId).toBe('usr-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('owner_id'),
        }),
      );
    });

    it('should return empty array when owner has no tenants', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findByOwnerId('usr-new');

      expect(result).toEqual([]);
    });

    it('should order results by created_at desc', async () => {
      const tenants = [
        { ...mockTenant, id: 'tenant-456', created_at: new Date('2024-01-02') },
        { ...mockTenant, id: 'tenant-123', created_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(tenants);

      const repo = createTenantRepository(mockDb);
      await repo.findByOwnerId('usr-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*desc/is),
        }),
      );
    });

    it('should handle owner with single tenant', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockTenant]);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findByOwnerId('usr-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tenant-123');
    });

    it('should handle owner with multiple tenants', async () => {
      const multiTenants = Array.from({ length: 5 }, (_, i) => ({
        ...mockTenant,
        id: `tenant-${i}`,
        name: `Tenant ${i}`,
        slug: `tenant-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(multiTenants);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findByOwnerId('usr-123');

      expect(result).toHaveLength(5);
      expect(result.every((t) => t.ownerId === 'usr-123')).toBe(true);
    });
  });

  describe('update', () => {
    it('should update tenant and return updated record', async () => {
      const updatedTenant = {
        ...mockTenant,
        name: 'Updated Corp',
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.update('tenant-123', { name: 'Updated Corp' });

      expect(result).toBeDefined();
      expect(result?.name).toBe('Updated Corp');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when tenant not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantRepository(mockDb);
      const result = await repo.update('nonexistent', { name: 'Updated' });

      expect(result).toBeNull();
    });

    it('should update only specified fields', async () => {
      const updatedTenant = {
        ...mockTenant,
        settings: { theme: 'light' },
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.update('tenant-123', { settings: { theme: 'light' } });

      expect(result?.settings).toEqual({ theme: 'light' });
      expect(result?.name).toBe('Acme Corp');
    });

    it('should generate UPDATE SQL with WHERE clause', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedTenant);

      const repo = createTenantRepository(mockDb);
      await repo.update('tenant-123', { name: 'Updated' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*tenants.*WHERE/s),
        }),
      );
    });

    it('should include RETURNING clause', async () => {
      const updatedTenant = { ...mockTenant, name: 'Updated' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedTenant);

      const repo = createTenantRepository(mockDb);
      await repo.update('tenant-123', { name: 'Updated' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/RETURNING/i),
        }),
      );
    });

    it('should handle updating multiple fields', async () => {
      const updatedTenant = {
        ...mockTenant,
        name: 'New Name',
        settings: { theme: 'light', locale: 'en-US' },
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.update('tenant-123', {
        name: 'New Name',
        settings: { theme: 'light', locale: 'en-US' },
      });

      expect(result?.name).toBe('New Name');
      expect(result?.settings).toEqual({ theme: 'light', locale: 'en-US' });
    });
  });

  describe('delete', () => {
    it('should delete tenant and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantRepository(mockDb);
      const result = await repo.delete('tenant-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when tenant not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createTenantRepository(mockDb);
      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantRepository(mockDb);
      await repo.delete('tenant-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*tenants/s),
        }),
      );
    });

    it('should only delete exact ID match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantRepository(mockDb);
      await repo.delete('tenant-specific');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['tenant-specific']),
        }),
      );
    });

    it('should include WHERE clause in delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantRepository(mockDb);
      await repo.delete('tenant-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*WHERE/s),
        }),
      );
    });
  });

  describe('edge cases', () => {
    it('should handle null settings', async () => {
      const tenantWithoutSettings = {
        ...mockTenant,
        settings: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tenantWithoutSettings);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findById('tenant-123');

      expect(result?.settings).toBeNull();
    });

    it('should handle empty settings object', async () => {
      const tenantWithEmptySettings = {
        ...mockTenant,
        settings: {},
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tenantWithEmptySettings);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findById('tenant-123');

      expect(result?.settings).toEqual({});
    });

    it('should handle complex settings structure', async () => {
      const complexSettings = {
        theme: 'dark',
        notifications: {
          email: true,
          push: false,
          sms: true,
        },
        features: ['feature1', 'feature2'],
      };
      const tenantWithComplexSettings = {
        ...mockTenant,
        settings: complexSettings,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tenantWithComplexSettings);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findById('tenant-123');

      expect(result?.settings).toEqual(complexSettings);
    });

    it('should handle very long tenant names', async () => {
      const longName = 'A'.repeat(255);
      const tenantWithLongName = {
        ...mockTenant,
        name: longName,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tenantWithLongName);

      const repo = createTenantRepository(mockDb);
      const result = await repo.create({
        ownerId: 'usr-123',
        name: longName,
        slug: 'long-slug',
      });

      expect(result.name).toBe(longName);
    });

    it('should handle slug with hyphens and numbers', async () => {
      const specialSlug = 'my-company-2024-v2';
      const tenantWithSpecialSlug = {
        ...mockTenant,
        slug: specialSlug,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tenantWithSpecialSlug);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findBySlug(specialSlug);

      expect(result?.slug).toBe(specialSlug);
    });

    it('should transform snake_case to camelCase correctly', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTenant);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findById('tenant-123');

      expect(result).toHaveProperty('ownerId');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('owner_id');
      expect(result).not.toHaveProperty('created_at');
    });

    it('should handle timestamp fields', async () => {
      const now = new Date('2024-06-15T10:30:00Z');
      const tenantWithTimestamps = {
        ...mockTenant,
        created_at: now,
        updated_at: now,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(tenantWithTimestamps);

      const repo = createTenantRepository(mockDb);
      const result = await repo.findById('tenant-123');

      expect(result?.createdAt).toEqual(now);
      expect(result?.updatedAt).toEqual(now);
    });
  });
});
