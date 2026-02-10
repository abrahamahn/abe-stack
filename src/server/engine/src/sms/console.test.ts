// src/server/engine/src/sms/console.test.ts
import { describe, expect, it, vi } from 'vitest';

import { ConsoleSmsProvider } from './console';

describe('ConsoleSmsProvider', () => {
  it('sends an SMS and returns success', async () => {
    const log = vi.fn();
    const provider = new ConsoleSmsProvider(log);

    const result = await provider.send({
      to: '+15551234567',
      body: 'Your code is 123456',
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^sms-dev-/);
  });

  it('logs the SMS details', async () => {
    const log = vi.fn();
    const provider = new ConsoleSmsProvider(log);

    await provider.send({
      to: '+15551234567',
      body: 'Your code is 123456',
    });

    expect(log).toHaveBeenCalledWith(expect.stringContaining('+15551234567'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Your code is 123456'));
  });

  it('works with default logger', async () => {
    const provider = new ConsoleSmsProvider();
    const writeSpy = vi.spyOn(process.stdout, 'write').mockReturnValue(true);

    const result = await provider.send({
      to: '+15559876543',
      body: 'Test message',
    });

    expect(result.success).toBe(true);
    expect(writeSpy).toHaveBeenCalled();
    writeSpy.mockRestore();
  });
});
