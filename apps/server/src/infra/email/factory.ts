import { ConsoleEmailService } from './consoleEmailService';
import { SmtpEmailService } from './smtpEmailService';

import type { EmailService } from './types';
import type { EmailConfig } from '../../config';

/**
 * Create an email service based on configuration
 */
export function createEmailService(config: EmailConfig): EmailService {
  if (config.provider === 'smtp') {
    return new SmtpEmailService(config);
  }
  return new ConsoleEmailService();
}
