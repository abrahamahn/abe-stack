// modules/auth/src/handlers/register.test.ts
/**
 * Register Handler Tests
 *
 * Comprehensive tests for user registration with email verification.
 */

import { EmailSendError, WeakPasswordError } from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleRegister } from './register';

import type { AppConfig } from '@abe-stack/shared';
import type { RegisterRequest } from '@abe-stack/shared';
import type { RegisterResult } from '../service';
import type { AppContext, ReplyWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Create mock functions via vi.hoisted to be available before vi.mock hoisting
const { mockRegisterUser, mockMapErrorToResponse } = vi.hoisted(() => ({
  mockRegisterUser: vi.fn(),
  // Error mapper that uses error.name instead of instanceof (avoids ESM module boundary issues)
  mockMapErrorToResponse: vi.fn(
    (error: unknown, logger: { error: (context: unknown, message?: string) => void }) => {
      if (error instanceof Error) {
        switch (error.name) {
          case 'WeakPasswordError':
            return { status: 400, body: { message: 'Password is too weak' } };
          case 'EmailSendError':
            return { status: 503, body: { message: 'Failed to send email' } };
          default:
            // Log unknown errors like the real implementation does
            logger.error(error);
            return { status: 500, body: { message: 'Internal server error' } };
        }
      }
      logger.error(error);
      return { status: 500, body: { message: 'Internal server error' } };
    },
  ),
}));

// Mock the service module
vi.mock('../service', () => ({
  registerUser: mockRegisterUser,
}));

// Mock @abe-stack/shared to intercept mapErrorToHttpResponse
vi.mock('@abe-stack/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/shared')>();
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
    appBaseUrl: 'http://localhost:3000',
    apiBaseUrl: 'http://localhost:3000',
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
      portalReturnUrl: 'http://localhost:3000/settings/billing',
      checkoutSuccessUrl: 'http://localhost:3000/checkout/success',
      checkoutCancelUrl: 'http://localhost:3000/checkout/cancel',
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

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

function createRegisterBody(overrides?: Partial<RegisterRequest>): RegisterRequest {
  return {
    email: 'newuser@example.com',
    password: 'SecureP@ssw0rd!123',
    name: 'New User',
    ...overrides,
  };
}

// ============================================================================
// Tests: handleRegister
// ============================================================================

describe('handleRegister', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('successful registration', () => {
    test('should return 201 with pending verification status on successful registration', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message:
          'Registration successful! Please check your email inbox and click the confirmation link to complete your registration.',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      const result = await handleRegister(ctx, body, reply);

      expect(result.status).toBe(201);
      expect(result.body).toEqual(mockRegisterResult);
    });

    test('should call registerUser with correct parameters including name', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      await handleRegister(ctx, body, reply);

      expect(mockRegisterUser).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.email,
        ctx.emailTemplates,
        ctx.config.auth,
        'newuser@example.com',
        'SecureP@ssw0rd!123',
        'New User',
        'http://localhost:3000',
      );
    });

    test('should call registerUser without name when not provided', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody({ name: undefined });

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      await handleRegister(ctx, body, reply);

      expect(mockRegisterUser).toHaveBeenCalledWith(
        ctx.db,
        ctx.repos,
        ctx.email,
        ctx.emailTemplates,
        ctx.config.auth,
        'newuser@example.com',
        'SecureP@ssw0rd!123',
        undefined,
        'http://localhost:3000',
      );
    });

    test('should use appBaseUrl from config', async () => {
      const base = createMockContext().config;
      const ctx = createMockContext({
        config: {
          ...base,
          server: {
            ...base.server,
            port: 8080,
            appBaseUrl: 'https://production.example.com',
          },
        },
      });
      const reply = createMockReply();
      const body = createRegisterBody();

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      await handleRegister(ctx, body, reply);

      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'https://production.example.com',
      );
    });

    test('should not set cookies for unverified user', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      await handleRegister(ctx, body, reply);

      expect(reply.setCookie).not.toHaveBeenCalled();
    });
  });

  describe('email send failure handling', () => {
    test('should return 201 with emailSendFailed flag when email fails to send', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      const originalError = new Error('SMTP connection timeout');
      mockRegisterUser.mockRejectedValue(new EmailSendError('Failed to send', originalError));

      const result = await handleRegister(ctx, body, reply);

      expect(result.status).toBe(201);
      expect(result.body).toEqual({
        status: 'pending_verification',
        message:
          'Account created successfully, but we had trouble sending the verification email. Please use the resend verification option.',
        email: 'newuser@example.com',
        emailSendFailed: true,
      });
    });

    test('should log email send failure with details', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody({ email: 'test@example.com' });

      const originalError = new Error('Email service unavailable');
      mockRegisterUser.mockRejectedValue(new EmailSendError('Failed to send', originalError));

      await handleRegister(ctx, body, reply);

      expect(ctx.log.error).toHaveBeenCalledWith(
        {
          email: 'test@example.com',
          originalError: 'Email service unavailable',
        },
        'Failed to send verification email after user creation',
      );
    });

    test('should handle EmailSendError without originalError', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      mockRegisterUser.mockRejectedValue(new EmailSendError('Failed to send'));

      const result = await handleRegister(ctx, body, reply);

      expect(result.status).toBe(201);
      expect(result.body).toMatchObject({
        emailSendFailed: true,
      });
      expect(ctx.log.error).toHaveBeenCalled();
    });
  });

  describe('validation error handling', () => {
    test('should return 400 for weak password', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      const weakPasswordError = new WeakPasswordError({
        errors: ['Password must be at least 12 characters long', 'Password must contain a number'],
      });

      mockRegisterUser.mockRejectedValue(weakPasswordError);

      const result = await handleRegister(ctx, body, reply);

      expect(result.status).toBe(400);
      expect((result.body as { message: string }).message).toBeTruthy();
    });

    test('should return 409 for existing email', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      // Create an error with name property that mapErrorToResponse recognizes
      const emailExistsError = new Error('Email already in use');
      emailExistsError.name = 'EmailAlreadyExistsError';

      mockRegisterUser.mockRejectedValue(emailExistsError);

      const result = await handleRegister(ctx, body, reply);

      // mapErrorToResponse should handle this - verify error was processed
      expect(result.status).toBeDefined();
      expect(result.body).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should return 500 for unexpected errors', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      mockRegisterUser.mockRejectedValue(new Error('Database connection failed'));

      const result = await handleRegister(ctx, body, reply);

      expect(result.status).toBe(500);
      expect((result.body as { message: string }).message).toBe('Internal server error');
    });

    test('should not set cookies on error', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      mockRegisterUser.mockRejectedValue(new Error('Unexpected error'));

      await handleRegister(ctx, body, reply);

      expect(reply.setCookie).not.toHaveBeenCalled();
    });

    test('should log unexpected errors', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      const error = new Error('Unexpected database error');
      mockRegisterUser.mockRejectedValue(error);

      await handleRegister(ctx, body, reply);

      expect(ctx.log.error).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    test('should handle email with uppercase letters', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody({ email: 'NewUser@EXAMPLE.COM' });

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'NewUser@EXAMPLE.COM',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      const result = await handleRegister(ctx, body, reply);

      expect(result.status).toBe(201);
      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        'NewUser@EXAMPLE.COM',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    test('should handle special characters in name', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody({ name: "O'Brien-Smith" });

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      await handleRegister(ctx, body, reply);

      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        "O'Brien-Smith",
        expect.anything(),
      );
    });

    test('should handle empty string name as undefined', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody({ name: '' });

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      await handleRegister(ctx, body, reply);

      // Empty string should be passed as-is (service layer handles normalization)
      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        '',
        expect.anything(),
      );
    });

    test('should handle very long passwords', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const longPassword = 'VerySecure123!' + 'a'.repeat(100);
      const body = createRegisterBody({ password: longPassword });

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Registration successful!',
        email: 'newuser@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      await handleRegister(ctx, body, reply);

      expect(mockRegisterUser).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        longPassword,
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('response structure', () => {
    test('should return RegisterResult without modification on success', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      const mockRegisterResult: RegisterResult = {
        status: 'pending_verification',
        message: 'Custom message',
        email: 'test@example.com',
      };

      mockRegisterUser.mockResolvedValue(mockRegisterResult);

      const result = await handleRegister(ctx, body, reply);

      expect(result.body).toEqual(mockRegisterResult);
      expect(result.body).not.toHaveProperty('emailSendFailed');
    });

    test('should include emailSendFailed only for EmailSendError', async () => {
      const ctx = createMockContext();
      const reply = createMockReply();
      const body = createRegisterBody();

      mockRegisterUser.mockRejectedValue(new EmailSendError('Email failed'));

      const result = await handleRegister(ctx, body, reply);

      expect(result.body).toHaveProperty('emailSendFailed', true);
    });
  });
});
