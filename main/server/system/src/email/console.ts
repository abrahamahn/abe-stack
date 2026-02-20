// main/server/system/src/email/console.ts
/**
 * Console Email Service (Development)
 *
 * Logs email content to console instead of sending.
 * Use this in development to see email output without SMTP.
 */

import { generateSecureId } from '@bslt/shared/primitives';

import type { EmailOptions, EmailResult, EmailService } from './types';

type LogFn = (message: string) => void;

// Default logger using stdout to avoid console in linted code
const defaultLog: LogFn = (message: string) => {
  process.stdout.write(`${message}\n`);
};

export class ConsoleEmailService implements EmailService {
  private readonly log: LogFn;

  constructor(log?: LogFn) {
    this.log = log ?? defaultLog;
  }

  healthCheck(): Promise<boolean> {
    return Promise.resolve(true);
  }

  send(options: EmailOptions): Promise<EmailResult> {
    const messageId = `dev-${String(Date.now())}-${generateSecureId(9)}`;

    this.log('\n📧 ═══════════════════════════════════════════════════════════');
    this.log('  EMAIL (Development Mode - Not Sent)');
    this.log('═══════════════════════════════════════════════════════════════');
    this.log(`  To:      ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    this.log(`  Subject: ${options.subject}`);
    this.log('───────────────────────────────────────────────────────────────');
    if (options.text !== undefined) {
      this.log(options.text);
    }
    this.log('═══════════════════════════════════════════════════════════════\n');

    return Promise.resolve({
      success: true,
      messageId,
    });
  }
}
