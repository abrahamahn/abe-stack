// apps/server/src/infra/email/smtpEmailService.ts
/**
 * SMTP Email Service (Production)
 *
 * Uses nodemailer for sending emails via SMTP.
 */

import type { EmailOptions, EmailResult, EmailService } from './types';
import type { EmailConfig } from '../../config';

export class SmtpEmailService implements EmailService {
  private transporter: unknown = null;
  private initialized = false;
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  private async initTransporter(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const nodemailer = await import('nodemailer');

      this.transporter = nodemailer.createTransport({
        host: this.config.smtp.host,
        port: this.config.smtp.port,
        secure: this.config.smtp.secure,
        auth: {
          user: this.config.smtp.auth.user,
          pass: this.config.smtp.auth.pass,
        },
      });
    } catch {
      /* eslint-disable no-console */
      console.warn('Nodemailer not installed. Email sending will fail.');
      /* eslint-enable no-console */
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    await this.initTransporter();

    if (!this.transporter) {
      return {
        success: false,
        error: 'Email transporter not configured',
      };
    }

    try {
      /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
      const info = await (this.transporter as any).sendMail({
        from: `"${this.config.from.name}" <${this.config.from.address}>`,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
      /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
