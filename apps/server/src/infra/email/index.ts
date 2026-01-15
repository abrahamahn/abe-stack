// apps/server/src/infra/email/index.ts
/**
 * Email Service Infrastructure
 *
 * Provides email sending capabilities with multiple providers.
 * In development, logs emails to console.
 * In production, sends via SMTP.
 */

// Types
export type { EmailService, EmailOptions, EmailResult } from './types';

// Services
export { ConsoleEmailService } from './consoleEmailService';
export { SmtpEmailService } from './smtpEmailService';

// Templates
export { emailTemplates } from './templates';
