// apps/server/src/config/__tests__/email.config.test.ts
import { describe, expect, test } from 'vitest';

import { loadEmailConfig } from '@config/email.config';

describe('Email Configuration', () => {
  describe('loadEmailConfig', () => {
    test('should load default values when no env vars set', () => {
      const config = loadEmailConfig({});

      expect(config.provider).toBe('console');
      expect(config.smtp.host).toBe('localhost');
      expect(config.smtp.port).toBe(587);
      expect(config.smtp.secure).toBe(false);
      expect(config.smtp.auth.user).toBe('');
      expect(config.smtp.auth.pass).toBe('');
      expect(config.from.name).toBe('ABE Stack');
      expect(config.from.address).toBe('noreply@example.com');
    });

    test('should use console provider in development', () => {
      const env = {
        NODE_ENV: 'development',
        SMTP_HOST: 'smtp.example.com',
      };

      const config = loadEmailConfig(env);

      expect(config.provider).toBe('console');
    });

    test('should use smtp provider in production when SMTP_HOST is set', () => {
      const env = {
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.example.com',
      };

      const config = loadEmailConfig(env);

      expect(config.provider).toBe('smtp');
    });

    test('should use console provider in production when SMTP_HOST is not set', () => {
      const env = {
        NODE_ENV: 'production',
      };

      const config = loadEmailConfig(env);

      expect(config.provider).toBe('console');
    });

    test('should parse SMTP settings', () => {
      const env = {
        SMTP_HOST: 'smtp.mailserver.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'password123',
      };

      const config = loadEmailConfig(env);

      expect(config.smtp.host).toBe('smtp.mailserver.com');
      expect(config.smtp.port).toBe(465);
      expect(config.smtp.secure).toBe(true);
      expect(config.smtp.auth.user).toBe('user@example.com');
      expect(config.smtp.auth.pass).toBe('password123');
    });

    test('should parse from address settings', () => {
      const env = {
        EMAIL_FROM_NAME: 'My Application',
        EMAIL_FROM_ADDRESS: 'support@myapp.com',
      };

      const config = loadEmailConfig(env);

      expect(config.from.name).toBe('My Application');
      expect(config.from.address).toBe('support@myapp.com');
    });

    test('should handle SMTP_SECURE as false when not "true"', () => {
      const env = {
        SMTP_SECURE: 'false',
      };

      const config = loadEmailConfig(env);

      expect(config.smtp.secure).toBe(false);
    });

    test('should handle SMTP_SECURE as false when empty', () => {
      const env = {
        SMTP_SECURE: '',
      };

      const config = loadEmailConfig(env);

      expect(config.smtp.secure).toBe(false);
    });

    test('should handle non-standard port', () => {
      const env = {
        SMTP_PORT: '2525',
      };

      const config = loadEmailConfig(env);

      expect(config.smtp.port).toBe(2525);
    });
  });
});
