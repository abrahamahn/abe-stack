// apps/server/src/infra/email/factory.ts
import { ConsoleEmailService } from '@email/consoleEmailService';
import { SmtpEmailService } from '@email/smtpEmailService';

import type { EmailConfig } from '@config';
import type { EmailService } from '@email/types';

/**
 * Create an email service based on configuration
 */
export function createEmailService(config: EmailConfig): EmailService {
  if (config.provider === 'smtp') {
    return new SmtpEmailService(config);
  }
  return new ConsoleEmailService();
}
