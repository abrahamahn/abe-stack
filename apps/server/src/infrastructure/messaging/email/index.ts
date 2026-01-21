// apps/server/src/infrastructure/messaging/email/index.ts
/**
 * Email Service Infrastructure
 *
 * Provides email sending capabilities with multiple providers.
 * In development, logs emails to console.
 * In production, sends via SMTP.
 */

// Types
export type { EmailService, EmailOptions, EmailResult } from './types';
export { ConsoleEmailService } from './consoleEmailService';
export { SmtpEmailService } from './smtpEmailService';
export { SmtpClient, type SmtpConfig, type SmtpMessage, type SmtpResult } from './smtp';
export { emailTemplates } from './templates';
export { createEmailService } from './factory';
