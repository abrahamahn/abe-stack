// main/server/system/src/mailer/smtp.index.test.ts
import { describe, expect, it } from 'vitest';

import { SmtpClient as Direct } from './smtp.client';
import { SmtpClient as FromIndex } from './smtp.index';

describe('mailer/smtp-index', () => {
  it('re-exports SmtpClient', () => {
    expect(FromIndex).toBe(Direct);
    expect(typeof FromIndex).toBe('function');
  });
});
