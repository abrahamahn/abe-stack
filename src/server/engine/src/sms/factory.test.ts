// src/server/engine/src/sms/factory.test.ts
import { describe, expect, it } from 'vitest';

import { ConsoleSmsProvider } from './console';
import { createSmsProvider } from './factory';

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

  it('throws for twilio provider (not yet implemented)', () => {
    expect(() =>
      createSmsProvider({
        enabled: true,
        provider: 'twilio',
      }),
    ).toThrow('not yet implemented');
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
