// main/server/system/src/email/client.test.ts
import { EmailSendError } from '@bslt/shared';
import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const consoleSend = vi.fn(() =>
    Promise.resolve({ success: true as const, messageId: 'console' }),
  );
  const consoleHealthCheck = vi.fn(() => Promise.resolve(true));
  const smtpSend = vi.fn(() => Promise.resolve({ success: true as const, messageId: 'smtp' }));
  const smtpHealthCheck = vi.fn(() => Promise.resolve(true));
  const smtpCtor = vi.fn();
  return { consoleSend, consoleHealthCheck, smtpSend, smtpHealthCheck, smtpCtor };
});

vi.mock('./console', () => {
  return {
    ConsoleEmailService: class {
      send = hoisted.consoleSend;
      healthCheck = hoisted.consoleHealthCheck;
    },
  };
});

vi.mock('./smtp', () => {
  return {
    SmtpEmailService: class {
      constructor(cfg: unknown) {
        hoisted.smtpCtor(cfg);
      }
      send = hoisted.smtpSend;
      healthCheck = hoisted.smtpHealthCheck;
    },
  };
});

import { MailerClient } from './client';

describe('mailer/client', () => {
  it('uses ConsoleEmailService in development when SMTP_HOST is missing', async () => {
    hoisted.consoleSend.mockClear();
    hoisted.smtpCtor.mockClear();

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);
    const res = await client.send({ to: 'a@b.com', subject: 's', text: 't' });

    expect(res.success).toBe(true);
    expect(res.messageId).toBe('console');
    expect(hoisted.smtpCtor).not.toHaveBeenCalled();
  });

  it('uses SmtpEmailService when SMTP_HOST is provided', async () => {
    hoisted.smtpCtor.mockClear();
    hoisted.smtpSend.mockClear();

    const client = new MailerClient({
      NODE_ENV: 'production',
      SMTP_HOST: 'smtp.example.com',
      SMTP_PORT: 465,
      SMTP_USER: 'u',
      SMTP_PASS: 'p',
      EMAIL_FROM_ADDRESS: 'noreply@example.com',
    } as unknown as import('../config').FullEnv);

    const res = await client.send({ to: 'a@b.com', subject: 's', text: 't' });
    expect(res.success).toBe(true);
    expect(res.messageId).toBe('smtp');
    expect(hoisted.smtpCtor).toHaveBeenCalledTimes(1);

    const cfg = hoisted.smtpCtor.mock.calls[0]?.[0];
    expect(cfg).toMatchObject({
      provider: 'smtp',
      smtp: {
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'u' },
      },
    });
  });

  it('throws EmailSendError when the underlying service returns success=false', async () => {
    type R = Awaited<ReturnType<typeof hoisted.consoleSend>>;
    hoisted.consoleSend.mockResolvedValueOnce({
      success: false,
      error: 'SMTP connection refused',
    } as unknown as R);

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    await expect(client.send({ to: 'a@b.com', subject: 's', text: 't' })).rejects.toBeInstanceOf(
      EmailSendError,
    );
  });

  it('throws EmailSendError with the provider error message', async () => {
    type R = Awaited<ReturnType<typeof hoisted.consoleSend>>;
    hoisted.consoleSend.mockResolvedValueOnce({
      success: false,
      error: 'Mailbox full',
    } as unknown as R);

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    await expect(client.send({ to: 'a@b.com', subject: 's', text: 't' })).rejects.toThrow(
      'Mailbox full',
    );
  });

  it('throws EmailSendError with default message when error string is absent', async () => {
    type R = Awaited<ReturnType<typeof hoisted.consoleSend>>;
    hoisted.consoleSend.mockResolvedValueOnce({ success: false } as unknown as R);

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    await expect(client.send({ to: 'a@b.com', subject: 's', text: 't' })).rejects.toThrow(
      'Failed to send email',
    );
  });
});

// ============================================================================
// verifyOnBoot Tests
// ============================================================================

describe('verifyOnBoot', () => {
  it('returns ok: true when health check passes', async () => {
    hoisted.consoleHealthCheck.mockResolvedValueOnce(true);

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    const log = { info: vi.fn(), warn: vi.fn() };
    const result = await client.verifyOnBoot(log);

    expect(result.ok).toBe(true);
    expect(result.message).toBeUndefined();
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('SMTP health check passed'));
  });

  it('returns ok: false when health check returns false', async () => {
    hoisted.consoleHealthCheck.mockResolvedValueOnce(false);

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    const log = { info: vi.fn(), warn: vi.fn() };
    const result = await client.verifyOnBoot(log);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('SMTP health check failed');
    expect(log.warn).toHaveBeenCalled();
  });

  it('returns ok: false when health check throws an error', async () => {
    hoisted.consoleHealthCheck.mockRejectedValueOnce(new Error('Connection refused'));

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    const log = { info: vi.fn(), warn: vi.fn() };
    const result = await client.verifyOnBoot(log);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Connection refused');
    expect(log.warn).toHaveBeenCalled();
  });

  it('works without a logger (does not throw)', async () => {
    hoisted.consoleHealthCheck.mockResolvedValueOnce(true);

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    const result = await client.verifyOnBoot();

    expect(result.ok).toBe(true);
  });

  it('does NOT throw on failure — server can still start', async () => {
    hoisted.consoleHealthCheck.mockRejectedValueOnce(new Error('Network error'));

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    // Must not throw
    const result = await client.verifyOnBoot();

    expect(result.ok).toBe(false);
    expect(result.message).toBeDefined();
  });

  it('handles non-Error exceptions gracefully', async () => {
    hoisted.consoleHealthCheck.mockRejectedValueOnce('string error');

    const client = new MailerClient({
      NODE_ENV: 'development',
      SMTP_HOST: undefined,
    } as unknown as import('../config').FullEnv);

    const log = { info: vi.fn(), warn: vi.fn() };
    const result = await client.verifyOnBoot(log);

    expect(result.ok).toBe(false);
    expect(result.message).toContain('Unknown SMTP error');
  });
});
