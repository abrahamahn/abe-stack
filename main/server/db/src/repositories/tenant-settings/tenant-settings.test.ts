// main/server/db/src/repositories/tenant-settings/tenant-settings.test.ts
/**
 * Tests for Tenant Settings Repository
 *
 * Validates tenant setting operations including lookups by composite key,
 * upsert with ON CONFLICT, updates, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createTenantSettingRepository } from './tenant-settings';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb =>
  ({
    query: vi.fn(),
    raw: vi.fn() as RawDb['raw'],
    transaction: vi.fn() as RawDb['transaction'],
    healthCheck: vi.fn(),
    close: vi.fn(),
    getClient: vi.fn() as RawDb['getClient'],
    queryOne: vi.fn(),
    execute: vi.fn(),
    withSession: vi.fn() as RawDb['withSession'],
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const mockSettingRow = {
  tenant_id: 'tenant-001',
  key: 'branding.primary_color',
  value: '#3b82f6',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-06-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createTenantSettingRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findByTenantIdAndKey', () => {
    it('should return a setting when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockSettingRow);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.findByTenantIdAndKey('tenant-001', 'branding.primary_color');

      expect(result).not.toBeNull();
      expect(result?.tenantId).toBe('tenant-001');
      expect(result?.key).toBe('branding.primary_color');
      expect(result?.value).toBe('#3b82f6');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return null when setting not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.findByTenantIdAndKey('tenant-001', 'nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByTenantId', () => {
    it('should return all settings for a tenant', async () => {
      const mockSettings = [
        mockSettingRow,
        { ...mockSettingRow, key: 'branding.logo_url', value: '/logo.png' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mockSettings);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.findByTenantId('tenant-001');

      expect(result).toHaveLength(2);
      expect(result[0]?.key).toBe('branding.primary_color');
      expect(result[1]?.key).toBe('branding.logo_url');
    });

    it('should return empty array when no settings found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.findByTenantId('tenant-001');

      expect(result).toEqual([]);
    });
  });

  describe('upsert', () => {
    it('should upsert a setting successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockSettingRow);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.upsert({
        tenantId: 'tenant-001',
        key: 'branding.primary_color',
        value: '#3b82f6',
      });

      expect(result.tenantId).toBe('tenant-001');
      expect(result.key).toBe('branding.primary_color');
      expect(result.value).toBe('#3b82f6');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ON CONFLICT.*DO UPDATE/s),
        }),
      );
    });

    it('should throw error when upsert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantSettingRepository(mockDb);

      await expect(
        repo.upsert({
          tenantId: 'tenant-001',
          key: 'branding.primary_color',
          value: '#3b82f6',
        }),
      ).rejects.toThrow('Failed to upsert tenant setting');
    });
  });

  describe('update', () => {
    it('should update a setting successfully', async () => {
      const updatedRow = { ...mockSettingRow, value: '#ef4444' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.update('tenant-001', 'branding.primary_color', {
        value: '#ef4444',
      });

      expect(result).not.toBeNull();
      expect(result?.value).toBe('#ef4444');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when setting not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.update('tenant-001', 'nonexistent', { value: 'test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when setting is deleted', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.delete('tenant-001', 'branding.primary_color');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when setting not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.delete('tenant-001', 'nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('deleteByTenantId', () => {
    it('should return count of deleted settings', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(5);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.deleteByTenantId('tenant-001');

      expect(result).toBe(5);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return 0 when no settings found for tenant', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createTenantSettingRepository(mockDb);
      const result = await repo.deleteByTenantId('tenant-001');

      expect(result).toBe(0);
    });
  });
});
