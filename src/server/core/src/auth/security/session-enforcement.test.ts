// src/server/core/src/auth/security/session-enforcement.test.ts
/**
 * Tests for Session Enforcement Helper
 *
 * Validates idle timeout checking and concurrent session enforcement.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  enforceMaxConcurrentSessions,
  getIdleTimeRemaining,
  isSessionIdle,
} from './session-enforcement';

import type { RefreshTokenFamily, Repositories } from '@abe-stack/db';

// ============================================================================
// Mock Repositories
// ============================================================================

function createMockRepos(): Repositories {
  return {
    refreshTokenFamilies: {
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
      create: vi.fn(),
      revoke: vi.fn(),
      revokeAllForUser: vi.fn(),
    },
    users: {} as never,
    refreshTokens: {} as never,
    loginAttempts: {} as never,
    passwordResetTokens: {} as never,
    emailVerificationTokens: {} as never,
    securityEvents: {} as never,
    totpBackupCodes: {} as never,
    emailChangeTokens: {} as never,
    emailChangeRevertTokens: {} as never,
    magicLinkTokens: {} as never,
    oauthConnections: {} as never,
    apiKeys: {} as never,
    pushSubscriptions: {} as never,
    notificationPreferences: {} as never,
    plans: {} as never,
    subscriptions: {} as never,
    customerMappings: {} as never,
    invoices: {} as never,
    paymentMethods: {} as never,
    billingEvents: {} as never,
    userSessions: {} as never,
    tenants: {} as never,
    memberships: {} as never,
    invitations: {} as never,
    notifications: {} as never,
    auditEvents: {} as never,
    jobs: {} as never,
    webhooks: {} as never,
    webhookDeliveries: {} as never,
    featureFlags: {} as never,
    tenantFeatureOverrides: {} as never,
    usageMetrics: {} as never,
    usageSnapshots: {} as never,
    legalDocuments: {} as never,
    userAgreements: {} as never,
    consentLogs: {} as never,
    dataExportRequests: {} as never,
    activities: {} as never,
    trustedDevices: {} as never,
    files: {} as never,
  } as Repositories;
}

function createMockFamily(overrides: Partial<RefreshTokenFamily> = {}): RefreshTokenFamily {
  return {
    id: 'family-1',
    userId: 'user-1',
    createdAt: new Date('2026-01-15T10:00:00Z'),
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    revokedAt: null,
    revokeReason: null,
    ...overrides,
  };
}

// ============================================================================
// Tests: isSessionIdle
// ============================================================================

describe('isSessionIdle', () => {
  it('should return false when session is within idle timeout', () => {
    const lastActiveAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
    const idleTimeoutDays = 7;

    expect(isSessionIdle(lastActiveAt, idleTimeoutDays)).toBe(false);
  });

  it('should return true when session exceeds idle timeout', () => {
    const lastActiveAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const idleTimeoutDays = 7;

    expect(isSessionIdle(lastActiveAt, idleTimeoutDays)).toBe(true);
  });

  it('should return false when session is exactly at the boundary', () => {
    // Exactly at the boundary (minus 1ms to stay under)
    const lastActiveAt = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000 + 1);
    const idleTimeoutDays = 7;

    expect(isSessionIdle(lastActiveAt, idleTimeoutDays)).toBe(false);
  });

  it('should return true with a 1-day timeout and session 2 days old', () => {
    const lastActiveAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    expect(isSessionIdle(lastActiveAt, 1)).toBe(true);
  });

  it('should return false for a just-created session', () => {
    const lastActiveAt = new Date();
    expect(isSessionIdle(lastActiveAt, 30)).toBe(false);
  });

  it('should handle very large timeout values', () => {
    const lastActiveAt = new Date(Date.now() - 364 * 24 * 60 * 60 * 1000); // 364 days ago
    expect(isSessionIdle(lastActiveAt, 365)).toBe(false);
  });

  it('should handle zero timeout', () => {
    const lastActiveAt = new Date();
    // With 0-day timeout, any session is idle (threshold is 0ms)
    // Actually now - now <= 0, a session at exactly now has 0ms idle which is not > 0
    expect(isSessionIdle(lastActiveAt, 0)).toBe(false);
  });
});

// ============================================================================
// Tests: getIdleTimeRemaining
// ============================================================================

describe('getIdleTimeRemaining', () => {
  it('should return positive remaining time for active session', () => {
    const lastActiveAt = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago
    const idleTimeoutDays = 7;

    const remaining = getIdleTimeRemaining(lastActiveAt, idleTimeoutDays);

    expect(remaining).toBeGreaterThan(0);
    // Should be roughly 7 days minus 1 hour
    const expectedMs = 7 * 24 * 60 * 60 * 1000 - 1 * 60 * 60 * 1000;
    expect(remaining).toBeCloseTo(expectedMs, -3); // Within 1000ms
  });

  it('should return 0 for an idle session', () => {
    const lastActiveAt = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000); // 8 days ago
    const idleTimeoutDays = 7;

    const remaining = getIdleTimeRemaining(lastActiveAt, idleTimeoutDays);

    expect(remaining).toBe(0);
  });

  it('should return 0 for a very old session', () => {
    const lastActiveAt = new Date('2020-01-01T00:00:00Z');
    expect(getIdleTimeRemaining(lastActiveAt, 1)).toBe(0);
  });
});

// ============================================================================
// Tests: enforceMaxConcurrentSessions
// ============================================================================

describe('enforceMaxConcurrentSessions', () => {
  let repos: Repositories;

  beforeEach(() => {
    repos = createMockRepos();
    vi.clearAllMocks();
  });

  it('should not revoke any sessions when under the limit', async () => {
    const families = [
      createMockFamily({ id: 'family-1' }),
      createMockFamily({ id: 'family-2' }),
    ];
    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(families);

    const count = await enforceMaxConcurrentSessions(repos, 'user-1', 5);

    expect(count).toBe(0);
    expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
  });

  it('should not revoke sessions when exactly at the limit', async () => {
    const families = [
      createMockFamily({ id: 'family-1' }),
      createMockFamily({ id: 'family-2' }),
      createMockFamily({ id: 'family-3' }),
    ];
    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(families);

    const count = await enforceMaxConcurrentSessions(repos, 'user-1', 3);

    expect(count).toBe(0);
    expect(repos.refreshTokenFamilies.revoke).not.toHaveBeenCalled();
  });

  it('should revoke oldest sessions when over the limit', async () => {
    const families = [
      createMockFamily({ id: 'family-newest', createdAt: new Date('2026-01-15T10:00:00Z') }),
      createMockFamily({ id: 'family-oldest', createdAt: new Date('2026-01-10T10:00:00Z') }),
      createMockFamily({ id: 'family-middle', createdAt: new Date('2026-01-12T10:00:00Z') }),
    ];
    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(families);
    vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(null);

    const count = await enforceMaxConcurrentSessions(repos, 'user-1', 2);

    expect(count).toBe(1);
    expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledTimes(1);
    // Should revoke the oldest one
    expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
      'family-oldest',
      'Session limit exceeded',
    );
  });

  it('should revoke multiple sessions when far over the limit', async () => {
    const families = [
      createMockFamily({ id: 'family-1', createdAt: new Date('2026-01-10T10:00:00Z') }),
      createMockFamily({ id: 'family-2', createdAt: new Date('2026-01-11T10:00:00Z') }),
      createMockFamily({ id: 'family-3', createdAt: new Date('2026-01-12T10:00:00Z') }),
      createMockFamily({ id: 'family-4', createdAt: new Date('2026-01-13T10:00:00Z') }),
      createMockFamily({ id: 'family-5', createdAt: new Date('2026-01-14T10:00:00Z') }),
    ];
    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue(families);
    vi.mocked(repos.refreshTokenFamilies.revoke).mockResolvedValue(null);

    const count = await enforceMaxConcurrentSessions(repos, 'user-1', 2);

    expect(count).toBe(3);
    expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledTimes(3);
    // Should revoke the 3 oldest
    expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
      'family-1',
      'Session limit exceeded',
    );
    expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
      'family-2',
      'Session limit exceeded',
    );
    expect(repos.refreshTokenFamilies.revoke).toHaveBeenCalledWith(
      'family-3',
      'Session limit exceeded',
    );
  });

  it('should return 0 when user has no sessions', async () => {
    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockResolvedValue([]);

    const count = await enforceMaxConcurrentSessions(repos, 'user-1', 5);

    expect(count).toBe(0);
  });

  it('should return 0 when maxSessions is 0', async () => {
    const count = await enforceMaxConcurrentSessions(repos, 'user-1', 0);

    expect(count).toBe(0);
    expect(repos.refreshTokenFamilies.findActiveByUserId).not.toHaveBeenCalled();
  });

  it('should propagate repository errors', async () => {
    vi.mocked(repos.refreshTokenFamilies.findActiveByUserId).mockRejectedValue(
      new Error('Database error'),
    );

    await expect(enforceMaxConcurrentSessions(repos, 'user-1', 5)).rejects.toThrow(
      'Database error',
    );
  });
});
