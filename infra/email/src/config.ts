// infra/email/src/config.ts
import { getInt } from '@abe-stack/core/config';

import type { EmailConfig, FullEnv, SmtpConfig } from '@abe-stack/core/config';

/**
 * Loads raw SMTP transport settings from environment variables.
 *
 * @param env - Environment variable map
 * @returns SMTP configuration for nodemailer transport
 * @complexity O(1)
 */
export function loadSmtpConfig(env: FullEnv): SmtpConfig {
  const config: SmtpConfig = {
    host: env.SMTP_HOST ?? 'localhost',
    port: getInt(env.SMTP_PORT != null ? String(env.SMTP_PORT) : undefined, 587),
    secure: env.SMTP_SECURE === 'true',
    connectionTimeout: getInt(env.SMTP_CONNECTION_TIMEOUT != null ? String(env.SMTP_CONNECTION_TIMEOUT) : undefined, 5000),
    socketTimeout: getInt(env.SMTP_SOCKET_TIMEOUT != null ? String(env.SMTP_SOCKET_TIMEOUT) : undefined, 30000),
  };

  if ((env.SMTP_USER != null && env.SMTP_USER !== '') && (env.SMTP_PASS != null && env.SMTP_PASS !== '')) {
    config.auth = { user: env.SMTP_USER, pass: env.SMTP_PASS };
  }

  return config;
}

/**
 * Load Email Service Configuration.
 *
 * **Provider Modes**:
 * - **Console**: "Dry run" mode. Logs email content to stdout. Useful for local dev.
 * - **SMTP**: Real email delivery via standard mail servers (SendGrid, SES, Postmark, etc).
 *
 * @param env - Environment variable map
 * @returns Complete email configuration
 * @complexity O(1)
 *
 * @example
 * ```typescript
 * const emailConfig = loadEmailConfig(process.env);
 * // emailConfig.provider === 'console' in development
 * // emailConfig.provider === 'smtp' in production
 * ```
 */
export function loadEmailConfig(env: FullEnv): EmailConfig {
  const provider = env.EMAIL_PROVIDER;

  const smtp = loadSmtpConfig(env);

  const config: EmailConfig = {
    provider,
    // SMTP settings - used if provider is 'smtp'
    smtp: {
      ...smtp,
      // Ensure auth object is at least an empty structure for type safety in some drivers
      auth: smtp.auth ?? { user: '', pass: '' },
    },

    // Global "From" identity
    from: {
      name: env.EMAIL_FROM_NAME ?? 'ABE Stack',
      address: env.EMAIL_FROM_ADDRESS ?? 'noreply@example.com',
    },

    // Standard Enterprise feature: separate reply-to
    replyTo: env.EMAIL_REPLY_TO ?? env.EMAIL_FROM_ADDRESS ?? 'noreply@example.com',
  };

  // API-based provider placeholder (e.g., Resend, Postmark)
  if (env.EMAIL_API_KEY !== undefined) {
    config.apiKey = env.EMAIL_API_KEY;
  }

  return config;
}

/** Default SMTP configuration for development */
export const DEFAULT_SMTP_CONFIG: SmtpConfig = {
  host: 'localhost',
  port: 587,
  secure: false,
  connectionTimeout: 5000,
  socketTimeout: 30000,
};
