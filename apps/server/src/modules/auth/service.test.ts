/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/modules/auth/__tests__/service.test.ts
import { validatePassword } from '@abe-stack/core';
import { toCamelCase, type User } from '@abe-stack/db';
import {
  applyProgressiveDelay,
  getAccountLockoutStatus,
  isAccountLocked,
  logAccountLockedEvent,
  logLoginAttempt,
  type DbClient,
  type EmailService,
  type Repositories,
  type Logger,
} from '@infrastructure';
import {
  AccountLockedError,
  EmailNotVerifiedError,
  EmailSendError,
  InvalidCredentialsError,
  InvalidTokenError,
  WeakPasswordError,
} from '@shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authenticateUser,
  createEmailVerificationToken,
  hasPassword,
  logoutUser,
  refreshUserTokens,
  registerUser,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  setPassword,
  verifyEmail,
  type AuthResult,
} from '../service';

import {
  createAccessToken,
  createAuthResponse,
  createRefreshTokenFamily,
  hashPassword,
  needsRehash,
  rotateRefreshToken as rotateRefreshTokenUtil,
  verifyPasswordSafe,
} from '../utils';

import type { AuthConfig } from '@/config';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@abe-stack/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...actual,
    validatePassword: vi.fn(),
  };
});

vi.mock('@infrastructure', () => ({
  applyProgressiveDelay: vi.fn(),
  emailTemplates: {
    emailVerification: vi.fn(() => ({
      subject: 'Verify your email',
      text: 'Click to verify',
      html: '<p>Click to verify</p>',
    })),
    existingAccountRegistrationAttempt: vi.fn(() => ({
      subject: 'Registration attempt',
      text: 'Someone tried to register',
      html: '<p>Someone tried to register</p>',
    })),
    passwordReset: vi.fn(() => ({
      subject: 'Reset your password',
      text: 'Click to reset',
      html: '<p>Click to reset</p>',
    })),
  },
  getAccountLockoutStatus: vi.fn(),
  isAccountLocked: vi.fn(),
  logAccountLockedEvent: vi.fn(),
  logLoginAttempt: vi.fn(),
  withTransaction: vi.fn((db, callback) => callback(db)),
}));

vi.mock('@abe-stack/db', () => ({
  toCamelCase: vi.fn(),
  USERS_TABLE: 'users',
  USER_COLUMNS: [],
  PASSWORD_RESET_TOKENS_TABLE: 'password_reset_tokens',
  EMAIL_VERIFICATION_TOKENS_TABLE: 'email_verification_tokens',
  and: vi.fn(),
  eq: vi.fn(),
  isNull: vi.fn(),
  insert: vi.fn(() => ({
    values: vi.fn(() => ({
      returningAll: vi.fn(() => ({
        toSql: vi.fn(() => 'INSERT SQL'),
      })),
      toSql: vi.fn(() => 'INSERT SQL'),
    })),
  })),
  update: vi.fn(() => ({
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        returningAll: vi.fn(() => ({
          toSql: vi.fn(() => 'UPDATE SQL'),
        })),
        toSql: vi.fn(() => 'UPDATE SQL'),
      })),
    })),
  })),
}));

vi.mock('../utils', () => ({
  createAuthResponse: vi.fn(),
  createAccessToken: vi.fn(),
  createRefreshTokenFamily: vi.fn(),
  hashPassword: vi.fn(),
  needsRehash: vi.fn(),
  rotateRefreshToken: vi.fn(),
  verifyPasswordSafe: vi.fn(),
}));

const VALID_PASSWORD_RESULT = {
  isValid: true,
  score: 4,
  errors: [] as string[],
  feedback: { warning: '', suggestions: [] as string[] },
  crackTimeDisplay: 'centuries',
};

const INVALID_PASSWORD_RESULT = (errors: string[]) => ({
  isValid: false,
  score: 0,
  errors,
  feedback: { warning: 'Too weak', suggestions: [] as string[] },
  crackTimeDisplay: 'instantly',
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDb(): DbClient {
  return {
    query: vi.fn(),
    execute: vi.fn(),
  } as unknown as DbClient;
}

function createMockRepos(): Repositories {
  return {
    users: {
      findByEmail: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshTokens: {
      deleteByToken: vi.fn(),
    },
    refreshTokenFamilies: {},
    loginAttempts: {},
    passwordResetTokens: {
      findValidByTokenHash: vi.fn(),
    },
    emailVerificationTokens: {
      findValidByTokenHash: vi.fn(),
      create: vi.fn(),
    },
    securityEvents: {},
    magicLinkTokens: {},
    oauthConnections: {},
    pushSubscriptions: {},
    notificationPreferences: {},
  } as unknown as Repositories;
}

function createMockEmailService(): EmailService {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  };
}

function createMockLogger() {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  logger.child.mockReturnValue(logger);
  return logger;
}

function createMockConfig() {
  return {
    jwt: {
      secret: 'test-secret-32-characters-long!!',
      accessTokenExpiry: '15m',
      refreshTokenExpiry: '7d',
    },
    argon2: {
      type: 2 as const,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    },
    refreshToken: {
      expiryDays: 7,
      gracePeriodSeconds: 60,
    },
    lockout: {
      maxAttempts: 5,
      windowMs: 900000,
      durationMs: 900000,
    },
  } as unknown as AuthConfig;
}

function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'user-id',
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    role: 'user',
    passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$test',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    lockedUntil: null,
    failedLoginAttempts: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

// ============================================================================
// Tests: registerUser
// ============================================================================

describe('registerUser', () => {
  let db: DbClient;
  let repos: Repositories;
  let emailService: EmailService;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    emailService = createMockEmailService();
    config = createMockConfig();
  });

  describe('when user does not exist', () => {
    it('should create user and send verification email', async () => {
      const email = 'newuser@example.com';
      const password = 'StrongPass123!';
      const name = 'New User';
      const baseUrl = 'http://localhost:3000';

      vi.mocked(repos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(validatePassword).mockResolvedValue(VALID_PASSWORD_RESULT);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(toCamelCase).mockReturnValue(createMockUser({ email, name, emailVerified: false }));
      vi.mocked(db.query).mockResolvedValue([{ id: 'user-id', email, name }]);

      const result = await registerUser(
        db,
        repos,
        emailService,
        config,
        email,
        password,
        name,
        baseUrl,
      );

      expect(result).toEqual({
        status: 'pending_verification',
        message: expect.stringContaining('check your email'),
        email,
      });
      expect(repos.users.findByEmail).toHaveBeenCalledWith(email);
      expect(validatePassword).toHaveBeenCalledWith(password, [email, name]);
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Verify your email',
        }),
      );
    });

    it('should throw WeakPasswordError if password is weak', async () => {
      const email = 'newuser@example.com';
      const password = 'weak';

      vi.mocked(repos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(validatePassword).mockResolvedValue(
        INVALID_PASSWORD_RESULT(['Password is too short']),
      );

      await expect(registerUser(db, repos, emailService, config, email, password)).rejects.toThrow(
        WeakPasswordError,
      );
      expect(emailService.send).not.toHaveBeenCalled();
    });

    it('should throw EmailSendError if email fails to send', async () => {
      const email = 'newuser@example.com';
      const password = 'StrongPass123!';
      const baseUrl = 'http://localhost:3000';

      vi.mocked(repos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(validatePassword).mockResolvedValue(VALID_PASSWORD_RESULT);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(toCamelCase).mockReturnValue(createMockUser({ email, emailVerified: false }));
      vi.mocked(db.query).mockResolvedValue([{ id: 'user-id', email }]);
      vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP error'));

      await expect(
        registerUser(db, repos, emailService, config, email, password, undefined, baseUrl),
      ).rejects.toThrow(EmailSendError);
    });

    it('should throw error if baseUrl is missing', async () => {
      const email = 'newuser@example.com';
      const password = 'StrongPass123!';

      vi.mocked(repos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(validatePassword).mockResolvedValue(VALID_PASSWORD_RESULT);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(toCamelCase).mockReturnValue(createMockUser({ email, emailVerified: false }));
      vi.mocked(db.query).mockResolvedValue([{ id: 'user-id', email }]);

      await expect(registerUser(db, repos, emailService, config, email, password)).rejects.toThrow(
        'baseUrl is required',
      );
    });
  });

  describe('when user already exists', () => {
    it('should send notification email and return pending status', async () => {
      const email = 'existing@example.com';
      const password = 'StrongPass123!';
      const existingUser = createMockUser({ email });

      vi.mocked(repos.users.findByEmail).mockResolvedValue(existingUser);

      const result = await registerUser(db, repos, emailService, config, email, password);

      expect(result).toEqual({
        status: 'pending_verification',
        message: expect.stringContaining('check your email'),
        email,
      });
      expect(emailService.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Registration attempt',
        }),
      );
    });

    it('should not throw if notification email fails', async () => {
      const email = 'existing@example.com';
      const password = 'StrongPass123!';
      const existingUser = createMockUser({ email });

      vi.mocked(repos.users.findByEmail).mockResolvedValue(existingUser);
      vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP error'));

      const result = await registerUser(db, repos, emailService, config, email, password);

      expect(result).toEqual({
        status: 'pending_verification',
        message: expect.stringContaining('check your email'),
        email,
      });
    });
  });
});

// ============================================================================
// Tests: authenticateUser
// ============================================================================

describe('authenticateUser', () => {
  let db: DbClient;
  let repos: Repositories;
  let config: AuthConfig;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    config = createMockConfig();
    logger = createMockLogger();
  });

  describe('successful authentication', () => {
    it('should return auth result with tokens for valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'correct-password';
      const user = createMockUser({ email, emailVerified: true });

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
      vi.mocked(createRefreshTokenFamily).mockResolvedValue({
        token: 'refresh-token',
        familyId: 'family-id',
      });
      vi.mocked(createAccessToken).mockReturnValue('access-token');
      vi.mocked(createAuthResponse).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl ?? null,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      } as AuthResult);
      vi.mocked(needsRehash).mockReturnValue(false);

      const result = await authenticateUser(db, repos, config, email, password, logger);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({ id: user.id, email: user.email }),
      });
      expect(logLoginAttempt).toHaveBeenCalledWith(db, email, true, undefined, undefined);
    });

    it('should handle ip address and user agent', async () => {
      const email = 'test@example.com';
      const password = 'correct-password';
      const user = createMockUser({ email, emailVerified: true });
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
      vi.mocked(createRefreshTokenFamily).mockResolvedValue({
        token: 'refresh-token',
        familyId: 'family-id',
      });
      vi.mocked(createAccessToken).mockReturnValue('access-token');
      vi.mocked(createAuthResponse).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl ?? null,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      } as AuthResult);
      vi.mocked(needsRehash).mockReturnValue(false);

      await authenticateUser(db, repos, config, email, password, logger, ipAddress, userAgent);

      expect(applyProgressiveDelay).toHaveBeenCalledWith(db, email, config.lockout);
      expect(logLoginAttempt).toHaveBeenCalledWith(db, email, true, ipAddress, userAgent);
    });

    it('should trigger password rehash if needed', async () => {
      const email = 'test@example.com';
      const password = 'correct-password';
      const user = createMockUser({ email, emailVerified: true });
      const onPasswordRehash = vi.fn();

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);
      vi.mocked(createRefreshTokenFamily).mockResolvedValue({
        token: 'refresh-token',
        familyId: 'family-id',
      });
      vi.mocked(createAccessToken).mockReturnValue('access-token');
      vi.mocked(createAuthResponse).mockReturnValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl ?? null,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
        },
      } as AuthResult);
      vi.mocked(needsRehash).mockReturnValue(true);

      await authenticateUser(
        db,
        repos,
        config,
        email,
        password,
        logger,
        undefined,
        undefined,
        onPasswordRehash,
      );

      expect(needsRehash).toHaveBeenCalledWith(user.passwordHash);
      // Note: rehashPassword is fire-and-forget, callback will be called async
    });
  });

  describe('failed authentication', () => {
    it('should throw AccountLockedError if account is locked', async () => {
      const email = 'test@example.com';
      const password = 'password';

      vi.mocked(isAccountLocked).mockResolvedValue(true);

      await expect(authenticateUser(db, repos, config, email, password, logger)).rejects.toThrow(
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

    it('should throw InvalidCredentialsError if user not found', async () => {
      const email = 'nonexistent@example.com';
      const password = 'password';

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(false);
      vi.mocked(getAccountLockoutStatus).mockResolvedValue({
        isLocked: false,
        failedAttempts: 0,
        lockedUntil: undefined,
      });

      await expect(authenticateUser(db, repos, config, email, password, logger)).rejects.toThrow(
        InvalidCredentialsError,
      );
      expect(logLoginAttempt).toHaveBeenCalledWith(
        db,
        email,
        false,
        undefined,
        undefined,
        'User not found',
      );
    });

    it('should throw InvalidCredentialsError if password is wrong', async () => {
      const email = 'test@example.com';
      const password = 'wrong-password';
      const user = createMockUser({ email });

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(false);
      vi.mocked(getAccountLockoutStatus).mockResolvedValue({
        isLocked: false,
        failedAttempts: 1,
        lockedUntil: undefined,
      });

      await expect(authenticateUser(db, repos, config, email, password, logger)).rejects.toThrow(
        InvalidCredentialsError,
      );
      expect(logLoginAttempt).toHaveBeenCalledWith(
        db,
        email,
        false,
        undefined,
        undefined,
        'Invalid password',
      );
    });

    it('should throw EmailNotVerifiedError if email not verified', async () => {
      const email = 'test@example.com';
      const password = 'correct-password';
      const user = createMockUser({ email, emailVerified: false });

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(true);

      await expect(authenticateUser(db, repos, config, email, password, logger)).rejects.toThrow(
        EmailNotVerifiedError,
      );
      expect(logLoginAttempt).toHaveBeenCalledWith(
        db,
        email,
        false,
        undefined,
        undefined,
        'Email not verified',
      );
    });

    it('should log account locked event when lockout threshold reached', async () => {
      const email = 'test@example.com';
      const password = 'wrong-password';
      const user = createMockUser({ email });

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(false);
      vi.mocked(getAccountLockoutStatus).mockResolvedValue({
        isLocked: true,
        failedAttempts: 5,
        lockedUntil: new Date(),
      });

      await expect(authenticateUser(db, repos, config, email, password, logger)).rejects.toThrow(
        InvalidCredentialsError,
      );
      expect(logAccountLockedEvent).toHaveBeenCalledWith(db, email, 5, undefined, undefined);
    });
  });

  describe('edge cases', () => {
    it('should handle progressive delay', async () => {
      const email = 'test@example.com';
      const password = 'password';

      vi.mocked(isAccountLocked).mockResolvedValue(false);
      vi.mocked(repos.users.findByEmail).mockResolvedValue(null);
      vi.mocked(verifyPasswordSafe).mockResolvedValue(false);

      await expect(authenticateUser(db, repos, config, email, password, logger)).rejects.toThrow();
      expect(applyProgressiveDelay).toHaveBeenCalledWith(db, email, config.lockout);
    });
  });
});

// ============================================================================
// Tests: refreshUserTokens
// ============================================================================

describe('refreshUserTokens', () => {
  let db: DbClient;
  let repos: Repositories;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    config = createMockConfig();
  });

  it('should return new tokens for valid refresh token', async () => {
    const oldRefreshToken = 'old-refresh-token';
    const userId = 'user-id';
    const email = 'test@example.com';
    const role = 'user';

    vi.mocked(rotateRefreshTokenUtil).mockResolvedValue({
      token: 'new-refresh-token',
      userId,
      email,
      role,
    });
    vi.mocked(createAccessToken).mockReturnValue('new-access-token');

    const result = await refreshUserTokens(db, repos, config, oldRefreshToken);

    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(rotateRefreshTokenUtil).toHaveBeenCalledWith(
      db,
      oldRefreshToken,
      undefined,
      undefined,
      config.refreshToken.expiryDays,
      config.refreshToken.gracePeriodSeconds,
    );
  });

  it('should include ip address and user agent', async () => {
    const oldRefreshToken = 'old-refresh-token';
    const ipAddress = '192.168.1.1';
    const userAgent = 'Mozilla/5.0';

    vi.mocked(rotateRefreshTokenUtil).mockResolvedValue({
      token: 'new-refresh-token',
      userId: 'user-id',
      email: 'test@example.com',
      role: 'user',
    });
    vi.mocked(createAccessToken).mockReturnValue('new-access-token');

    await refreshUserTokens(db, repos, config, oldRefreshToken, ipAddress, userAgent);

    expect(rotateRefreshTokenUtil).toHaveBeenCalledWith(
      db,
      oldRefreshToken,
      ipAddress,
      userAgent,
      config.refreshToken.expiryDays,
      config.refreshToken.gracePeriodSeconds,
    );
  });

  it('should throw InvalidTokenError if token rotation fails', async () => {
    const oldRefreshToken = 'invalid-token';

    vi.mocked(rotateRefreshTokenUtil).mockResolvedValue(null);

    await expect(refreshUserTokens(db, repos, config, oldRefreshToken)).rejects.toThrow(
      InvalidTokenError,
    );
  });
});

// ============================================================================
// Tests: logoutUser
// ============================================================================

describe('logoutUser', () => {
  let db: DbClient;
  let repos: Repositories;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
  });

  it('should delete refresh token if provided', async () => {
    const refreshToken = 'refresh-token';

    await logoutUser(db, repos, refreshToken);

    expect(repos.refreshTokens.deleteByToken).toHaveBeenCalledWith(refreshToken);
  });

  it('should not throw if no refresh token provided', async () => {
    await expect(logoutUser(db, repos)).resolves.toBeUndefined();
    expect(repos.refreshTokens.deleteByToken).not.toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: requestPasswordReset
// ============================================================================

describe('requestPasswordReset', () => {
  let db: DbClient;
  let repos: Repositories;
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    emailService = createMockEmailService();
  });

  it('should create token and send email for existing user', async () => {
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:3000';
    const user = createMockUser({ email });

    vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
    vi.mocked(hashPassword).mockResolvedValue('hashed-token');

    await requestPasswordReset(db, repos, emailService, email, baseUrl);

    expect(repos.users.findByEmail).toHaveBeenCalledWith(email);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        subject: 'Reset your password',
      }),
    );
  });

  it('should silently succeed if user not found', async () => {
    const email = 'nonexistent@example.com';
    const baseUrl = 'http://localhost:3000';

    vi.mocked(repos.users.findByEmail).mockResolvedValue(null);

    await expect(
      requestPasswordReset(db, repos, emailService, email, baseUrl),
    ).resolves.toBeUndefined();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('should throw EmailSendError if email fails', async () => {
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:3000';
    const user = createMockUser({ email });

    vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP error'));

    await expect(requestPasswordReset(db, repos, emailService, email, baseUrl)).rejects.toThrow(
      EmailSendError,
    );
  });
});

// ============================================================================
// Tests: resetPassword
// ============================================================================

describe('resetPassword', () => {
  let db: DbClient;
  let repos: Repositories;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    config = createMockConfig();
  });

  it('should reset password with valid token', async () => {
    const token = 'valid-token';
    const newPassword = 'NewStrongPass123!';
    const userId = 'user-id';
    const user = createMockUser({ id: userId });

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(repos.passwordResetTokens.findValidByTokenHash).mockResolvedValue({
      id: 'token-id',
      userId,
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(repos.users.findById).mockResolvedValue(user);
    vi.mocked(validatePassword).mockResolvedValue(VALID_PASSWORD_RESULT);

    await resetPassword(db, repos, config, token, newPassword);

    expect(repos.passwordResetTokens.findValidByTokenHash).toHaveBeenCalled();
    expect(validatePassword).toHaveBeenCalledWith(newPassword, [user.email, user.name]);
  });

  it('should throw InvalidTokenError if token not found', async () => {
    const token = 'invalid-token';
    const newPassword = 'NewStrongPass123!';

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(repos.passwordResetTokens.findValidByTokenHash).mockResolvedValue(null);

    await expect(resetPassword(db, repos, config, token, newPassword)).rejects.toThrow(
      InvalidTokenError,
    );
  });

  it('should throw InvalidTokenError if user not found', async () => {
    const token = 'valid-token';
    const newPassword = 'NewStrongPass123!';
    const userId = 'user-id';

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(repos.passwordResetTokens.findValidByTokenHash).mockResolvedValue({
      id: 'token-id',
      userId,
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(repos.users.findById).mockResolvedValue(null);

    await expect(resetPassword(db, repos, config, token, newPassword)).rejects.toThrow(
      InvalidTokenError,
    );
  });

  it('should throw WeakPasswordError if password is weak', async () => {
    const token = 'valid-token';
    const newPassword = 'weak';
    const userId = 'user-id';
    const user = createMockUser({ id: userId });

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(repos.passwordResetTokens.findValidByTokenHash).mockResolvedValue({
      id: 'token-id',
      userId,
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(repos.users.findById).mockResolvedValue(user);
    vi.mocked(validatePassword).mockResolvedValue(
      INVALID_PASSWORD_RESULT(['Password is too short']),
    );

    await expect(resetPassword(db, repos, config, token, newPassword)).rejects.toThrow(
      WeakPasswordError,
    );
  });
});

// ============================================================================
// Tests: verifyEmail
// ============================================================================

describe('verifyEmail', () => {
  let db: DbClient;
  let repos: Repositories;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    config = createMockConfig();
  });

  it('should verify email and return auth result', async () => {
    const token = 'valid-token';
    const userId = 'user-id';
    const user = createMockUser({ id: userId, emailVerified: true });

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(repos.emailVerificationTokens.findValidByTokenHash).mockResolvedValue({
      id: 'token-id',
      userId,
      tokenHash: 'hashed-token',
      expiresAt: new Date(Date.now() + 3600000),
      usedAt: null,
      createdAt: new Date(),
    });
    vi.mocked(toCamelCase).mockReturnValue(user);
    vi.mocked(db.query).mockResolvedValue([
      {
        id: userId,
        email: user.email,
        email_verified: true,
      },
    ]);
    vi.mocked(createRefreshTokenFamily).mockResolvedValue({
      token: 'refresh-token',
      familyId: 'family-id',
    });
    vi.mocked(createAccessToken).mockReturnValue('access-token');
    vi.mocked(createAuthResponse).mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      },
    } as AuthResult);

    const result = await verifyEmail(db, repos, config, token);

    expect(result).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: expect.objectContaining({ id: userId }),
    });
  });

  it('should throw InvalidTokenError if token not found', async () => {
    const token = 'invalid-token';

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(repos.emailVerificationTokens.findValidByTokenHash).mockResolvedValue(null);

    await expect(verifyEmail(db, repos, config, token)).rejects.toThrow(InvalidTokenError);
  });
});

// ============================================================================
// Tests: resendVerificationEmail
// ============================================================================

describe('resendVerificationEmail', () => {
  let db: DbClient;
  let repos: Repositories;
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    emailService = createMockEmailService();
  });

  it('should create new token and send email for unverified user', async () => {
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:3000';
    const user = createMockUser({ email, emailVerified: false });

    vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
    vi.mocked(hashPassword).mockResolvedValue('hashed-token');

    await resendVerificationEmail(db, repos, emailService, email, baseUrl);

    expect(repos.users.findByEmail).toHaveBeenCalledWith(email);
    expect(emailService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: email,
        subject: 'Verify your email',
      }),
    );
  });

  it('should silently succeed if user not found', async () => {
    const email = 'nonexistent@example.com';
    const baseUrl = 'http://localhost:3000';

    vi.mocked(repos.users.findByEmail).mockResolvedValue(null);

    await expect(
      resendVerificationEmail(db, repos, emailService, email, baseUrl),
    ).resolves.toBeUndefined();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('should silently succeed if user already verified', async () => {
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:3000';
    const user = createMockUser({ email, emailVerified: true });

    vi.mocked(repos.users.findByEmail).mockResolvedValue(user);

    await expect(
      resendVerificationEmail(db, repos, emailService, email, baseUrl),
    ).resolves.toBeUndefined();
    expect(emailService.send).not.toHaveBeenCalled();
  });

  it('should throw EmailSendError if email fails', async () => {
    const email = 'test@example.com';
    const baseUrl = 'http://localhost:3000';
    const user = createMockUser({ email, emailVerified: false });

    vi.mocked(repos.users.findByEmail).mockResolvedValue(user);
    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(emailService.send).mockRejectedValue(new Error('SMTP error'));

    await expect(resendVerificationEmail(db, repos, emailService, email, baseUrl)).rejects.toThrow(
      EmailSendError,
    );
  });
});

// ============================================================================
// Tests: setPassword
// ============================================================================

describe('setPassword', () => {
  let db: DbClient;
  let repos: Repositories;
  let config: AuthConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    repos = createMockRepos();
    config = createMockConfig();
  });

  it('should set password for magic-link only user', async () => {
    const userId = 'user-id';
    const newPassword = 'NewStrongPass123!';
    const user = createMockUser({ id: userId, passwordHash: 'magiclink:placeholder' });

    vi.mocked(repos.users.findById).mockResolvedValue(user);
    vi.mocked(validatePassword).mockResolvedValue(VALID_PASSWORD_RESULT);
    vi.mocked(hashPassword).mockResolvedValue('new-hashed-password');

    await setPassword(db, repos, config, userId, newPassword);

    expect(repos.users.findById).toHaveBeenCalledWith(userId);
    expect(validatePassword).toHaveBeenCalledWith(newPassword, [user.email, user.name]);
    expect(repos.users.update).toHaveBeenCalledWith(userId, {
      passwordHash: 'new-hashed-password',
    });
  });

  it('should throw InvalidCredentialsError if user not found', async () => {
    const userId = 'user-id';
    const newPassword = 'NewStrongPass123!';

    vi.mocked(repos.users.findById).mockResolvedValue(null);

    await expect(setPassword(db, repos, config, userId, newPassword)).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it('should throw PasswordAlreadySetError if user has password', async () => {
    const userId = 'user-id';
    const newPassword = 'NewStrongPass123!';
    const user = createMockUser({
      id: userId,
      passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$test',
    });

    vi.mocked(repos.users.findById).mockResolvedValue(user);

    await expect(setPassword(db, repos, config, userId, newPassword)).rejects.toThrow(
      'User already has a password',
    );
  });

  it('should throw WeakPasswordError if password is weak', async () => {
    const userId = 'user-id';
    const newPassword = 'weak';
    const user = createMockUser({ id: userId, passwordHash: 'magiclink:placeholder' });

    vi.mocked(repos.users.findById).mockResolvedValue(user);
    vi.mocked(validatePassword).mockResolvedValue(
      INVALID_PASSWORD_RESULT(['Password is too short']),
    );

    await expect(setPassword(db, repos, config, userId, newPassword)).rejects.toThrow(
      WeakPasswordError,
    );
  });
});

// ============================================================================
// Tests: hasPassword
// ============================================================================

describe('hasPassword', () => {
  it('should return true for regular password hash', () => {
    expect(hasPassword('$argon2id$v=19$m=19456,t=2,p=1$test')).toBe(true);
  });

  it('should return false for magic-link placeholder', () => {
    expect(hasPassword('magiclink:placeholder')).toBe(false);
  });
});

// ============================================================================
// Tests: createEmailVerificationToken
// ============================================================================

describe('createEmailVerificationToken', () => {
  let repos: Repositories;

  beforeEach(() => {
    vi.clearAllMocks();
    repos = createMockRepos();
  });

  it('should create token using repositories', async () => {
    const userId = 'user-id';

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');
    vi.mocked(repos.emailVerificationTokens.create).mockResolvedValue({
      id: 'token-id',
      userId,
      tokenHash: 'hashed-token',
      expiresAt: new Date(),
      usedAt: null,
      createdAt: new Date(),
    });

    const token = await createEmailVerificationToken(repos, userId);

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(repos.emailVerificationTokens.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        tokenHash: 'hashed-token',
        expiresAt: expect.any(Date),
      }),
    );
  });

  it('should create token using db client for transactions', async () => {
    const db = createMockDb();
    const userId = 'user-id';

    vi.mocked(hashPassword).mockResolvedValue('hashed-token');

    const token = await createEmailVerificationToken(db, userId);

    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');
    expect(db.execute).toHaveBeenCalled();
  });
});
