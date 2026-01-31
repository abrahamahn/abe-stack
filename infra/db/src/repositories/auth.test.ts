// infra/db/src/repositories/auth.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createEmailVerificationTokenRepository,
  createLoginAttemptRepository,
  createPasswordResetTokenRepository,
  createRefreshTokenFamilyRepository,
  createSecurityEventRepository,
} from './auth';

import type { RawDb } from '../client';
import type {
  NewEmailVerificationToken,
  NewLoginAttempt,
  NewPasswordResetToken,
  NewRefreshTokenFamily,
  NewSecurityEvent,
} from '../schema/index';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  execute: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  raw: vi.fn(),
  healthCheck: vi.fn(),
  getClient: vi.fn(),
});

// ============================================================================
// Refresh Token Family Repository Tests
// ============================================================================

describe('RefreshTokenFamilyRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createRefreshTokenFamilyRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createRefreshTokenFamilyRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return refresh token family when found', async () => {
      const mockFamily: Record<string, unknown> = {
        id: 'family-123',
        ['user_id']: 'user-456',
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
        ['created_at']: new Date('2024-01-01'),
        ['revoked_at']: null,
        ['revoke_reason']: null,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockFamily);

      const result = await repository.findById('family-123');

      expect(result).toEqual({
        id: 'family-123',
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        createdAt: mockFamily['created_at'],
        revokedAt: null,
        revokeReason: null,
      });
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return null when family not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });
  });

  describe('findActiveByUserId', () => {
    test('should return active families for user', async () => {
      const mockFamilies: Record<string, unknown>[] = [
        {
          id: 'family-1',
          ['user_id']: 'user-456',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          ['created_at']: new Date('2024-01-02'),
          ['revoked_at']: null,
          ['revoke_reason']: null,
        },
        {
          id: 'family-2',
          ['user_id']: 'user-456',
          ['ip_address']: '192.168.1.2',
          ['user_agent']: 'Chrome/120',
          ['created_at']: new Date('2024-01-01'),
          ['revoked_at']: null,
          ['revoke_reason']: null,
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockFamilies);

      const result = await repository.findActiveByUserId('user-456');

      expect(result).toHaveLength(2);
      expect(result[0]?.userId).toBe('user-456');
      expect(result[0]?.revokedAt).toBeNull();
      expect(mockedQuery).toHaveBeenCalledOnce();
    });

    test('should return empty array when no active families', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const result = await repository.findActiveByUserId('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    test('should create new refresh token family', async () => {
      const newFamily: NewRefreshTokenFamily = {
        userId: 'user-456',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      const mockCreated: Record<string, unknown> = {
        id: 'family-123',
        ['user_id']: 'user-456',
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
        ['created_at']: new Date(),
        ['revoked_at']: null,
        ['revoke_reason']: null,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newFamily);

      expect(result.id).toBe('family-123');
      expect(result.userId).toBe('user-456');
      expect(result.ipAddress).toBe('192.168.1.1');
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should throw error when creation fails', async () => {
      const newFamily: NewRefreshTokenFamily = {
        userId: 'user-456',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newFamily)).rejects.toThrow(
        'Failed to create refresh token family',
      );
    });
  });

  describe('revoke', () => {
    test('should revoke token family', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.revoke('family-123', 'Token reuse detected');

      expect(mockedExecute).toHaveBeenCalledOnce();
      const sqlCall = mockedExecute.mock.calls[0]?.[0];
      expect(sqlCall).toBeDefined();
    });
  });

  describe('revokeAllForUser', () => {
    test('should revoke all active families for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(3);

      const count = await repository.revokeAllForUser('user-456', 'Logout all sessions');

      expect(count).toBe(3);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });

    test('should return 0 when no active families to revoke', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(0);

      const count = await repository.revokeAllForUser('user-456', 'Logout all sessions');

      expect(count).toBe(0);
    });
  });
});

// ============================================================================
// Login Attempt Repository Tests
// ============================================================================

describe('LoginAttemptRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createLoginAttemptRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createLoginAttemptRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('create', () => {
    test('should create new login attempt', async () => {
      const newAttempt: NewLoginAttempt = {
        email: 'user@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        success: false,
        failureReason: 'Invalid password',
      };

      const mockCreated: Record<string, unknown> = {
        id: 'attempt-123',
        email: 'user@example.com',
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
        success: false,
        ['failure_reason']: 'Invalid password',
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newAttempt);

      expect(result.id).toBe('attempt-123');
      expect(result.email).toBe('user@example.com');
      expect(result.success).toBe(false);
      expect(result.failureReason).toBe('Invalid password');
    });

    test('should throw error when creation fails', async () => {
      const newAttempt: NewLoginAttempt = {
        email: 'user@example.com',
        success: false,
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newAttempt)).rejects.toThrow('Failed to create login attempt');
    });
  });

  describe('countRecentFailures', () => {
    test('should count recent failed login attempts', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue({ count: '5' });

      const since = new Date(Date.now() - 3600000); // 1 hour ago
      const count = await repository.countRecentFailures('user@example.com', since);

      expect(count).toBe(5);
      expect(mockedQueryOne).toHaveBeenCalledOnce();
    });

    test('should return 0 when no failures found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const since = new Date(Date.now() - 3600000);
      const count = await repository.countRecentFailures('user@example.com', since);

      expect(count).toBe(0);
    });
  });

  describe('findRecentByEmail', () => {
    test('should return recent login attempts for email', async () => {
      const mockAttempts: Record<string, unknown>[] = [
        {
          id: 'attempt-1',
          email: 'user@example.com',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          success: false,
          ['failure_reason']: 'Invalid password',
          ['created_at']: new Date('2024-01-02'),
        },
        {
          id: 'attempt-2',
          email: 'user@example.com',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          success: true,
          ['failure_reason']: null,
          ['created_at']: new Date('2024-01-01'),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockAttempts);

      const result = await repository.findRecentByEmail('user@example.com');

      expect(result).toHaveLength(2);
      expect(result[0]?.email).toBe('user@example.com');
    });

    test('should respect limit parameter', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      await repository.findRecentByEmail('user@example.com', 5);

      expect(mockedQuery).toHaveBeenCalledOnce();
    });
  });

  describe('deleteOlderThan', () => {
    test('should delete old login attempts', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(100);

      const cutoffDate = new Date(Date.now() - 86400000 * 30); // 30 days ago
      const count = await repository.deleteOlderThan(cutoffDate);

      expect(count).toBe(100);
      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });
});

// ============================================================================
// Password Reset Token Repository Tests
// ============================================================================

describe('PasswordResetTokenRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createPasswordResetTokenRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createPasswordResetTokenRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return password reset token when found', async () => {
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['token_hash']: 'hash123',
        ['expires_at']: new Date('2024-12-31'),
        ['used_at']: null,
        ['created_at']: new Date('2024-01-01'),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findById('token-123');

      expect(result).toEqual({
        id: 'token-123',
        userId: 'user-456',
        tokenHash: 'hash123',
        expiresAt: mockToken['expires_at'],
        usedAt: null,
        createdAt: mockToken['created_at'],
      });
    });

    test('should return null when not found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findValidByTokenHash', () => {
    test('should return valid token by hash', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['token_hash']: 'hash123',
        ['expires_at']: futureDate,
        ['used_at']: null,
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findValidByTokenHash('hash123');

      expect(result).toBeDefined();
      expect(result?.tokenHash).toBe('hash123');
      expect(result?.usedAt).toBeNull();
    });

    test('should return null for expired token', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const result = await repository.findValidByTokenHash('expired-hash');

      expect(result).toBeNull();
    });
  });

  describe('findValidByUserId', () => {
    test('should return most recent valid token for user', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['token_hash']: 'hash123',
        ['expires_at']: futureDate,
        ['used_at']: null,
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findValidByUserId('user-456');

      expect(result).toBeDefined();
      expect(result?.userId).toBe('user-456');
    });
  });

  describe('create', () => {
    test('should create new password reset token', async () => {
      const newToken: NewPasswordResetToken = {
        userId: 'user-456',
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 86400000),
      };

      const mockCreated: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['token_hash']: 'hash123',
        ['expires_at']: newToken.expiresAt,
        ['used_at']: null,
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newToken);

      expect(result.id).toBe('token-123');
      expect(result.userId).toBe('user-456');
      expect(result.tokenHash).toBe('hash123');
    });

    test('should throw error when creation fails', async () => {
      const newToken: NewPasswordResetToken = {
        userId: 'user-456',
        tokenHash: 'hash123',
        expiresAt: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newToken)).rejects.toThrow(
        'Failed to create password reset token',
      );
    });
  });

  describe('markAsUsed', () => {
    test('should mark token as used', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.markAsUsed('token-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('invalidateByUserId', () => {
    test('should invalidate all unused tokens for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(2);

      const count = await repository.invalidateByUserId('user-456');

      expect(count).toBe(2);
    });
  });

  describe('deleteByUserId', () => {
    test('should delete all tokens for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(3);

      const count = await repository.deleteByUserId('user-456');

      expect(count).toBe(3);
    });
  });

  describe('deleteExpired', () => {
    test('should delete expired tokens', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(50);

      const count = await repository.deleteExpired();

      expect(count).toBe(50);
    });
  });
});

// ============================================================================
// Email Verification Token Repository Tests
// ============================================================================

describe('EmailVerificationTokenRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createEmailVerificationTokenRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createEmailVerificationTokenRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('findById', () => {
    test('should return email verification token when found', async () => {
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['token_hash']: 'hash123',
        ['expires_at']: new Date('2024-12-31'),
        ['used_at']: null,
        ['created_at']: new Date('2024-01-01'),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findById('token-123');

      expect(result).toEqual({
        id: 'token-123',
        userId: 'user-456',
        tokenHash: 'hash123',
        expiresAt: mockToken['expires_at'],
        usedAt: null,
        createdAt: mockToken['created_at'],
      });
    });
  });

  describe('findValidByTokenHash', () => {
    test('should return valid token by hash', async () => {
      const futureDate = new Date(Date.now() + 86400000);
      const mockToken: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['token_hash']: 'hash123',
        ['expires_at']: futureDate,
        ['used_at']: null,
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockToken);

      const result = await repository.findValidByTokenHash('hash123');

      expect(result).toBeDefined();
      expect(result?.tokenHash).toBe('hash123');
    });
  });

  describe('create', () => {
    test('should create new email verification token', async () => {
      const newToken: NewEmailVerificationToken = {
        userId: 'user-456',
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 86400000),
      };

      const mockCreated: Record<string, unknown> = {
        id: 'token-123',
        ['user_id']: 'user-456',
        ['token_hash']: 'hash123',
        ['expires_at']: newToken.expiresAt,
        ['used_at']: null,
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newToken);

      expect(result.id).toBe('token-123');
      expect(result.userId).toBe('user-456');
    });

    test('should throw error when creation fails', async () => {
      const newToken: NewEmailVerificationToken = {
        userId: 'user-456',
        tokenHash: 'hash123',
        expiresAt: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newToken)).rejects.toThrow(
        'Failed to create email verification token',
      );
    });
  });

  describe('markAsUsed', () => {
    test('should mark token as used', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      await repository.markAsUsed('token-123');

      expect(mockedExecute).toHaveBeenCalledOnce();
    });
  });

  describe('invalidateByUserId', () => {
    test('should invalidate all unused tokens for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(1);

      const count = await repository.invalidateByUserId('user-456');

      expect(count).toBe(1);
    });
  });

  describe('deleteByUserId', () => {
    test('should delete all tokens for user', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(2);

      const count = await repository.deleteByUserId('user-456');

      expect(count).toBe(2);
    });
  });

  describe('deleteExpired', () => {
    test('should delete expired tokens', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(25);

      const count = await repository.deleteExpired();

      expect(count).toBe(25);
    });
  });
});

// ============================================================================
// Security Event Repository Tests
// ============================================================================

describe('SecurityEventRepository', () => {
  let mockDb: RawDb;
  let repository: ReturnType<typeof createSecurityEventRepository>;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = createSecurityEventRepository(mockDb);
    vi.clearAllMocks();
  });

  describe('create', () => {
    test('should create new security event', async () => {
      const newEvent: NewSecurityEvent = {
        userId: 'user-456',
        email: 'user@example.com',
        eventType: 'login_failure',
        severity: 'medium',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        metadata: '{"reason":"invalid password"}',
      };

      const mockCreated: Record<string, unknown> = {
        id: 'event-123',
        ['user_id']: 'user-456',
        email: 'user@example.com',
        ['event_type']: 'login_failure',
        severity: 'medium',
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
        metadata: '{"reason":"invalid password"}',
        ['created_at']: new Date(),
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(mockCreated);

      const result = await repository.create(newEvent);

      expect(result.id).toBe('event-123');
      expect(result.eventType).toBe('login_failure');
      expect(result.severity).toBe('medium');
    });

    test('should throw error when creation fails', async () => {
      const newEvent: NewSecurityEvent = {
        eventType: 'login_failure',
        severity: 'medium',
      };

      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      await expect(repository.create(newEvent)).rejects.toThrow('Failed to create security event');
    });
  });

  describe('findByUserId', () => {
    test('should return paginated security events for user', async () => {
      const mockEvents: Record<string, unknown>[] = [
        {
          id: 'event-1',
          ['user_id']: 'user-456',
          email: 'user@example.com',
          ['event_type']: 'login_success',
          severity: 'low',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          metadata: null,
          ['created_at']: new Date('2024-01-02'),
        },
        {
          id: 'event-2',
          ['user_id']: 'user-456',
          email: 'user@example.com',
          ['event_type']: 'password_changed',
          severity: 'medium',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          metadata: null,
          ['created_at']: new Date('2024-01-01'),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockEvents);

      const result = await repository.findByUserId('user-456', { limit: 20 });

      expect(result.items).toHaveLength(2);
      expect(result.items[0]?.userId).toBe('user-456');
      expect(result.nextCursor).toBeNull();
    });

    test('should handle pagination with cursor', async () => {
      const mockEvents: Record<string, unknown>[] = [];
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockEvents);

      const result = await repository.findByUserId('user-456', {
        limit: 20,
        cursor: '2024-01-01T00:00:00.000Z',
      });

      expect(result.items).toEqual([]);
      expect(result.nextCursor).toBeNull();
    });

    test('should indicate more items available', async () => {
      const mockEvents: Record<string, unknown>[] = Array.from({ length: 21 }, (_, i) => ({
        id: `event-${i}`,
        ['user_id']: 'user-456',
        email: 'user@example.com',
        ['event_type']: 'login_success',
        severity: 'low',
        ['ip_address']: '192.168.1.1',
        ['user_agent']: 'Mozilla/5.0',
        metadata: null,
        ['created_at']: new Date(`2024-01-${String(i + 1).padStart(2, '0')}`),
      }));

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockEvents);

      const result = await repository.findByUserId('user-456', { limit: 20 });

      expect(result.items).toHaveLength(20);
      expect(result.nextCursor).toBeDefined();
    });
  });

  describe('findByEmail', () => {
    test('should return paginated security events for email', async () => {
      const mockEvents: Record<string, unknown>[] = [
        {
          id: 'event-1',
          ['user_id']: null,
          email: 'user@example.com',
          ['event_type']: 'login_failure',
          severity: 'medium',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          metadata: null,
          ['created_at']: new Date('2024-01-01'),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockEvents);

      const result = await repository.findByEmail('user@example.com');

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.email).toBe('user@example.com');
    });
  });

  describe('findByType', () => {
    test('should return events by type', async () => {
      const mockEvents: Record<string, unknown>[] = [
        {
          id: 'event-1',
          ['user_id']: 'user-456',
          email: 'user@example.com',
          ['event_type']: 'login_failure',
          severity: 'medium',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          metadata: null,
          ['created_at']: new Date(),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockEvents);

      const result = await repository.findByType('login_failure');

      expect(result).toHaveLength(1);
      expect(result[0]?.eventType).toBe('login_failure');
    });

    test('should filter by time range', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      const result = await repository.findByType('login_failure', { from, to });

      expect(result).toEqual([]);
      expect(mockedQuery).toHaveBeenCalledOnce();
    });
  });

  describe('findBySeverity', () => {
    test('should return events by severity', async () => {
      const mockEvents: Record<string, unknown>[] = [
        {
          id: 'event-1',
          ['user_id']: 'user-456',
          email: 'user@example.com',
          ['event_type']: 'suspicious_activity',
          severity: 'high',
          ['ip_address']: '192.168.1.1',
          ['user_agent']: 'Mozilla/5.0',
          metadata: null,
          ['created_at']: new Date(),
        },
      ];

      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue(mockEvents);

      const result = await repository.findBySeverity('high');

      expect(result).toHaveLength(1);
      expect(result[0]?.severity).toBe('high');
    });

    test('should filter by time range', async () => {
      const mockedQuery = vi.mocked(mockDb['query']);
      mockedQuery.mockResolvedValue([]);

      const from = new Date('2024-01-01');
      const to = new Date('2024-01-31');
      const result = await repository.findBySeverity('critical', { from, to });

      expect(result).toEqual([]);
    });
  });

  describe('countByType', () => {
    test('should count events by type since date', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue({ count: '42' });

      const since = new Date(Date.now() - 86400000);
      const count = await repository.countByType('login_failure', since);

      expect(count).toBe(42);
    });

    test('should return 0 when no events found', async () => {
      const mockedQueryOne = vi.mocked(mockDb['queryOne']);
      mockedQueryOne.mockResolvedValue(null);

      const since = new Date();
      const count = await repository.countByType('token_reuse', since);

      expect(count).toBe(0);
    });
  });

  describe('deleteOlderThan', () => {
    test('should delete old security events', async () => {
      const mockedExecute = vi.mocked(mockDb['execute']);
      mockedExecute.mockResolvedValue(150);

      const cutoffDate = new Date(Date.now() - 86400000 * 90); // 90 days ago
      const count = await repository.deleteOlderThan(cutoffDate);

      expect(count).toBe(150);
    });
  });
});
