// main/server/engine/src/mailer/smtp-client.test.ts
import { delay } from '@bslt/shared';
import { describe, expect, it, vi } from 'vitest';

import { SmtpClient } from './smtp-client';

// Mock the shared delay function used for retry backoff
vi.mock('@bslt/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bslt/shared')>();
  return {
    ...actual,
    delay: vi.fn(() => Promise.resolve(undefined)),
  };
});

const mockedDelay = vi.mocked(delay);

describe('mailer/smtp-client', () => {
  it('returns success when connect/auth/send/quit succeed', async () => {
    const client = new SmtpClient({ host: 'h', port: 587, secure: false });
    const anyClient = client as any;
    anyClient.connect = vi.fn(() => Promise.resolve(undefined));
    anyClient.authenticate = vi.fn(() => Promise.resolve(undefined));
    anyClient.sendMessage = vi.fn(() => Promise.resolve('<msg@h>'));
    anyClient.quit = vi.fn(() => Promise.resolve(undefined));

    const res = await client.send({ from: 'a@b.com', to: 'c@d.com', subject: 's', text: 't' });
    expect(res).toEqual({ success: true, messageId: '<msg@h>' });
    expect(anyClient.connect).toHaveBeenCalledTimes(1);
    expect(anyClient.authenticate).toHaveBeenCalledTimes(1);
    expect(anyClient.sendMessage).toHaveBeenCalledTimes(1);
    expect(anyClient.quit).toHaveBeenCalledTimes(1);
  });

  it('retries transient errors and succeeds on a later attempt', async () => {
    mockedDelay.mockClear();
    const client = new SmtpClient({ host: 'h', port: 587, secure: false });
    const anyClient = client as any;
    let attempt = 0;
    anyClient.connect = vi.fn(() => {
      attempt++;
      if (attempt < 3) return Promise.reject(new Error('Connection timeout'));
      return Promise.resolve(undefined);
    });
    anyClient.authenticate = vi.fn(() => Promise.resolve(undefined));
    anyClient.sendMessage = vi.fn(() => Promise.resolve('<msg@h>'));
    anyClient.quit = vi.fn(() => Promise.resolve(undefined));
    anyClient.cleanup = vi.fn(() => undefined);

    const res = await client.send({ from: 'a@b.com', to: 'c@d.com', subject: 's', text: 't' });
    expect(res.success).toBe(true);
    expect(anyClient.connect).toHaveBeenCalledTimes(3);
    expect(mockedDelay).toHaveBeenCalledTimes(2);
    expect(anyClient.cleanup).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-transient errors', async () => {
    mockedDelay.mockClear();
    const client = new SmtpClient({ host: 'h', port: 587, secure: false });
    const anyClient = client as any;
    anyClient.connect = vi.fn(() => Promise.reject(new Error('AUTH user failed: 535')));
    anyClient.cleanup = vi.fn(() => undefined);

    const res = await client.send({ from: 'a@b.com', to: 'c@d.com', subject: 's', text: 't' });
    expect(res.success).toBe(false);
    expect(anyClient.connect).toHaveBeenCalledTimes(1);
    expect(mockedDelay).not.toHaveBeenCalled();
  });
});
