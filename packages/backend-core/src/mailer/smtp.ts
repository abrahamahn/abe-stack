// infra/src/email/providers/smtp-service.ts
/**
 * SMTP Email Service (Production)
 *
 * Uses manual SMTP client for sending emails. Replaces nodemailer.
 */

import { SmtpClient } from './smtp-client';

import type { SmtpConfig, SmtpMessage } from './smtp-index';
import type { EmailOptions, EmailResult, EmailService } from '../types';
import type { EmailConfig } from '@abe-stack/shared/config';

export class SmtpEmailService implements EmailService {
  private client: SmtpClient;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    const smtpConfig: SmtpConfig = {
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
    };
    if (this.config.smtp.auth != null) {
      smtpConfig.auth = {
        user: this.config.smtp.auth.user,
        pass: this.config.smtp.auth.pass,
      };
    }
    this.client = new SmtpClient(smtpConfig);
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    const message: SmtpMessage = {
      from: `"${this.config.from.name}" <${this.config.from.address}>`,
      to: options.to,
      subject: options.subject,
    };
    if (options.text !== undefined) {
      message.text = options.text;
    }
    if (options.html !== undefined) {
      message.html = options.html;
    }
    const result = await this.client.send(message);

    const emailResult: EmailResult = {
      success: result.success,
    };
    if (result.messageId !== undefined) {
      emailResult.messageId = result.messageId;
    }
    if (result.error !== undefined) {
      emailResult.error = result.error;
    }
    return emailResult;
  }
}
