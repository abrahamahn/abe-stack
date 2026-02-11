// src/server/core/src/admin/impersonation.test.ts
import { sign as jwtSign } from '@abe-stack/server-engine';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  endImpersonation,
  ImpersonationForbiddenError,
  ImpersonationRateLimitError,
  resetRateLimitStore,
  startImpersonation,
  validateImpersonationToken,
} from './impersonation';

import type {
  ImpersonationAuditLogger,
  ImpersonationConfig,
  ImpersonationRepositories,
} from './impersonation';
import type { User as DbUser, UserRepository } from '@abe-stack/db';

// ============================================================================
// Test Helpers
// ============================================================================

const JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

function createMockDbUser(overrides: Partial<DbUser> = {}): DbUser {
  return {
    id: 'user-123',
    email: 'user@example.com',
    canonicalEmail: 'user@example.com',
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

function createMockRepos(findByIdFn?: UserRepository['findById']): ImpersonationRepositories {
  return {
    users: {
      findById: findByIdFn ?? vi.fn().mockResolvedValue(null),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateWithVersion: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      listWithFilters: vi.fn(),
      existsByEmail: vi.fn(),
      lockAccount: vi.fn(),
      unlockAccount: vi.fn(),
      findByCanonicalEmail: vi.fn(),
      findByUsername: vi.fn(),
    } as unknown as UserRepository,
  };
}

function createConfig(overrides: Partial<ImpersonationConfig> = {}): ImpersonationConfig {
  return {
    jwtSecret: JWT_SECRET,
    ...overrides,
  };
}

function createMockAuditLogger(): ImpersonationAuditLogger {
  return vi.fn().mockResolvedValue(undefined);
}

// ============================================================================
// Tests
// ============================================================================

describe('Impersonation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  // ==========================================================================
  // startImpersonation
  // ==========================================================================

  describe('startImpersonation', () => {
    test('should successfully start impersonation for valid admin and target', async () => {
      const adminUser = createMockDbUser({ id: 'admin-1', role: 'admin', email: 'admin@test.com' });
      const targetUser = createMockDbUser({
        id: 'target-1',
        role: 'user',
        email: 'target@test.com',
      });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(adminUser);
        if (id === 'target-1') return Promise.resolve(targetUser);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      const result = await startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent);

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeDefined();
      expect(result.targetUser.id).toBe('target-1');
      expect(result.targetUser.email).toBe('target@test.com');
    });

    test('should log audit event on successful start', async () => {
      const adminUser = createMockDbUser({ id: 'admin-1', role: 'admin' });
      const targetUser = createMockDbUser({ id: 'target-1', role: 'user' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(adminUser);
        if (id === 'target-1') return Promise.resolve(targetUser);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      await startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'admin_impersonation_start',
          resource: 'user',
          resourceId: 'target-1',
          category: 'security',
          severity: 'warn',
        }),
      );
    });

    test('should generate a valid impersonation JWT', async () => {
      const adminUser = createMockDbUser({ id: 'admin-1', role: 'admin' });
      const targetUser = createMockDbUser({ id: 'target-1', role: 'user' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(adminUser);
        if (id === 'target-1') return Promise.resolve(targetUser);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      const result = await startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent);

      // Validate the token can be decoded
      const decoded = validateImpersonationToken(result.token, config);
      expect(decoded).not.toBeNull();
      expect(decoded?.impersonatorId).toBe('admin-1');
      expect(decoded?.targetUserId).toBe('target-1');
    });

    test('should throw ImpersonationForbiddenError when impersonating self', async () => {
      const repos = createMockRepos();
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      await expect(
        startImpersonation(repos, 'admin-1', 'admin-1', config, logAuditEvent),
      ).rejects.toThrow(ImpersonationForbiddenError);

      await expect(
        startImpersonation(repos, 'admin-1', 'admin-1', config, logAuditEvent),
      ).rejects.toThrow('Cannot impersonate yourself');
    });

    test('should throw ImpersonationForbiddenError when admin not found', async () => {
      const findById = vi.fn().mockResolvedValue(null);
      const repos = createMockRepos(findById);
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      await expect(
        startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow(ImpersonationForbiddenError);

      await expect(
        startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow('Admin user not found');
    });

    test('should throw ImpersonationForbiddenError when caller is not admin', async () => {
      const nonAdmin = createMockDbUser({ id: 'user-1', role: 'user' });
      const findById = vi.fn().mockResolvedValue(nonAdmin);
      const repos = createMockRepos(findById);
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      await expect(
        startImpersonation(repos, 'user-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow(ImpersonationForbiddenError);

      await expect(
        startImpersonation(repos, 'user-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow('Only admins can impersonate users');
    });

    test('should throw ImpersonationForbiddenError when target not found', async () => {
      const adminUser = createMockDbUser({ id: 'admin-1', role: 'admin' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(adminUser);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      await expect(
        startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow(ImpersonationForbiddenError);

      await expect(
        startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow('Target user not found');
    });

    test('should throw ImpersonationForbiddenError when target is admin', async () => {
      const adminUser = createMockDbUser({ id: 'admin-1', role: 'admin' });
      const targetAdmin = createMockDbUser({ id: 'admin-2', role: 'admin' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(adminUser);
        if (id === 'admin-2') return Promise.resolve(targetAdmin);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const logAuditEvent = createMockAuditLogger();

      await expect(
        startImpersonation(repos, 'admin-1', 'admin-2', config, logAuditEvent),
      ).rejects.toThrow(ImpersonationForbiddenError);

      await expect(
        startImpersonation(repos, 'admin-1', 'admin-2', config, logAuditEvent),
      ).rejects.toThrow('Cannot impersonate admin users');
    });

    test('should throw ImpersonationRateLimitError when rate limit exceeded', async () => {
      const adminUser = createMockDbUser({ id: 'admin-1', role: 'admin' });
      const targetUser = createMockDbUser({ id: 'target-1', role: 'user' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(adminUser);
        if (id === 'target-1') return Promise.resolve(targetUser);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig({ maxPerHour: 2 });
      const logAuditEvent = createMockAuditLogger();

      // First two should succeed
      await startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent);
      await startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent);

      // Third should fail
      await expect(
        startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow(ImpersonationRateLimitError);

      await expect(
        startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent),
      ).rejects.toThrow('Rate limit exceeded');
    });

    test('should use custom TTL from config', async () => {
      const adminUser = createMockDbUser({ id: 'admin-1', role: 'admin' });
      const targetUser = createMockDbUser({ id: 'target-1', role: 'user' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(adminUser);
        if (id === 'target-1') return Promise.resolve(targetUser);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig({ ttlMinutes: 15 });
      const logAuditEvent = createMockAuditLogger();

      const result = await startImpersonation(repos, 'admin-1', 'target-1', config, logAuditEvent);

      // Token should be valid
      expect(result.token).toBeDefined();

      // Audit event should log the custom TTL
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ ttlMinutes: 15 }),
        }),
      );
    });
  });

  // ==========================================================================
  // endImpersonation
  // ==========================================================================

  describe('endImpersonation', () => {
    test('should log audit event and return success message', async () => {
      const logAuditEvent = createMockAuditLogger();

      const result = await endImpersonation('admin-1', 'target-1', logAuditEvent);

      expect(result.message).toBe('Impersonation session ended');
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-1',
          action: 'admin_impersonation_end',
          resource: 'user',
          resourceId: 'target-1',
          category: 'security',
          severity: 'warn',
        }),
      );
    });
  });

  // ==========================================================================
  // validateImpersonationToken
  // ==========================================================================

  describe('validateImpersonationToken', () => {
    test('should return payload for valid impersonation token', () => {
      const token = jwtSign(
        {
          type: 'impersonation',
          impersonatorId: 'admin-1',
          targetUserId: 'target-1',
        },
        JWT_SECRET,
        { expiresIn: '30m' },
      );

      const result = validateImpersonationToken(token, { jwtSecret: JWT_SECRET });

      expect(result).not.toBeNull();
      expect(result?.impersonatorId).toBe('admin-1');
      expect(result?.targetUserId).toBe('target-1');
    });

    test('should return null for token with wrong type', () => {
      const token = jwtSign(
        {
          type: 'access',
          impersonatorId: 'admin-1',
          targetUserId: 'target-1',
        },
        JWT_SECRET,
        { expiresIn: '30m' },
      );

      const result = validateImpersonationToken(token, { jwtSecret: JWT_SECRET });

      expect(result).toBeNull();
    });

    test('should return null for token with missing fields', () => {
      const token = jwtSign(
        {
          type: 'impersonation',
          // Missing impersonatorId and targetUserId
        },
        JWT_SECRET,
        { expiresIn: '30m' },
      );

      const result = validateImpersonationToken(token, { jwtSecret: JWT_SECRET });

      expect(result).toBeNull();
    });

    test('should return null for expired token', () => {
      const token = jwtSign(
        {
          type: 'impersonation',
          impersonatorId: 'admin-1',
          targetUserId: 'target-1',
        },
        JWT_SECRET,
        { expiresIn: 0 }, // Already expired (0 seconds)
      );

      const result = validateImpersonationToken(token, { jwtSecret: JWT_SECRET });

      expect(result).toBeNull();
    });

    test('should return null for token with wrong secret', () => {
      const token = jwtSign(
        {
          type: 'impersonation',
          impersonatorId: 'admin-1',
          targetUserId: 'target-1',
        },
        'wrong-secret-that-is-at-least-32-characters-long',
        { expiresIn: '30m' },
      );

      const result = validateImpersonationToken(token, { jwtSecret: JWT_SECRET });

      expect(result).toBeNull();
    });

    test('should return null for malformed token', () => {
      const result = validateImpersonationToken('not-a-jwt', { jwtSecret: JWT_SECRET });

      expect(result).toBeNull();
    });
  });
});
