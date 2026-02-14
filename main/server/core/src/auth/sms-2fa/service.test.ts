// main/server/core/src/auth/sms-2fa/service.test.ts
/**
 * SMS 2FA Service Tests
 */

import { createHash } from 'node:crypto';

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { getSmsVerificationCode, sendSms2faCode, verifySms2faCode } from './service';

import type { DbClient } from '../../../../db/src';
import type { SmsProvider } from '../../../../engine/src';

// ============================================================================
// Test Helpers
// ============================================================================

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function createMockDb(): DbClient {
  return {
    raw: vi.fn().mockResolvedValue([]),
  } as unknown as DbClient;
}

function createMockSmsProvider(success = true): SmsProvider {
  return {
    send: vi.fn().mockResolvedValue({
      success,
      messageId: success ? 'msg-123' : undefined,
      error: success ? undefined : 'Provider error',
    }),
  };
}

// ============================================================================
// Tests: sendSms2faCode
// ============================================================================

describe('sendSms2faCode', () => {
  let db: DbClient;
  let smsProvider: SmsProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
    smsProvider = createMockSmsProvider();
  });

  test('sends a 6-digit code to the phone number', async () => {
    const result = await sendSms2faCode(db, smsProvider, 'user-1', '+15551234567');

    expect(result.success).toBe(true);
    expect(smsProvider.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '+15551234567',
        body: expect.stringContaining('verification code'),
      }),
    );

    // Verify code in SMS body is 6 digits
    const sendCall = vi.mocked(smsProvider.send).mock.calls[0];
    expect(sendCall).toBeDefined();
    const codeMatch = /(\d{6})/.exec(sendCall![0].body);
    expect(codeMatch).not.toBeNull();
    expect(codeMatch?.[1]).toHaveLength(6);
  });

  test('invalidates existing pending codes before creating new one', async () => {
    await sendSms2faCode(db, smsProvider, 'user-1', '+15551234567');

    const rawMock = vi.mocked(db.raw);
    // First call should be UPDATE to invalidate existing codes
    const firstCall = rawMock.mock.calls[0];
    expect(firstCall).toBeDefined();
    expect(firstCall![0]).toContain('UPDATE sms_verification_codes SET verified = true');
    expect(firstCall![1]).toEqual(['user-1']);
  });

  test('stores hashed code in the database', async () => {
    await sendSms2faCode(db, smsProvider, 'user-1', '+15551234567');

    const rawMock = vi.mocked(db.raw);
    // Second call should be INSERT
    const insertCall = rawMock.mock.calls[1];
    expect(insertCall).toBeDefined();
    expect(insertCall![0]).toContain('INSERT INTO sms_verification_codes');
    const insertArgs = insertCall![1] as string[];
    expect(insertArgs[0]).toBe('user-1');
    expect(insertArgs[1]).toBe('+15551234567');
    // Code should be a SHA-256 hash (64 hex chars)
    expect(insertArgs[2]).toHaveLength(64);
  });

  test('returns error when SMS provider fails', async () => {
    smsProvider = createMockSmsProvider(false);

    const result = await sendSms2faCode(db, smsProvider, 'user-1', '+15551234567');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Provider error');
  });
});

// ============================================================================
// Tests: verifySms2faCode
// ============================================================================

describe('verifySms2faCode', () => {
  let db: DbClient;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  test('returns valid=true for correct code', async () => {
    const code = '123456';
    vi.mocked(db.raw).mockResolvedValueOnce([
      {
        id: 'code-1',
        code: hashCode(code),
        attempts: 0,
        expires_at: new Date(Date.now() + 300000),
      },
    ]);

    const result = await verifySms2faCode(db, 'user-1', code);

    expect(result.valid).toBe(true);
    expect(result.message).toContain('verified');
  });

  test('returns valid=false for incorrect code', async () => {
    vi.mocked(db.raw).mockResolvedValueOnce([
      {
        id: 'code-1',
        code: hashCode('654321'),
        attempts: 0,
        expires_at: new Date(Date.now() + 300000),
      },
    ]);

    const result = await verifySms2faCode(db, 'user-1', '000000');

    expect(result.valid).toBe(false);
    expect(result.message).toContain('Invalid code');
  });

  test('shows remaining attempts in error message', async () => {
    vi.mocked(db.raw).mockResolvedValueOnce([
      {
        id: 'code-1',
        code: hashCode('654321'),
        attempts: 1,
        expires_at: new Date(Date.now() + 300000),
      },
    ]);

    const result = await verifySms2faCode(db, 'user-1', '000000');

    expect(result.valid).toBe(false);
    expect(result.message).toContain('1 attempt remaining');
  });

  test('returns error when no pending code exists', async () => {
    vi.mocked(db.raw).mockResolvedValueOnce([]);

    const result = await verifySms2faCode(db, 'user-1', '123456');

    expect(result.valid).toBe(false);
    expect(result.message).toContain('No pending verification code');
  });

  test('returns error when max attempts exceeded', async () => {
    vi.mocked(db.raw).mockResolvedValueOnce([
      {
        id: 'code-1',
        code: hashCode('654321'),
        attempts: 3,
        expires_at: new Date(Date.now() + 300000),
      },
    ]);

    const result = await verifySms2faCode(db, 'user-1', '654321');

    expect(result.valid).toBe(false);
    expect(result.message).toContain('Too many attempts');
    // Should mark code as consumed
    expect(db.raw).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE sms_verification_codes SET verified = true'),
      ['code-1'],
    );
  });

  test('increments attempt counter on each verify call', async () => {
    vi.mocked(db.raw).mockResolvedValueOnce([
      {
        id: 'code-1',
        code: hashCode('654321'),
        attempts: 0,
        expires_at: new Date(Date.now() + 300000),
      },
    ]);

    await verifySms2faCode(db, 'user-1', '000000');

    expect(db.raw).toHaveBeenCalledWith(expect.stringContaining('SET attempts = attempts + 1'), [
      'code-1',
    ]);
  });

  test('marks code as verified on successful verification', async () => {
    const code = '123456';
    vi.mocked(db.raw).mockResolvedValueOnce([
      {
        id: 'code-1',
        code: hashCode(code),
        attempts: 0,
        expires_at: new Date(Date.now() + 300000),
      },
    ]);

    await verifySms2faCode(db, 'user-1', code);

    // Should have called UPDATE to increment attempts and then UPDATE to mark verified
    const rawCalls = vi.mocked(db.raw).mock.calls;
    const verifiedCall = rawCalls.find(
      (call) =>
        typeof call[0] === 'string' &&
        call[0].includes('SET verified = true') &&
        !call[0].includes('SET attempts'),
    );
    expect(verifiedCall).toBeDefined();
  });
});

// ============================================================================
// Tests: getSmsVerificationCode
// ============================================================================

describe('getSmsVerificationCode', () => {
  let db: DbClient;

  beforeEach(() => {
    vi.clearAllMocks();
    db = createMockDb();
  });

  test('returns pending code when one exists', async () => {
    const expiresAt = new Date(Date.now() + 300000);
    vi.mocked(db.raw).mockResolvedValueOnce([
      {
        id: 'code-1',
        phone: '+15551234567',
        expires_at: expiresAt,
        attempts: 1,
      },
    ]);

    const result = await getSmsVerificationCode(db, 'user-1');

    expect(result).toEqual({
      id: 'code-1',
      phone: '+15551234567',
      expiresAt,
      attempts: 1,
    });
  });

  test('returns null when no pending code exists', async () => {
    vi.mocked(db.raw).mockResolvedValueOnce([]);

    const result = await getSmsVerificationCode(db, 'user-1');

    expect(result).toBeNull();
  });
});
