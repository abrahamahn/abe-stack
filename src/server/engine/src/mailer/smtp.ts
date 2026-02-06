// backend/engine/src/mailer/smtp.ts
/**
 * SMTP Email Service (Production)
 *
 * Uses manual SMTP client for sending emails. Replaces nodemailer.
 */

import { SmtpClient, type SmtpConfig as SmtpClientConfig, type SmtpMessage } from './smtp-client';

import type { EmailConfig } from '../config';
import type { EmailOptions, EmailResult, EmailService } from './types';

export class SmtpEmailService implements EmailService {
  private readonly client: SmtpClient;
  private readonly config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
    const smtpAuth = this.config.smtp.auth;
    const smtpConfig: SmtpClientConfig = {
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      connectionTimeout: this.config.smtp.connectionTimeout,
      socketTimeout: this.config.smtp.socketTimeout,
    };
    if (smtpAuth !== undefined) {
      smtpConfig.auth = { user: smtpAuth.user, pass: smtpAuth.pass };
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
