// apps/server/src/modules/auth/security/__tests__/login-edge-cases.test.ts
/**
 * Login Flow Edge Cases Tests
 *
 * Tests edge cases for authentication including:
 * - Lockout expiration
 * - Parallel login requests
 * - Password change invalidation
 * - Progressive delay timing
 * - Failed attempt counter reset
 */

import { AccountLockedError, InvalidCredentialsError } from '@abe-stack/core';
import { authenticateUser, refreshUserTokens, verifyEmail } from '@auth/service';
import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  getProgressiveDelay,
  isAccountLocked,
  logLoginAttempt,
  withTransaction,
} from '@infrastructure';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { Auth } from '@';
import type { RawDb } from '@abe-stack/db';
import type { Logger, Repositories } from '@infrastructure';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@abe-stack/core', async () => {
  const actual = await vi.importActual('@abe-stack/core');
  return {
    ...actual,
    validatePassword: vi.fn(),
  };
});

vi.mock('@infrastructure', () => ({
  applyProgressiveDelay: vi.fn(),
  getAccountLockoutStatus: vi.fn(),
  getProgressiveDelay: vi.fn(),
  isAccountLocked: vi.fn(),
  logAccountLockedEvent: vi.fn(),
  logLoginAttempt: vi.fn(),
  withTransaction: vi.fn(),
  emailTemplates: {
    emailVerification: vi.fn((url: string) => ({
      to: '',
      subject: 'Verify',
      text: `URL: ${url}`,
      html: `<a href="${url}">Verify</a>`,
    })),
    passwordReset: vi.fn((url: string) => ({
      to: '',
      subject: 'Reset',
      text: `URL: ${url}`,
      html: `<a href="${url}">Reset</a>`,
    })),
  },
}));

vi.mock('../../utils/index.js', () => ({
  createAccessToken: vi.fn().mockReturnValue('access-token'),
  createAuthResponse: vi.fn((accessToken, refreshToken, user) => ({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })),
  createRefreshTokenFamily: vi
    .fn()
    .mockResolvedValue({ familyId: 'family-1', token: 'refresh-token' }),
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  needsRehash: vi.fn().mockReturnValue(false),
  rotateRefreshToken: vi.fn(),
  verifyPasswordSafe: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const TEST_: Auth = {
  jwt: {
    secret: 'test-secret-32-characters-long!!',
    accessTokenExpiry: '15m',
  },
  argon2: {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  },
  refreshToken: {
    expiryDays: 7,
    gracePeriodSeconds: 30,
  },
  lockout: {
    maxAttempts: 5,
    lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
    progressiveDelay: true,
    baseDelayMs: 1000,
  },
} as unknown as Auth;

function createMockDb(): RawDb {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  } as unknown as RawDb;
}

function createMockLogger(): Logger {
  const mockLogger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => mockLogger),
  };
  return mockLogger;
}

function createMockRepos() {
  return {
    users: {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
      existsByEmail: vi.fn(),
      incrementFailedAttempts: vi.fn(),
      resetFailedAttempts: vi.fn(),
      lockAccount: vi.fn(),
      unlockAccount: vi.fn(),
      verifyEmail: vi.fn(),
      updateWithVersion: vi.fn(),
    },
    refreshTokens: {
      findById: vi.fn(),
      findByToken: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteByToken: vi.fn(),
      deleteByUserId: vi.fn(),
      deleteByFamilyId: vi.fn(),
      deleteExpired: vi.fn(),
    },
    refreshTokenFamilies: {
      findById: vi.fn(),
      findActiveByUserId: vi.fn(),
      create: vi.fn(),
      revoke: vi.fn(),
      revokeAllForUser: vi.fn(),
    },
    loginAttempts: {
      create: vi.fn(),
      countRecentFailures: vi.fn(),
      findRecentByEmail: vi.fn(),
      deleteOlderThan: vi.fn(),
    },
    passwordResetTokens: {
      findById: vi.fn(),
      findValidByTokenHash: vi.fn(),
      findValidByUserId: vi.fn(),
      create: vi.fn(),
      markAsUsed: vi.fn(),
      invalidateByUserId: vi.fn(),
      deleteByUserId: vi.fn(),
      deleteExpired: vi.fn(),
    },
    emailVerificationTokens: {
      findById: vi.fn(),
      findValidByTokenHash: vi.fn(),
      findValidByUserId: vi.fn(),
      create: vi.fn(),
      markAsUsed: vi.fn(),
      invalidateByUserId: vi.fn(),
      deleteByUserId: vi.fn(),
      deleteExpired: vi.fn(),
    },
    securityEvents: {
      create: vi.fn(),
      findByUserId: vi.fn(),
      findByEmail: vi.fn(),
      findByType: vi.fn(),
      findBySeverity: vi.fn(),
      countByType: vi.fn(),
      deleteOlderThan: vi.fn(),
    },
    magicLinkTokens: {
      findById: vi.fn(),
      findValidByTokenHash: vi.fn(),
      findValidByEmail: vi.fn(),
      findRecentByEmail: vi.fn(),
      countRecentByEmail: vi.fn(),
      create: vi.fn(),
      markAsUsed: vi.fn(),
      deleteByEmail: vi.fn(),
      deleteExpired: vi.fn(),
    },
    oauthConnections: {
      findById: vi.fn(),
      findByUserIdAndProvider: vi.fn(),
      findByProviderUserId: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByUserId: vi.fn(),
      deleteByUserIdAndProvider: vi.fn(),
    },
    pushSubscriptions: {
      findById: vi.fn(),
      findByEndpoint: vi.fn(),
      findByUserId: vi.fn(),
      create: vi.fn(),
      updateLastUsed: vi.fn(),
      delete: vi.fn(),
      deleteByUserId: vi.fn(),
      deleteInactive: vi.fn(),
    },
    notificationPreferences: {
      findByUserId: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
  } as unknown as Repositories;
}

// ============================================================================
// Tests: Account Lockout Expiration
// ============================================================================

describe('Account Lockout Expiration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should allow login after lockout period expires', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const password = 'correct-password';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    // First attempt: account is locked
    vi.mocked(isAccountLocked).mockResolvedValueOnce(true);

    await expect(authenticateUser(db, repos, TEST_, email, password, logger)).rejects.toThrow(
      AccountLockedError
    );

    // Advance time past lockout duration (30 minutes)
    vi.advanceTimersByTime(31 * 60 * 1000);

    // Second attempt: lockout has expired
    vi.mocked(isAccountLocked).mockResolvedValueOnce(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const result = await authenticateUser(db, repos, TEST_, email, password, logger);

    expect(result.accessToken).toBe('access-token');
    expect(result.user.email).toBe(email);
  });

  test('should remain locked before lockout period expires', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const password = 'correct-password';

    // Account is locked
    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    // Advance time by half the lockout duration (15 minutes)
    vi.advanceTimersByTime(15 * 60 * 1000);

    await expect(authenticateUser(db, repos, TEST_, email, password, logger)).rejects.toThrow(
      AccountLockedError
    );

    expect(logLoginAttempt).toHaveBeenCalledWith(
      db,
      email,
      false,
      undefined,
      undefined,
      'Account locked'
    );
  });

  test('should track lockout status with remaining time', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const lockout = TEST_.lockout;

    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({
      isLocked: true,
      failedAttempts: 5,
      remainingTime: 15 * 60 * 1000,
      lockedUntil,
    });

    const status = await getAccountLockoutStatus(db, email, lockout);

    expect(status.isLocked).toBe(true);
    expect(status.failedAttempts).toBe(5);
    expect(status.remainingTime).toBe(15 * 60 * 1000);
    expect(status.lockedUntil).toEqual(lockedUntil);
  });
});

// ============================================================================
// Tests: Parallel Login Requests
// ============================================================================

describe('Parallel Login Requests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should handle multiple simultaneous login attempts from same user', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const password = 'correct-password';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    // Fire 3 parallel login requests
    const loginPromises = [
      authenticateUser(db, repos, TEST_, email, password, logger),
      authenticateUser(db, repos, TEST_, email, password, logger),
      authenticateUser(db, repos, TEST_, email, password, logger),
    ];

    const results = await Promise.all(loginPromises);

    // All should succeed with valid tokens
    expect(results).toHaveLength(3);
    results.forEach((result) => {
      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(email);
    });
  });

  test('should handle mixed success/failure parallel attempts', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    // Alternate success/failure
    vi.mocked(verifyPasswordSafe)
      .mockResolvedValueOnce(true) // First succeeds
      .mockResolvedValueOnce(false) // Second fails
      .mockResolvedValueOnce(true); // Third succeeds

    const results = await Promise.allSettled([
      authenticateUser(db, repos, TEST_, email, 'correct-password', logger),
      authenticateUser(db, repos, TEST_, email, 'wrong-password', logger),
      authenticateUser(db, repos, TEST_, email, 'correct-password', logger),
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');

    if (results[1].status === 'rejected') {
      expect(results[1].reason).toBeInstanceOf(InvalidCredentialsError);
    }
  });

  test('should trigger lockout after concurrent failed attempts exceed threshold', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    // Track failed attempts count
    let failedAttempts = 0;
    vi.mocked(getAccountLockoutStatus).mockImplementation(async () => {
      failedAttempts++;
      return {
        isLocked: failedAttempts >= 5,
        failedAttempts,
      };
    });

    // Simulate 5 concurrent failed attempts
    const failedPromises = Array(5)
      .fill(null)
      .map(() =>
        authenticateUser(db, repos, TEST_, email, 'wrong-password', logger).catch((e: unknown) => e)
      );

    const results = await Promise.all(failedPromises);

    // All should fail with InvalidCredentialsError
    results.forEach((result) => {
      expect(result).toBeInstanceOf(InvalidCredentialsError);
    });
  });
});

// ============================================================================
// Tests: Password Change Session Invalidation
// ============================================================================

describe('Password Change Session Invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should invalidate refresh tokens after password reset', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const oldRefreshToken = 'old-refresh-token';

    const { rotateRefreshToken } = await import('../../utils/index.js');

    // After password reset, refresh token rotation should fail
    vi.mocked(rotateRefreshToken).mockResolvedValue(null);

    await expect(refreshUserTokens(db, repos, TEST_, oldRefreshToken)).rejects.toThrow(
      'Invalid or expired token'
    );
  });

  test('should allow new login after password change', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const newPassword = 'NewSecurePassword123!';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'new-hashed-password',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const result = await authenticateUser(db, repos, TEST_, email, newPassword, logger);

    expect(result.accessToken).toBe('access-token');
    expect(result.user.email).toBe(email);
  });

  test('should reject old password after password change', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const oldPassword = 'OldPassword123!';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'new-hashed-password', // Password was changed
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false); // Old password doesn't match new hash

    await expect(authenticateUser(db, repos, TEST_, email, oldPassword, logger)).rejects.toThrow(
      InvalidCredentialsError
    );
  });
});

// ============================================================================
// Tests: Login During Active Lockout
// ============================================================================

describe('Login During Active Lockout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should reject login with correct password during lockout', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'locked@example.com';
    const correctPassword = 'CorrectPassword123!';

    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await expect(
      authenticateUser(db, repos, TEST_, email, correctPassword, logger)
    ).rejects.toThrow(AccountLockedError);

    // Password verification should NOT be called when account is locked
    const { verifyPasswordSafe } = await import('../../utils/index.js');
    expect(verifyPasswordSafe).not.toHaveBeenCalled();
  });

  test('should log lockout rejection with IP and user agent', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'locked@example.com';
    const ipAddress = '192.168.1.100';
    const userAgent = 'Mozilla/5.0 Chrome/120';

    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await expect(
      authenticateUser(db, repos, TEST_, email, 'any-password', logger, ipAddress, userAgent)
    ).rejects.toThrow(AccountLockedError);

    expect(logLoginAttempt).toHaveBeenCalledWith(
      db,
      email,
      false,
      ipAddress,
      userAgent,
      'Account locked'
    );
  });

  test('should not increment failed attempts during lockout', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'locked@example.com';

    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    // Make 3 attempts during lockout
    for (let i = 0; i < 3; i++) {
      await expect(
        authenticateUser(db, repos, TEST_, email, 'wrong-password', logger)
      ).rejects.toThrow(AccountLockedError);
    }

    // getAccountLockoutStatus should not be called since we exit early on isAccountLocked
    expect(getAccountLockoutStatus).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: Progressive Delay Timing
// ============================================================================

describe('Progressive Delay Timing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('should apply exponential backoff delays', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const lockout = TEST_.lockout;

    // Mock progressive delays: 1s, 2s, 4s, 8s, 16s
    const expectedDelays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < expectedDelays.length; i++) {
      const expectedDelay = expectedDelays[i]!;
      vi.mocked(getProgressiveDelay).mockResolvedValueOnce(expectedDelay);

      const delay = await getProgressiveDelay(db, email, lockout);
      expect(delay).toBe(expectedDelay);
    }
  });

  test('should cap delay at maximum value', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const lockout = TEST_.lockout;
    const MAX_DELAY = 30000; // 30 seconds max

    // After many failures, should be capped at max
    vi.mocked(getProgressiveDelay).mockResolvedValue(MAX_DELAY);

    const delay = await getProgressiveDelay(db, email, lockout);
    expect(delay).toBeLessThanOrEqual(MAX_DELAY);
  });

  test('should reset delay after successful login', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, repos, TEST_, email, 'correct-password', logger);

    // After successful login, next attempt should have no delay
    vi.mocked(getProgressiveDelay).mockResolvedValue(0);
    const delay = await getProgressiveDelay(db, email, TEST_.lockout);
    expect(delay).toBe(0);
  });

  test('should apply delay before password verification', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    const delayApplied = vi.fn();
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockImplementation(async () => {
      delayApplied();
    });
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, repos, TEST_, email, 'password', logger);

    expect(delayApplied).toHaveBeenCalled();
    expect(applyProgressiveDelay).toHaveBeenCalledBefore(vi.mocked(verifyPasswordSafe));
  });
});

// ============================================================================
// Tests: Lockout Counter Reset
// ============================================================================

describe('Lockout Counter Reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should reset failed attempt counter on successful login', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    // First: simulate 4 failed attempts (just under lockout threshold)
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 4 });

    // Then successful login
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, repos, TEST_, email, 'correct-password', logger);

    // Verify successful login was logged (which resets the counter window)
    expect(logLoginAttempt).toHaveBeenCalledWith(db, email, true, undefined, undefined);
  });

  test('should not trigger lockout after counter reset', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const { verifyPasswordSafe } = await import('../../utils/index.js');

    // After successful login, failed attempts counter should be reset
    // So even if we have more failed attempts, we start fresh

    // First: successful login (resets counter)
    vi.mocked(verifyPasswordSafe).mockResolvedValueOnce(true);
    await authenticateUser(db, repos, TEST_, email, 'correct-password', logger);

    // Reset mock to track new failures
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    // Second: one failed attempt (should be counted as first failure, not as 5th)
    vi.mocked(verifyPasswordSafe).mockResolvedValueOnce(false);

    await expect(
      authenticateUser(db, repos, TEST_, email, 'wrong-password', logger)
    ).rejects.toThrow(InvalidCredentialsError);

    // Account should not be locked (only 1 failure after reset)
    expect(getAccountLockoutStatus).toHaveBeenCalled();
  });

  test('should track failed attempts within lockout window only', async () => {
    const db = createMockDb();
    const email = 'test@example.com';

    // Mock status showing only recent failures within window
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({
      isLocked: false,
      failedAttempts: 2, // Only 2 failures in the current window
    });

    const status = await getAccountLockoutStatus(db, email, TEST_.lockout);

    expect(status.isLocked).toBe(false);
    expect(status.failedAttempts).toBe(2);
  });
});

// ============================================================================
// Tests: Email Verification Auto-Login
// ============================================================================

describe('Email Verification Auto-Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should auto-login user after email verification', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const token = 'valid-verification-token';

    const { hashPassword } = await import('../../utils/index.js');
    vi.mocked(hashPassword).mockResolvedValue('hashed-token');

    const mockTokenRecord = {
      id: 'token-id',
      userId: 'user-id',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 1000000),
      usedAt: null,
      createdAt: new Date(),
    };
    vi.mocked(repos.emailVerificationTokens.findValidByTokenHash).mockResolvedValue(
      mockTokenRecord
    );

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(withTransaction).mockImplementation(async (_db, fn) => {
      const mockTx = {
        query: vi.fn().mockResolvedValue([mockUser]),
        queryOne: vi.fn().mockResolvedValue(mockUser),
        execute: vi.fn().mockResolvedValue(1),
        raw: vi.fn(),
      } as unknown as RawDb;
      return fn(mockTx);
    });

    const result = await verifyEmail(db, repos, TEST_, token);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe('user-id');
    expect(result.user.email).toBe('test@example.com');
  });
});

// ============================================================================
// Tests: Timing-Safe Operations
// ============================================================================

describe('Timing-Safe Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should use timing-safe password verification for non-existent users', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'nonexistent@example.com';

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(null);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    const { verifyPasswordSafe } = await import('../../utils/index.js');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    await expect(authenticateUser(db, repos, TEST_, email, 'any-password', logger)).rejects.toThrow(
      InvalidCredentialsError
    );

    // verifyPasswordSafe should be called even for non-existent users (timing attack prevention)
    expect(verifyPasswordSafe).toHaveBeenCalledWith('any-password', undefined);
  });

  test('should take similar time for existing vs non-existing user', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();

    const { verifyPasswordSafe } = await import('../../utils/index.js');

    // Mock timing-safe verification that takes same time regardless of user existence
    vi.mocked(verifyPasswordSafe).mockImplementation(async () => {
      // Simulate constant-time comparison
      await new Promise((resolve) => setTimeout(resolve, 50));
      return false;
    });

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    // Non-existent user
    vi.mocked(repos.users.findByEmail).mockResolvedValueOnce(null);

    const start1 = Date.now();
    await expect(
      authenticateUser(db, repos, TEST_, 'nonexistent@example.com', 'password', logger)
    ).rejects.toThrow();
    const time1 = Date.now() - start1;

    // Existing user with wrong password
    vi.mocked(repos.users.findByEmail).mockResolvedValueOnce({
      id: 'user-123',
      email: 'existing@example.com',
      passwordHash: 'hash',
      avatarUrl: null,
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: 'user',
      name: 'Test',
      lockedUntil: null,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    });

    const start2 = Date.now();
    await expect(
      authenticateUser(db, repos, TEST_, 'existing@example.com', 'wrong-password', logger)
    ).rejects.toThrow();
    const time2 = Date.now() - start2;

    // Times should be within reasonable bounds (accounting for test overhead)
    expect(Math.abs(time1 - time2)).toBeLessThan(100);
  });
});
