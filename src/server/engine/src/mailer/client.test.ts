// src/server/engine/src/mailer/client.test.ts
import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const consoleSend = vi.fn(() =>
    Promise.resolve({ success: true as const, messageId: 'console' }),
  );
  const smtpSend = vi.fn(() => Promise.resolve({ success: true as const, messageId: 'smtp' }));
  const smtpCtor = vi.fn();
  return { consoleSend, smtpSend, smtpCtor };
});

vi.mock('./console', () => {
  return {
    ConsoleEmailService: class {
      send = hoisted.consoleSend;
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
    },
  };
});

import { MailerClient } from './client';

describe('mailer/client', () => {
  it('uses ConsoleEmailService in development when SMTP_HOST is missing', async () => {
    hoisted.consoleSend.mockClear();
    hoisted.smtpCtor.mockClear();

    const client = new MailerClient({ NODE_ENV: 'development', SMTP_HOST: undefined } as any);
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
    } as any);

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
});
