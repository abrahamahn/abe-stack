// apps/server/src/infra/index.ts
/**
 * Infrastructure Layer
 *
 * Technical capabilities organized by concern:
 * - database: Database client, schema, transactions
 * - storage: File storage providers (local, S3)
 * - email: Email sending services
 * - pubsub: Real-time subscription management
 * - security: Login tracking, lockout, audit logging
 *
 * Note: HTTP server setup is in app.ts
 */

// Database
export * from './database';

// Storage
export * from './storage';

// Email
export type { EmailService, EmailOptions, EmailResult } from './email';
export { ConsoleEmailService, SmtpEmailService, emailTemplates } from './email';

// PubSub
export { SubscriptionManager, SubKeys, publishAfterWrite } from './pubsub';
export type { SubscriptionKey, RecordKey, ListKey } from './pubsub';

// Security
export * from './security';
export * from './security/events';
