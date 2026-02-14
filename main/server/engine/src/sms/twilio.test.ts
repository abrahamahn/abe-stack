// main/server/engine/src/sms/twilio.test.ts
import { describe, expect, it, vi } from 'vitest';

import { TwilioSmsProvider } from './twilio';

import type { TwilioConfig } from './twilio';

// ============================================================================
// Test Helpers
// ============================================================================

const TEST_TWILIO_ACCOUNT_SID =
  process.env['TEST_TWILIO_ACCOUNT_SID'] ?? 'AC_TEST_ACCOUNT_SID_PLACEHOLDER';
const TEST_TWILIO_AUTH_TOKEN =
  process.env['TEST_TWILIO_AUTH_TOKEN'] ?? 'test-auth-token-placeholder';
const TEST_TWILIO_FROM_NUMBER = process.env['TEST_TWILIO_FROM_NUMBER'] ?? '+15551234567';

function createConfig(overrides?: Partial<TwilioConfig>): TwilioConfig {
  return {
    accountSid: TEST_TWILIO_ACCOUNT_SID,
    authToken: TEST_TWILIO_AUTH_TOKEN,
    fromNumber: TEST_TWILIO_FROM_NUMBER,
    ...overrides,
  };
}

function createMockFetch(
  status: number,
  body: Record<string, unknown>,
  ok?: boolean,
): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: ok ?? (status >= 200 && status < 300),
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  }) as unknown as typeof fetch;
}

// ============================================================================
// Tests
// ============================================================================

describe('TwilioSmsProvider', () => {
  describe('constructor validation', () => {
    it('throws when accountSid is empty', () => {
      expect(() => new TwilioSmsProvider(createConfig({ accountSid: '' }))).toThrow(
        'Twilio accountSid is required',
      );
    });

    it('throws when authToken is empty', () => {
      expect(() => new TwilioSmsProvider(createConfig({ authToken: '' }))).toThrow(
        'Twilio authToken is required',
      );
    });

    it('throws when fromNumber is empty', () => {
      expect(() => new TwilioSmsProvider(createConfig({ fromNumber: '' }))).toThrow(
        'Twilio fromNumber is required',
      );
    });

    it('creates provider with valid config', () => {
      const provider = new TwilioSmsProvider(createConfig());
      expect(provider).toBeDefined();
    });
  });

  describe('send', () => {
    it('sends SMS successfully and returns message ID', async () => {
      const mockFetch = createMockFetch(201, {
        sid: 'SM1234567890',
        status: 'queued',
        error_code: null,
        error_message: null,
      });

      const provider = new TwilioSmsProvider(createConfig(), mockFetch);
      const result = await provider.send({
        to: '+15559876543',
        body: 'Your code is 123456',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('SM1234567890');
    });

    it('calls Twilio API with correct URL and auth header', async () => {
      const config = createConfig();
      const mockFetch = createMockFetch(201, {
        sid: 'SM1234',
        status: 'queued',
        error_code: null,
        error_message: null,
      });

      const provider = new TwilioSmsProvider(config, mockFetch);
      await provider.send({ to: '+15559876543', body: 'Test' });

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
          }),
        }),
      );

      // Verify Basic auth header
      const callArgs = vi.mocked(mockFetch).mock.calls[0];
      expect(callArgs).toBeDefined();
      const headers = (callArgs![1] as RequestInit).headers as Record<string, string>;
      const expectedCredentials = Buffer.from(`${config.accountSid}:${config.authToken}`).toString(
        'base64',
      );
      expect(headers['Authorization']).toBe(`Basic ${expectedCredentials}`);
    });

    it('sends correct form body parameters', async () => {
      const config = createConfig();
      const mockFetch = createMockFetch(201, {
        sid: 'SM5678',
        status: 'queued',
        error_code: null,
        error_message: null,
      });

      const provider = new TwilioSmsProvider(config, mockFetch);
      await provider.send({ to: '+15559876543', body: 'Code: 654321' });

      const callArgs = vi.mocked(mockFetch).mock.calls[0];
      expect(callArgs).toBeDefined();
      const body = (callArgs![1] as RequestInit).body as string;
      const params = new URLSearchParams(body);

      expect(params.get('To')).toBe('+15559876543');
      expect(params.get('From')).toBe(config.fromNumber);
      expect(params.get('Body')).toBe('Code: 654321');
    });

    it('returns failure when HTTP status is not ok', async () => {
      const mockFetch = createMockFetch(400, { message: 'Invalid phone number' }, false);

      const provider = new TwilioSmsProvider(createConfig(), mockFetch);
      const result = await provider.send({
        to: 'invalid',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Twilio API error (400)');
    });

    it('returns failure when Twilio returns error_code', async () => {
      const mockFetch = createMockFetch(201, {
        sid: 'SM9999',
        status: 'failed',
        error_code: 21211,
        error_message: 'Invalid phone number',
      });

      const provider = new TwilioSmsProvider(createConfig(), mockFetch);
      const result = await provider.send({
        to: '+15559876543',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('21211');
      expect(result.error).toContain('Invalid phone number');
    });

    it('handles network errors gracefully', async () => {
      const mockFetch = vi
        .fn()
        .mockRejectedValue(new Error('Network timeout')) as unknown as typeof fetch;

      const provider = new TwilioSmsProvider(createConfig(), mockFetch);
      const result = await provider.send({
        to: '+15559876543',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network timeout');
    });

    it('handles non-Error thrown values', async () => {
      const mockFetch = vi.fn().mockRejectedValue('string error') as unknown as typeof fetch;

      const provider = new TwilioSmsProvider(createConfig(), mockFetch);
      const result = await provider.send({
        to: '+15559876543',
        body: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error sending SMS');
    });
  });
});
