// main/apps/server/src/config/services/email.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { loadEmailConfig } from './email';

import type { FullEnv } from '@bslt/shared/config';

/**
 * Creates a base environment with email-related defaults (as applied by Zod schema).
 * Used to simulate properly parsed FullEnv in tests.
 */
function createBaseEnv(overrides: Partial<FullEnv> = {}): FullEnv {
  return {
    EMAIL_PROVIDER: 'console',
    ...overrides,
  } as unknown as FullEnv;
}

describe('Email Configuration', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('loadEmailConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadEmailConfig(createBaseEnv());

      expect(config.provider).toBe('console');
      expect(config.smtp.host).toBe('localhost');
      expect(config.from.name).toBe('BSLT');
      expect(config.smtp.auth).toEqual({ user: '', pass: '' });
    });

    test('should prioritize explicit EMAIL_PROVIDER', () => {
      const config = loadEmailConfig(
        createBaseEnv({
          EMAIL_PROVIDER: 'smtp',
          SMTP_HOST: 'smtp.mailtrap.io',
        }),
      );

      expect(config.provider).toBe('smtp');
    });

    test('should parse SMTP settings accurately', () => {
      const env = createBaseEnv({
        SMTP_HOST: 'smtp.mailserver.com',
        SMTP_PORT: 465,
        SMTP_SECURE: 'true',
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'password123',
      });

      const config = loadEmailConfig(env);

      expect(config.smtp.host).toBe('smtp.mailserver.com');
      expect(config.smtp.port).toBe(465);
    });

    test('should parse SMTP settings accurately (fixed)', () => {
      const env = createBaseEnv({
        SMTP_HOST: 'smtp.mailserver.com',
        SMTP_PORT: 465,
        SMTP_SECURE: 'true',
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'password123',
      });

      const config = loadEmailConfig(env);

      expect(config.smtp.host).toBe('smtp.mailserver.com');
      expect(config.smtp.port).toBe(465);
      expect(config.smtp.secure).toBe(true);
      expect(config.smtp.auth).toEqual({ user: 'user@example.com', pass: 'password123' });
    });

    test('should handle "reply-to" fallback logic', () => {
      const configNoReply = loadEmailConfig(
        createBaseEnv({
          EMAIL_FROM_ADDRESS: 'from@abe.com',
        }),
      );
      expect(configNoReply.replyTo).toBe('from@abe.com');

      const configWithReply = loadEmailConfig(
        createBaseEnv({
          EMAIL_FROM_ADDRESS: 'from@abe.com',
          EMAIL_REPLY_TO: 'human@abe.com',
        }),
      );
      expect(configWithReply.replyTo).toBe('human@abe.com');
    });

    test('should load API key for modern mail providers', () => {
      const config = loadEmailConfig(createBaseEnv({ EMAIL_API_KEY: 're_123456789' }));
      expect(config.apiKey).toBe('re_123456789');
    });

    test('should handle production-ready SMTP timeout settings', () => {
      const env = createBaseEnv({
        SMTP_CONNECTION_TIMEOUT: 10000,
        SMTP_SOCKET_TIMEOUT: 60000,
      });

      const config = loadEmailConfig(env);
      expect(config.smtp.connectionTimeout).toBe(10000);
      expect(config.smtp.socketTimeout).toBe(60000);
    });
  });
});
