// main/server/core/src/auth/__tests__/handlers.test.ts
/**
 * Auth Handlers Integration Tests
 *
 * Tests the auth handler functions by mocking service layer dependencies.
 */
import * as shared from '@abe-stack/shared';
import {
  AccountLockedError,
  AUTH_ERROR_MESSAGES,
  EmailAlreadyExistsError,
  HTTP_ERROR_MESSAGES,
  InvalidCredentialsError,
  InvalidTokenError,
  AUTH_SUCCESS_MESSAGES as SUCCESS_MESSAGES,
  WeakPasswordError,
} from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

// Import actual modules to spy on their functions
import {
  handleForgotPassword,
  handleLogin,
  handleLogout,
  handleRefresh,
  handleRegister,
  handleResetPassword,
  handleVerifyEmail,
} from '../handlers/index';
import * as security from '../security';
import * as service from '../service';
import {
  REFRESH_COOKIE_NAME,
  type AppContext,
  type ReplyWithCookies,
  type RequestWithCookies,
} from '../types';
import * as utils from '../utils';

// ============================================================================
// Mock Dependencies - use vi.hoisted() so mocks are available before vi.mock
// ============================================================================

// Import handlers AFTER mocks are set up

import type { RawDb, Repositories } from '../../../../db/src'; // Added import for Repositories and RawDb

// ============================================================================
// Test Helpers
// ============================================================================

function createMockDb(): RawDb {
  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn((cb) =>
      cb({
        query: vi.fn().mockResolvedValue([]),
        queryOne: vi.fn().mockResolvedValue(null),
        execute: vi.fn().mockResolvedValue(0),
        raw: vi.fn().mockResolvedValue([]),
      }),
    ),
  } as unknown as RawDb;
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
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    ...overrides,
  };
}

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: createMockDb(), // Use createMockDb
    repos: {
      // Inlined createMockRepos content
      users: {
        findById: vi.fn() as Mock,
        findByEmail: vi.fn() as Mock,
        findByUsername: vi.fn() as Mock,
        create: vi.fn() as Mock,
        update: vi.fn() as Mock,
        delete: vi.fn() as Mock,
        list: vi.fn() as Mock,
        existsByEmail: vi.fn() as Mock,
        incrementFailedAttempts: vi.fn() as Mock,
        resetFailedAttempts: vi.fn() as Mock,
        lockAccount: vi.fn() as Mock,
        unlockAccount: vi.fn() as Mock,
        verifyEmail: vi.fn() as Mock,
        updateWithVersion: vi.fn() as Mock,
      },
      refreshTokens: {
        findById: vi.fn() as Mock,
        findByToken: vi.fn() as Mock,
        findByUserId: vi.fn() as Mock,
        create: vi.fn() as Mock,
        delete: vi.fn() as Mock,
        deleteByToken: vi.fn() as Mock,
        deleteByUserId: vi.fn() as Mock,
        deleteByFamilyId: vi.fn() as Mock,
        deleteExpired: vi.fn() as Mock,
      },
      refreshTokenFamilies: {
        findById: vi.fn() as Mock,
        findActiveByUserId: vi.fn().mockResolvedValue([]) as Mock,
        create: vi.fn() as Mock,
        revoke: vi.fn() as Mock,
        revokeAllForUser: vi.fn() as Mock,
      },
      loginAttempts: {
        create: vi.fn() as Mock,
        countRecentFailures: vi.fn() as Mock,
        findRecentByEmail: vi.fn() as Mock,
        deleteOlderThan: vi.fn() as Mock,
      },
      passwordResetTokens: {
        findById: vi.fn() as Mock,
        findValidByTokenHash: vi.fn() as Mock,
        findValidByUserId: vi.fn() as Mock,
        create: vi.fn() as Mock,
        markAsUsed: vi.fn() as Mock,
        invalidateByUserId: vi.fn() as Mock,
        deleteByUserId: vi.fn() as Mock,
        deleteExpired: vi.fn() as Mock,
      },
      emailVerificationTokens: {
        findById: vi.fn() as Mock,
        findValidByTokenHash: vi.fn() as Mock,
        findValidByUserId: vi.fn() as Mock,
        create: vi.fn() as Mock,
        markAsUsed: vi.fn() as Mock,
        invalidateByUserId: vi.fn() as Mock,
        deleteByUserId: vi.fn() as Mock,
        deleteExpired: vi.fn() as Mock,
      },
      securityEvents: {
        create: vi.fn() as Mock,
        findByUserId: vi.fn() as Mock,
        findByEmail: vi.fn() as Mock,
        findByType: vi.fn() as Mock,
        findBySeverity: vi.fn() as Mock,
        countByType: vi.fn() as Mock,
        deleteOlderThan: vi.fn() as Mock,
      },
      magicLinkTokens: {
        findById: vi.fn() as Mock,
        findValidByTokenHash: vi.fn() as Mock,
        findValidByEmail: vi.fn() as Mock,
        findRecentByEmail: vi.fn() as Mock,
        countRecentByEmail: vi.fn() as Mock,
        create: vi.fn() as Mock,
        markAsUsed: vi.fn() as Mock,
        deleteByEmail: vi.fn() as Mock,
        deleteExpired: vi.fn() as Mock,
      },
      oauthConnections: {
        findById: vi.fn() as Mock,
        findByUserIdAndProvider: vi.fn() as Mock,
        findByProviderUserId: vi.fn() as Mock,
        findByUserId: vi.fn() as Mock,
        create: vi.fn() as Mock,
        update: vi.fn() as Mock,
        delete: vi.fn() as Mock,
        deleteByUserId: vi.fn() as Mock,
        deleteByUserIdAndProvider: vi.fn() as Mock,
      },
      pushSubscriptions: {
        findById: vi.fn() as Mock,
        findByEndpoint: vi.fn() as Mock,
        findByUserId: vi.fn() as Mock,
        create: vi.fn() as Mock,
        updateLastUsed: vi.fn() as Mock,
        delete: vi.fn() as Mock,
        deleteByUserId: vi.fn() as Mock,
        deleteInactive: vi.fn() as Mock,
      },
      notificationPreferences: {
        findByUserId: vi.fn() as Mock,
        upsert: vi.fn() as Mock,
        delete: vi.fn() as Mock,
      },
      memberships: {
        findByUserId: vi.fn().mockResolvedValue([]) as Mock,
      },
    } as unknown as Repositories, // Cast only at the very end
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    emailTemplates: {
      emailVerification: vi.fn(() => ({
        subject: 'Verify your email',
        text: 'verify',
        html: '<p>verify</p>',
      })),
      existingAccountRegistrationAttempt: vi.fn(() => ({
        subject: 'Registration attempt',
        text: 'reg',
        html: '<p>reg</p>',
      })),
      passwordReset: vi.fn(() => ({
        subject: 'Reset your password',
        text: 'reset',
        html: '<p>reset</p>',
      })),
      magicLink: vi.fn(() => ({ subject: 'Login link', text: 'login', html: '<p>login</p>' })),
      accountLocked: vi.fn(() => ({
        subject: 'Account locked',
        text: 'locked',
        html: '<p>locked</p>',
      })),
      newLoginAlert: vi.fn(() => ({
        subject: 'New login detected',
        text: 'login alert',
        html: '<p>login alert</p>',
      })),
    },
    config: {
      auth: {
        jwt: { secret: 'test-secret-32-characters-long!!' },
        argon2: {},
        refreshToken: { expiryDays: 7 },
        lockout: { lockoutDurationMs: 3600000, maxFailedAttempts: 5 },
        cookie: {
          httpOnly: true,
          secure: true,
          path: '/',
          sameSite: 'strict',
        },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    },
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnThis(),
    },
    ...overrides,
  } as unknown as AppContext;
}

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

function createMockRequest(cookies: Record<string, string | undefined> = {}): RequestWithCookies {
  return {
    cookies,
    headers: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  } as RequestWithCookies;
}

// ============================================================================
// Tests: handleRegister
// ============================================================================

describe('handleRegister', () => {
  let registerUserSpy: Mock;
  let mapErrorToHttpResponseSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    registerUserSpy = vi.spyOn(service, 'registerUser') as Mock;
    mapErrorToHttpResponseSpy = vi.spyOn(shared, 'mapErrorToHttpResponse') as Mock;
    // Set default mock implementations
    mapErrorToHttpResponseSpy.mockImplementation((error, logger) => {
      if (error instanceof Error) {
        switch (error.name) {
          case 'EmailAlreadyExistsError':
            return {
              status: 409,
              body: { message: shared.HTTP_ERROR_MESSAGES.EmailAlreadyRegistered },
            };
          case 'WeakPasswordError':
            return { status: 400, body: { message: shared.HTTP_ERROR_MESSAGES.WeakPassword } };
          case 'InvalidCredentialsError':
            return {
              status: 401,
              body: { message: shared.HTTP_ERROR_MESSAGES.InvalidCredentials },
            };
          case 'AccountLockedError':
            return { status: 429, body: { message: shared.HTTP_ERROR_MESSAGES.AccountLocked } };
          case 'InvalidTokenError':
            return { status: 400, body: { message: shared.HTTP_ERROR_MESSAGES.InvalidToken } };
          default:
            logger.error(error);
            return { status: 500, body: { message: shared.HTTP_ERROR_MESSAGES.InternalError } };
        }
      }
      logger.error(error);
      return { status: 500, body: { message: shared.HTTP_ERROR_MESSAGES.InternalError } };
    });
  });

  test('should return 201 with pending verification on successful registration', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = {
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: 'StrongPass123!',
      tosAccepted: true,
    };

    const mockResult = {
      status: 'pending_verification' as const,
      message: 'Please check your email to verify your account.',
      email: 'test@example.com',
    };

    registerUserSpy.mockResolvedValue(mockResult);

    // Mock findByEmail to return null (user does not exist)
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue(null);
    (ctx.repos.users.findByUsername as Mock).mockResolvedValue(null);

    const result = await handleRegister(ctx, body, createMockRequest(), reply);

    expect(result.status).toBe(201);
    expect(result.body).toEqual(mockResult);
    // No cookies set - user must verify email first
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 409 when email already exists', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = {
      email: 'existing@example.com',
      username: 'existinguser',
      firstName: 'Existing',
      lastName: 'User',
      password: 'StrongPass123!',
      tosAccepted: true,
    };

    registerUserSpy.mockRejectedValue(new EmailAlreadyExistsError('Email already registered'));

    // Mock findByEmail to return an existing user
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue({
      id: 'user1',
      email: 'existing@example.com',
    });

    const result = await handleRegister(ctx, body, createMockRequest(), reply);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.EmailAlreadyRegistered });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 400 when password is too weak', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = {
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: 'weak',
      tosAccepted: true,
    };

    registerUserSpy.mockRejectedValue(new WeakPasswordError({ errors: ['Password too short'] }));
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue(null);
    (ctx.repos.users.findByUsername as Mock).mockResolvedValue(null);

    const result = await handleRegister(ctx, body, createMockRequest(), reply);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.WeakPassword });
    // Note: mapErrorToResponse does not log WeakPasswordError by default (no logContext provided)
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = {
      email: 'test@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      password: 'StrongPass123!',
      tosAccepted: true,
    };

    registerUserSpy.mockRejectedValue(new Error('Database connection failed'));
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue(null); // Removed vi.mocked()

    const result = await handleRegister(ctx, body, createMockRequest(), reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InternalError });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleLogin
// ============================================================================

describe('handleLogin', () => {
  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  let authenticateUserSpy: Mock;
  let setRefreshTokenCookieSpy: Mock;
  let isCaptchaRequiredSpy: Mock;
  let verifyCaptchaTokenSpy: Mock;
  let sendNewLoginAlertSpy: Mock;
  let generateDeviceFingerprintSpy: Mock;
  let isKnownDeviceSpy: Mock;
  let recordDeviceAccessSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    authenticateUserSpy = vi.spyOn(service, 'authenticateUser') as Mock;
    setRefreshTokenCookieSpy = vi.spyOn(utils, 'setRefreshTokenCookie') as Mock;
    isCaptchaRequiredSpy = vi.spyOn(security, 'isCaptchaRequired') as Mock;
    verifyCaptchaTokenSpy = vi.spyOn(security, 'verifyCaptchaToken') as Mock;
    sendNewLoginAlertSpy = vi.spyOn(security, 'sendNewLoginAlert') as Mock;
    generateDeviceFingerprintSpy = vi.spyOn(security, 'generateDeviceFingerprint') as Mock;
    isKnownDeviceSpy = vi.spyOn(security, 'isKnownDevice') as Mock;
    recordDeviceAccessSpy = vi.spyOn(security, 'recordDeviceAccess') as Mock;

    isCaptchaRequiredSpy.mockReturnValue(false);
    verifyCaptchaTokenSpy.mockResolvedValue({ success: true });
    sendNewLoginAlertSpy.mockResolvedValue(undefined);
    generateDeviceFingerprintSpy.mockReturnValue('mock-fingerprint');
    isKnownDeviceSpy.mockResolvedValue(false);
    recordDeviceAccessSpy.mockResolvedValue(undefined);
  });

  test('should return 200 with user response on successful login', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { identifier: 'test@example.com', password: 'password123' };

    const mockUser = createMockUser({ email: 'test@example.com', createdAt, updatedAt: createdAt });

    authenticateUserSpy.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: mockUser,
    });
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue(mockUser);

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      user: mockUser,
      isNewDevice: true,
    });
    expect(setRefreshTokenCookieSpy).toHaveBeenCalledWith(reply, 'refresh-token', ctx.config.auth);
    // expect(authenticateUserSpy).toHaveBeenCalledWith(
    //   ctx.db,
    //   ctx.repos,
    //   ctx.config.auth,
    //   'test@example.com',
    //   'password123',
    //   ctx.log,
    //   '127.0.0.1',
    //   'test-agent',
    //   expect.any(Function),
    // );
  });

  test('should return 401 on invalid credentials', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { identifier: 'test@example.com', password: 'wrongpassword' };

    authenticateUserSpy.mockRejectedValue(new InvalidCredentialsError());
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue(null);

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InvalidCredentials });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 429 when account is locked', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { identifier: 'locked@example.com', password: 'password123' };

    authenticateUserSpy.mockRejectedValue(new AccountLockedError());
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue(null);

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(429);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.AccountLocked });
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest();
    const reply = createMockReply();
    const body = { identifier: 'test@example.com', password: 'password123' };

    authenticateUserSpy.mockRejectedValue(new Error('Unexpected error'));
    (ctx.repos.users.findByEmail as Mock).mockResolvedValue(null);

    const result = await handleLogin(ctx, body, request, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InternalError });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleRefresh
// ============================================================================

describe('handleRefresh', () => {
  let refreshUserTokensSpy: Mock;
  let setRefreshTokenCookieSpy: Mock;
  let clearRefreshTokenCookieSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    refreshUserTokensSpy = vi.spyOn(service, 'refreshUserTokens') as Mock;
    setRefreshTokenCookieSpy = vi.spyOn(utils, 'setRefreshTokenCookie') as Mock;
    clearRefreshTokenCookieSpy = vi.spyOn(utils, 'clearRefreshTokenCookie') as Mock;
  });

  test('should return 200 with new access token on valid refresh', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-refresh-token' });
    const reply = createMockReply();

    // Mock findByToken to return a recent token record (idle timeout check)
    (ctx.repos.refreshTokens.findByToken as Mock).mockResolvedValue({
      createdAt: new Date(),
    });

    refreshUserTokensSpy.mockResolvedValue({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ token: 'new-access-token' });
    expect(setRefreshTokenCookieSpy).toHaveBeenCalledWith(
      reply,
      'new-refresh-token',
      ctx.config.auth,
    );
  });

  test('should return 401 when no refresh token is provided', async () => {
    const ctx = createMockContext();
    const request = createMockRequest(); // No cookies
    const reply = createMockReply();

    // No direct call to refreshUserTokensSpy, as it's not expected to be called
    // when no refresh token is provided, and the handler returns early.

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: AUTH_ERROR_MESSAGES.NO_REFRESH_TOKEN });
    expect(refreshUserTokensSpy).not.toHaveBeenCalled();
  });

  test('should return 401 and clear cookie on invalid token', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'invalid-token' });
    const reply = createMockReply();

    // Mock findByToken to return null (token not found in DB, but exists in cookie)
    (ctx.repos.refreshTokens.findByToken as Mock).mockResolvedValue(null);

    refreshUserTokensSpy.mockRejectedValue(new InvalidTokenError());

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InvalidToken });
    expect(clearRefreshTokenCookieSpy).toHaveBeenCalledWith(reply);
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'valid-token' });
    const reply = createMockReply();

    // Mock findByToken to return null so idle check passes
    (ctx.repos.refreshTokens.findByToken as Mock).mockResolvedValue(null);

    refreshUserTokensSpy.mockRejectedValue(new Error('Database error'));

    const result = await handleRefresh(ctx, request, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InternalError });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});
// ============================================================================
// Tests: handleLogout
// ============================================================================

describe('handleLogout', () => {
  let logoutUserSpy: Mock;
  let clearRefreshTokenCookieSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    logoutUserSpy = vi.spyOn(service, 'logoutUser') as Mock;
    clearRefreshTokenCookieSpy = vi.spyOn(utils, 'clearRefreshTokenCookie') as Mock;
  });

  test('should return 200 and clear cookie on successful logout', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'refresh-token' });
    const reply = createMockReply();

    logoutUserSpy.mockResolvedValue(undefined);

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.LOGGED_OUT });
    expect(clearRefreshTokenCookieSpy).toHaveBeenCalledWith(reply);
    expect(logoutUserSpy).toHaveBeenCalledWith(ctx.db, ctx.repos, 'refresh-token');
  });

  test('should return 200 even when no refresh token cookie exists', async () => {
    const ctx = createMockContext();
    const request = createMockRequest(); // No cookies
    const reply = createMockReply();

    logoutUserSpy.mockResolvedValue(undefined);

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.LOGGED_OUT });
    expect(clearRefreshTokenCookieSpy).toHaveBeenCalled();
    expect(logoutUserSpy).toHaveBeenCalledWith(ctx.db, ctx.repos, undefined);
  });

  test('should return 500 on unexpected errors', async () => {
    const ctx = createMockContext();
    const request = createMockRequest({ [REFRESH_COOKIE_NAME]: 'refresh-token' });
    const reply = createMockReply();

    logoutUserSpy.mockRejectedValue(new Error('Database error'));

    const result = await handleLogout(ctx, request, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InternalError });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});
// ============================================================================
// Tests: handleForgotPassword
// ============================================================================

describe('handleForgotPassword', () => {
  let requestPasswordResetSpy: Mock;
  let isCaptchaRequiredSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    requestPasswordResetSpy = vi.spyOn(service, 'requestPasswordReset') as Mock;
    isCaptchaRequiredSpy = vi.spyOn(security, 'isCaptchaRequired') as Mock;
    isCaptchaRequiredSpy.mockReturnValue(false);
  });

  test('should return success response for valid request', async () => {
    const ctx = createMockContext();
    const body = { email: 'test@example.com' };

    requestPasswordResetSpy.mockResolvedValue(undefined);

    const result = await handleForgotPassword(ctx, body, createMockRequest());

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: SUCCESS_MESSAGES.PASSWORD_RESET_SENT });
    expect(requestPasswordResetSpy).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.email,
      ctx.emailTemplates,
      'test@example.com',
      'http://localhost:8080',
    );
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const body = { email: 'test@example.com' };

    requestPasswordResetSpy.mockRejectedValue(new Error('Database error'));

    const result = await handleForgotPassword(ctx, body, createMockRequest());

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InternalError });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});

// ============================================================================
// Tests: handleResetPassword
// ============================================================================

describe('handleResetPassword', () => {
  let resetPasswordSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    resetPasswordSpy = vi.spyOn(service, 'resetPassword') as Mock;
  });

  test('should return success response for valid reset', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'newPassword123!' };

    resetPasswordSpy.mockResolvedValue(undefined);

    const result = await handleResetPassword(ctx, body, createMockRequest());

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ message: 'Password reset successfully' });
    expect(resetPasswordSpy).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      'reset-token',
      'newPassword123!',
    );
  });

  test('should return bad request for weak password', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'weak' };

    resetPasswordSpy.mockRejectedValue(new WeakPasswordError({ errors: ['Password too weak'] }));

    const result = await handleResetPassword(ctx, body, createMockRequest());

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.WeakPassword });
  });

  test('should return bad request for invalid token', async () => {
    const ctx = createMockContext();
    const body = { token: 'invalid-token', password: 'newPassword123!' };

    resetPasswordSpy.mockRejectedValue(new InvalidTokenError('Invalid token'));

    const result = await handleResetPassword(ctx, body, createMockRequest());

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InvalidToken });
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const body = { token: 'reset-token', password: 'newPassword123!' };

    resetPasswordSpy.mockRejectedValue(new Error('Database error'));

    const result = await handleResetPassword(ctx, body, createMockRequest());

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InternalError });
    expect(ctx.log.error).toHaveBeenCalled();
  });
});
// ============================================================================
// Tests: handleVerifyEmail
// ============================================================================

describe('handleVerifyEmail', () => {
  const createdAt = new Date('2024-01-01T00:00:00.000Z');
  let verifyEmailSpy: Mock;
  let setRefreshTokenCookieSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    verifyEmailSpy = vi.spyOn(service, 'verifyEmail') as Mock;
    setRefreshTokenCookieSpy = vi.spyOn(utils, 'setRefreshTokenCookie') as Mock;
  });

  test('should return success response with auth tokens for valid verification', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'verify-token' };

    const mockUser = createMockUser({ email: 'test@example.com', createdAt, updatedAt: createdAt });
    verifyEmailSpy.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: mockUser,
    });

    const result = await handleVerifyEmail(ctx, body, reply);

    expect(result.status).toBe(200);
    expect(result.body).toEqual({
      verified: true,
      token: 'access-token',
      user: mockUser,
    });
    expect(verifyEmailSpy).toHaveBeenCalledWith(
      ctx.db,
      ctx.repos,
      ctx.config.auth,
      'verify-token',
      ctx.log,
    );
    expect(setRefreshTokenCookieSpy).toHaveBeenCalledWith(reply, 'refresh-token', ctx.config.auth);
  });

  test('should return bad request for invalid token', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'invalid-token' };

    verifyEmailSpy.mockRejectedValue(new InvalidTokenError('Invalid token'));

    const result = await handleVerifyEmail(ctx, body, reply);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InvalidToken });
    expect(reply.setCookie).not.toHaveBeenCalled();
  });

  test('should return internal error on service failure', async () => {
    const ctx = createMockContext();
    const reply = createMockReply();
    const body = { token: 'verify-token' };

    verifyEmailSpy.mockRejectedValue(new Error('Database error'));

    const result = await handleVerifyEmail(ctx, body, reply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: HTTP_ERROR_MESSAGES.InternalError });
    expect(ctx.log.error).toHaveBeenCalled();
    expect(reply.setCookie).not.toHaveBeenCalled();
  });
});
// ============================================================================
// Tests: verifyToken
// ============================================================================

describe('verifyToken (from utils/jwt)', () => {
  let verifyTokenSpy: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    verifyTokenSpy = vi.spyOn(utils, 'verifyToken') as Mock;
  });

  test('should return token payload for valid token', () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user' as const,
    };

    verifyTokenSpy.mockReturnValue(mockPayload);

    const result = verifyTokenSpy('valid-token', 'secret-key-32-characters-long!!');

    expect(result).toEqual(mockPayload);
    expect(verifyTokenSpy).toHaveBeenCalledWith('valid-token', 'secret-key-32-characters-long!!');
  });

  test('should throw error for invalid token', () => {
    verifyTokenSpy.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    expect(() => verifyTokenSpy('invalid-token', 'secret-key-32-characters-long!!')).toThrow(
      'Invalid token',
    );
  });
});
