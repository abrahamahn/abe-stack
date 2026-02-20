// main/apps/server/src/__tests__/integration/impersonation-lifecycle.integration.test.ts
/**
 * Impersonation Lifecycle Integration Tests
 *
 * Tests the full impersonation flow:
 *   start -> perform actions (validate token) -> verify audit trail -> end
 *   admin-only enforcement, safety guards, and rate limiting.
 */

import {
  endImpersonation,
  ImpersonationForbiddenError,
  ImpersonationRateLimitError,
  resetRateLimitStore,
  startImpersonation,
  validateImpersonationToken,
} from '@bslt/core/admin/impersonation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ImpersonationAuditLogger,
  ImpersonationConfig,
  ImpersonationRepositories,
} from '@bslt/core/admin/impersonation';
import type { User as DbUser, UserRepository } from '@bslt/core/db';

// ============================================================================
// Test Helpers
// ============================================================================

const JWT_SECRET = 'integration-test-secret-that-is-at-least-32-characters';

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

function createAuditLogger(): ImpersonationAuditLogger & { calls: unknown[] } {
  const calls: unknown[] = [];
  const fn = vi.fn().mockImplementation(async (event: unknown) => {
    calls.push(event);
  }) as unknown as ImpersonationAuditLogger & { calls: unknown[] };
  fn.calls = calls;
  return fn;
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Impersonation Lifecycle Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimitStore();
  });

  // ==========================================================================
  // Full Lifecycle: start -> perform actions -> verify audit trail -> end
  // ==========================================================================

  describe('full lifecycle: start -> validate token -> verify audit -> end', () => {
    it('should complete the full impersonation lifecycle with audit trail', async () => {
      const adminUser = createMockDbUser({
        id: 'admin-lifecycle-1',
        role: 'admin',
        email: 'admin@test.com',
      });
      const targetUser = createMockDbUser({
        id: 'target-lifecycle-1',
        role: 'user',
        email: 'target@test.com',
      });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-lifecycle-1') return Promise.resolve(adminUser);
        if (id === 'target-lifecycle-1') return Promise.resolve(targetUser);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig({ ttlMinutes: 15 });
      const auditLogger = createAuditLogger();

      // Step 1: Start impersonation
      const startResult = await startImpersonation(
        repos,
        'admin-lifecycle-1',
        'target-lifecycle-1',
        config,
        auditLogger,
      );

      expect(startResult.token).toBeDefined();
      expect(startResult.expiresAt).toBeDefined();
      expect(startResult.targetUser.id).toBe('target-lifecycle-1');
      expect(startResult.targetUser.email).toBe('target@test.com');

      // Step 2: Validate the impersonation token (simulates performing actions)
      const decoded = validateImpersonationToken(startResult.token, config);
      expect(decoded).not.toBeNull();
      expect(decoded?.impersonatorId).toBe('admin-lifecycle-1');
      expect(decoded?.targetUserId).toBe('target-lifecycle-1');

      // Step 3: Verify audit trail for start event
      expect(auditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-lifecycle-1',
          action: 'admin_impersonation_start',
          resource: 'user',
          resourceId: 'target-lifecycle-1',
          category: 'security',
          severity: 'warn',
          metadata: expect.objectContaining({
            targetEmail: 'target@test.com',
            ttlMinutes: 15,
          }),
        }),
      );

      // Step 4: End impersonation
      const endResult = await endImpersonation(
        'admin-lifecycle-1',
        'target-lifecycle-1',
        auditLogger,
      );

      expect(endResult.message).toBe('Impersonation session ended');

      // Step 5: Verify audit trail for end event
      expect(auditLogger).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-lifecycle-1',
          action: 'admin_impersonation_end',
          resource: 'user',
          resourceId: 'target-lifecycle-1',
          category: 'security',
          severity: 'warn',
        }),
      );

      // Total audit events: start + end = 2
      expect(auditLogger).toHaveBeenCalledTimes(2);
    });
  });

  // ==========================================================================
  // Admin-Only Enforcement
  // ==========================================================================

  describe('admin-only enforcement', () => {
    it('should reject impersonation by non-admin user', async () => {
      const regularUser = createMockDbUser({
        id: 'regular-1',
        role: 'user',
        email: 'regular@test.com',
      });

      const findById = vi.fn().mockResolvedValue(regularUser);
      const repos = createMockRepos(findById);
      const config = createConfig();
      const auditLogger = createAuditLogger();

      await expect(
        startImpersonation(repos, 'regular-1', 'target-1', config, auditLogger),
      ).rejects.toThrow(ImpersonationForbiddenError);

      await expect(
        startImpersonation(repos, 'regular-1', 'target-1', config, auditLogger),
      ).rejects.toThrow('Only admins can impersonate users');

      // No audit events should have been created
      expect(auditLogger).not.toHaveBeenCalled();
    });

    it('should reject impersonation of another admin', async () => {
      const admin1 = createMockDbUser({
        id: 'admin-1',
        role: 'admin',
        email: 'admin1@test.com',
      });
      const admin2 = createMockDbUser({
        id: 'admin-2',
        role: 'admin',
        email: 'admin2@test.com',
      });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(admin1);
        if (id === 'admin-2') return Promise.resolve(admin2);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const auditLogger = createAuditLogger();

      await expect(
        startImpersonation(repos, 'admin-1', 'admin-2', config, auditLogger),
      ).rejects.toThrow('Cannot impersonate admin users');
    });

    it('should reject self-impersonation', async () => {
      const repos = createMockRepos();
      const config = createConfig();
      const auditLogger = createAuditLogger();

      await expect(
        startImpersonation(repos, 'admin-1', 'admin-1', config, auditLogger),
      ).rejects.toThrow('Cannot impersonate yourself');
    });

    it('should reject when admin user not found', async () => {
      const findById = vi.fn().mockResolvedValue(null);
      const repos = createMockRepos(findById);
      const config = createConfig();
      const auditLogger = createAuditLogger();

      await expect(
        startImpersonation(repos, 'nonexistent-admin', 'target-1', config, auditLogger),
      ).rejects.toThrow('Admin user not found');
    });

    it('should reject when target user not found', async () => {
      const admin = createMockDbUser({ id: 'admin-1', role: 'admin' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-1') return Promise.resolve(admin);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const auditLogger = createAuditLogger();

      await expect(
        startImpersonation(repos, 'admin-1', 'nonexistent-target', config, auditLogger),
      ).rejects.toThrow('Target user not found');
    });
  });

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  describe('rate limiting', () => {
    it('should enforce per-admin rate limit', async () => {
      const admin = createMockDbUser({ id: 'admin-rate-1', role: 'admin' });
      const target = createMockDbUser({ id: 'target-rate-1', role: 'user' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-rate-1') return Promise.resolve(admin);
        if (id === 'target-rate-1') return Promise.resolve(target);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig({ maxPerHour: 2 });
      const auditLogger = createAuditLogger();

      // First two should succeed
      await startImpersonation(repos, 'admin-rate-1', 'target-rate-1', config, auditLogger);
      await startImpersonation(repos, 'admin-rate-1', 'target-rate-1', config, auditLogger);

      // Third should fail with rate limit error
      await expect(
        startImpersonation(repos, 'admin-rate-1', 'target-rate-1', config, auditLogger),
      ).rejects.toThrow(ImpersonationRateLimitError);

      await expect(
        startImpersonation(repos, 'admin-rate-1', 'target-rate-1', config, auditLogger),
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('should track rate limits per admin independently', async () => {
      const admin1 = createMockDbUser({ id: 'admin-rl-1', role: 'admin' });
      const admin2 = createMockDbUser({ id: 'admin-rl-2', role: 'admin' });
      const target = createMockDbUser({ id: 'target-rl-1', role: 'user' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-rl-1') return Promise.resolve(admin1);
        if (id === 'admin-rl-2') return Promise.resolve(admin2);
        if (id === 'target-rl-1') return Promise.resolve(target);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig({ maxPerHour: 1 });
      const auditLogger = createAuditLogger();

      // Admin 1 uses their one allowed impersonation
      await startImpersonation(repos, 'admin-rl-1', 'target-rl-1', config, auditLogger);

      // Admin 2 should still be able to impersonate
      await startImpersonation(repos, 'admin-rl-2', 'target-rl-1', config, auditLogger);

      // Admin 1 should now be rate-limited
      await expect(
        startImpersonation(repos, 'admin-rl-1', 'target-rl-1', config, auditLogger),
      ).rejects.toThrow(ImpersonationRateLimitError);
    });
  });

  // ==========================================================================
  // Token Validation
  // ==========================================================================

  describe('token validation edge cases', () => {
    it('should reject tokens signed with wrong secret', async () => {
      const admin = createMockDbUser({ id: 'admin-tv-1', role: 'admin' });
      const target = createMockDbUser({ id: 'target-tv-1', role: 'user' });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-tv-1') return Promise.resolve(admin);
        if (id === 'target-tv-1') return Promise.resolve(target);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig();
      const auditLogger = createAuditLogger();

      const result = await startImpersonation(
        repos,
        'admin-tv-1',
        'target-tv-1',
        config,
        auditLogger,
      );

      // Validate with different secret
      const wrongConfig = createConfig({
        jwtSecret: 'a-completely-different-secret-that-is-32-plus-chars',
      });
      const decoded = validateImpersonationToken(result.token, wrongConfig);

      expect(decoded).toBeNull();
    });

    it('should reject malformed tokens', () => {
      const config = createConfig();
      const result = validateImpersonationToken('not-a-valid-jwt', config);

      expect(result).toBeNull();
    });

    it('should reject tokens with missing claims', () => {
      const config = createConfig();
      const result = validateImpersonationToken('', config);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Audit Trail Completeness
  // ==========================================================================

  describe('audit trail completeness', () => {
    it('should include target email and TTL in start event metadata', async () => {
      const admin = createMockDbUser({
        id: 'admin-audit-1',
        role: 'admin',
      });
      const target = createMockDbUser({
        id: 'target-audit-1',
        role: 'user',
        email: 'specific-target@test.com',
      });

      const findById = vi.fn().mockImplementation((id: string) => {
        if (id === 'admin-audit-1') return Promise.resolve(admin);
        if (id === 'target-audit-1') return Promise.resolve(target);
        return Promise.resolve(null);
      });

      const repos = createMockRepos(findById);
      const config = createConfig({ ttlMinutes: 10 });
      const auditLogger = createAuditLogger();

      await startImpersonation(repos, 'admin-audit-1', 'target-audit-1', config, auditLogger);

      const startEvent = (auditLogger as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
        metadata: { targetEmail: string; ttlMinutes: number; expiresAt: string };
      };

      expect(startEvent.metadata.targetEmail).toBe('specific-target@test.com');
      expect(startEvent.metadata.ttlMinutes).toBe(10);
      expect(startEvent.metadata.expiresAt).toBeDefined();
    });

    it('should include endedAt timestamp in end event metadata', async () => {
      const auditLogger = createAuditLogger();

      await endImpersonation('admin-audit-1', 'target-audit-1', auditLogger);

      const endEvent = (auditLogger as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as {
        metadata: { endedAt: string };
      };

      expect(endEvent.metadata.endedAt).toBeDefined();
      // Should be a valid ISO date string
      expect(new Date(endEvent.metadata.endedAt).toISOString()).toBe(endEvent.metadata.endedAt);
    });
  });
});
