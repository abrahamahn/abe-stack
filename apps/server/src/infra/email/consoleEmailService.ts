// apps/server/src/infra/email/consoleEmailService.ts
/**
 * Console Email Service (Development)
 *
 * Logs email content to console instead of sending.
 * Use this in development to see email output without SMTP.
 */

/* eslint-disable no-console */
import type { EmailOptions, EmailResult, EmailService } from '@email/types';

export class ConsoleEmailService implements EmailService {
  send(options: EmailOptions): Promise<EmailResult> {
    const messageId = `dev-${String(Date.now())}-${Math.random().toString(36).slice(2, 11)}`;

    console.log('\n📧 ═══════════════════════════════════════════════════════════');
    console.log('  EMAIL (Development Mode - Not Sent)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  To:      ${options.to}`);
    console.log(`  Subject: ${options.subject}`);
    console.log('───────────────────────────────────────────────────────────────');
    console.log(options.text);
    console.log('═══════════════════════════════════════════════════════════════\n');

    return Promise.resolve({
      success: true,
      messageId,
    });
  }
}
/* eslint-enable no-console */
