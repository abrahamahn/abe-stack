// main/server/core/src/auth/handlers/sms-challenge.test.ts
/**
 * SMS 2FA Challenge Handler Tests
 *
 * Tests for SMS challenge during login flow (send code and verify code).
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleSendSmsCode, handleVerifySmsCode } from './sms-challenge';

import type { SmsChallengeRequest, SmsVerifyRequest } from '../sms-2fa/types';
import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

const {
  mockCheckSmsRateLimit,
  mockSendSms2faCode,
  mockVerifySms2faCode,
  mockJwtVerify,
  mockCreateAccessToken,
  mockCreateAuthResponse,
  mockCreateRefreshTokenFamily,
  mockSetRefreshTokenCookie,
  mockWithTransaction,
  mockMapErrorToHttpResponse,
} = vi.hoisted(() => ({
  mockCheckSmsRateLimit: vi.fn(),
  mockSendSms2faCode: vi.fn(),
  mockVerifySms2faCode: vi.fn(),
  mockJwtVerify: vi.fn(),
  mockCreateAccessToken: vi.fn(),
  mockCreateAuthResponse: vi.fn(),
  mockCreateRefreshTokenFamily: vi.fn(),
  mockSetRefreshTokenCookie: vi.fn(),
  mockWithTransaction: vi.fn(),
  mockMapErrorToHttpResponse: vi.fn((error: unknown) => {
    if (error instanceof Error) {
      switch (error.name) {
        case 'InvalidTokenError':
          return { status: 401, body: { message: error.message } };
        default:
          return { status: 500, body: { message: 'Internal server error' } };
      }
    }
    return { status: 500, body: { message: 'Internal server error' } };
  }),
}));

vi.mock('../sms-2fa/rate-limit', () => ({
  checkSmsRateLimit: mockCheckSmsRateLimit,
}));

vi.mock('../sms-2fa/service', () => ({
  sendSms2faCode: mockSendSms2faCode,
  verifySms2faCode: mockVerifySms2faCode,
}));

vi.mock('../utils', () => ({
  createAccessToken: mockCreateAccessToken,
  createAuthResponse: mockCreateAuthResponse,
  createRefreshTokenFamily: mockCreateRefreshTokenFamily,
  setRefreshTokenCookie: mockSetRefreshTokenCookie,
}));

vi.mock('@abe-stack/server-engine', () => ({
  verify: mockJwtVerify,
  JwtError: class JwtError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JwtError';
    }
  },
}));

vi.mock('@abe-stack/db', () => ({
  withTransaction: mockWithTransaction,
}));

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToHttpResponse,
    InvalidTokenError: class InvalidTokenError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'InvalidTokenError';
      }
    },
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

const createdAt = new Date('2024-01-01T00:00:00.000Z').toISOString();

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: { raw: vi.fn().mockResolvedValue([]) } as unknown as AppContext['db'],
    repos: {
      users: {
        findById: vi.fn().mockResolvedValue({
          id: 'user-123',
          email: 'test@example.com',
          username: 'testuser',
          role: 'user',
          phone: '+15551234567',
          phoneVerified: true,
          lockedUntil: null,
          lockReason: null,
          createdAt,
          updatedAt: createdAt,
        }),
      },
    } as unknown as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    sms: { send: vi.fn().mockResolvedValue({ success: true }) },
    config: {
      auth: {
        jwt: { secret: 'test-secret-32-chars-long!!!!!!!!', accessTokenExpiry: '15m' },
        refreshToken: { expiryDays: 7 },
      },
      server: { appBaseUrl: 'http://localhost:8080' },
    },
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
    ...overrides,
  } as unknown as AppContext;
}

function createMockReply(): ReplyWithCookies {
  return { setCookie: vi.fn(), clearCookie: vi.fn() };
}

function createRequest(): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'Test Browser' },
  } as RequestWithCookies;
}

// ============================================================================
// Tests: handleSendSmsCode
// ============================================================================

describe('handleSendSmsCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckSmsRateLimit.mockResolvedValue({ allowed: true });
    mockSendSms2faCode.mockResolvedValue({ success: true });
  });

  test('sends SMS code on valid challenge token', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const body: SmsChallengeRequest = { challengeToken: 'valid-token' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'user-123' });

    const result = await handleSendSmsCode(ctx, body, request);

    expect(result.status).toBe(200);
    expect((result.body as { message: string }).message).toBe('Verification code sent');
    expect(mockSendSms2faCode).toHaveBeenCalled();
  });

  test('returns 401 when challenge token is invalid', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const body: SmsChallengeRequest = { challengeToken: 'invalid-token' };

    const JwtError = vi.mocked(await import('../../../../engine/src'))
      .JwtError as unknown as new (message: string) => Error;
    mockJwtVerify.mockImplementation(() => {
      throw new JwtError('Invalid JWT');
    });

    const result = await handleSendSmsCode(ctx, body, request);

    expect(result.status).toBe(401);
  });

  test('returns 401 when challenge token has wrong purpose', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const body: SmsChallengeRequest = { challengeToken: 'wrong-purpose-token' };

    mockJwtVerify.mockReturnValue({ purpose: 'password_reset', userId: 'user-123' });

    const result = await handleSendSmsCode(ctx, body, request);

    expect(result.status).toBe(401);
  });

  test('returns 400 when user has no verified phone', async () => {
    const ctx = createMockContext({
      repos: {
        users: {
          findById: vi.fn().mockResolvedValue({
            id: 'user-123',
            phone: null,
            phoneVerified: null,
            lockedUntil: null,
            lockReason: null,
          }),
        },
      } as unknown as AppContext['repos'],
    });
    const request = createRequest();
    const body: SmsChallengeRequest = { challengeToken: 'valid-token' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'user-123' });

    const result = await handleSendSmsCode(ctx, body, request);

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('No verified phone');
  });

  test('returns 429 when rate limited', async () => {
    mockCheckSmsRateLimit.mockResolvedValue({ allowed: false, retryAfter: new Date() });
    const ctx = createMockContext();
    const request = createRequest();
    const body: SmsChallengeRequest = { challengeToken: 'valid-token' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'user-123' });

    const result = await handleSendSmsCode(ctx, body, request);

    expect(result.status).toBe(429);
  });

  test('accepts totp_challenge purpose for backward compatibility', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const body: SmsChallengeRequest = { challengeToken: 'totp-challenge-token' };

    mockJwtVerify.mockReturnValue({ purpose: 'totp_challenge', userId: 'user-123' });

    const result = await handleSendSmsCode(ctx, body, request);

    expect(result.status).toBe(200);
  });
});

// ============================================================================
// Tests: handleVerifySmsCode
// ============================================================================

describe('handleVerifySmsCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySms2faCode.mockResolvedValue({ valid: true, message: 'Verified' });
  });

  test('returns 200 with auth tokens when SMS code is valid', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const reply = createMockReply();
    const body: SmsVerifyRequest = { challengeToken: 'valid-token', code: '123456' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'user-123' });

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      role: 'user',
      phone: '+15551234567',
      phoneVerified: true,
    };

    vi.mocked(ctx.repos.users.findById).mockResolvedValue(mockUser as never);
    mockWithTransaction.mockImplementation((_, callback) => Promise.resolve(callback({} as never)));
    mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token-123' });
    mockCreateAccessToken.mockReturnValue('access-token-123');
    mockCreateAuthResponse.mockReturnValue({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      user: mockUser,
    });

    const result = await handleVerifySmsCode(ctx, body, request, reply);

    expect(result.status).toBe(200);
    expect((result.body as { token: string }).token).toBe('access-token-123');
  });

  test('returns 401 when SMS code is invalid', async () => {
    mockVerifySms2faCode.mockResolvedValue({ valid: false, message: 'Invalid code' });
    const ctx = createMockContext();
    const request = createRequest();
    const reply = createMockReply();
    const body: SmsVerifyRequest = { challengeToken: 'valid-token', code: '000000' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'user-123' });

    const result = await handleVerifySmsCode(ctx, body, request, reply);

    expect(result.status).toBe(401);
    expect((result.body as { message: string }).message).toBe('Invalid code');
  });

  test('returns 401 when challenge token is invalid', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const reply = createMockReply();
    const body: SmsVerifyRequest = { challengeToken: 'invalid-token', code: '123456' };

    const JwtError = vi.mocked(await import('../../../../engine/src'))
      .JwtError as unknown as new (message: string) => Error;
    mockJwtVerify.mockImplementation(() => {
      throw new JwtError('Invalid JWT');
    });

    const result = await handleVerifySmsCode(ctx, body, request, reply);

    expect(result.status).toBe(401);
  });

  test('returns 401 when user not found', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const reply = createMockReply();
    const body: SmsVerifyRequest = { challengeToken: 'valid-token', code: '123456' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'nonexistent' });
    vi.mocked(ctx.repos.users.findById).mockResolvedValue(null);

    const result = await handleVerifySmsCode(ctx, body, request, reply);

    expect(result.status).toBe(401);
  });

  test('sets refresh token cookie on success', async () => {
    const ctx = createMockContext();
    const request = createRequest();
    const reply = createMockReply();
    const body: SmsVerifyRequest = { challengeToken: 'valid-token', code: '123456' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'user-123' });
    vi.mocked(ctx.repos.users.findById).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      role: 'user',
    } as never);
    mockWithTransaction.mockImplementation((_, callback) => Promise.resolve(callback({} as never)));
    mockCreateRefreshTokenFamily.mockResolvedValue({ token: 'refresh-token' });
    mockCreateAccessToken.mockReturnValue('access-token');
    mockCreateAuthResponse.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      user: {},
    });

    await handleVerifySmsCode(ctx, body, request, reply);

    expect(mockSetRefreshTokenCookie).toHaveBeenCalledWith(reply, 'refresh-token', ctx.config.auth);
  });

  test('does not create tokens when SMS code is invalid', async () => {
    mockVerifySms2faCode.mockResolvedValue({ valid: false, message: 'Invalid code' });
    const ctx = createMockContext();
    const request = createRequest();
    const reply = createMockReply();
    const body: SmsVerifyRequest = { challengeToken: 'valid-token', code: '000000' };

    mockJwtVerify.mockReturnValue({ purpose: 'sms_challenge', userId: 'user-123' });

    await handleVerifySmsCode(ctx, body, request, reply);

    expect(mockCreateAccessToken).not.toHaveBeenCalled();
    expect(mockCreateRefreshTokenFamily).not.toHaveBeenCalled();
    expect(mockSetRefreshTokenCookie).not.toHaveBeenCalled();
  });
});
