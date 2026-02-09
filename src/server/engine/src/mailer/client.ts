// src/server/engine/src/mailer/client.ts
import { ConsoleEmailService } from './console';
import { SmtpEmailService } from './smtp';

import type { EmailConfig, FullEnv } from '../config';
import type { EmailOptions, EmailResult, EmailService } from './types';

export class MailerClient implements EmailService {
  private readonly service: EmailService;

  constructor(config: FullEnv) {
    const smtpHost: string | undefined = config.SMTP_HOST;
    const isDevWithoutSmtp =
      config.NODE_ENV === 'development' && (smtpHost === undefined || smtpHost === '');

    if (isDevWithoutSmtp) {
      this.service = new ConsoleEmailService();
    } else {
      // Basic SMTP check
      if (smtpHost !== undefined && smtpHost !== '') {
        const smtpPort: number = config.SMTP_PORT ?? 587;
        const smtpUser: string | undefined = config.SMTP_USER;
        const smtpPass: string = config.SMTP_PASS ?? '';
        const fromEmail: string = config.EMAIL_FROM_ADDRESS ?? 'noreply@example.com';

        const smtpOptions: EmailConfig['smtp'] = {
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          connectionTimeout: 30000,
          socketTimeout: 60000,
        };
        if (smtpUser !== undefined && smtpUser !== '') {
          smtpOptions.auth = { user: smtpUser, pass: smtpPass };
        }

        const emailConfig: EmailConfig = {
          provider: 'smtp',
          smtp: smtpOptions,
          from: {
            address: fromEmail,
            name: 'Abe Stack',
          },
          replyTo: fromEmail,
        };
        this.service = new SmtpEmailService(emailConfig);
      } else {
        this.service = new ConsoleEmailService();
      }
    }
  }

  async send(options: EmailOptions): Promise<EmailResult> {
    return this.service.send(options);
  }
}
