// packages/email/src/factory.ts

import { ConsoleEmailService } from './providers/console-service';
import { SmtpEmailService } from './providers/smtp-service';

import type { EmailService } from './types';
import type { EmailConfig } from '@abe-stack/core/config';

/**
 * Create an email service based on configuration
 *
 * @param config - Email configuration with provider selection
 * @returns An EmailService instance (SMTP for production, Console for development)
 */
export function createEmailService(config: EmailConfig): EmailService {
  if (config.provider === 'smtp') {
    return new SmtpEmailService(config);
  }
  return new ConsoleEmailService();
}
