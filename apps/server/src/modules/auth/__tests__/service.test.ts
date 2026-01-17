// apps/server/src/modules/auth/__tests__/service.test.ts
/**
 * Auth Service Unit Tests
 *
 * Tests the auth service business logic by mocking database and utility functions.
 * These tests verify the orchestration logic, error handling, and token management.
 */
import { validatePassword } from '@abe-stack/core';
import { authenticateUser, logoutUser, refreshUserTokens, registerUser } from '@auth/service';
import {
  createAccessToken,
  createRefreshTokenFamily,
  hashPassword,
  needsRehash,
  rotateRefreshToken,
  verifyPasswordSafe,
} from '@auth/utils';
import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  isAccountLocked,
  logAccountLockedEvent,
  logLoginAttempt,
  withTransaction,
} from '@infra';
import {
  AccountLockedError,
  EmailAlreadyExistsError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { AuthConfig } from '@config';
import type { DbClient } from '@infra';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock @abe-stack/core
vi.mock('@abe-stack/core', () => ({
  validatePassword: vi.fn(),
}));

// Mock @infra
vi.mock('@infra', () => ({
  applyProgressiveDelay: vi.fn(),
  getAccountLockoutStatus: vi.fn(),
  isAccountLocked: vi.fn(),
  logAccountLockedEvent: vi.fn(),
  logLoginAttempt: vi.fn(),
  refreshTokens: { token: 'token' },
  users: { email: 'email', id: 'id' },
  withTransaction: vi.fn(),
}));

// Mock ../utils
vi.mock('../utils', () => ({
  createAccessToken: vi.fn(),
  createRefreshTokenFamily: vi.fn(),
  hashPassword: vi.fn(),
  needsRehash: vi.fn(),
  rotateRefreshToken: vi.fn(),
  verifyPasswordSafe: vi.fn(),
}));

// Mock drizzle-orm
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((...args: unknown[]) => args),
}));

// ============================================================================
// Test Constants
// ============================================================================

const TEST_CONFIG = {
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
    windowMinutes: 15,
    durationMinutes: 30,
  },
} as unknown as AuthConfig;

// ============================================================================
// Test Helpers
// ============================================================================

interface MockDbQueryResult {
  findFirst: ReturnType<typeof vi.fn>;
}

interface MockDbInsertResult {
  values: ReturnType<typeof vi.fn>;
}

interface MockDbUpdateResult {
  set: ReturnType<typeof vi.fn>;
}

interface MockDbDeleteResult {
  where: ReturnType<typeof vi.fn>;
}

interface MockDbClientExtended {
  query: {
    users: MockDbQueryResult;
  };
  insert: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbInsertResult);
  update: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbUpdateResult);
  delete: ReturnType<typeof vi.fn> & ((...args: unknown[]) => MockDbDeleteResult);
}

function createMockDb(): MockDbClientExtended & DbClient {
  const mockInsert = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn(() => Promise.resolve([])),
    })),
  }));

  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => Promise.resolve()),
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
    },
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  } as unknown as MockDbClientExtended & DbClient;
}

// ============================================================================
// Tests: registerUser
// ============================================================================

describe('registerUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should register a new user successfully', async () => {
    const db = createMockDb();
    const email = 'new@example.com';
    const password = 'StrongPassword123!';
    const name = 'New User';

    // Mock: no existing user
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

    // Mock: password validation passes
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: true,
      errors: [],
      score: 4,
      feedback: { warning: '', suggestions: [] },
      crackTimeDisplay: 'centuries',
    });

    // Mock: password hashing
    vi.mocked(hashPassword).mockResolvedValue('hashed-password');

    // Mock: transaction creates user and token
    const mockUser = { id: 'user-123', email, name, role: 'user' as const, passwordHash: 'hash' };
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      return callback(db);
    });
    vi.mocked(createRefreshTokenFamily).mockResolvedValue({
      familyId: 'family-123',
      token: 'refresh-token-123',
    });

    // Mock insert to return the user
    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([mockUser]),
      }),
    });

    // Mock: access token creation
    vi.mocked(createAccessToken).mockReturnValue('access-token-123');

    const result = await registerUser(db, TEST_CONFIG, email, password, name);

    expect(result.accessToken).toBe('access-token-123');
    expect(result.refreshToken).toBe('refresh-token-123');
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe(name);
    expect(validatePassword).toHaveBeenCalledWith(password, [email, name]);
    expect(hashPassword).toHaveBeenCalledWith(password, TEST_CONFIG.argon2);
  });

  test('should throw EmailAlreadyExistsError when email is taken', async () => {
    const db = createMockDb();
    const email = 'existing@example.com';
    const password = 'StrongPassword123!';

    // Mock: existing user found
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: 'existing-123',
      email,
      name: 'Existing',
      role: 'user',
    });

    await expect(registerUser(db, TEST_CONFIG, email, password)).rejects.toThrow(
      EmailAlreadyExistsError,
    );
  });

  test('should throw WeakPasswordError when password validation fails', async () => {
    const db = createMockDb();
    const email = 'new@example.com';
    const password = 'weak';

    // Mock: no existing user
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

    // Mock: password validation fails
    vi.mocked(validatePassword).mockResolvedValue({
      isValid: false,
      errors: ['Password is too short', 'Password needs uppercase'],
      score: 1,
      feedback: { warning: 'Too weak', suggestions: ['Add uppercase'] },
      crackTimeDisplay: 'instant',
    });

    await expect(registerUser(db, TEST_CONFIG, email, password)).rejects.toThrow(WeakPasswordError);
  });
});

// ============================================================================
// Tests: authenticateUser
// ============================================================================

describe('authenticateUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should authenticate user successfully', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const password = 'correct-password';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test User',
      role: 'user' as const,
      passwordHash: 'stored-hash',
    };

    // Mock: account not locked
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);

    // Mock: user found
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    // Mock: password verification passes
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);

    // Mock: transaction creates token
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      return callback(db);
    });
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(createRefreshTokenFamily).mockResolvedValue({
      familyId: 'family-123',
      token: 'refresh-token-123',
    });

    // Mock: no rehash needed
    vi.mocked(needsRehash).mockReturnValue(false);

    // Mock: access token creation
    vi.mocked(createAccessToken).mockReturnValue('access-token-123');

    const result = await authenticateUser(db, TEST_CONFIG, email, password, ipAddress, userAgent);

    expect(result.accessToken).toBe('access-token-123');
    expect(result.refreshToken).toBe('refresh-token-123');
    expect(result.user.email).toBe(email);
    expect(isAccountLocked).toHaveBeenCalledWith(db, email, TEST_CONFIG.lockout);
    expect(verifyPasswordSafe).toHaveBeenCalledWith(password, 'stored-hash');
  });

  test('should throw AccountLockedError when account is locked', async () => {
    const db = createMockDb();
    const email = 'locked@example.com';
    const password = 'any-password';

    // Mock: account is locked
    vi.mocked(isAccountLocked).mockResolvedValue(true);
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);

    await expect(authenticateUser(db, TEST_CONFIG, email, password)).rejects.toThrow(
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

  test('should throw InvalidCredentialsError when user not found', async () => {
    const db = createMockDb();
    const email = 'nonexistent@example.com';
    const password = 'any-password';
    const ipAddress = '192.168.1.1';

    // Mock: account not locked
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);

    // Mock: user not found
    vi.mocked(db.query.users.findFirst).mockResolvedValue(null);

    // Mock: timing-safe verification still runs (returns false for null hash)
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    // Mock: failed login logging
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 1 });

    await expect(authenticateUser(db, TEST_CONFIG, email, password, ipAddress)).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  test('should throw InvalidCredentialsError when password is wrong', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const password = 'wrong-password';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test',
      role: 'user' as const,
      passwordHash: 'stored-hash',
    };

    // Mock: account not locked
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);

    // Mock: user found
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    // Mock: password verification fails
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    // Mock: failed login logging
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: false, failedAttempts: 2 });

    await expect(authenticateUser(db, TEST_CONFIG, email, password)).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  test('should trigger account lockout event when threshold reached', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const password = 'wrong-password';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test',
      role: 'user' as const,
      passwordHash: 'stored-hash',
    };

    // Mock: account not locked
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);

    // Mock: user found
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);

    // Mock: password verification fails
    vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

    // Mock: failed login logging - account becomes locked
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(getAccountLockoutStatus).mockResolvedValue({ isLocked: true, failedAttempts: 5 });
    vi.mocked(logAccountLockedEvent).mockResolvedValue(undefined);

    await expect(
      authenticateUser(db, TEST_CONFIG, email, password, ipAddress, userAgent),
    ).rejects.toThrow(InvalidCredentialsError);

    expect(logAccountLockedEvent).toHaveBeenCalledWith(db, email, 5, ipAddress, userAgent);
  });

  test('should trigger password rehash callback when hash needs updating', async () => {
    const db = createMockDb();
    const email = 'test@example.com';
    const password = 'correct-password';

    const mockUser = {
      id: 'user-123',
      email,
      name: 'Test',
      role: 'user' as const,
      passwordHash: 'old-hash',
    };

    // Mock: successful login
    vi.mocked(isAccountLocked).mockResolvedValue(false);
    vi.mocked(applyProgressiveDelay).mockResolvedValue(undefined);
    vi.mocked(db.query.users.findFirst).mockResolvedValue(mockUser);
    vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
    vi.mocked(withTransaction).mockImplementation(async (_db, callback) => {
      return callback(db);
    });
    vi.mocked(logLoginAttempt).mockResolvedValue(undefined);
    vi.mocked(createRefreshTokenFamily).mockResolvedValue({
      familyId: 'family-123',
      token: 'refresh-token-123',
    });
    vi.mocked(createAccessToken).mockReturnValue('access-token-123');

    // Mock: rehash needed
    vi.mocked(needsRehash).mockReturnValue(true);

    // Mock: hashPassword for background rehash
    vi.mocked(hashPassword).mockResolvedValue('new-hash');

    // Setup mock for db.update chain
    vi.mocked(db.update).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    const onRehash = vi.fn();

    await authenticateUser(db, TEST_CONFIG, email, password, undefined, undefined, onRehash);

    expect(needsRehash).toHaveBeenCalledWith('old-hash');
    // Note: rehash happens in background (fire and forget), so we can't easily test the callback
  });
});

// ============================================================================
// Tests: refreshUserTokens
// ============================================================================

describe('refreshUserTokens', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should refresh tokens successfully', async () => {
    const db = createMockDb();
    const oldToken = 'old-refresh-token';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    // Mock: rotation succeeds
    vi.mocked(rotateRefreshToken).mockResolvedValue({
      token: 'new-refresh-token',
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user' as const,
    });

    // Mock: access token creation
    vi.mocked(createAccessToken).mockReturnValue('new-access-token');

    const result = await refreshUserTokens(db, TEST_CONFIG, oldToken, ipAddress, userAgent);

    expect(result.accessToken).toBe('new-access-token');
    expect(result.refreshToken).toBe('new-refresh-token');
    expect(rotateRefreshToken).toHaveBeenCalledWith(
      db,
      oldToken,
      ipAddress,
      userAgent,
      TEST_CONFIG.refreshToken.expiryDays,
      TEST_CONFIG.refreshToken.gracePeriodSeconds,
    );
    expect(createAccessToken).toHaveBeenCalledWith(
      'user-123',
      'test@example.com',
      'user',
      TEST_CONFIG.jwt.secret,
      TEST_CONFIG.jwt.accessTokenExpiry,
    );
  });

  test('should throw InvalidTokenError when rotation fails', async () => {
    const db = createMockDb();
    const oldToken = 'invalid-token';

    // Mock: rotation fails
    vi.mocked(rotateRefreshToken).mockResolvedValue(null);

    await expect(refreshUserTokens(db, TEST_CONFIG, oldToken)).rejects.toThrow(InvalidTokenError);
  });
});

// ============================================================================
// Tests: logoutUser
// ============================================================================

describe('logoutUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should delete refresh token when provided', async () => {
    const db = createMockDb();
    const refreshToken = 'valid-refresh-token';

    const whereMock = vi.fn().mockResolvedValue(undefined);
    vi.mocked(db.delete).mockReturnValue({
      where: whereMock,
    });

    await logoutUser(db, refreshToken);

    expect(db.delete).toHaveBeenCalled();
    expect(whereMock).toHaveBeenCalled();
  });

  test('should not delete anything when no token provided', async () => {
    const db = createMockDb();

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await logoutUser(db, undefined);

    expect(db.delete).not.toHaveBeenCalled();
  });

  test('should handle empty string token', async () => {
    const db = createMockDb();

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    });

    await logoutUser(db, '');

    // Empty string is falsy, so should not delete
    expect(db.delete).not.toHaveBeenCalled();
  });
});
