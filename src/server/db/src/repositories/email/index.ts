// src/server/db/src/repositories/email/index.ts
/**
 * Email Repositories Barrel
 *
 * Functional-style repositories for email_templates and email_log tables.
 */

// Email Templates
export { createEmailTemplateRepository, type EmailTemplateRepository } from './email-templates';

// Email Log
export { createEmailLogRepository, type EmailLogRepository } from './email-log';
