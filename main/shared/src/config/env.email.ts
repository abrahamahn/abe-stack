// main/shared/src/config/env.email.ts
/**
 * Email Environment Configuration
 *
 * Email types, env interface, and validation schema.
 * Merged from config/types/services.ts (email section) and config/env.ts.
 *
 * @module config/env.email
 */

import {
  coerceNumber,
  createEnumSchema,
  createSchema,
  parseObject,
  parseOptional,
  parseString,
  withDefault,
} from '../primitives/schema';

import { trueFalseSchema } from './env.base';

import type { Schema } from '../primitives/schema';

// ============================================================================
// Types
// ============================================================================

/**
 * SMTP connection settings.
 * Compatible with most email providers (Gmail, SendGrid, Mailgun, etc.)
 */
export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
  connectionTimeout: number;
  socketTimeout: number;
}

/**
 * Email service configuration.
 * Supports console logging (dev) or SMTP (production).
 */
export interface EmailConfig {
  provider: 'console' | 'smtp';
  smtp: SmtpConfig;
  apiKey?: string;
  from: {
    name: string;
    address: string;
  };
  replyTo: string;
}

// ============================================================================
// Env Interface
// ============================================================================

/** Email environment variables */
export interface EmailEnv {
  EMAIL_PROVIDER: 'console' | 'smtp';
  SMTP_HOST?: string | undefined;
  SMTP_PORT?: number | undefined;
  SMTP_SECURE?: 'true' | 'false' | undefined;
  SMTP_USER?: string | undefined;
  SMTP_PASS?: string | undefined;
  EMAIL_API_KEY?: string | undefined;
  EMAIL_FROM_NAME?: string | undefined;
  EMAIL_FROM_ADDRESS?: string | undefined;
  EMAIL_REPLY_TO?: string | undefined;
  SMTP_CONNECTION_TIMEOUT?: number | undefined;
  SMTP_SOCKET_TIMEOUT?: number | undefined;
}

// ============================================================================
// Env Schema
// ============================================================================

export const EmailEnvSchema: Schema<EmailEnv> = createSchema<EmailEnv>((data: unknown) => {
  const obj = parseObject(data, 'EmailEnv');
  return {
    EMAIL_PROVIDER: createEnumSchema(['console', 'smtp'] as const, 'EMAIL_PROVIDER').parse(
      withDefault(obj['EMAIL_PROVIDER'], 'console'),
    ),
    SMTP_HOST: parseOptional(obj['SMTP_HOST'], (v: unknown) => parseString(v, 'SMTP_HOST')),
    SMTP_PORT: parseOptional(obj['SMTP_PORT'], (v: unknown) => coerceNumber(v, 'SMTP_PORT')),
    SMTP_SECURE: parseOptional(obj['SMTP_SECURE'], (v: unknown) => trueFalseSchema.parse(v)),
    SMTP_USER: parseOptional(obj['SMTP_USER'], (v: unknown) => parseString(v, 'SMTP_USER')),
    SMTP_PASS: parseOptional(obj['SMTP_PASS'], (v: unknown) => parseString(v, 'SMTP_PASS')),
    EMAIL_API_KEY: parseOptional(obj['EMAIL_API_KEY'], (v: unknown) => parseString(v, 'EMAIL_API_KEY')),
    EMAIL_FROM_NAME: parseOptional(obj['EMAIL_FROM_NAME'], (v: unknown) =>
      parseString(v, 'EMAIL_FROM_NAME'),
    ),
    EMAIL_FROM_ADDRESS: parseOptional(obj['EMAIL_FROM_ADDRESS'], (v: unknown) =>
      parseString(v, 'EMAIL_FROM_ADDRESS'),
    ),
    EMAIL_REPLY_TO: parseOptional(obj['EMAIL_REPLY_TO'], (v: unknown) => parseString(v, 'EMAIL_REPLY_TO')),
    SMTP_CONNECTION_TIMEOUT: parseOptional(obj['SMTP_CONNECTION_TIMEOUT'], (v: unknown) =>
      coerceNumber(v, 'SMTP_CONNECTION_TIMEOUT'),
    ),
    SMTP_SOCKET_TIMEOUT: parseOptional(obj['SMTP_SOCKET_TIMEOUT'], (v: unknown) =>
      coerceNumber(v, 'SMTP_SOCKET_TIMEOUT'),
    ),
  };
});
