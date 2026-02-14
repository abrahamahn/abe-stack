// main/server/core/src/auth/handlers/phone.test.ts
/**
 * Phone Management Handler Tests
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { handleRemovePhone, handleSetPhone, handleVerifyPhone } from './phone';

import type { SetPhoneRequest, VerifyPhoneRequest } from '../sms-2fa/types';
import type { AppContext, RequestWithCookies } from '../types';

// ============================================================================
// Mock Dependencies
// ============================================================================

const {
  mockCheckSmsRateLimit,
  mockSendSms2faCode,
  mockVerifySms2faCode,
  mockMapErrorToHttpResponse,
} = vi.hoisted(() => ({
  mockCheckSmsRateLimit: vi.fn(),
  mockSendSms2faCode: vi.fn(),
  mockVerifySms2faCode: vi.fn(),
  mockMapErrorToHttpResponse: vi.fn((error: unknown) => {
    if (error instanceof Error) {
      return { status: 500, body: { message: error.message } };
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

vi.mock('@abe-stack/shared', async (importOriginal) => {
  const original = await importOriginal<typeof import('@abe-stack/shared')>();
  return {
    ...original,
    mapErrorToHttpResponse: mockMapErrorToHttpResponse,
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(overrides?: Partial<AppContext>): AppContext {
  return {
    db: {
      raw: vi.fn().mockResolvedValue([]),
    } as unknown as AppContext['db'],
    repos: {
      users: {
        findById: vi.fn().mockResolvedValue({ lockedUntil: null, lockReason: null }),
      },
    } as unknown as AppContext['repos'],
    email: { send: vi.fn().mockResolvedValue({ success: true }) } as AppContext['email'],
    sms: { send: vi.fn().mockResolvedValue({ success: true }) },
    config: {
      auth: {
        jwt: { secret: 'test-secret-32-chars-long!!!!!!!!' },
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

function createAuthenticatedRequest(userId = 'user-123'): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'Test Browser' },
    user: { userId, email: 'test@example.com', role: 'user' },
  } as RequestWithCookies;
}

function createUnauthenticatedRequest(): RequestWithCookies {
  return {
    cookies: {},
    headers: { 'user-agent': 'Test Browser' },
    ip: '127.0.0.1',
    requestInfo: { ipAddress: '127.0.0.1', userAgent: 'Test Browser' },
  } as RequestWithCookies;
}

// ============================================================================
// Tests: handleSetPhone
// ============================================================================

describe('handleSetPhone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckSmsRateLimit.mockResolvedValue({ allowed: true });
    mockSendSms2faCode.mockResolvedValue({ success: true });
  });

  test('returns 200 when phone is set and code is sent', async () => {
    const ctx = createMockContext();
    const request = createAuthenticatedRequest();
    const body: SetPhoneRequest = { phone: '+15551234567' };

    const result = await handleSetPhone(ctx, body, request);

    expect(result.status).toBe(200);
    expect((result.body as { message: string }).message).toBe('Verification code sent');
  });

  test('returns 401 when not authenticated', async () => {
    const ctx = createMockContext();
    const request = createUnauthenticatedRequest();
    const body: SetPhoneRequest = { phone: '+15551234567' };

    const result = await handleSetPhone(ctx, body, request);

    expect(result.status).toBe(401);
  });

  test('returns 400 for invalid phone format', async () => {
    const ctx = createMockContext();
    const request = createAuthenticatedRequest();
    const body: SetPhoneRequest = { phone: 'not-a-phone' };

    const result = await handleSetPhone(ctx, body, request);

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toContain('Invalid phone');
  });

  test('returns 429 when rate limited', async () => {
    mockCheckSmsRateLimit.mockResolvedValue({ allowed: false, retryAfter: new Date() });
    const ctx = createMockContext();
    const request = createAuthenticatedRequest();
    const body: SetPhoneRequest = { phone: '+15551234567' };

    const result = await handleSetPhone(ctx, body, request);

    expect(result.status).toBe(429);
  });

  test('returns 500 when SMS sending fails', async () => {
    mockSendSms2faCode.mockResolvedValue({ success: false, error: 'Provider down' });
    const ctx = createMockContext();
    const request = createAuthenticatedRequest();
    const body: SetPhoneRequest = { phone: '+15551234567' };

    const result = await handleSetPhone(ctx, body, request);

    expect(result.status).toBe(500);
  });
});

// ============================================================================
// Tests: handleVerifyPhone
// ============================================================================

describe('handleVerifyPhone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifySms2faCode.mockResolvedValue({ valid: true, message: 'Code verified' });
  });

  test('returns 200 with verified=true on success', async () => {
    const ctx = createMockContext();
    vi.mocked(ctx.db.raw).mockResolvedValueOnce([{ phone: '+15551234567' }]);
    const request = createAuthenticatedRequest();
    const body: VerifyPhoneRequest = { code: '123456' };

    const result = await handleVerifyPhone(ctx, body, request);

    expect(result.status).toBe(200);
    expect((result.body as { verified: boolean }).verified).toBe(true);
  });

  test('returns 401 when not authenticated', async () => {
    const ctx = createMockContext();
    const request = createUnauthenticatedRequest();
    const body: VerifyPhoneRequest = { code: '123456' };

    const result = await handleVerifyPhone(ctx, body, request);

    expect(result.status).toBe(401);
  });

  test('returns 400 when code is invalid', async () => {
    mockVerifySms2faCode.mockResolvedValue({ valid: false, message: 'Invalid code' });
    const ctx = createMockContext();
    const request = createAuthenticatedRequest();
    const body: VerifyPhoneRequest = { code: '000000' };

    const result = await handleVerifyPhone(ctx, body, request);

    expect(result.status).toBe(400);
    expect((result.body as { message: string }).message).toBe('Invalid code');
  });

  test('updates user phone and phoneVerified on success', async () => {
    const ctx = createMockContext();
    vi.mocked(ctx.db.raw).mockResolvedValueOnce([{ phone: '+15551234567' }]);
    const request = createAuthenticatedRequest();
    const body: VerifyPhoneRequest = { code: '123456' };

    await handleVerifyPhone(ctx, body, request);

    // Should have called raw to update user record
    expect(ctx.db.raw).toHaveBeenCalledWith(expect.stringContaining('UPDATE users SET phone'), [
      '+15551234567',
      'user-123',
    ]);
  });
});

// ============================================================================
// Tests: handleRemovePhone
// ============================================================================

describe('handleRemovePhone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns 200 with success message', async () => {
    const ctx = createMockContext();
    const request = createAuthenticatedRequest();

    const result = await handleRemovePhone(ctx, request);

    expect(result.status).toBe(200);
    expect((result.body as { message: string }).message).toBe('Phone number removed');
  });

  test('returns 401 when not authenticated', async () => {
    const ctx = createMockContext();
    const request = createUnauthenticatedRequest();

    const result = await handleRemovePhone(ctx, request);

    expect(result.status).toBe(401);
  });

  test('clears phone and phoneVerified in database', async () => {
    const ctx = createMockContext();
    const request = createAuthenticatedRequest();

    await handleRemovePhone(ctx, request);

    expect(ctx.db.raw).toHaveBeenCalledWith(expect.stringContaining('phone = NULL'), ['user-123']);
  });
});
