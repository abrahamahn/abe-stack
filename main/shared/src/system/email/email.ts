// main/shared/src/system/email/email.ts

/**
 * @file Email Domain Schemas
 * @description Schemas for email template and delivery log validation.
 * @module Domain/Email
 */

import {
  coerceDate,
  createEnumSchema,
  createSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseOptional,
  parseRecord,
  parseString,
} from '../../primitives/schema';
import { emailLogIdSchema, emailTemplateKeySchema, userIdSchema } from '../../primitives/schema/ids';
import { EMAIL_PROVIDERS, EMAIL_STATUSES } from '../constants/platform';

import type { Schema } from '../../primitives/schema';
import type { EmailLogId, EmailTemplateKey, UserId } from '../../primitives/schema/ids';

// ============================================================================
// Enums
// ============================================================================

/** Lifecycle states for email delivery */
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

/** Supported email delivery providers */
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

/** Schema for validating email statuses */
export const emailStatusSchema = createEnumSchema(EMAIL_STATUSES, 'status');

/** Schema for validating email providers */
export const emailProviderSchema = createEnumSchema(EMAIL_PROVIDERS, 'provider');

// ============================================================================
// Email Template Types
// ============================================================================

/**
 * Full email template (matches DB SELECT result).
 *
 * @param key - Dot-notation identifier (e.g. "auth.welcome")
 * @param name - Human-readable display name
 * @param subject - Email subject line template
 * @param bodyHtml - Optional HTML body template
 * @param bodyText - Optional plaintext body template
 * @param variables - Template variable definitions
 * @param isActive - Whether the template is active
 * @param createdAt - Creation timestamp
 * @param updatedAt - Last modification timestamp
 */
export interface EmailTemplate {
  key: EmailTemplateKey;
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
 * Input for creating a new email template.
 */
export interface CreateEmailTemplate {
  key: EmailTemplateKey;
  name: string;
  subject: string;
  bodyHtml?: string | null | undefined;
  bodyText?: string | null | undefined;
  variables?: Record<string, unknown> | undefined;
  isActive?: boolean | undefined;
}

/**
 * Input for updating an existing email template.
 */
export interface UpdateEmailTemplate {
  name?: string | undefined;
  subject?: string | undefined;
  bodyHtml?: string | null | undefined;
  bodyText?: string | null | undefined;
  variables?: Record<string, unknown> | undefined;
  isActive?: boolean | undefined;
}

// ============================================================================
// Email Log Types
// ============================================================================

/**
 * Full email log entry (matches DB SELECT result).
 * Append-only — no update type.
 *
 * @param id - Unique log entry identifier (UUID)
 * @param userId - Optional user who triggered the email
 * @param templateKey - Optional template used
 * @param recipient - Recipient email address
 * @param subject - Email subject
 * @param status - Delivery status
 * @param provider - Delivery provider used
 * @param providerMessageId - Provider-specific message ID
 * @param sentAt - When the email was sent
 * @param deliveredAt - When delivery was confirmed
 * @param bouncedAt - When the bounce was detected
 * @param errorMessage - Error details for failed deliveries
 * @param metadata - Arbitrary JSONB metadata
 * @param createdAt - Log entry creation timestamp
 */
export interface EmailLogEntry {
  id: EmailLogId;
  userId: UserId | null;
  templateKey: EmailTemplateKey | null;
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
 * Input for creating a new email log entry.
 */
export interface CreateEmailLogEntry {
  userId?: UserId | null | undefined;
  templateKey?: EmailTemplateKey | null | undefined;
  recipient: string;
  subject: string;
  status?: EmailStatus | undefined;
  provider: EmailProvider;
  providerMessageId?: string | null | undefined;
  sentAt?: Date | null | undefined;
  errorMessage?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

// ============================================================================
// Email Template Schemas
// ============================================================================

/**
 * Full email template schema (matches DB SELECT result).
 */
export const emailTemplateSchema: Schema<EmailTemplate> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    key: emailTemplateKeySchema.parse(obj['key']),
    name: parseString(obj['name'], 'name'),
    subject: parseString(obj['subject'], 'subject'),
    bodyHtml: parseNullable(obj['bodyHtml'], (v: unknown) => parseString(v, 'bodyHtml')),
    bodyText: parseNullable(obj['bodyText'], (v: unknown) => parseString(v, 'bodyText')),
    variables: parseRecord(obj['variables'], 'variables'),
    isActive: parseBoolean(obj['isActive'], 'isActive'),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
    updatedAt: coerceDate(obj['updatedAt'], 'updatedAt'),
  };
});

/**
 * Schema for creating a new email template.
 */
export const createEmailTemplateSchema: Schema<CreateEmailTemplate> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      key: emailTemplateKeySchema.parse(obj['key']),
      name: parseString(obj['name'], 'name'),
      subject: parseString(obj['subject'], 'subject'),
      bodyHtml: parseNullableOptional(obj['bodyHtml'], (v: unknown) => parseString(v, 'bodyHtml')),
      bodyText: parseNullableOptional(obj['bodyText'], (v: unknown) => parseString(v, 'bodyText')),
      variables: parseOptional(obj['variables'], (v: unknown) => parseRecord(v, 'variables')),
      isActive: parseOptional(obj['isActive'], (v: unknown) => parseBoolean(v, 'isActive')),
    };
  },
);

/**
 * Schema for updating an existing email template.
 */
export const updateEmailTemplateSchema: Schema<UpdateEmailTemplate> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      name: parseOptional(obj['name'], (v: unknown) => parseString(v, 'name')),
      subject: parseOptional(obj['subject'], (v: unknown) => parseString(v, 'subject')),
      bodyHtml: parseNullableOptional(obj['bodyHtml'], (v: unknown) => parseString(v, 'bodyHtml')),
      bodyText: parseNullableOptional(obj['bodyText'], (v: unknown) => parseString(v, 'bodyText')),
      variables: parseOptional(obj['variables'], (v: unknown) => parseRecord(v, 'variables')),
      isActive: parseOptional(obj['isActive'], (v: unknown) => parseBoolean(v, 'isActive')),
    };
  },
);

// ============================================================================
// Email Log Schemas
// ============================================================================

/**
 * Full email log entry schema (matches DB SELECT result).
 */
export const emailLogEntrySchema: Schema<EmailLogEntry> = createSchema((data: unknown) => {
  const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  return {
    id: emailLogIdSchema.parse(obj['id']),
    userId: parseNullable(obj['userId'], (v: unknown) => userIdSchema.parse(v)),
    templateKey: parseNullable(obj['templateKey'], (v: unknown) => emailTemplateKeySchema.parse(v)),
    recipient: parseString(obj['recipient'], 'recipient'),
    subject: parseString(obj['subject'], 'subject'),
    status: emailStatusSchema.parse(obj['status']),
    provider: emailProviderSchema.parse(obj['provider']),
    providerMessageId: parseNullable(obj['providerMessageId'], (v: unknown) =>
      parseString(v, 'providerMessageId'),
    ),
    sentAt: parseNullable(obj['sentAt'], (v: unknown) => coerceDate(v, 'sentAt')),
    deliveredAt: parseNullable(obj['deliveredAt'], (v: unknown) => coerceDate(v, 'deliveredAt')),
    bouncedAt: parseNullable(obj['bouncedAt'], (v: unknown) => coerceDate(v, 'bouncedAt')),
    errorMessage: parseNullable(obj['errorMessage'], (v: unknown) =>
      parseString(v, 'errorMessage'),
    ),
    metadata: parseRecord(obj['metadata'], 'metadata'),
    createdAt: coerceDate(obj['createdAt'], 'createdAt'),
  };
});

/**
 * Schema for creating a new email log entry.
 */
export const createEmailLogEntrySchema: Schema<CreateEmailLogEntry> = createSchema(
  (data: unknown) => {
    const obj = (data !== null && typeof data === 'object' ? data : {}) as Record<string, unknown>;

    return {
      userId: parseNullableOptional(obj['userId'], (v: unknown) => userIdSchema.parse(v)),
      templateKey: parseNullableOptional(obj['templateKey'], (v: unknown) =>
        emailTemplateKeySchema.parse(v),
      ),
      recipient: parseString(obj['recipient'], 'recipient'),
      subject: parseString(obj['subject'], 'subject'),
      status: parseOptional(obj['status'], (v: unknown) => emailStatusSchema.parse(v)),
      provider: emailProviderSchema.parse(obj['provider']),
      providerMessageId: parseNullableOptional(obj['providerMessageId'], (v: unknown) =>
        parseString(v, 'providerMessageId'),
      ),
      sentAt: parseNullableOptional(obj['sentAt'], (v: unknown) => coerceDate(v, 'sentAt')),
      errorMessage: parseNullableOptional(obj['errorMessage'], (v: unknown) =>
        parseString(v, 'errorMessage'),
      ),
      metadata: parseOptional(obj['metadata'], (v: unknown) => parseRecord(v, 'metadata')),
    };
  },
);
