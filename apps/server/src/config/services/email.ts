// apps/server/src/config/services/email.ts
import type { EmailConfig, SmtpConfig } from '@abe-stack/core/contracts/config';
import type { FullEnv } from '@abe-stack/core/contracts/config/environment';

/**
 * Loads raw SMTP transport settings from environment variables.
 *
 * @param env - Environment variable map
 * @returns SMTP configuration for nodemailer transport
 */
export function loadSmtpConfig(env: FullEnv): SmtpConfig {
  return {
    host: env.SMTP_HOST || 'localhost',
    port: env.SMTP_PORT ?? 587,
    secure: env.SMTP_SECURE === 'true',
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
    connectionTimeout: env.SMTP_CONNECTION_TIMEOUT ?? 5000,
    socketTimeout: env.SMTP_SOCKET_TIMEOUT ?? 30000,
  };
}

/**
 * Loads the high-level Email Service configuration.
 *
 * Handles switching between local console logging and production mail servers.
 * Console provider logs emails to terminal (development).
 * SMTP provider sends real emails via configured server (production).
 *
 * @param env - Environment variable map
 * @returns Complete email configuration
 *
 * @example
 * ```typescript
 * const emailConfig = loadEmail(process.env);
 * // emailConfig.provider === 'console' in development
 * // emailConfig.provider === 'smtp' in production
 * ```
 */
export function loadEmail(env: FullEnv): EmailConfig {
  const provider = (env.EMAIL_PROVIDER || 'console') as EmailConfig['provider'];

  const smtp = loadSmtpConfig(env);

  return {
    provider,
    // SMTP settings - used if provider is 'smtp'
    smtp: {
      ...smtp,
      // Ensure auth object is at least an empty structure for type safety in some drivers
      auth: smtp.auth ?? { user: '', pass: '' },
    },

    // API-based provider placeholder (e.g., Resend, Postmark)
    apiKey: env.EMAIL_API_KEY,

    // Global "From" identity
    from: {
      name: env.EMAIL_FROM_NAME || 'ABE Stack',
      address: env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
    },

    // Standard Enterprise feature: separate reply-to
    replyTo: env.EMAIL_REPLY_TO || env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
  };
}

export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: 'localhost',
  port: 587,
  secure: false,
  connectionTimeout: 5000,
  socketTimeout: 30000,
};
