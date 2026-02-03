import type { ServerEnv } from '../config/env';
import { ConsoleEmailService } from './console';
import { SmtpEmailService } from './smtp';

export class MailerClient {
  private service: any;

  constructor(config: ServerEnv) {
    if (config.NODE_ENV === 'development' && !config.SMTP_HOST) {
      this.service = new ConsoleEmailService();
    } else {
      // Basic SMTP check
      if (config.SMTP_HOST) {
        this.service = new SmtpEmailService({
          smtp: {
            host: config.SMTP_HOST,
            port: config.SMTP_PORT || 587,
            secure: config.SMTP_PORT === 465,
            auth: config.SMTP_USER ? {
              user: config.SMTP_USER,
              pass: config.SMTP_PASS || '',
            } : undefined,
          },
          from: {
            address: config.FROM_EMAIL || 'noreply@example.com',
            name: 'Abe Stack',
          }
        } as any);
      } else {
        this.service = new ConsoleEmailService();
      }
    }
  }

  async send(options: { to: string; subject: string; html?: string; text?: string }) {
    return this.service.send(options);
  }
}
