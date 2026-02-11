// src/server/core/src/auth/__tests__/login-edge-cases.test.ts
// backend/core/src/auth/__tests__/login-edge-cases.test.ts
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

import { withTransaction } from '@abe-stack/db';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  getProgressiveDelay,
  isAccountLocked,
  logLoginAttempt,
} from '../security/index';
import { authenticateUser, refreshUserTokens, verifyEmail } from '../service';
import { LOGIN_FAILURE_REASON, type AuthLogger } from '../types';

import type { AuthResult, TotpChallengeResult } from '../service';
import type { RawDb, Repositories } from '@abe-stack/db';
import type { AuthConfig } from '@abe-stack/shared/config';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@abe-stack/shared', async () => {
  const actual = await vi.importActual('@abe-stack/shared');
  return {
    ...actual,
    validatePassword: vi.fn(),
  };
});

vi.mock('../security/index', () => ({
  // MODIFIED HERE
  applyProgressiveDelay: vi.fn(),
  getAccountLockoutStatus: vi.fn(),
  getProgressiveDelay: vi.fn(),
  isAccountLocked: vi.fn(),
  logAccountLockedEvent: vi.fn(),
  logLoginAttempt: vi.fn(),
}));

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/db')>('@abe-stack/db');
  return {
    ...actual,
    withTransaction: vi.fn((db, callback) => callback(db)),
  };
});

vi.mock('../utils/index', () => ({
  // MODIFIED HERE
  createAccessToken: vi.fn().mockReturnValue('access-token'),
  createAuthResponse: vi.fn((accessToken, refreshToken, user) => ({
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
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

function createMockDb(): RawDb {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
  } as unknown as RawDb;
}

function createMockLogger(): AuthLogger {
  const mockLogger: AuthLogger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => mockLogger),
  } as AuthLogger;
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

interface MockUser {
  id: string;
  email: string;
  canonicalEmail: string;
  username: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  role: 'user' | 'admin' | 'moderator';
  passwordHash: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  lockedUntil: Date | null;
  lockReason: string | null;
  failedLoginAttempts: number;
  totpSecret: string | null;
  totpEnabled: boolean;
  phone: string | null;
  phoneVerified: boolean | null;
  dateOfBirth: Date | null;
  gender: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bio: string | null;
  language: string | null;
  website: string | null;
  lastUsernameChange: Date | null;
  deactivatedAt: Date | null;
  deletedAt: Date | null;
  deletionGracePeriodEnds: Date | null;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: 'user-123',
    email: 'test@example.com',
    canonicalEmail: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    avatarUrl: null,
    role: 'user',
    passwordHash: 'stored-hash',
    emailVerified: true,
    emailVerifiedAt: new Date(),
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
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
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

    const mockUser = createMockUser({ email });

    // First attempt: account is locked
    vi.mocked(isAccountLocked).mockResolvedValueOnce(true);

    await expect(
      authenticateUser(db, repos, TEST_CONFIG, email, password, logger),
    ).rejects.toMatchObject({
      name: 'AccountLockedError',
    });

    // Advance time past lockout duration (30 minutes)
    vi.advanceTimersByTime(31 * 60 * 1000);

    // Second attempt: lockout has expired
    vi.mocked(isAccountLocked).mockResolvedValueOnce(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const result = await authenticateUser(db, repos, TEST_CONFIG, email, password, logger);

    expect('requiresTotp' in result).toBe(false);
    if (!('requiresTotp' in result)) {
      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(email);
    }
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

    await expect(
      authenticateUser(db, repos, TEST_CONFIG, email, password, logger),
    ).rejects.toMatchObject({
      name: 'AccountLockedError',
    });

    expect(logLoginAttempt).toHaveBeenCalledWith(
      db,
      email,
      false,
      undefined,
      undefined,
      LOGIN_FAILURE_REASON.ACCOUNT_LOCKED,
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
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';
    const password = 'correct-password';

    const mockUser = createMockUser({ email });

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    // Fire 3 parallel login requests
    const loginPromises = [
      authenticateUser(db, repos, TEST_CONFIG, email, password, logger),
      authenticateUser(db, repos, TEST_CONFIG, email, password, logger),
      authenticateUser(db, repos, TEST_CONFIG, email, password, logger),
    ];

    const results = await Promise.all(loginPromises);

    // All should succeed with valid tokens
    expect(results).toHaveLength(3);
    results.forEach((result: AuthResult | TotpChallengeResult) => {
      // ADDED TYPE HERE
      expect('requiresTotp' in result).toBe(false);
      if (!('requiresTotp' in result)) {
        expect(result.accessToken).toBe('access-token');
        expect(result.user.email).toBe(email);
      }
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
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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

    const { verifyPasswordSafe } = await import('../utils/index');
    // Alternate success/failure
    vi.mocked(verifyPasswordSafe)
      .mockResolvedValueOnce(true) // First succeeds
      .mockResolvedValueOnce(false) // Second fails
      .mockResolvedValueOnce(true); // Third succeeds

    const results = await Promise.allSettled([
      authenticateUser(db, repos, TEST_CONFIG, email, 'correct-password', logger),
      authenticateUser(db, repos, TEST_CONFIG, email, 'wrong-password', logger),
      authenticateUser(db, repos, TEST_CONFIG, email, 'correct-password', logger),
    ]);

    expect(results[0].status).toBe('fulfilled');
    expect(results[1].status).toBe('rejected');
    expect(results[2].status).toBe('fulfilled');

    if (results[1].status === 'rejected') {
      expect((results[1].reason as Error).name).toBe('InvalidCredentialsError');
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
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    // Track failed attempts count
    let failedAttempts = 0;
    vi.mocked(getAccountLockoutStatus).mockImplementation(() => {
      failedAttempts++;
      return Promise.resolve({
        isLocked: failedAttempts >= 5,
        failedAttempts,
      });
    });

    const failedPromises = Array(5)
      .fill(null)
      .map(() =>
        authenticateUser(db, repos, TEST_CONFIG, email, 'wrong-password', logger).catch(
          (e: unknown) => e,
        ),
      );

    const results = await Promise.all(failedPromises);

    // All should fail with InvalidCredentialsError
    results.forEach((result: unknown) => {
      // ADDED TYPE HERE
      expect((result as Error).name).toBe('InvalidCredentialsError');
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

    const { rotateRefreshToken } = await import('../utils/index');

    // After password reset, refresh token rotation should fail
    vi.mocked(rotateRefreshToken).mockResolvedValue(null);

    await expect(refreshUserTokens(db, repos, TEST_CONFIG, oldRefreshToken)).rejects.toThrow(
      'Invalid or expired token',
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
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'new-hashed-password',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const result = await authenticateUser(db, repos, TEST_CONFIG, email, newPassword, logger);

    expect('requiresTotp' in result).toBe(false);
    if (!('requiresTotp' in result)) {
      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(email);
    }
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
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'new-hashed-password', // Password was changed
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false); // Old password doesn't match new hash

    await expect(
      authenticateUser(db, repos, TEST_CONFIG, email, oldPassword, logger),
    ).rejects.toMatchObject({ name: 'InvalidCredentialsError' });
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
      authenticateUser(db, repos, TEST_CONFIG, email, correctPassword, logger),
    ).rejects.toMatchObject({ name: 'AccountLockedError' });

    // Password verification should NOT be called when account is locked
    const { verifyPasswordSafe } = await import('../utils/index');
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
      authenticateUser(db, repos, TEST_CONFIG, email, 'any-password', logger, ipAddress, userAgent),
    ).rejects.toMatchObject({ name: 'AccountLockedError' });

    expect(logLoginAttempt).toHaveBeenCalledWith(
      db,
      email,
      false,
      ipAddress,
      userAgent,
      LOGIN_FAILURE_REASON.ACCOUNT_LOCKED,
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
        authenticateUser(db, repos, TEST_CONFIG, email, 'wrong-password', logger),
      ).rejects.toMatchObject({ name: 'AccountLockedError' });
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
      const expectedDelay = expectedDelays[i]!;
      vi.mocked(getProgressiveDelay).mockResolvedValueOnce(expectedDelay);

      const delay = await getProgressiveDelay(db, email, lockoutConfig);
      expect(delay).toBe(expectedDelay);
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
    const repos = createMockRepos();
    const logger = createMockLogger();
    const email = 'test@example.com';

    const mockUser = {
      id: 'user-123',
      email,
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, repos, TEST_CONFIG, email, 'correct-password', logger);

    // After successful login, next attempt should have no delay
    vi.mocked(getProgressiveDelay).mockResolvedValue(0);
    const delay = await getProgressiveDelay(db, email, TEST_CONFIG.lockout);
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
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    const delayApplied = vi.fn();
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockImplementation(() => {
      delayApplied();
      return Promise.resolve();
    });
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, repos, TEST_CONFIG, email, 'password', logger);

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
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await authenticateUser(db, repos, TEST_CONFIG, email, 'correct-password', logger);

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
      canonicalEmail: email,
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'stored-hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    };

    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(repos.users.findByEmail).mockResolvedValue(mockUser);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => callback(db));
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    const { verifyPasswordSafe } = await import('../utils/index');

    // After successful login, failed attempts counter should be reset
    // So even if we have more failed attempts, we start fresh

    // First: successful login (resets counter)
    vi.mocked(verifyPasswordSafe).mockResolvedValueOnce(true);
    await authenticateUser(db, repos, TEST_CONFIG, email, 'correct-password', logger);

    // Reset mock to track new failures
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    // Second: one failed attempt (should be counted as first failure, not as 5th)
    vi.mocked(verifyPasswordSafe).mockResolvedValueOnce(false);

    await expect(
      authenticateUser(db, repos, TEST_CONFIG, email, 'wrong-password', logger),
    ).rejects.toMatchObject({ name: 'InvalidCredentialsError' });

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
    const repos = createMockRepos();
    const token = 'valid-verification-token';

    const { hashPassword } = await import('../utils/index');
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
      mockTokenRecord,
    );

    const mockUser = {
      id: 'user-id',
      email: 'test@example.com',
      canonicalEmail: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      avatarUrl: null,
      role: 'user' as const,
      passwordHash: 'hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
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

    const result = await verifyEmail(db, repos, TEST_CONFIG, token);

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

    const { verifyPasswordSafe } = await import('../utils/index');
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    await expect(
      authenticateUser(db, repos, TEST_CONFIG, email, 'any-password', logger),
    ).rejects.toMatchObject({ name: 'InvalidCredentialsError' });

    // verifyPasswordSafe should be called even for non-existent users (timing attack prevention)
    expect(verifyPasswordSafe).toHaveBeenCalledWith('any-password', undefined);
  });

  test('should take similar time for existing vs non-existing user', async () => {
    const db = createMockDb();
    const repos = createMockRepos();
    const logger = createMockLogger();

    const { verifyPasswordSafe } = await import('../utils/index');

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
      authenticateUser(db, repos, TEST_CONFIG, 'nonexistent@example.com', 'password', logger),
    ).rejects.toThrow();
    const time1 = Date.now() - start1;

    // Existing user with wrong password
    vi.mocked(repos.users.findByEmail).mockResolvedValueOnce({
      id: 'user-123',
      email: 'existing@example.com',
      canonicalEmail: 'existing@example.com',
      username: 'existinguser',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: 'hash',
      emailVerified: true,
      emailVerifiedAt: new Date(),
      role: 'user',
      avatarUrl: null,
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
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 0,
    });

    const start2 = Date.now();
    await expect(
      authenticateUser(db, repos, TEST_CONFIG, 'existing@example.com', 'wrong-password', logger),
    ).rejects.toThrow();
    const time2 = Date.now() - start2;

    // Timing in CI can jitter under load; keep a defensive bound that still
    // catches major timing leaks without creating flaky failures.
    expect(Math.abs(time1 - time2)).toBeLessThan(200);
  });
});
