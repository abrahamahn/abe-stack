// apps/server/src/infra/index.ts
// Infrastructure layer - technical capabilities

export type { ServerEnvironment } from './ctx';
export { createEnvironment, createMockEnvironment } from './factory';
export type { CreateEnvironmentOptions } from './factory';

// Email infrastructure
export type { EmailService, EmailOptions, EmailResult } from './email';
export { ConsoleEmailService, SmtpEmailService, emailTemplates } from './email';

// Security infrastructure
export * from './security';
export * from './security/events';
