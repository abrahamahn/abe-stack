// main/server/engine/src/mailer/index.ts
export { MailerClient } from './client';
export { SmtpClient } from './smtp-client';
export type { SmtpConfig, SmtpMessage, SmtpResult } from './smtp-client';
export { emailTemplates } from './templates';
export type { AuthEmailTemplates, EmailOptions, EmailResult, EmailService } from './types';

