// apps/server/src//__tests__/email..test.ts
import { describe, expect, test } from 'vitest';

import { loadEmail } from '@/email.';

describe('Email uration', () => {
  describe('loadEmail', () => {
    test('should load default values when no env vars set', () => {
      const  = loadEmail({});

      expect(.provider).toBe('console');
      expect(.smtp.host).toBe('localhost');
      expect(.smtp.port).toBe(587);
      expect(.smtp.secure).toBe(false);
      expect(.smtp.auth.user).toBe('');
      expect(.smtp.auth.pass).toBe('');
      expect(.from.name).toBe('ABE Stack');
      expect(.from.address).toBe('noreply@example.com');
    });

    test('should use console provider in development', () => {
      const env = {
        NODE_ENV: 'development',
        SMTP_HOST: 'smtp.example.com',
      };

      const  = loadEmail(env);

      expect(.provider).toBe('console');
    });

    test('should use smtp provider in production when SMTP_HOST is set', () => {
      const env = {
        NODE_ENV: 'production',
        SMTP_HOST: 'smtp.example.com',
      };

      const  = loadEmail(env);

      expect(.provider).toBe('smtp');
    });

    test('should use console provider in production when SMTP_HOST is not set', () => {
      const env = {
        NODE_ENV: 'production',
      };

      const  = loadEmail(env);

      expect(.provider).toBe('console');
    });

    test('should parse SMTP settings', () => {
      const env = {
        SMTP_HOST: 'smtp.mailserver.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'password123',
      };

      const  = loadEmail(env);

      expect(.smtp.host).toBe('smtp.mailserver.com');
      expect(.smtp.port).toBe(465);
      expect(.smtp.secure).toBe(true);
      expect(.smtp.auth.user).toBe('user@example.com');
      expect(.smtp.auth.pass).toBe('password123');
    });

    test('should parse from address settings', () => {
      const env = {
        EMAIL_FROM_NAME: 'My Application',
        EMAIL_FROM_ADDRESS: 'support@myapp.com',
      };

      const  = loadEmail(env);

      expect(.from.name).toBe('My Application');
      expect(.from.address).toBe('support@myapp.com');
    });

    test('should handle SMTP_SECURE as false when not "true"', () => {
      const env = {
        SMTP_SECURE: 'false',
      };

      const  = loadEmail(env);

      expect(.smtp.secure).toBe(false);
    });

    test('should handle SMTP_SECURE as false when empty', () => {
      const env = {
        SMTP_SECURE: '',
      };

      const  = loadEmail(env);

      expect(.smtp.secure).toBe(false);
    });

    test('should handle non-standard port', () => {
      const env = {
        SMTP_PORT: '2525',
      };

      const  = loadEmail(env);

      expect(.smtp.port).toBe(2525);
    });
  });
});
