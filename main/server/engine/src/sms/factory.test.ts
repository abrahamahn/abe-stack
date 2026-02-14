// main/server/engine/src/sms/factory.test.ts
import { describe, expect, it } from 'vitest';

import { ConsoleSmsProvider } from './console';
import { createSmsProvider } from './factory';
import { TwilioSmsProvider } from './twilio';

const TEST_TWILIO_ACCOUNT_SID =
  process.env['TEST_TWILIO_ACCOUNT_SID'] ?? 'AC_TEST_ACCOUNT_SID_PLACEHOLDER';
const TEST_TWILIO_AUTH_TOKEN =
  process.env['TEST_TWILIO_AUTH_TOKEN'] ?? 'test-auth-token-placeholder';
const TEST_TWILIO_FROM_NUMBER = process.env['TEST_TWILIO_FROM_NUMBER'] ?? '+15551234567';

describe('createSmsProvider', () => {
  it('returns ConsoleSmsProvider when provider is console', () => {
    const provider = createSmsProvider({
      enabled: true,
      provider: 'console',
    });

    expect(provider).toBeInstanceOf(ConsoleSmsProvider);
  });

  it('returns ConsoleSmsProvider when SMS is disabled', () => {
    const provider = createSmsProvider({
      enabled: false,
      provider: 'twilio',
    });

    expect(provider).toBeInstanceOf(ConsoleSmsProvider);
  });

  it('returns TwilioSmsProvider when provider is twilio and config is provided', () => {
    const provider = createSmsProvider(
      { enabled: true, provider: 'twilio' },
      {
        accountSid: TEST_TWILIO_ACCOUNT_SID,
        authToken: TEST_TWILIO_AUTH_TOKEN,
        fromNumber: TEST_TWILIO_FROM_NUMBER,
      },
    );

    expect(provider).toBeInstanceOf(TwilioSmsProvider);
  });

  it('throws for twilio provider when no config is provided', () => {
    expect(() =>
      createSmsProvider({
        enabled: true,
        provider: 'twilio',
      }),
    ).toThrow('Twilio configuration');
  });

  it('throws for aws-sns provider (not yet implemented)', () => {
    expect(() =>
      createSmsProvider({
        enabled: true,
        provider: 'aws-sns',
      }),
    ).toThrow('not yet implemented');
  });
});
