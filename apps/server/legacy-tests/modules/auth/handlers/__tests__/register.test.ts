// apps/server/src/modules/auth/handlers/__tests__/register.test.ts
import { EmailAlreadyExistsError, WeakPasswordError, ERROR_MESSAGES } from '@shared';
import { registerUser } from '@auth/service';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleRegister } from '../register';

import type { RegisterRequest } from '@abe-stack/core';
import type { AppContext, ReplyWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

vi.mock('@auth/service', () => ({
  registerUser: vi.fn(),
}));

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {} as AppContext['db'],
    repos: {} as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    : {
      auth: {
        jwt: {
          secret: 'test-secret-32-characters-long!!',
          accessTokenExpiry: '15m',
        },
        argon2: {},
        refreshToken: {
          expiryDays: 7,
        },
        cookie: {
          name: 'refreshToken',
          secret: 'test-secret',
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    } as AppContext[''],
    log: {
      error: vi.fn(),
    } as unknown as AppContext['log'],
    pubsub: {} as AppContext['pubsub'],
    ...overrides,
  } as unknown as AppContext;
}

function createMockReply(): ReplyWithCookies {
  return {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
  };
}

// ============================================================================
// Tests: handleRegister
// ============================================================================

describe('handleRegister', () => {
  const mockCtx = createMockContext();
  const mockReply = createMockReply();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return 201 with pending verification on successful registration', async () => {
    const body: RegisterRequest = {
      email: 'test@example.com',
      password: 'StrongPass123!',
      name: 'Test User',
    };

    const mockResult = {
      status: 'pending_verification' as const,
      message: 'Please check your email to verify your account.',
      email: 'test@example.com',
    };

    vi.mocked(registerUser).mockResolvedValue(mockResult);

    const result = await handleRegister(mockCtx, body, mockReply);

    expect(result.status).toBe(201);
    expect(result.body).toEqual(mockResult);
    // No cookies set - user must verify email first
    expect(mockReply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 409 when email already exists', async () => {
    const body: RegisterRequest = {
      email: 'existing@example.com',
      password: 'StrongPass123!',
    };

    vi.mocked(registerUser).mockRejectedValue(
      new EmailAlreadyExistsError('Email already registered'),
    );

    const result = await handleRegister(mockCtx, body, mockReply);

    expect(result.status).toBe(409);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.EMAIL_ALREADY_REGISTERED });
    expect(mockReply.setCookie).not.toHaveBeenCalled();
  });

  test('should return 400 when password is too weak', async () => {
    const body: RegisterRequest = {
      email: 'test@example.com',
      password: 'weak',
    };

    vi.mocked(registerUser).mockRejectedValue(
      new WeakPasswordError({ errors: ['Password too short'] }),
    );

    const result = await handleRegister(mockCtx, body, mockReply);

    expect(result.status).toBe(400);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.WEAK_PASSWORD });
  });

  test('should return 500 on unexpected errors', async () => {
    const body: RegisterRequest = {
      email: 'test@example.com',
      password: 'StrongPass123!',
    };

    vi.mocked(registerUser).mockRejectedValue(new Error('Database connection failed'));

    const result = await handleRegister(mockCtx, body, mockReply);

    expect(result.status).toBe(500);
    expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    expect(mockCtx.log.error).toHaveBeenCalled();
  });
});
