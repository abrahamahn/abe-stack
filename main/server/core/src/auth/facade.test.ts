// main/server/core/src/auth/facade.test.ts
/**
 * Auth Facade Tests
 *
 * Tests for the domain-level auth facade. Each auth flow has one
 * success-path test and one critical failure-mode test.
 *
 * The facade delegates to service functions, so we mock the service
 * layer and verify correct argument forwarding and result propagation.
 *
 * @module facade.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createAuthFacade, type AuthFacadeDeps } from './facade';

import type { AuthEmailService, AuthEmailTemplates, AuthLogger } from './types';
import type { DbClient, Repositories } from '../../../db/src';
import type { AuthConfig } from '@bslt/shared/config';

// ============================================================================
// Mock Service Functions
// ============================================================================

const {
  mockRegisterUser,
  mockAuthenticateUser,
  mockRefreshUserTokens,
  mockLogoutUser,
  mockRequestPasswordReset,
  mockResetPassword,
} = vi.hoisted(() => ({
  mockRegisterUser: vi.fn(),
  mockAuthenticateUser: vi.fn(),
  mockRefreshUserTokens: vi.fn(),
  mockLogoutUser: vi.fn(),
  mockRequestPasswordReset: vi.fn(),
  mockResetPassword: vi.fn(),
}));

vi.mock('./service', () => ({
  registerUser: mockRegisterUser,
  authenticateUser: mockAuthenticateUser,
  refreshUserTokens: mockRefreshUserTokens,
  logoutUser: mockLogoutUser,
  requestPasswordReset: mockRequestPasswordReset,
  resetPassword: mockResetPassword,
}));

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
      findByUsername: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshTokens: {
      deleteByToken: vi.fn(),
    },
    authTokens: {
      findValidByTokenHash: vi.fn(),
      create: vi.fn(),
    },
    memberships: {
      findByUserId: vi.fn().mockResolvedValue([]),
    },
  } as unknown as Repositories;
}

function createMockEmailService(): AuthEmailService {
  return {
    send: vi.fn().mockResolvedValue({ success: true, messageId: 'test-id' }),
  } as unknown as AuthEmailService;
}

function createMockEmailTemplates(): AuthEmailTemplates {
  return {
    emailVerification: vi.fn(() => ({
      subject: 'Verify your email',
      text: 'Click to verify',
      html: '<p>Click to verify</p>',
    })),
    passwordReset: vi.fn(() => ({
      subject: 'Reset your password',
      text: 'Click to reset',
      html: '<p>Click to reset</p>',
    })),
    existingAccountRegistrationAttempt: vi.fn(() => ({
      subject: 'Registration attempt',
      text: 'Someone tried to register',
      html: '<p>Someone tried to register</p>',
    })),
    magicLink: vi.fn(() => ({
      subject: 'Your login link',
      text: 'Click to login',
      html: '<p>Click to login</p>',
    })),
  } as unknown as AuthEmailTemplates;
}

function createMockLogger(): AuthLogger {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn() as unknown as (bindings: Record<string, unknown>) => AuthLogger,
  } as AuthLogger;
  (logger.child as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger;
}

function createMockConfig(): AuthConfig {
  return {
    jwt: {
      secret: 'test-secret-32-characters-long!!',
      accessTokenExpiry: '15m',
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

function createFacadeDeps(overrides?: Partial<AuthFacadeDeps>): AuthFacadeDeps {
  return {
    db: createMockDb(),
    repos: createMockRepos(),
    config: createMockConfig(),
    logger: createMockLogger(),
    email: createMockEmailService(),
    emailTemplates: createMockEmailTemplates(),
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('AuthFacade', () => {
  let deps: AuthFacadeDeps;

  beforeEach(() => {
    vi.clearAllMocks();
    deps = createFacadeDeps();
  });

  // --------------------------------------------------------------------------
  // signUp
  // --------------------------------------------------------------------------

  describe('signUp', () => {
    it('delegates to registerUser and returns the result', async () => {
      const expectedResult = {
        status: 'pending_verification' as const,
        message: 'Registration successful!',
        email: 'alice@example.com',
      };
      mockRegisterUser.mockResolvedValue(expectedResult);

      const facade = createAuthFacade(deps);
      const result = await facade.signUp({
        email: 'alice@example.com',
        username: 'alice',
        firstName: 'Alice',
        lastName: 'Smith',
        password: 'SecureP@ss1!',
        baseUrl: 'https://app.example.com',
        tosAccepted: true,
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
      });

      expect(result).toEqual(expectedResult);
      expect(mockRegisterUser).toHaveBeenCalledOnce();
      expect(mockRegisterUser).toHaveBeenCalledWith(
        deps.db,
        deps.repos,
        deps.email,
        deps.emailTemplates,
        deps.config,
        'alice@example.com',
        'SecureP@ss1!',
        'alice',
        'Alice',
        'Smith',
        'https://app.example.com',
        {
          tosAccepted: true,
          ipAddress: '127.0.0.1',
          userAgent: 'TestAgent/1.0',
        },
      );
    });

    it('propagates ConflictError when username is taken', async () => {
      const conflictError = new Error('Username is already taken');
      conflictError.name = 'ConflictError';
      mockRegisterUser.mockRejectedValue(conflictError);

      const facade = createAuthFacade(deps);
      await expect(
        facade.signUp({
          email: 'bob@example.com',
          username: 'taken_name',
          firstName: 'Bob',
          lastName: 'Jones',
          password: 'SecureP@ss1!',
          baseUrl: 'https://app.example.com',
        }),
      ).rejects.toThrow('Username is already taken');
    });
  });

  // --------------------------------------------------------------------------
  // signIn
  // --------------------------------------------------------------------------

  describe('signIn', () => {
    it('delegates to authenticateUser and returns the auth result', async () => {
      const expectedResult = {
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
        user: {
          id: 'user-1',
          email: 'alice@example.com',
          username: 'alice',
          firstName: 'Alice',
          lastName: 'Smith',
          avatarUrl: null,
          role: 'user',
          emailVerified: true,
          phone: null,
          phoneVerified: null,
          dateOfBirth: null,
          gender: null,
          bio: null,
          city: null,
          state: null,
          country: null,
          language: null,
          website: null,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      };
      mockAuthenticateUser.mockResolvedValue(expectedResult);

      const onPasswordRehash = vi.fn();
      const facade = createAuthFacade(deps);
      const result = await facade.signIn({
        identifier: 'alice@example.com',
        password: 'SecureP@ss1!',
        ipAddress: '127.0.0.1',
        userAgent: 'TestAgent/1.0',
        onPasswordRehash,
      });

      expect(result).toEqual(expectedResult);
      expect(mockAuthenticateUser).toHaveBeenCalledOnce();
      expect(mockAuthenticateUser).toHaveBeenCalledWith(
        deps.db,
        deps.repos,
        deps.config,
        'alice@example.com',
        'SecureP@ss1!',
        deps.logger,
        '127.0.0.1',
        'TestAgent/1.0',
        onPasswordRehash,
        undefined,
      );
    });

    it('propagates InvalidCredentialsError on wrong password', async () => {
      const credError = new Error('Invalid email or password');
      credError.name = 'InvalidCredentialsError';
      mockAuthenticateUser.mockRejectedValue(credError);

      const facade = createAuthFacade(deps);
      await expect(
        facade.signIn({
          identifier: 'alice@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow('Invalid email or password');
    });
  });

  // --------------------------------------------------------------------------
  // refresh
  // --------------------------------------------------------------------------

  describe('refresh', () => {
    it('delegates to refreshUserTokens and returns new tokens', async () => {
      const expectedResult = {
        accessToken: 'new-jwt',
        refreshToken: 'new-refresh',
      };
      mockRefreshUserTokens.mockResolvedValue(expectedResult);

      const facade = createAuthFacade(deps);
      const result = await facade.refresh({
        refreshToken: 'old-refresh-token',
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/2.0',
      });

      expect(result).toEqual(expectedResult);
      expect(mockRefreshUserTokens).toHaveBeenCalledOnce();
      expect(mockRefreshUserTokens).toHaveBeenCalledWith(
        deps.db,
        deps.repos,
        deps.config,
        'old-refresh-token',
        '10.0.0.1',
        'TestAgent/2.0',
      );
    });

    it('propagates InvalidTokenError on expired token', async () => {
      const tokenError = new Error('Invalid or expired token');
      tokenError.name = 'InvalidTokenError';
      mockRefreshUserTokens.mockRejectedValue(tokenError);

      const facade = createAuthFacade(deps);
      await expect(
        facade.refresh({
          refreshToken: 'expired-token',
        }),
      ).rejects.toThrow('Invalid or expired token');
    });
  });

  // --------------------------------------------------------------------------
  // signOut
  // --------------------------------------------------------------------------

  describe('signOut', () => {
    it('delegates to logoutUser with the refresh token', async () => {
      mockLogoutUser.mockResolvedValue(undefined);

      const facade = createAuthFacade(deps);
      await facade.signOut({ refreshToken: 'token-to-revoke' });

      expect(mockLogoutUser).toHaveBeenCalledOnce();
      expect(mockLogoutUser).toHaveBeenCalledWith(deps.db, deps.repos, 'token-to-revoke');
    });

    it('handles signOut without a refresh token gracefully', async () => {
      mockLogoutUser.mockResolvedValue(undefined);

      const facade = createAuthFacade(deps);
      await facade.signOut({});

      expect(mockLogoutUser).toHaveBeenCalledOnce();
      expect(mockLogoutUser).toHaveBeenCalledWith(deps.db, deps.repos, undefined);
    });
  });

  // --------------------------------------------------------------------------
  // forgotPassword
  // --------------------------------------------------------------------------

  describe('forgotPassword', () => {
    it('delegates to requestPasswordReset', async () => {
      mockRequestPasswordReset.mockResolvedValue(undefined);

      const facade = createAuthFacade(deps);
      await facade.forgotPassword({
        email: 'alice@example.com',
        baseUrl: 'https://app.example.com',
      });

      expect(mockRequestPasswordReset).toHaveBeenCalledOnce();
      expect(mockRequestPasswordReset).toHaveBeenCalledWith(
        deps.db,
        deps.repos,
        deps.email,
        deps.emailTemplates,
        'alice@example.com',
        'https://app.example.com',
      );
    });

    it('propagates EmailSendError when email fails to send', async () => {
      const emailError = new Error('Failed to send password reset email');
      emailError.name = 'EmailSendError';
      mockRequestPasswordReset.mockRejectedValue(emailError);

      const facade = createAuthFacade(deps);
      await expect(
        facade.forgotPassword({
          email: 'alice@example.com',
          baseUrl: 'https://app.example.com',
        }),
      ).rejects.toThrow('Failed to send password reset email');
    });
  });

  // --------------------------------------------------------------------------
  // resetPassword
  // --------------------------------------------------------------------------

  describe('resetPassword', () => {
    it('delegates to resetPassword service and returns the email', async () => {
      mockResetPassword.mockResolvedValue('alice@example.com');

      const facade = createAuthFacade(deps);
      const email = await facade.resetPassword({
        token: 'valid-reset-token',
        password: 'NewSecureP@ss1!',
      });

      expect(email).toBe('alice@example.com');
      expect(mockResetPassword).toHaveBeenCalledOnce();
      expect(mockResetPassword).toHaveBeenCalledWith(
        deps.db,
        deps.repos,
        deps.config,
        'valid-reset-token',
        'NewSecureP@ss1!',
      );
    });

    it('propagates InvalidTokenError on expired reset token', async () => {
      const tokenError = new Error('Invalid or expired reset token');
      tokenError.name = 'InvalidTokenError';
      mockResetPassword.mockRejectedValue(tokenError);

      const facade = createAuthFacade(deps);
      await expect(
        facade.resetPassword({
          token: 'expired-token',
          password: 'NewSecureP@ss1!',
        }),
      ).rejects.toThrow('Invalid or expired reset token');
    });
  });
});
