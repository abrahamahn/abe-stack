// backend/db/src/repositories/tenant/invitations.test.ts
/**
 * Tests for Invitations Repository
 *
 * Validates invitation operations including creation, status lookups,
 * pending invitation queries, and invitation updates.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createInvitationRepository } from './invitations';

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

const mockInvitation = {
  id: 'inv-123',
  tenant_id: 'tenant-123',
  email: 'user@example.com',
  role: 'member',
  status: 'pending',
  token: 'token-abc123',
  expires_at: new Date('2024-12-31'),
  invited_by: 'usr-admin',
  created_at: new Date('2024-01-01'),
  updated_at: new Date('2024-01-01'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createInvitationRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new invitation', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        email: 'user@example.com',
        role: 'member',
        token: 'token-abc123',
        expiresAt: new Date('2024-12-31'),
        invitedBy: 'usr-admin',
      });

      expect(result.id).toBe('inv-123');
      expect(result.tenantId).toBe('tenant-123');
      expect(result.email).toBe('user@example.com');
      expect(result.role).toBe('member');
      expect(result.status).toBe('pending');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvitationRepository(mockDb);

      await expect(
        repo.create({
          tenantId: 'tenant-123',
          email: 'user@example.com',
          role: 'member',
          token: 'token-abc123',
          expiresAt: new Date('2024-12-31'),
          invitedBy: 'usr-admin',
        }),
      ).rejects.toThrow('Failed to create invitation');
    });

    it('should handle admin role invitation', async () => {
      const adminInvitation = {
        ...mockInvitation,
        role: 'admin',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(adminInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        email: 'admin@example.com',
        role: 'admin',
        token: 'token-abc123',
        expiresAt: new Date('2024-12-31'),
        invitedBy: 'usr-owner',
      });

      expect(result.role).toBe('admin');
    });

    it('should default status to pending', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        email: 'user@example.com',
        role: 'member',
        token: 'token-abc123',
        expiresAt: new Date('2024-12-31'),
        invitedBy: 'usr-admin',
      });

      expect(result.status).toBe('pending');
    });

    it('should generate SQL with invitations table', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.create({
        tenantId: 'tenant-123',
        email: 'user@example.com',
        role: 'member',
        token: 'token-abc123',
        expiresAt: new Date('2024-12-31'),
        invitedBy: 'usr-admin',
      });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/INSERT INTO.*invitations/s),
        }),
      );
    });

    it('should handle expiration date', async () => {
      const futureDate = new Date('2025-12-31');
      const invitationWithExpiry = {
        ...mockInvitation,
        expires_at: futureDate,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(invitationWithExpiry);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.create({
        tenantId: 'tenant-123',
        email: 'user@example.com',
        role: 'member',
        token: 'token-abc123',
        expiresAt: futureDate,
        invitedBy: 'usr-admin',
      });

      expect(result.expiresAt).toEqual(futureDate);
    });
  });

  describe('findById', () => {
    it('should return invitation when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('inv-123');
      expect(result?.email).toBe('user@example.com');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findById('nonexistent');

      expect(result).toBeNull();
    });

    it('should query invitations table with WHERE clause', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.findById('inv-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/SELECT.*FROM.*invitations.*WHERE/s),
        }),
      );
    });

    it('should pass invitation ID as parameter', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.findById('inv-123');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['inv-123']),
        }),
      );
    });

    it('should return invitations with different statuses', async () => {
      const statuses = ['pending', 'accepted', 'rejected', 'expired'];

      for (const status of statuses) {
        vi.mocked(mockDb.queryOne).mockResolvedValue({
          ...mockInvitation,
          status,
        });

        const repo = createInvitationRepository(mockDb);
        const result = await repo.findById('inv-123');

        expect(result?.status).toBe(status);
      }
    });
  });

  describe('findByTenantId', () => {
    it('should return array of invitations for tenant', async () => {
      const invitations = [
        mockInvitation,
        {
          ...mockInvitation,
          id: 'inv-456',
          email: 'another@example.com',
          role: 'admin',
        },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(invitations);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(2);
      expect(result[0].tenantId).toBe('tenant-123');
      expect(result[1].tenantId).toBe('tenant-123');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return empty array when tenant has no invitations', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findByTenantId('tenant-new');

      expect(result).toEqual([]);
    });

    it('should order results by created_at desc', async () => {
      const invitations = [
        { ...mockInvitation, id: 'inv-456', created_at: new Date('2024-01-02') },
        { ...mockInvitation, id: 'inv-123', created_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(invitations);

      const repo = createInvitationRepository(mockDb);
      await repo.findByTenantId('tenant-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*desc/is),
        }),
      );
    });

    it('should include all invitation statuses', async () => {
      const mixedStatusInvitations = [
        { ...mockInvitation, id: 'inv-1', status: 'pending' },
        { ...mockInvitation, id: 'inv-2', status: 'accepted' },
        { ...mockInvitation, id: 'inv-3', status: 'rejected' },
        { ...mockInvitation, id: 'inv-4', status: 'expired' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(mixedStatusInvitations);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(4);
      expect(result.map((i) => i.status)).toEqual(['pending', 'accepted', 'rejected', 'expired']);
    });

    it('should handle multiple pending invitations', async () => {
      const pendingInvitations = Array.from({ length: 5 }, (_, i) => ({
        ...mockInvitation,
        id: `inv-${i}`,
        email: `user${i}@example.com`,
        status: 'pending',
      }));
      vi.mocked(mockDb.query).mockResolvedValue(pendingInvitations);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findByTenantId('tenant-123');

      expect(result).toHaveLength(5);
      expect(result.every((i) => i.status === 'pending')).toBe(true);
    });
  });

  describe('findPendingByTenantAndEmail', () => {
    it('should return pending invitation when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByTenantAndEmail('tenant-123', 'user@example.com');

      expect(result).toBeDefined();
      expect(result?.tenantId).toBe('tenant-123');
      expect(result?.email).toBe('user@example.com');
      expect(result?.status).toBe('pending');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('tenant_id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByTenantAndEmail('tenant-999', 'none@example.com');

      expect(result).toBeNull();
    });

    it('should filter by pending status', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.findPendingByTenantAndEmail('tenant-123', 'user@example.com');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('status'),
          values: expect.arrayContaining(['pending']),
        }),
      );
    });

    it('should use AND condition for tenant, email, and status', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.findPendingByTenantAndEmail('tenant-123', 'user@example.com');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/WHERE.*tenant_id.*email.*status/s),
        }),
      );
    });

    it('should pass tenant ID, email, and pending status as parameters', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.findPendingByTenantAndEmail('tenant-123', 'user@example.com');

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['tenant-123', 'user@example.com', 'pending']),
        }),
      );
    });

    it('should handle case-sensitive email matching', async () => {
      const invitation = {
        ...mockInvitation,
        email: 'User@Example.com',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(invitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByTenantAndEmail('tenant-123', 'User@Example.com');

      expect(result?.email).toBe('User@Example.com');
    });

    it('should not return accepted invitations', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByTenantAndEmail('tenant-123', 'accepted@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findPendingByEmail', () => {
    it('should return array of pending invitations for email', async () => {
      const invitations = [
        mockInvitation,
        { ...mockInvitation, id: 'inv-456', tenant_id: 'tenant-456' },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(invitations);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByEmail('user@example.com');

      expect(result).toHaveLength(2);
      expect(result[0].email).toBe('user@example.com');
      expect(result[1].email).toBe('user@example.com');
      expect(result.every((i) => i.status === 'pending')).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('email'),
        }),
      );
    });

    it('should return empty array when email has no pending invitations', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByEmail('none@example.com');

      expect(result).toEqual([]);
    });

    it('should filter by pending status', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockInvitation]);

      const repo = createInvitationRepository(mockDb);
      await repo.findPendingByEmail('user@example.com');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('status'),
          values: expect.arrayContaining(['pending']),
        }),
      );
    });

    it('should order results by created_at desc', async () => {
      const invitations = [
        { ...mockInvitation, id: 'inv-456', created_at: new Date('2024-01-02') },
        { ...mockInvitation, id: 'inv-123', created_at: new Date('2024-01-01') },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(invitations);

      const repo = createInvitationRepository(mockDb);
      await repo.findPendingByEmail('user@example.com');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/ORDER BY.*created_at.*desc/is),
        }),
      );
    });

    it('should handle multiple pending invitations from different tenants', async () => {
      const multiTenantInvitations = Array.from({ length: 3 }, (_, i) => ({
        ...mockInvitation,
        id: `inv-${i}`,
        tenant_id: `tenant-${i}`,
        status: 'pending',
      }));
      vi.mocked(mockDb.query).mockResolvedValue(multiTenantInvitations);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByEmail('user@example.com');

      expect(result).toHaveLength(3);
      expect(result.every((i) => i.status === 'pending')).toBe(true);
      expect(result.map((i) => i.tenantId)).toEqual(['tenant-0', 'tenant-1', 'tenant-2']);
    });

    it('should pass email and pending status as parameters', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockInvitation]);

      const repo = createInvitationRepository(mockDb);
      await repo.findPendingByEmail('user@example.com');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining(['user@example.com', 'pending']),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update invitation and return updated record', async () => {
      const updatedInvitation = {
        ...mockInvitation,
        status: 'accepted',
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.update('inv-123', { status: 'accepted' });

      expect(result).toBeDefined();
      expect(result?.status).toBe('accepted');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when invitation not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.update('nonexistent', { status: 'accepted' });

      expect(result).toBeNull();
    });

    it('should handle status update to accepted', async () => {
      const acceptedInvitation = {
        ...mockInvitation,
        status: 'accepted',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(acceptedInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.update('inv-123', { status: 'accepted' });

      expect(result?.status).toBe('accepted');
    });

    it('should handle status update to rejected', async () => {
      const rejectedInvitation = {
        ...mockInvitation,
        status: 'rejected',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(rejectedInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.update('inv-123', { status: 'rejected' });

      expect(result?.status).toBe('rejected');
    });

    it('should handle status update to expired', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        status: 'expired',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(expiredInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.update('inv-123', { status: 'expired' });

      expect(result?.status).toBe('expired');
    });

    it('should generate UPDATE SQL with WHERE clause', async () => {
      const updatedInvitation = { ...mockInvitation, status: 'accepted' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.update('inv-123', { status: 'accepted' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*invitations.*WHERE/s),
        }),
      );
    });

    it('should include RETURNING clause', async () => {
      const updatedInvitation = { ...mockInvitation, status: 'accepted' };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedInvitation);

      const repo = createInvitationRepository(mockDb);
      await repo.update('inv-123', { status: 'accepted' });

      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/RETURNING/i),
        }),
      );
    });

    it('should update only specified fields', async () => {
      const updatedInvitation = {
        ...mockInvitation,
        status: 'accepted',
        updated_at: new Date('2024-01-02'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.update('inv-123', { status: 'accepted' });

      expect(result?.status).toBe('accepted');
      expect(result?.email).toBe('user@example.com');
      expect(result?.role).toBe('member');
    });
  });

  describe('edge cases', () => {
    it('should transform snake_case to camelCase correctly', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result).toHaveProperty('tenantId');
      expect(result).toHaveProperty('invitedBy');
      expect(result).toHaveProperty('expiresAt');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(result).not.toHaveProperty('tenant_id');
      expect(result).not.toHaveProperty('invited_by');
    });

    it('should handle timestamp fields', async () => {
      const now = new Date('2024-06-15T10:30:00Z');
      const invitationWithTimestamps = {
        ...mockInvitation,
        created_at: now,
        updated_at: now,
        expires_at: new Date('2024-12-31'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(invitationWithTimestamps);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result?.createdAt).toEqual(now);
      expect(result?.updatedAt).toEqual(now);
      expect(result?.expiresAt).toEqual(new Date('2024-12-31'));
    });

    it('should handle email normalization', async () => {
      const emails = [
        'user@example.com',
        'User@Example.com',
        'USER@EXAMPLE.COM',
        'user+tag@example.com',
      ];

      for (const email of emails) {
        const invitation = { ...mockInvitation, email };
        vi.mocked(mockDb.queryOne).mockResolvedValue(invitation);

        const repo = createInvitationRepository(mockDb);
        const result = await repo.findById('inv-123');

        expect(result?.email).toBe(email);
      }
    });

    it('should handle very long token strings', async () => {
      const longToken = 'A'.repeat(500);
      const invitationWithLongToken = {
        ...mockInvitation,
        token: longToken,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(invitationWithLongToken);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result?.token).toBe(longToken);
    });

    it('should handle past expiration dates', async () => {
      const pastDate = new Date('2020-01-01');
      const expiredInvitation = {
        ...mockInvitation,
        expires_at: pastDate,
        status: 'expired',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(expiredInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result?.expiresAt).toEqual(pastDate);
      expect(result?.status).toBe('expired');
    });

    it('should handle different role types in invitations', async () => {
      const roles = ['owner', 'admin', 'member', 'viewer'];

      for (const role of roles) {
        const invitation = { ...mockInvitation, role };
        vi.mocked(mockDb.queryOne).mockResolvedValue(invitation);

        const repo = createInvitationRepository(mockDb);
        const result = await repo.findById('inv-123');

        expect(result?.role).toBe(role);
      }
    });

    it('should handle multiple pending invitations for same email', async () => {
      const multipleInvitations = Array.from({ length: 5 }, (_, i) => ({
        ...mockInvitation,
        id: `inv-${i}`,
        tenant_id: `tenant-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(multipleInvitations);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findPendingByEmail('user@example.com');

      expect(result).toHaveLength(5);
      expect(result.every((i) => i.email === 'user@example.com')).toBe(true);
    });

    it('should handle invitation lifecycle transitions', async () => {
      const transitions = ['pending', 'accepted', 'rejected', 'expired'];

      for (const status of transitions) {
        const invitation = { ...mockInvitation, status };
        vi.mocked(mockDb.queryOne).mockResolvedValue(invitation);

        const repo = createInvitationRepository(mockDb);
        const result = await repo.update('inv-123', { status });

        expect(result?.status).toBe(status);
      }
    });

    it('should handle invitations with null invited_by', async () => {
      const systemInvitation = {
        ...mockInvitation,
        invited_by: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(systemInvitation);

      const repo = createInvitationRepository(mockDb);
      const result = await repo.findById('inv-123');

      expect(result?.invitedBy).toBeNull();
    });
  });
});
