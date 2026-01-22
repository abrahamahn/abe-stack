// apps/server/src/infrastructure/messaging/email/consoleEmailService.ts
/**
 * Console Email Service (Development)
 *
 * Logs email content to console instead of sending.
 * Use this in development to see email output without SMTP.
 */

import type { EmailOptions, EmailResult, EmailService } from '@email/types';

type LogFn = (message: string) => void;

// Default logger using console.log
const defaultLog: LogFn = (message: string) => {
  console.log(message);
};

export class ConsoleEmailService implements EmailService {
  private readonly log: LogFn;

  constructor(log?: LogFn) {
    this.log = log ?? defaultLog;
  }

  send(options: EmailOptions): Promise<EmailResult> {
    const messageId = `dev-${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`;

    this.log('\n📧 ═══════════════════════════════════════════════════════════');
    this.log('  EMAIL (Development Mode - Not Sent)');
    this.log('═══════════════════════════════════════════════════════════════');
    this.log(`  To:      ${options.to}`);
    this.log(`  Subject: ${options.subject}`);
    this.log('───────────────────────────────────────────────────────────────');
    this.log(options.text);
    this.log('═══════════════════════════════════════════════════════════════\n');

    return Promise.resolve({
      success: true,
      messageId,
    });
  }
}
