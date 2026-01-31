// infra/email/src/index.ts
/**
 * Email Service Infrastructure
 *
 * Provides email sending capabilities with multiple providers.
 * In development, logs emails to console.
 * In production, sends via SMTP.
 */

// Types
export type { EmailService, EmailOptions, EmailResult } from './types';

// Providers
export { ConsoleEmailService } from './providers';
export { SmtpEmailService } from './providers';

// SMTP Client
export { SmtpClient } from './smtp';
export type { SmtpConfig, SmtpMessage, SmtpResult } from './smtp';

// Templates
export { emailTemplates } from './templates';

// Factory
export { createEmailService } from './factory';
