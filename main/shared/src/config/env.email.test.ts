// main/shared/src/config/env.email.test.ts
import { describe, expect, it } from 'vitest';

import { EmailEnvSchema } from './env.email';

describe('EmailEnvSchema', () => {
  describe('defaults', () => {
    it('defaults EMAIL_PROVIDER to console', () => {
      const result = EmailEnvSchema.parse({});
      expect(result.EMAIL_PROVIDER).toBe('console');
    });

    it('leaves all optional SMTP fields undefined when absent', () => {
      const result = EmailEnvSchema.parse({});
      expect(result.SMTP_HOST).toBeUndefined();
      expect(result.SMTP_PORT).toBeUndefined();
      expect(result.SMTP_SECURE).toBeUndefined();
      expect(result.SMTP_USER).toBeUndefined();
      expect(result.SMTP_PASS).toBeUndefined();
      expect(result.EMAIL_API_KEY).toBeUndefined();
      expect(result.EMAIL_FROM_NAME).toBeUndefined();
      expect(result.EMAIL_FROM_ADDRESS).toBeUndefined();
      expect(result.EMAIL_REPLY_TO).toBeUndefined();
      expect(result.SMTP_CONNECTION_TIMEOUT).toBeUndefined();
      expect(result.SMTP_SOCKET_TIMEOUT).toBeUndefined();
    });
  });

  describe('EMAIL_PROVIDER', () => {
    it('accepts console', () => {
      expect(EmailEnvSchema.parse({ EMAIL_PROVIDER: 'console' }).EMAIL_PROVIDER).toBe('console');
    });

    it('accepts smtp', () => {
      expect(EmailEnvSchema.parse({ EMAIL_PROVIDER: 'smtp' }).EMAIL_PROVIDER).toBe('smtp');
    });

    it('rejects sendgrid', () => {
      expect(() => EmailEnvSchema.parse({ EMAIL_PROVIDER: 'sendgrid' })).toThrow();
    });

    it('rejects mailgun', () => {
      expect(() => EmailEnvSchema.parse({ EMAIL_PROVIDER: 'mailgun' })).toThrow();
    });

    it('rejects an empty string', () => {
      expect(() => EmailEnvSchema.parse({ EMAIL_PROVIDER: '' })).toThrow();
    });

    it('rejects a numeric value', () => {
      expect(() => EmailEnvSchema.parse({ EMAIL_PROVIDER: 0 })).toThrow();
    });

    it('rejects SMTP in uppercase', () => {
      expect(() => EmailEnvSchema.parse({ EMAIL_PROVIDER: 'SMTP' })).toThrow();
    });
  });

  describe('SMTP_HOST', () => {
    it('accepts a hostname', () => {
      expect(EmailEnvSchema.parse({ SMTP_HOST: 'smtp.example.com' }).SMTP_HOST).toBe(
        'smtp.example.com',
      );
    });

    it('rejects a non-string value', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_HOST: 12345 })).toThrow();
    });
  });

  describe('SMTP_PORT', () => {
    it('accepts port 587', () => {
      expect(EmailEnvSchema.parse({ SMTP_PORT: 587 }).SMTP_PORT).toBe(587);
    });

    it('accepts port 465', () => {
      expect(EmailEnvSchema.parse({ SMTP_PORT: 465 }).SMTP_PORT).toBe(465);
    });

    it('coerces a string port', () => {
      expect(EmailEnvSchema.parse({ SMTP_PORT: '25' }).SMTP_PORT).toBe(25);
    });

    it('rejects a non-numeric string', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_PORT: 'smtp' })).toThrow();
    });

    it('accepts port 0 (schema does not enforce a minimum port)', () => {
      const result = EmailEnvSchema.parse({ SMTP_PORT: 0 });
      expect(result.SMTP_PORT).toBe(0);
    });
  });

  describe('SMTP_SECURE', () => {
    it('accepts true', () => {
      expect(EmailEnvSchema.parse({ SMTP_SECURE: 'true' }).SMTP_SECURE).toBe('true');
    });

    it('accepts false', () => {
      expect(EmailEnvSchema.parse({ SMTP_SECURE: 'false' }).SMTP_SECURE).toBe('false');
    });

    it('rejects 1', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_SECURE: '1' })).toThrow();
    });

    it('rejects a boolean true', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_SECURE: true })).toThrow();
    });

    it('rejects yes', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_SECURE: 'yes' })).toThrow();
    });
  });

  describe('SMTP credentials', () => {
    it('accepts SMTP_USER and SMTP_PASS', () => {
      const result = EmailEnvSchema.parse({
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'password123',
      });
      expect(result.SMTP_USER).toBe('user@example.com');
      expect(result.SMTP_PASS).toBe('password123');
    });

    it('rejects a non-string SMTP_USER', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_USER: 42 })).toThrow();
    });

    it('rejects a non-string SMTP_PASS', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_PASS: null })).toThrow();
    });
  });

  describe('EMAIL_API_KEY', () => {
    it('accepts an API key string', () => {
      const result = EmailEnvSchema.parse({ EMAIL_API_KEY: 'SG.xxxxxxxxxxxx' });
      expect(result.EMAIL_API_KEY).toBe('SG.xxxxxxxxxxxx');
    });

    it('rejects a non-string value', () => {
      expect(() => EmailEnvSchema.parse({ EMAIL_API_KEY: 123 })).toThrow();
    });
  });

  describe('EMAIL_FROM fields', () => {
    it('accepts a from name and address', () => {
      const result = EmailEnvSchema.parse({
        EMAIL_FROM_NAME: 'My App',
        EMAIL_FROM_ADDRESS: 'no-reply@example.com',
        EMAIL_REPLY_TO: 'support@example.com',
      });
      expect(result.EMAIL_FROM_NAME).toBe('My App');
      expect(result.EMAIL_FROM_ADDRESS).toBe('no-reply@example.com');
      expect(result.EMAIL_REPLY_TO).toBe('support@example.com');
    });

    it('rejects a non-string EMAIL_FROM_NAME', () => {
      expect(() => EmailEnvSchema.parse({ EMAIL_FROM_NAME: true })).toThrow();
    });
  });

  describe('SMTP timeout fields', () => {
    it('accepts SMTP_CONNECTION_TIMEOUT and SMTP_SOCKET_TIMEOUT', () => {
      const result = EmailEnvSchema.parse({
        SMTP_CONNECTION_TIMEOUT: 10000,
        SMTP_SOCKET_TIMEOUT: 20000,
      });
      expect(result.SMTP_CONNECTION_TIMEOUT).toBe(10000);
      expect(result.SMTP_SOCKET_TIMEOUT).toBe(20000);
    });

    it('coerces string timeout values', () => {
      const result = EmailEnvSchema.parse({
        SMTP_CONNECTION_TIMEOUT: '5000',
        SMTP_SOCKET_TIMEOUT: '15000',
      });
      expect(result.SMTP_CONNECTION_TIMEOUT).toBe(5000);
      expect(result.SMTP_SOCKET_TIMEOUT).toBe(15000);
    });

    it('rejects a non-numeric SMTP_CONNECTION_TIMEOUT', () => {
      expect(() => EmailEnvSchema.parse({ SMTP_CONNECTION_TIMEOUT: 'slow' })).toThrow();
    });

    it('accepts zero timeout (no minimum enforced)', () => {
      const result = EmailEnvSchema.parse({ SMTP_CONNECTION_TIMEOUT: 0 });
      expect(result.SMTP_CONNECTION_TIMEOUT).toBe(0);
    });
  });

  describe('complete SMTP configuration', () => {
    it('accepts a full SMTP setup', () => {
      const result = EmailEnvSchema.parse({
        EMAIL_PROVIDER: 'smtp',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_PORT: 587,
        SMTP_SECURE: 'false',
        SMTP_USER: 'user@gmail.com',
        SMTP_PASS: 'app-password',
        EMAIL_FROM_NAME: 'My App',
        EMAIL_FROM_ADDRESS: 'noreply@myapp.com',
        EMAIL_REPLY_TO: 'support@myapp.com',
        SMTP_CONNECTION_TIMEOUT: 10000,
        SMTP_SOCKET_TIMEOUT: 20000,
      });
      expect(result.EMAIL_PROVIDER).toBe('smtp');
      expect(result.SMTP_HOST).toBe('smtp.gmail.com');
      expect(result.SMTP_PORT).toBe(587);
      expect(result.SMTP_SECURE).toBe('false');
    });
  });

  describe('non-object input', () => {
    it('rejects null', () => {
      expect(() => EmailEnvSchema.parse(null)).toThrow();
    });

    it('rejects an array', () => {
      expect(() => EmailEnvSchema.parse([])).toThrow();
    });

    it('rejects a string', () => {
      expect(() => EmailEnvSchema.parse('smtp')).toThrow();
    });
  });

  describe('safeParse', () => {
    it('returns success:true for an empty object', () => {
      const result = EmailEnvSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('returns success:false for an invalid provider without throwing', () => {
      const result = EmailEnvSchema.safeParse({ EMAIL_PROVIDER: 'ses' });
      expect(result.success).toBe(false);
    });
  });
});
