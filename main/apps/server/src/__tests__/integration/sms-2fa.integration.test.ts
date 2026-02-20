// main/apps/server/src/__tests__/integration/sms-2fa.integration.test.ts
/**
 * SMS 2FA Integration Tests
 *
 * Tests the complete SMS 2FA flows:
 *   1. Phone verification: send code -> verify code -> phone marked verified
 *   2. SMS 2FA login challenge: send challenge code -> verify -> authentication proceeds
 *   3. Rate limiting: excessive sends are rejected
 *   4. Attempt limiting: too many wrong codes locks out verification
 *   5. Expiry: expired codes are rejected
 */

import { createHash } from 'node:crypto';

import { checkSmsRateLimit } from '@bslt/core/auth/sms-2fa/rate-limit';
import {
  getSmsVerificationCode,
  sendSms2faCode,
  verifySms2faCode,
} from '@bslt/core/auth/sms-2fa/service';
import { SMS_MAX_ATTEMPTS } from '@bslt/core/auth/sms-2fa/types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { DbClient } from '@bslt/core/db';
import type { SmsProvider } from '@bslt/server-system';

// ============================================================================
// Test Helpers
// ============================================================================

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Create a mock DB client that tracks raw SQL calls.
 * Maintains an in-memory store for SMS verification codes.
 */
function createMockDb(): DbClient & { _calls: Array<{ sql: string; params: unknown[] }> } {
  const calls: Array<{ sql: string; params: unknown[] }> = [];

  return {
    _calls: calls,
    raw: vi.fn().mockImplementation((sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      return Promise.resolve([]);
    }),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
  } as unknown as DbClient & { _calls: Array<{ sql: string; params: unknown[] }> };
}

function createMockSmsProvider(success = true): SmsProvider {
  return {
    send: vi.fn().mockResolvedValue({
      success,
      messageId: success ? 'msg-test-123' : undefined,
      error: success ? undefined : 'SMS delivery failed',
    }),
  };
}

// ============================================================================
// Phone Verification Flow
// ============================================================================

describe('SMS 2FA Integration - Phone Verification Flow', () => {
  let db: ReturnType<typeof createMockDb>;
  let smsProvider: SmsProvider;

  beforeEach(() => {
    db = createMockDb();
    smsProvider = createMockSmsProvider();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('send code -> verify code (happy path)', () => {
    it('should send a code and verify it successfully', async () => {
      const userId = 'user-sms-1';
      const phone = '+15551234567';

      // Step 1: Send the verification code
      const sendResult = await sendSms2faCode(db, smsProvider, userId, phone);
      expect(sendResult.success).toBe(true);

      // Verify SMS was sent with a 6-digit code
      expect(smsProvider.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: phone,
          body: expect.stringMatching(/\d{6}/),
        }),
      );

      // Extract the code from the SMS body
      const sendCall = vi.mocked(smsProvider.send).mock.calls[0]!;
      const codeMatch = /(\d{6})/.exec(sendCall[0].body);
      expect(codeMatch).not.toBeNull();
      const code = codeMatch![1]!;

      // Step 2: Verify the code
      // Mock DB to return the stored code hash
      const storedHash = hashCode(code);
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'code-1',
          code_hash: storedHash,
          attempts: 0,
          expires_at: new Date(Date.now() + 300_000), // 5 min from now
        },
      ]);

      const verifyResult = await verifySms2faCode(db, userId, code);

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.message).toContain('verified');
    });

    it('should invalidate existing codes before creating a new one', async () => {
      const userId = 'user-sms-2';
      const phone = '+15559876543';

      await sendSms2faCode(db, smsProvider, userId, phone);

      // First raw call should UPDATE to invalidate existing codes
      const firstCall = db._calls[0];
      expect(firstCall).toBeDefined();
      expect(firstCall!.sql).toContain('UPDATE sms_verification_codes SET verified = true');
      expect(firstCall!.params).toEqual([userId]);

      // Second raw call should INSERT the new code
      const secondCall = db._calls[1];
      expect(secondCall).toBeDefined();
      expect(secondCall!.sql).toContain('INSERT INTO sms_verification_codes');
    });

    it('should store code as SHA-256 hash, not plaintext', async () => {
      await sendSms2faCode(db, smsProvider, 'user-sms-3', '+15551112222');

      // The INSERT call should contain a 64-char hex hash
      const insertCall = db._calls[1];
      expect(insertCall).toBeDefined();
      const insertParams = insertCall!.params as string[];
      // Third param is the code hash
      expect(insertParams[2]).toHaveLength(64);
      expect(insertParams[2]).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  // ==========================================================================
  // Failed Verification
  // ==========================================================================

  describe('failed verification scenarios', () => {
    it('should reject an incorrect code', async () => {
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'code-1',
          code_hash: hashCode('654321'),
          attempts: 0,
          expires_at: new Date(Date.now() + 300_000),
        },
      ]);

      const result = await verifySms2faCode(db, 'user-fail-1', '000000');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid code');
    });

    it('should show remaining attempts in error message', async () => {
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'code-1',
          code_hash: hashCode('654321'),
          attempts: 1, // 1 attempt already used
          expires_at: new Date(Date.now() + 300_000),
        },
      ]);

      const result = await verifySms2faCode(db, 'user-fail-2', '000000');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('attempt');
    });

    it('should reject when no pending code exists', async () => {
      vi.mocked(db.raw).mockResolvedValueOnce([]); // No codes found

      const result = await verifySms2faCode(db, 'user-fail-3', '123456');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('No pending verification code');
    });
  });

  // ==========================================================================
  // Attempt Limiting
  // ==========================================================================

  describe('attempt limiting', () => {
    it('should lock out verification after max attempts', async () => {
      // Simulate max attempts reached
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'code-locked',
          code_hash: hashCode('654321'),
          attempts: SMS_MAX_ATTEMPTS, // At max
          expires_at: new Date(Date.now() + 300_000),
        },
      ]);

      const result = await verifySms2faCode(db, 'user-lock-1', '654321');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Too many attempts');

      // Should mark code as consumed
      const rawCalls = vi.mocked(db.raw).mock.calls;
      const consumeCall = rawCalls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('SET verified = true') &&
          !call[0].includes('SET attempts'),
      );
      expect(consumeCall).toBeDefined();
    });

    it('should increment attempt counter on each failed verify', async () => {
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'code-attempt',
          code_hash: hashCode('654321'),
          attempts: 0,
          expires_at: new Date(Date.now() + 300_000),
        },
      ]);

      await verifySms2faCode(db, 'user-attempt-1', '000000');

      // Should have called UPDATE to increment attempts
      expect(db.raw).toHaveBeenCalledWith(expect.stringContaining('SET attempts = attempts + 1'), [
        'code-attempt',
      ]);
    });

    it('should mark code as verified on successful verification', async () => {
      const code = '123456';
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'code-success',
          code_hash: hashCode(code),
          attempts: 0,
          expires_at: new Date(Date.now() + 300_000),
        },
      ]);

      await verifySms2faCode(db, 'user-success-1', code);

      // Should call UPDATE to mark as verified (distinct from attempt increment)
      const rawCalls = vi.mocked(db.raw).mock.calls;
      const verifyCall = rawCalls.find(
        (call) =>
          typeof call[0] === 'string' &&
          call[0].includes('SET verified = true') &&
          !call[0].includes('SET attempts'),
      );
      expect(verifyCall).toBeDefined();
    });
  });

  // ==========================================================================
  // SMS Provider Failures
  // ==========================================================================

  describe('SMS provider failure handling', () => {
    it('should return error when SMS provider fails to send', async () => {
      const failingSmsProvider = createMockSmsProvider(false);

      const result = await sendSms2faCode(db, failingSmsProvider, 'user-fail-sms', '+15550000000');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS delivery failed');
    });

    it('should still store the code in DB even if SMS send fails', async () => {
      const failingSmsProvider = createMockSmsProvider(false);

      await sendSms2faCode(db, failingSmsProvider, 'user-fail-sms-2', '+15550000000');

      // INSERT should have been called before SMS send
      const insertCall = db._calls.find((c) => c.sql.includes('INSERT'));
      expect(insertCall).toBeDefined();
    });
  });

  // ==========================================================================
  // Pending Code Query
  // ==========================================================================

  describe('getSmsVerificationCode', () => {
    it('should return pending code details when one exists', async () => {
      const expiresAt = new Date(Date.now() + 300_000);
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'code-pending',
          phone: '+15551234567',
          expires_at: expiresAt,
          attempts: 1,
        },
      ]);

      const result = await getSmsVerificationCode(db, 'user-pending-1');

      expect(result).toEqual({
        id: 'code-pending',
        phone: '+15551234567',
        expiresAt,
        attempts: 1,
      });
    });

    it('should return null when no pending code exists', async () => {
      vi.mocked(db.raw).mockResolvedValueOnce([]);

      const result = await getSmsVerificationCode(db, 'user-no-code');

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // Rate Limiting
  // ==========================================================================

  describe('SMS rate limiting', () => {
    it('should allow sends within rate limit', async () => {
      // Mock: 0 codes sent in last hour
      vi.mocked(db.raw)
        .mockResolvedValueOnce([{ count: '0' }]) // hourly count
        .mockResolvedValueOnce([{ count: '0' }]); // daily count

      const result = await checkSmsRateLimit(db, 'user-rate-1');

      expect(result.allowed).toBe(true);
      expect(result.retryAfter).toBeUndefined();
    });

    it('should reject when hourly limit is exceeded', async () => {
      // Mock: 3+ codes sent in last hour
      vi.mocked(db.raw)
        .mockResolvedValueOnce([{ count: '10' }]) // hourly count exceeds limit
        .mockResolvedValueOnce([{ created_at: new Date(Date.now() - 30 * 60_000) }]); // oldest code

      const result = await checkSmsRateLimit(db, 'user-rate-2');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeInstanceOf(Date);
    });

    it('should reject when daily limit is exceeded', async () => {
      // Mock: hourly OK, but daily exceeded
      vi.mocked(db.raw)
        .mockResolvedValueOnce([{ count: '1' }]) // hourly count OK
        .mockResolvedValueOnce([{ count: '20' }]) // daily count exceeds limit
        .mockResolvedValueOnce([{ created_at: new Date(Date.now() - 12 * 60 * 60_000) }]); // oldest code

      const result = await checkSmsRateLimit(db, 'user-rate-3');

      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeInstanceOf(Date);
    });
  });

  // ==========================================================================
  // SMS 2FA Login Challenge Flow (End-to-End)
  // ==========================================================================

  describe('SMS 2FA login challenge flow', () => {
    it('should complete the full challenge flow: send -> verify -> success', async () => {
      const userId = 'user-challenge-1';
      const phone = '+15559999999';

      // Step 1: Send SMS challenge code
      const sendResult = await sendSms2faCode(db, smsProvider, userId, phone);
      expect(sendResult.success).toBe(true);

      // Extract the code from the SMS body
      const sendCall = vi.mocked(smsProvider.send).mock.calls[0]!;
      const codeMatch = /(\d{6})/.exec(sendCall[0].body);
      const code = codeMatch![1]!;

      // Step 2: Simulate correct verification
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'challenge-code-1',
          code_hash: hashCode(code),
          attempts: 0,
          expires_at: new Date(Date.now() + 300_000),
        },
      ]);

      const verifyResult = await verifySms2faCode(db, userId, code);

      expect(verifyResult.valid).toBe(true);
      expect(verifyResult.message).toContain('verified');
    });

    it('should reject verification with wrong code in challenge flow', async () => {
      const userId = 'user-challenge-2';
      const phone = '+15558888888';

      // Send code
      await sendSms2faCode(db, smsProvider, userId, phone);

      // Attempt verification with wrong code
      vi.mocked(db.raw).mockResolvedValueOnce([
        {
          id: 'challenge-code-2',
          code_hash: hashCode('999999'), // actual code
          attempts: 0,
          expires_at: new Date(Date.now() + 300_000),
        },
      ]);

      const result = await verifySms2faCode(db, userId, '111111'); // wrong code

      expect(result.valid).toBe(false);
      expect(result.message).toContain('Invalid code');
    });

    it('should reject verification for an expired challenge code', async () => {
      // Simulate expired code: no pending codes returned (expired codes are excluded)
      vi.mocked(db.raw).mockResolvedValueOnce([]); // WHERE expires_at > NOW() returns nothing

      const result = await verifySms2faCode(db, 'user-challenge-3', '123456');

      expect(result.valid).toBe(false);
      expect(result.message).toContain('No pending verification code');
    });
  });
});
