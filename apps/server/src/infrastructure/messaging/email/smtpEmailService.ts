// apps/server/src/infrastructure/messaging/email/smtpEmailService.ts
/**
 * SMTP Email Service (Production)
 *
 * Uses manual SMTP client for sending emails. Replaces nodemailer.
 */

import { SmtpClient } from './smtp';

import type { EmailConfig } from '@config';
import type { EmailOptions, EmailResult, EmailService } from '@email/types';

export class SmtpEmailService implements EmailService {
  private client: SmtpClient;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    this.client = new SmtpClient({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: this.config.smtp.auth
        ? {
            user: this.config.smtp.auth.user,
            pass: this.config.smtp.auth.pass,
          }
        : undefined,
    });
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const result = await this.client.send({
      from: `"${this.config.from.name}" <${this.config.from.address}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return {
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    };
  }
}
