// modules/auth/src/handlers/password.test.ts
/**
 * Password Handler Tests
 *
 * Comprehensive tests for password reset and set password flows.
 */

import { EmailSendError, InvalidCredentialsError, InvalidTokenError, WeakPasswordError } from '@abe-stack/core';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleForgotPassword, handleResetPassword, handleSetPassword } from './password';

import type { AppConfig } from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Create mock functions via vi.hoisted to be available before vi.mock hoisting
const {
  mockRequestPasswordReset,
  mockResetPassword,
  mockSetPassword,
  mockMapErrorToResponse,
} = vi.hoisted(() => ({
  mockRequestPasswordReset: vi.fn(),
  mockResetPassword: vi.fn(),
  mockSetPassword: vi.fn(),
  // Error mapper that uses error.name instead of instanceof (avoids ESM module boundary issues)
  mockMapErrorToResponse: vi.fn((error: unknown, _ctx: unknown) => {
    if (error instanceof Error) {
      switch (error.name) {
        case 'InvalidTokenError':
          return { status: 400, body: { message: error.message || 'Invalid or expired token' } };
        case 'WeakPasswordError':
          return { status: 400, body: { message: 'Password is too weak' } };
        case 'InvalidCredentialsError':
          return { status: 401, body: { message: 'Invalid email or password' } };
        case 'EmailSendError':
          return { status: 503, body: { message: 'Failed to send email' } };
        default:
          return { status: 500, body: { message: 'Internal server error' } };
      }
    }
    return { status: 500, body: { message: 'Internal server error' } };
  }),
}));

// Mock the service module
vi.mock('../service', () => ({
  requestPasswordReset: mockRequestPasswordReset,
  resetPassword: mockResetPassword,
  setPassword: mockSetPassword,
}));

// Mock @abe-stack/core to intercept mapErrorToHttpResponse
vi.mock('@abe-stack/core', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/core')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToResponse,
  };
});


// ============================================================================
// Test Helpers
// ============================================================================

const baseConfig: AppConfig = {
  env: 'test',
  server: {
    host: '127.0.0.1',
    port: 8080,
    portFallbacks: [],
    cors: { origin: ['*'], credentials: false, methods: ['GET', 'POST'] },
    trustProxy: false,
    logLevel: 'silent',
    maintenanceMode: false,
    appBaseUrl: 'http://localhost:8080',
    apiBaseUrl: 'http://localhost:8080',
    rateLimit: { windowMs: 60000, max: 1000 },
  },
  database: {
    provider: 'postgresql',
    host: 'localhost',
    port: 5432,
    database: 'test',
    user: 'test',
    password: 'test',
    maxConnections: 1,
    portFallbacks: [],
    ssl: false,
  },
  auth: {
    strategies: ['local'],
    jwt: {
      secret: 'test-secret-32-characters-long!!',
      accessTokenExpiry: '15m',
      issuer: 'test',
      audience: 'test',
    },
    refreshToken: { expiryDays: 7, gracePeriodSeconds: 30 },
    argon2: { type: 2, memoryCost: 1024, timeCost: 1, parallelism: 1 },
    password: { minLength: 8, maxLength: 64, minZxcvbnScore: 2 },
    lockout: {
      maxAttempts: 5,
      lockoutDurationMs: 1800000,
      progressiveDelay: false,
      baseDelayMs: 0,
    },
    bffMode: false,
    proxy: { trustProxy: false, trustedProxies: [], maxProxyDepth: 1 },
    rateLimit: {
      login: { max: 100, windowMs: 60000 },
      register: { max: 100, windowMs: 60000 },
      forgotPassword: { max: 100, windowMs: 60000 },
      verifyEmail: { max: 100, windowMs: 60000 },
    },
    cookie: {
      name: 'refreshToken',
      secret: 'test',
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    },
    oauth: {},
    magicLink: { tokenExpiryMinutes: 15, maxAttempts: 3 },
    totp: { issuer: 'Test', window: 1 },
  },
  email: {
    provider: 'console',
    smtp: {
      host: '',
      port: 587,
      secure: false,
      auth: { user: '', pass: '' },
      connectionTimeout: 30000,
      socketTimeout: 30000,
    },
    from: { name: 'Test', address: 'test@test.com' },
    replyTo: 'test@test.com',
  },
  storage: { provider: 'local', rootPath: './test-uploads' },
  billing: {
    enabled: false,
    provider: 'stripe',
    currency: 'USD',
    stripe: { secretKey: '', publishableKey: '', webhookSecret: '' },
    paypal: { clientId: '', clientSecret: '', webhookId: '', sandbox: true },
    plans: {},
    urls: {
      portalReturnUrl: 'http://localhost:8080/settings/billing',
      checkoutSuccessUrl: 'http://localhost:8080/checkout/success',
      checkoutCancelUrl: 'http://localhost:8080/checkout/cancel',
    },
  },
  cache: { ttl: 300000, maxSize: 1000, useExternalProvider: false },
  queue: {
    provider: 'local',
    pollIntervalMs: 1000,
    concurrency: 1,
    defaultMaxAttempts: 3,
    backoffBaseMs: 1000,
    maxBackoffMs: 30000,
  },
  notifications: {
    enabled: false,
    provider: 'fcm',
    config: { credentials: '', projectId: '' },
  },
  search: { provider: 'sql', config: { defaultPageSize: 20, maxPageSize: 100 } },
};

type AppContextOverrides = Partial<AppContext> & {
  config?: Partial<AppConfig> & { server?: Partial<AppConfig['server']> };
};

function createMockContext(overrides?: AppContextOverrides): AppContext {
  const config: AppConfig = {
    ...baseConfig,
    ...(overrides?.config ?? {}),
    server: {
      ...baseConfig.server,
      ...(overrides?.config?.server ?? {}),
    },
  };
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    emailTemplates: {
      emailVerification: vi.fn(() => ({ subject: 'Verify your email', text: 'verify', html: '<p>verify</p>' })),
      existingAccountRegistrationAttempt: vi.fn(() => ({ subject: 'Registration attempt', text: 'reg', html: '<p>reg</p>' })),
      passwordReset: vi.fn(() => ({ subject: 'Reset your password', text: 'reset', html: '<p>reset</p>' })),
      magicLink: vi.fn(() => ({ subject: 'Login link', text: 'login', html: '<p>login</p>' })),
      accountLocked: vi.fn(() => ({ subject: 'Account locked', text: 'locked', html: '<p>locked</p>' })),
    },
    config,
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn(),
    },
    storage: {} as AppContext['storage'],
    pubsub: {} as AppContext['pubsub'],
    cache: {} as AppContext['cache'],
    ...overrides,
  } as unknown as AppContext;
}

function createMockRequest(userId?: string): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
    },
    user: userId != null && userId !== '' ? { userId, email: 'test@example.com', role: 'user' as const } : undefined,
  };
}

// ============================================================================
// Tests: handleForgotPassword (formerly handleRequestPasswordReset)
// ============================================================================

describe('handleForgotPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful password reset request', () => {
    test('should return 200 with success message when email exists', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      mockRequestPasswordReset.mockResolvedValue(undefined);

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(result.body.message).toBe('Password reset email sent');
    });

    test('should call requestPasswordReset with correct parameters', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      mockRequestPasswordReset.mockResolvedValue(undefined);

      await handleForgotPassword(ctx, body);

      expect(mockRequestPasswordReset).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.email,
        ctx.emailTemplates,
        'test@example.com',
        'http://localhost:8080',
      );
    });

    test('should use appBaseUrl from config', async () => {
      const base = createMockContext().config;
      const ctx = createMockContext({
        config: {
          ...base,
          server: {
            ...base.server,
            port: 3000,
            appBaseUrl: 'https://example.com',
          },
        },
      });
      const body = { email: 'test@example.com' };

      mockRequestPasswordReset.mockResolvedValue(undefined);

      await handleForgotPassword(ctx, body);

      expect(mockRequestPasswordReset).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.email,
        ctx.emailTemplates,
        'test@example.com',
        'https://example.com',
      );
    });

    test('should handle different email formats', async () => {
      const ctx = createMockContext();
      const emails = [
        'user@example.com',
        'user+tag@example.co.uk',
        'user.name@subdomain.example.com',
      ];

      for (const email of emails) {
        mockRequestPasswordReset.mockResolvedValue(undefined);

        const result = await handleForgotPassword(ctx, { email });

        expect(result.status).toBe(200);
        expect(mockRequestPasswordReset).toHaveBeenCalledWith(
          ctx.db,
          ctx.repos,
          ctx.email,
          ctx.emailTemplates,
          email,
          'http://localhost:8080',
        );
        vi.clearAllMocks();
      }
    });
  });

  describe('email send error handling', () => {
    test('should return 200 even if email send fails (prevent enumeration)', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      const emailError = new EmailSendError('SMTP connection failed', new Error('SMTP timeout'));

      mockRequestPasswordReset.mockRejectedValue(emailError);

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(result.body.message).toBe('Password reset email sent');
    });

    test('should log email send failure with details', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      const originalError = new Error('SMTP connection failed');
      const emailError = new EmailSendError('Email send failed', originalError);

      mockRequestPasswordReset.mockRejectedValue(emailError);

      await handleForgotPassword(ctx, body);

      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          originalError: 'SMTP connection failed',
        },
        'Failed to send password reset email',
      );
    });

    test('should handle EmailSendError without originalError', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      const emailError = new EmailSendError('Email send failed');

      mockRequestPasswordReset.mockRejectedValue(emailError);

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          originalError: undefined,
        },
        'Failed to send password reset email',
      );
    });
  });

  describe('error handling', () => {
    test('should return mapped error for non-email errors', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      const dbError = new Error('Database connection failed');
      mockRequestPasswordReset.mockRejectedValue(dbError);

      const result = await handleForgotPassword(ctx, body);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe('Internal server error');
    });

    test('should handle InvalidTokenError appropriately', async () => {
      const ctx = createMockContext();
      const body = { email: 'test@example.com' };

      const error = new Error('Invalid token');
      error.name = 'InvalidTokenError';
      mockRequestPasswordReset.mockRejectedValue(error);

      const result = await handleForgotPassword(ctx, body);

      // Should be mapped by mapErrorToResponse
      expect(result.status).toBeGreaterThanOrEqual(400);
    });
  });
});

// ============================================================================
// Tests: handleResetPassword
// ============================================================================

describe('handleResetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful password reset', () => {
    test('should return 200 with success message on valid token', async () => {
      const ctx = createMockContext();
      const body = {
        token: 'valid-reset-token-123456789abcdef',
        password: 'NewSecureP@ssw0rd!',
      };

      mockResetPassword.mockResolvedValue(undefined);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(result.body.message).toBe('Password reset successfully');
    });

    test('should call resetPassword with correct parameters', async () => {
      const ctx = createMockContext();
      const body = {
        token: 'valid-reset-token-123456789abcdef',
        password: 'NewSecureP@ssw0rd!',
      };

      mockResetPassword.mockResolvedValue(undefined);

      await handleResetPassword(ctx, body);

      expect(mockResetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.config.auth,
        'valid-reset-token-123456789abcdef',
        'NewSecureP@ssw0rd!',
      );
    });

    test('should handle complex passwords with special characters', async () => {
      const ctx = createMockContext();
      const complexPasswords = [
        'P@ssw0rd!#$%',
        'MyP@ss123_W0rd',
        'Secure!23456789',
        'Test@2024#Pass',
      ];

      for (const password of complexPasswords) {
        mockResetPassword.mockResolvedValue(undefined);

        const result = await handleResetPassword(ctx, {
          token: 'token-123',
          password,
        });

        expect(result.status).toBe(200);
        expect(mockResetPassword).toHaveBeenCalledWith(
          ctx.db,
          ctx.repos,
          ctx.config.auth,
          'token-123',
          password,
        );
        vi.clearAllMocks();
      }
    });

    test('should handle long tokens', async () => {
      const ctx = createMockContext();
      const longToken = 'a'.repeat(128);
      const body = {
        token: longToken,
        password: 'NewSecureP@ssw0rd!',
      };

      mockResetPassword.mockResolvedValue(undefined);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(200);
      expect(mockResetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.config.auth,
        longToken,
        'NewSecureP@ssw0rd!',
      );
    });
  });

  describe('error handling', () => {
    test('should return 400 for invalid token', async () => {
      const ctx = createMockContext();
      const body = {
        token: 'invalid-token',
        password: 'NewSecureP@ssw0rd!',
      };

      const error = new InvalidTokenError('Invalid or expired reset token');
      mockResetPassword.mockRejectedValue(error);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body.message).toContain('Invalid or expired');
    });

    test('should return 400 for expired token', async () => {
      const ctx = createMockContext();
      const body = {
        token: 'expired-token-123',
        password: 'NewSecureP@ssw0rd!',
      };

      const error = new InvalidTokenError('Invalid or expired reset token');
      mockResetPassword.mockRejectedValue(error);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
    });

    test('should return 400 for weak password', async () => {
      const ctx = createMockContext();
      const body = {
        token: 'valid-token',
        password: 'weak',
      };

      mockResetPassword.mockRejectedValue(
        new WeakPasswordError({ errors: ['Password is too weak'] }),
      );

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
      expect(result.body.message).toContain('weak');
    });

    test('should return 500 for database errors', async () => {
      const ctx = createMockContext();
      const body = {
        token: 'valid-token',
        password: 'NewSecureP@ssw0rd!',
      };

      mockResetPassword.mockRejectedValue(new Error('Database connection failed'));

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe('Internal server error');
    });

    test('should handle token already used scenario', async () => {
      const ctx = createMockContext();
      const body = {
        token: 'used-token',
        password: 'NewSecureP@ssw0rd!',
      };

      const error = new InvalidTokenError('Token already used');
      mockResetPassword.mockRejectedValue(error);

      const result = await handleResetPassword(ctx, body);

      expect(result.status).toBe(400);
    });
  });
});

// ============================================================================
// Tests: handleSetPassword
// ============================================================================

describe('handleSetPassword', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful password set', () => {
    test('should return 200 with success message for authenticated user', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('user-123');

      mockSetPassword.mockResolvedValue(undefined);

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(200);
      expect(result.body.message).toBe('Password set successfully');
    });

    test('should call setPassword with correct parameters', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('user-123');

      mockSetPassword.mockResolvedValue(undefined);

      await handleSetPassword(ctx, body, req);

      expect(mockSetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.config.auth,
        'user-123',
        'NewSecureP@ssw0rd!',
      );
    });

    test('should handle different user IDs', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const userIds = ['user-1', 'user-999', 'uuid-abc-123'];

      for (const userId of userIds) {
        mockSetPassword.mockResolvedValue(undefined);

        const req = createMockRequest(userId);
        const result = await handleSetPassword(ctx, body, req);

        expect(result.status).toBe(200);
        expect(mockSetPassword).toHaveBeenCalledWith(
          ctx.db,
          ctx.repos,
          ctx.config.auth,
          userId,
          'NewSecureP@ssw0rd!',
        );
        vi.clearAllMocks();
      }
    });

    test('should handle complex passwords with special characters', async () => {
      const ctx = createMockContext();
      const req = createMockRequest('user-123');
      const complexPasswords = [
        'P@ssw0rd!#$%^&*()',
        'MyV3ry!Secure_P@ssw0rd',
        'Test@2024#NewPass!',
      ];

      for (const password of complexPasswords) {
        mockSetPassword.mockResolvedValue(undefined);

        const result = await handleSetPassword(ctx, { password }, req);

        expect(result.status).toBe(200);
        expect(mockSetPassword).toHaveBeenCalledWith(
          ctx.db,
          ctx.repos,
          ctx.config.auth,
          'user-123',
          password,
        );
        vi.clearAllMocks();
      }
    });
  });

  describe('authentication errors', () => {
    test('should return 401 when user is not authenticated', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest(); // No userId

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Authentication required');
      expect(mockSetPassword).not.toHaveBeenCalled();
    });

    test('should return 401 when req.user is undefined', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = {
        ...createMockRequest(),
        user: undefined,
      };

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Authentication required');
      expect(mockSetPassword).not.toHaveBeenCalled();
    });

    test('should return 401 when userId is empty string', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = {
        ...createMockRequest(),
        user: { userId: '', email: 'test@example.com', role: 'user' as const },
      };

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(401);
      expect(result.body.message).toBe('Authentication required');
      expect(mockSetPassword).not.toHaveBeenCalled();
    });
  });

  describe('password already set error', () => {
    test('should return 409 when user already has password', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('user-123');

      const error = new Error('User already has a password set');
      error.name = 'PasswordAlreadySetError';
      mockSetPassword.mockRejectedValue(error);

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(409);
      expect(result.body.message).toBe('User already has a password set');
    });

    test('should match exact error name PasswordAlreadySetError', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('user-123');

      // Test that error name must be exactly 'PasswordAlreadySetError'
      const error = new Error('User already has a password set');
      error.name = 'PasswordAlreadySetError';
      mockSetPassword.mockRejectedValue(error);

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(409);
    });

    test('should not match similar error names', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('user-123');

      // Test with different error name
      const error = new Error('Password exists');
      error.name = 'PasswordExistsError'; // Different name
      mockSetPassword.mockRejectedValue(error);

      const result = await handleSetPassword(ctx, body, req);

      // Should fall through to general error handling, not 409
      expect(result.status).toBe(500);
    });
  });

  describe('other error handling', () => {
    test('should return 400 for weak password', async () => {
      const ctx = createMockContext();
      const body = { password: 'weak' };
      const req = createMockRequest('user-123');

      mockSetPassword.mockRejectedValue(
        new WeakPasswordError({ errors: ['Password is too weak'] }),
      );

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(400);
      expect(result.body.message).toContain('weak');
    });

    test('should return 500 for database errors', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('user-123');

      mockSetPassword.mockRejectedValue(new Error('Database connection failed'));

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe('Internal server error');
    });

    test('should return 401 for InvalidCredentialsError', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('nonexistent-user');

      const error = new InvalidCredentialsError();
      mockSetPassword.mockRejectedValue(error);

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(401);
    });

    test('should handle generic Error instances', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = createMockRequest('user-123');

      mockSetPassword.mockRejectedValue(new Error('Unknown error'));

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(500);
      expect(result.body.message).toBe('Internal server error');
    });
  });

  describe('edge cases', () => {
    test('should handle very long passwords', async () => {
      const ctx = createMockContext();
      const longPassword = 'A1b2C3d4!'.repeat(20); // 180 characters
      const body = { password: longPassword };
      const req = createMockRequest('user-123');

      mockSetPassword.mockResolvedValue(undefined);

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(200);
      expect(mockSetPassword).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.config.auth,
        'user-123',
        longPassword,
      );
    });

    test('should handle passwords with unicode characters', async () => {
      const ctx = createMockContext();
      const body = { password: 'P@ssw0rd123!🔒' };
      const req = createMockRequest('user-123');

      mockSetPassword.mockResolvedValue(undefined);

      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(200);
    });

    test('should handle null user.userId gracefully', async () => {
      const ctx = createMockContext();
      const body = { password: 'NewSecureP@ssw0rd!' };
      const req = {
        ...createMockRequest(),
        user: {
          userId: null as unknown as string,
          email: 'test@example.com',
          role: 'user' as const,
        },
      };

      // Package handler only guards against undefined/'', null userId passes through
      const result = await handleSetPassword(ctx, body, req);

      expect(result.status).toBe(200);
    });
  });
});
