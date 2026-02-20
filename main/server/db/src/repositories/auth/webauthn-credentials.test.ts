// main/server/db/src/repositories/auth/webauthn-credentials.test.ts
/**
 * Tests for WebAuthn Credentials Repository
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createWebauthnCredentialRepository } from './webauthn-credentials';

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

const mockCredential = {
  id: 'cred-123',
  user_id: 'usr-123',
  credential_id: 'base64url-credential-id',
  public_key: 'base64url-public-key',
  counter: 5,
  transports: 'internal,hybrid',
  device_type: 'multiDevice',
  backed_up: true,
  name: 'My Passkey',
  created_at: new Date('2024-01-01'),
  last_used_at: new Date('2024-06-15'),
};

// ============================================================================
// Tests
// ============================================================================

describe('createWebauthnCredentialRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new credential successfully', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockCredential);

      const repo = createWebauthnCredentialRepository(mockDb);
      const result = await repo.create({
        userId: 'usr-123',
        credentialId: 'base64url-credential-id',
        publicKey: 'base64url-public-key',
        counter: 5,
        transports: 'internal,hybrid',
        deviceType: 'multiDevice',
        backedUp: true,
        name: 'My Passkey',
      });

      expect(result.userId).toBe('usr-123');
      expect(result.credentialId).toBe('base64url-credential-id');
      expect(result.counter).toBe(5);
      expect(result.backedUp).toBe(true);
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error when creation fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebauthnCredentialRepository(mockDb);

      await expect(
        repo.create({
          userId: 'usr-123',
          credentialId: 'cid',
          publicKey: 'pk',
        }),
      ).rejects.toThrow('Failed to create WebAuthn credential');
    });
  });

  describe('findByUserId', () => {
    it('should return credentials for a user', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockCredential]);

      const repo = createWebauthnCredentialRepository(mockDb);
      const result = await repo.findByUserId('usr-123');

      expect(result).toHaveLength(1);
      expect(result[0]?.userId).toBe('usr-123');
      expect(result[0]?.name).toBe('My Passkey');
    });

    it('should return empty array when no credentials found', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createWebauthnCredentialRepository(mockDb);
      const result = await repo.findByUserId('usr-999');

      expect(result).toEqual([]);
    });
  });

  describe('findByCredentialId', () => {
    it('should return credential when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockCredential);

      const repo = createWebauthnCredentialRepository(mockDb);
      const result = await repo.findByCredentialId('base64url-credential-id');

      expect(result).not.toBeNull();
      expect(result?.credentialId).toBe('base64url-credential-id');
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createWebauthnCredentialRepository(mockDb);
      const result = await repo.findByCredentialId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('updateCounter', () => {
    it('should update counter and last_used_at', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createWebauthnCredentialRepository(mockDb);
      await repo.updateCounter('cred-123', 10);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });
  });

  describe('updateName', () => {
    it('should update credential name', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createWebauthnCredentialRepository(mockDb);
      await repo.updateName('cred-123', 'New Name');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/UPDATE.*name/s),
        }),
      );
    });
  });

  describe('delete', () => {
    it('should delete a credential by id', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createWebauthnCredentialRepository(mockDb);
      await repo.delete('cred-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });
  });

  describe('deleteAllByUserId', () => {
    it('should delete all credentials for a user', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(3);

      const repo = createWebauthnCredentialRepository(mockDb);
      const result = await repo.deleteAllByUserId('usr-123');

      expect(result).toBe(3);
    });

    it('should return 0 when no credentials to delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createWebauthnCredentialRepository(mockDb);
      const result = await repo.deleteAllByUserId('usr-999');

      expect(result).toBe(0);
    });
  });
});
