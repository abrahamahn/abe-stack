// apps/server/src/services/index.ts
// Re-export from infra for backwards compatibility
// New code should import from '../infra' directly
export type { ServerEnvironment, EmailService } from '../infra';
export { ConsoleEmailService, SmtpEmailService, emailTemplates } from '../infra';
