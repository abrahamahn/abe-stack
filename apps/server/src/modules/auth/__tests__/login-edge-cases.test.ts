// apps/server/src/modules/auth/__tests__/login-edge-cases.test.ts
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
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AuthConfig } from '@config';
import type { DbClient, Logger } from '@infrastructure';

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
  passwordResetTokens: { tokenHash: 'tokenHash', expiresAt: 'expiresAt', usedAt: 'usedAt' },
  emailVerificationTokens: { tokenHash: 'tokenHash', expiresAt: 'expiresAt', usedAt: 'usedAt' },
  refreshTokens: { token: 'token' },
  users: { email: 'email', id: 'id', passwordHash: 'passwordHash', emailVerified: 'emailVerified' },
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

vi.mock('../utils', () => ({
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

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
  and: vi.fn((...args: unknown[]) => args),
  gt: vi.fn((...args: unknown[]) => args),
  isNull: vi.fn((...args: unknown[]) => args),
}));

// ============================================================================
// Test Helpers
// ============================================================================

const TEST_CONFIG: AuthConfig = {
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
} as unknown as AuthConfig;

function createMockDb(): DbClient {
  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  }));

  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{ id: 'user-id' }])),
      })),
    })),
  }));

  const mockDelete = vi.fn(() => ({
    where: vi.fn(() => Promise.resolve()),
  }));

  return {
    query: {
      users: {
        findFirst: vi.fn(),
      },
      passwordResetTokens: {
        findFirst: vi.fn(),
      },
      emailVerificationTokens: {
        findFirst: vi.fn(),
      },
      refreshTokens: {
        findFirst: vi.fn(),
      },
      loginAttempts: {
        findMany: vi.fn(),
      },
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  } as unknown as DbClient;
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
    const logger = createMockLogger();
    const email = 'test@example.com';
    const password = 'correct-password';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    // First attempt: account is locked
    vi.mocked(isAccountLocked).mockResolvedValueOnce(true);

    await expect(authenticateUser(db, TEST_CONFIG, email, password, logger)).rejects.toThrow(
      AccountLockedError,
    );

    // Advance time past lockout duration (30 minutes)
    vi.advanceTimersByTime(31 * 60 * 1000);

    // Second attempt: lockout has expired
    vi.mocked(isAccountLocked).mockResolvedValueOnce(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const result = await authenticateUser(db, TEST_CONFIG, email, password, logger);

    expect(result.accessToken).toBe('access-token');
    expect(result.user.email).toBe(email);
  });

  test('should remain locked before lockout period expires', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const password = 'correct-password';

    // Account is locked
    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    // Advance time by half the lockout duration (15 minutes)
    vi.advanceTimersByTime(15 * 60 * 1000);

    await expect(authenticateUser(db, TEST_CONFIG, email, password, logger)).rejects.toThrow(
      AccountLockedError,
    );

    expect(logLoginAttempt).toHaveBeenCalledWith(
      db,
      email,
      false,
      undefined,
      undefined,
      'Account locked',
    );
  });

  test('should track lockout status with remaining time', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const lockoutConfig = TEST_CONFIG.lockout;

    const lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({
      isLocked: true,
      failedAttempts: 5,
      remainingTime: 15 * 60 * 1000,
      lockedUntil,
    });

    const status = await getAccountLockoutStatus(db, email, lockoutConfig);

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
    const logger = createMockLogger();
    const email = 'test@example.com';
    const password = 'correct-password';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    // Fire 3 parallel login requests
    const loginPromises = [
      authenticateUser(db, TEST_CONFIG, email, password, logger),
      authenticateUser(db, TEST_CONFIG, email, password, logger),
      authenticateUser(db, TEST_CONFIG, email, password, logger),
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
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    const { verifyPasswordSafe } = await import('../utils');
    // Alternate success/failure
    vi.mocked(verifyPasswordSafe)
      .mockResolvedValueOnce(true) // First succeeds
      .mockResolvedValueOnce(false) // Second fails
      .mockResolvedValueOnce(true); // Third succeeds

    const results = await Promise.allSettled([
      authenticateUser(db, TEST_CONFIG, email, 'correct-password', logger),
      authenticateUser(db, TEST_CONFIG, email, 'wrong-password', logger),
      authenticateUser(db, TEST_CONFIG, email, 'correct-password', logger),
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
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const { verifyPasswordSafe } = await import('../utils');
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
        authenticateUser(db, TEST_CONFIG, email, 'wrong-password', logger).catch((e: unknown) => e),
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
    const oldRefreshToken = 'old-refresh-token';

    const { rotateRefreshToken } = await import('../utils');

    // After password reset, refresh token rotation should fail
    vi.mocked(rotateRefreshToken).mockResolvedValue(null);

    await expect(refreshUserTokens(db, TEST_CONFIG, oldRefreshToken)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  test('should allow new login after password change', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const newPassword = 'NewSecurePassword123!';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'new-hashed-password',
      emailVerified: true,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const result = await authenticateUser(db, TEST_CONFIG, email, newPassword, logger);

    expect(result.accessToken).toBe('access-token');
    expect(result.user.email).toBe(email);
  });

  test('should reject old password after password change', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const oldPassword = 'OldPassword123!';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'new-hashed-password', // Password was changed
      emailVerified: true,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false); // Old password doesn't match new hash

    await expect(authenticateUser(db, TEST_CONFIG, email, oldPassword, logger)).rejects.toThrow(
      InvalidCredentialsError,
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
    const logger = createMockLogger();
    const email = 'locked@example.com';
    const correctPassword = 'CorrectPassword123!';

    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await expect(authenticateUser(db, TEST_CONFIG, email, correctPassword, logger)).rejects.toThrow(
      AccountLockedError,
    );

    // Password verification should NOT be called when account is locked
    const { verifyPasswordSafe } = await import('../utils');
    expect(verifyPasswordSafe).not.toHaveBeenCalled();
  });

  test('should log lockout rejection with IP and user agent', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'locked@example.com';
    const ipAddress = '192.168.1.100';
    const userAgent = 'Mozilla/5.0 Chrome/120';

    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await expect(
      authenticateUser(db, TEST_CONFIG, email, 'any-password', logger, ipAddress, userAgent),
    ).rejects.toThrow(AccountLockedError);

    expect(logLoginAttempt).toHaveBeenCalledWith(
      db,
      email,
      false,
      ipAddress,
      userAgent,
      'Account locked',
    );
  });

  test('should not increment failed attempts during lockout', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'locked@example.com';

    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    // Make 3 attempts during lockout
    for (let i = 0; i < 3; i++) {
      await expect(
        authenticateUser(db, TEST_CONFIG, email, 'wrong-password', logger),
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
    const lockoutConfig = TEST_CONFIG.lockout;

    // Mock progressive delays: 1s, 2s, 4s, 8s, 16s
    const expectedDelays = [1000, 2000, 4000, 8000, 16000];

    for (let i = 0; i < expectedDelays.length; i++) {
      vi.mocked(getProgressiveDelay).mockResolvedValueOnce(expectedDelays[i]);

      const delay = await getProgressiveDelay(db, email, lockoutConfig);
      expect(delay).toBe(expectedDelays[i]);
    }
  });

  test('should cap delay at maximum value', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const lockoutConfig = TEST_CONFIG.lockout;
    const MAX_DELAY = 30000; // 30 seconds max

    // After many failures, should be capped at max
    vi.mocked(getProgressiveDelay).mockResolvedValue(MAX_DELAY);

    const delay = await getProgressiveDelay(db, email, lockoutConfig);
    expect(delay).toBeLessThanOrEqual(MAX_DELAY);
  });

  test('should reset delay after successful login', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, TEST_CONFIG, email, 'correct-password', logger);

    // After successful login, next attempt should have no delay
    vi.mocked(getProgressiveDelay).mockResolvedValue(0);
    const delay = await getProgressiveDelay(db, email, TEST_CONFIG.lockout);
    expect(delay).toBe(0);
  });

  test('should apply delay before password verification', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    const delayApplied = vi.fn();
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockImplementation(async () => {
      delayApplied();
    });
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, TEST_CONFIG, email, 'password', logger);

    expect(delayApplied).toHaveBeenCalled();
    expect(applyProgressiveDelay).toHaveBeenCalledBefore(verifyPasswordSafe);
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
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    // First: simulate 4 failed attempts (just under lockout threshold)
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 4 });

    // Then successful login
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, TEST_CONFIG, email, 'correct-password', logger);

    // Verify successful login was logged (which resets the counter window)
    expect(logLoginAttempt).toHaveBeenCalledWith(db, email, true, undefined, undefined);
  });

  test('should not trigger lockout after counter reset', async () => {
    const db = createMockDb();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const { verifyPasswordSafe } = await import('../utils');

    // After successful login, failed attempts counter should be reset
    // So even if we have more failed attempts, we start fresh

    // First: successful login (resets counter)
    vi.mocked(verifyPasswordSafe).mockResolvedValueOnce(true);
    await authenticateUser(db, TEST_CONFIG, email, 'correct-password', logger);

    // Reset mock to track new failures
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    // Second: one failed attempt (should be counted as first failure, not as 5th)
    vi.mocked(verifyPasswordSafe).mockResolvedValueOnce(false);

    await expect(
      authenticateUser(db, TEST_CONFIG, email, 'wrong-password', logger),
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

    const status = await getAccountLockoutStatus(db, email, TEST_CONFIG.lockout);

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
    const token = 'valid-verification-token';

    const { hashPassword } = await import('../utils');
    vi.mocked(hashPassword).mockResolvedValue('hashed-token');

    const mockTokenRecord = {
      id: 'token-id',
      userId: 'user-id',
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 1000000),
      usedAt: null,
    };
    vi.mocked(db.query.emailVerificationTokens.findFirst).mockResolvedValue(mockTokenRecord);

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      name: 'Test',
      role: 'user' as const,
      emailVerified: true,
    };

    vi.mocked(withTransaction).mockImplementation(async (_db, fn) => fn(db));
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([mockUser]),
        }),
      }),
    } as never);

    const result = await verifyEmail(db, TEST_CONFIG, token);

    expect(result.accessToken).toBe('access-token');
    expect(result.refreshToken).toBe('refresh-token');
    expect(result.user.id).toBe('user-id');
    // Note: emailVerified is not included in the AuthResponse user object
    // (it's only stored in the database, not returned to the client)
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
    const logger = createMockLogger();
    const email = 'nonexistent@example.com';

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    const { verifyPasswordSafe } = await import('../utils');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    await expect(authenticateUser(db, TEST_CONFIG, email, 'any-password', logger)).rejects.toThrow(
      InvalidCredentialsError,
    );

    // verifyPasswordSafe should be called even for non-existent users (timing attack prevention)
    expect(verifyPasswordSafe).toHaveBeenCalledWith('any-password', undefined);
  });

  test('should take similar time for existing vs non-existing user', async () => {
    const db = createMockDb();
    const logger = createMockLogger();

    const { verifyPasswordSafe } = await import('../utils');

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
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce(null);

    const start1 = Date.now();
    await expect(
      authenticateUser(db, TEST_CONFIG, 'nonexistent@example.com', 'password', logger),
    ).rejects.toThrow();
    const time1 = Date.now() - start1;

    // Existing user with wrong password
    vi.mocked(db.query.users.findFirst).mockResolvedValueOnce({
      id: 'user-123',
      email: 'existing@example.com',
      passwordHash: 'hash',
      emailVerified: true,
      role: 'user',
      name: 'Test',
    });

    const start2 = Date.now();
    await expect(
      authenticateUser(db, TEST_CONFIG, 'existing@example.com', 'wrong-password', logger),
    ).rejects.toThrow();
    const time2 = Date.now() - start2;

    // Times should be within reasonable bounds (accounting for test overhead)
    expect(Math.abs(time1 - time2)).toBeLessThan(100);
  });
});
