// main/server/system/src/mailer/smtp.test.ts
import { describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => {
  const ctor = vi.fn();
  const send = vi.fn((_message: unknown) =>
    Promise.resolve({ success: true as const, messageId: '<id@host>' }),
  );
  return { ctor, send };
});

vi.mock('./smtp.client', () => {
  return {
    SmtpClient: class {
      constructor(cfg: unknown) {
        hoisted.ctor(cfg);
      }
      send = hoisted.send;
    },
  };
});

import { SmtpEmailService } from './smtp';

describe('mailer/smtp', () => {
  it('builds SMTP message and forwards to SmtpClient', async () => {
    hoisted.ctor.mockClear();
    hoisted.send.mockClear();

    const service = new SmtpEmailService({
      provider: 'smtp',
      from: { address: 'noreply@example.com', name: 'Abe Stack' },
      replyTo: 'noreply@example.com',
      smtp: {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'u', pass: 'p' },
        connectionTimeout: 111,
        socketTimeout: 222,
      },
    });

    const res = await service.send({ to: 'user@example.com', subject: 'Sub', text: 'Body' });
    expect(res).toEqual({ success: true, messageId: '<id@host>' });

    expect(hoisted.ctor).toHaveBeenCalledTimes(1);
    const ctorCfg = hoisted.ctor.mock.calls[0]?.[0];
    expect(ctorCfg).toMatchObject({
      host: 'smtp.example.com',
      port: 587,
      auth: { user: 'u' },
    });

    expect(hoisted.send).toHaveBeenCalledTimes(1);
    const msg = hoisted.send.mock.calls[0]?.[0];
    expect(msg).toMatchObject({
      to: 'user@example.com',
      subject: 'Sub',
      text: 'Body',
    });
    expect(msg).toMatchObject({ from: expect.stringContaining('noreply@example.com') });
  });
});
