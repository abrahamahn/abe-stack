// apps/server/src/config/email.config.ts
/**
 * Email Service Configuration
 */

export interface EmailConfig {
  provider: 'console' | 'smtp';
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    address: string;
  };
}

export function loadEmailConfig(env: Record<string, string | undefined>): EmailConfig {
  // Determine provider:
  // 1. If EMAIL_PROVIDER is explicitly set, use it
  // 2. Otherwise, use SMTP in production if SMTP_HOST is configured
  // 3. Default to console (logs emails)
  const isProduction = env.NODE_ENV === 'production';
  const explicitProvider = env.EMAIL_PROVIDER;
  let provider: 'console' | 'smtp';

  if (explicitProvider === 'smtp' || explicitProvider === 'console') {
    provider = explicitProvider;
  } else {
    provider = isProduction && env.SMTP_HOST ? 'smtp' : 'console';
  }

  return {
    provider,
    smtp: {
      host: env.SMTP_HOST || 'localhost',
      port: parseInt(env.SMTP_PORT || '587', 10),
      secure: env.SMTP_SECURE === 'true',
      auth: {
        user: env.SMTP_USER || '',
        pass: env.SMTP_PASS || '',
      },
    },
    from: {
      name: env.EMAIL_FROM_NAME || 'ABE Stack',
      address: env.EMAIL_FROM_ADDRESS || 'noreply@example.com',
    },
  };
}
