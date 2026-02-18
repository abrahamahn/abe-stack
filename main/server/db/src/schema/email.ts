// main/server/db/src/schema/email.ts
/**
 * Email Schema Types
 *
 * Explicit TypeScript interfaces for email_templates and email_log tables.
 * Manages transactional email templates and delivery tracking.
 * Maps to migration 0014_email.sql.
 *
 * @remarks email_log is append-only — no UpdateEmailLog type exists.
 */

import {
  EMAIL_PROVIDERS,
  EMAIL_STATUSES,
  type EmailProvider,
  type EmailStatus,
} from '@bslt/shared';

// Re-export shared constants for consumers that import from schema
export { EMAIL_PROVIDERS, EMAIL_STATUSES };
export type { EmailProvider, EmailStatus };

// ============================================================================
// Table Names
// ============================================================================

export const EMAIL_TEMPLATES_TABLE = 'email_templates';
export const EMAIL_LOG_TABLE = 'email_log';

// ============================================================================
// Email Template Types
// ============================================================================

/**
 * Email template record (SELECT result).
 * Uses TEXT primary key (e.g., "auth.welcome", "billing.invoice").
 *
 * @see 0014_email.sql — key format: `^[a-z][a-z0-9_.]+$`, max 100 chars
 */
export interface EmailTemplate {
  key: string;
  name: string;
  subject: string;
  bodyHtml: string | null;
  bodyText: string | null;
  variables: Record<string, unknown>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fields for inserting a new email template (INSERT).
 *
 * @param key - Dot-notation identifier (e.g., "auth.password_reset")
 * @param name - Human-readable display name
 * @param subject - Email subject line template
 */
export interface NewEmailTemplate {
  key: string;
  name: string;
  subject: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  variables?: Record<string, unknown>;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Fields for updating an existing email template (UPDATE).
 * Key is the primary key and cannot be changed.
 */
export interface UpdateEmailTemplate {
  name?: string;
  subject?: string;
  bodyHtml?: string | null;
  bodyText?: string | null;
  variables?: Record<string, unknown>;
  isActive?: boolean;
  updatedAt?: Date;
}

// ============================================================================
// Email Log Types
// ============================================================================

/**
 * Email delivery log record (SELECT result).
 * Append-only — no UpdateEmailLog type.
 *
 * @see 0014_email.sql
 */
export interface EmailLog {
  id: string;
  userId: string | null;
  templateKey: string | null;
  recipient: string;
  subject: string;
  status: EmailStatus;
  provider: EmailProvider;
  providerMessageId: string | null;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  errorMessage: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

/**
 * Fields for inserting a new email log entry (INSERT).
 * Append-only table — records are immutable after creation.
 *
 * @param recipient - Email address the message was sent to
 * @param provider - Delivery provider used (smtp, ses, sendgrid, console)
 */
export interface NewEmailLog {
  id?: string;
  userId?: string | null;
  templateKey?: string | null;
  recipient: string;
  subject: string;
  status?: EmailStatus;
  provider: EmailProvider;
  providerMessageId?: string | null;
  sentAt?: Date | null;
  deliveredAt?: Date | null;
  bouncedAt?: Date | null;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}

// ============================================================================
// Column Name Mappings (camelCase TS → snake_case SQL)
// ============================================================================

/**
 * Column mappings for email_templates table.
 * Maps camelCase TypeScript property names to snake_case SQL column names.
 */
export const EMAIL_TEMPLATE_COLUMNS = {
  key: 'key',
  name: 'name',
  subject: 'subject',
  bodyHtml: 'body_html',
  bodyText: 'body_text',
  variables: 'variables',
  isActive: 'is_active',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
} as const;

/**
 * Column mappings for email_log table.
 * Maps camelCase TypeScript property names to snake_case SQL column names.
 */
export const EMAIL_LOG_COLUMNS = {
  id: 'id',
  userId: 'user_id',
  templateKey: 'template_key',
  recipient: 'recipient',
  subject: 'subject',
  status: 'status',
  provider: 'provider',
  providerMessageId: 'provider_message_id',
  sentAt: 'sent_at',
  deliveredAt: 'delivered_at',
  bouncedAt: 'bounced_at',
  errorMessage: 'error_message',
  metadata: 'metadata',
  createdAt: 'created_at',
} as const;
