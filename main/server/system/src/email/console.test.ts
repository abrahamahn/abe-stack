// main/server/system/src/email/console.test.ts
import { describe, expect, it } from 'vitest';

import { ConsoleEmailService } from './console';

describe('mailer/console', () => {
  it('logs email details and returns a dev message id', async () => {
    const logs: string[] = [];
    const service = new ConsoleEmailService((m) => logs.push(m));

    const res = await service.send({
      to: 'user@example.com',
      subject: 'Hello',
      text: 'Body',
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toMatch(/^dev-/);
    expect(logs.join('\n')).toContain('To:      user@example.com');
    expect(logs.join('\n')).toContain('Subject: Hello');
    expect(logs.join('\n')).toContain('Body');
  });
});
