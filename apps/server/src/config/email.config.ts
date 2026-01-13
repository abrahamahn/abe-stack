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
  const isProduction = env.NODE_ENV === 'production';

  return {
    // Use console in dev, SMTP in production (if configured)
    provider: isProduction && env.SMTP_HOST ? 'smtp' : 'console',
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
