// main/server/db/src/repositories/email/email-templates.test.ts
/**
 * Tests for Email Templates Repository
 *
 * Validates email template CRUD operations including creation,
 * key-based lookups, active template filtering, updates, and deletion.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createEmailTemplateRepository } from './email-templates';

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
  }) as unknown as RawDb;

// ============================================================================
// Test Data
// ============================================================================

const mockTemplateRow = {
  key: 'auth.welcome',
  name: 'Welcome Email',
  subject: 'Welcome to {{appName}}',
  body_html: '<h1>Welcome</h1>',
  body_text: 'Welcome',
  variables: { appName: 'string' },
  is_active: true,
  created_at: new Date('2024-06-01'),
  updated_at: new Date('2024-06-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createEmailTemplateRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('findByKey', () => {
    it('should return a template when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTemplateRow);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.findByKey('auth.welcome');

      expect(result).not.toBeNull();
      expect(result?.key).toBe('auth.welcome');
      expect(result?.name).toBe('Welcome Email');
      expect(result?.bodyHtml).toBe('<h1>Welcome</h1>');
      expect(result?.isActive).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('SELECT'),
        }),
      );
    });

    it('should return null when template not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.findByKey('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all templates', async () => {
      const mockTemplates = [
        mockTemplateRow,
        { ...mockTemplateRow, key: 'billing.invoice', name: 'Invoice Email' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mockTemplates);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('auth.welcome');
      expect(result[1].key).toBe('billing.invoice');
    });

    it('should return empty array when no templates exist', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should return only active templates', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockTemplateRow]);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.findActive();

      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('is_active'),
        }),
      );
    });
  });

  describe('create', () => {
    it('should create a template successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockTemplateRow);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.create({
        key: 'auth.welcome',
        name: 'Welcome Email',
        subject: 'Welcome to {{appName}}',
        bodyHtml: '<h1>Welcome</h1>',
        bodyText: 'Welcome',
      });

      expect(result.key).toBe('auth.welcome');
      expect(result.name).toBe('Welcome Email');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailTemplateRepository(mockDb);

      await expect(
        repo.create({
          key: 'auth.welcome',
          name: 'Welcome Email',
          subject: 'Welcome',
        }),
      ).rejects.toThrow('Failed to create email template');
    });
  });

  describe('update', () => {
    it('should update a template successfully', async () => {
      const updatedRow = { ...mockTemplateRow, subject: 'Updated Subject' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedRow);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.update('auth.welcome', { subject: 'Updated Subject' });

      expect(result).not.toBeNull();
      expect(result?.subject).toBe('Updated Subject');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when template not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.update('nonexistent', { subject: 'Test' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should return true when template is deleted', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.delete('auth.welcome');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when template not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createEmailTemplateRepository(mockDb);
      const result = await repo.delete('nonexistent');

      expect(result).toBe(false);
    });
  });
});
