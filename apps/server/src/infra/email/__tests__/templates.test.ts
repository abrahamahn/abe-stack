// apps/server/src/infra/email/__tests__/templates.test.ts
import { describe, expect, test } from 'vitest';

import { emailTemplates } from '../templates';

// ============================================================================
// Email Templates Tests
// ============================================================================

describe('emailTemplates', () => {
  describe('passwordReset', () => {
    test('should generate password reset email with default expiry', () => {
      const resetUrl = 'https://example.com/reset?token=abc123';
      const result = emailTemplates.passwordReset(resetUrl);

      expect(result.subject).toBe('Reset Your Password');
      expect(result.text).toContain(resetUrl);
      expect(result.text).toContain('15 minutes');
      expect(result.html).toContain(resetUrl);
      expect(result.html).toContain('15 minutes');
      expect(result.to).toBe('');
    });

    test('should accept custom expiry time', () => {
      const result = emailTemplates.passwordReset('https://example.com/reset', 30);

      expect(result.text).toContain('30 minutes');
      expect(result.html).toContain('30 minutes');
    });

    test('should include instructions in text version', () => {
      const result = emailTemplates.passwordReset('https://example.com/reset');

      expect(result.text).toContain('reset your password');
    });

    test('should generate clickable link in HTML version', () => {
      const resetUrl = 'https://example.com/reset?token=abc123';
      const result = emailTemplates.passwordReset(resetUrl);

      expect(result.html).toContain(`href="${resetUrl}"`);
    });
  });

  describe('magicLink', () => {
    test('should generate magic link email with default expiry', () => {
      const loginUrl = 'https://example.com/login?token=xyz789';
      const result = emailTemplates.magicLink(loginUrl);

      expect(result.subject).toBe('Sign in to your account');
      expect(result.text).toContain(loginUrl);
      expect(result.text).toContain('15 minutes');
      expect(result.html).toContain(loginUrl);
      expect(result.to).toBe('');
    });

    test('should accept custom expiry time', () => {
      const result = emailTemplates.magicLink('https://example.com/login', 10);

      expect(result.text).toContain('10 minutes');
      expect(result.html).toContain('10 minutes');
    });

    test('should include sign-in instructions', () => {
      const result = emailTemplates.magicLink('https://example.com/login');

      expect(result.text.toLowerCase()).toContain('sign in');
    });
  });

  describe('emailVerification', () => {
    test('should generate email verification with default expiry', () => {
      const verifyUrl = 'https://example.com/verify?token=verify123';
      const result = emailTemplates.emailVerification(verifyUrl);

      expect(result.subject).toBe('Verify Your Email Address');
      expect(result.text).toContain(verifyUrl);
      expect(result.text).toContain('60 minutes');
      expect(result.html).toContain(verifyUrl);
      expect(result.to).toBe('');
    });

    test('should accept custom expiry time', () => {
      const result = emailTemplates.emailVerification('https://example.com/verify', 120);

      expect(result.text).toContain('120 minutes');
      expect(result.html).toContain('120 minutes');
    });

    test('should include verification instructions', () => {
      const result = emailTemplates.emailVerification('https://example.com/verify');

      expect(result.text.toLowerCase()).toContain('verify');
    });
  });

  describe('passwordChanged', () => {
    test('should generate password changed notification', () => {
      const result = emailTemplates.passwordChanged();

      expect(result.subject).toBe('Your Password Was Changed');
      expect(result.text).toContain('password was recently changed');
      expect(result.text).toContain('contact support');
      expect(result.html).toContain('Password Was Changed');
      expect(result.to).toBe('');
    });

    test('should include security warning', () => {
      const result = emailTemplates.passwordChanged();

      expect(result.text.toLowerCase()).toContain('contact');
    });
  });

  describe('template HTML structure', () => {
    test('should generate valid HTML with DOCTYPE', () => {
      const result = emailTemplates.passwordReset('https://example.com');

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html>');
      expect(result.html).toContain('</html>');
    });

    test('should include meta charset', () => {
      const result = emailTemplates.magicLink('https://example.com');

      expect(result.html).toContain('charset="utf-8"');
    });

    test('should include body tags', () => {
      const result = emailTemplates.emailVerification('https://example.com');

      expect(result.html).toContain('<body');
      expect(result.html).toContain('</body>');
    });

    test('should include head section', () => {
      const result = emailTemplates.passwordChanged();

      expect(result.html).toContain('<head>');
      expect(result.html).toContain('</head>');
    });
  });

  describe('template text structure', () => {
    test('should have plain text alternative for password reset', () => {
      const result = emailTemplates.passwordReset('https://example.com/reset');

      expect(result.text).not.toContain('<');
      expect(result.text).not.toContain('>');
    });

    test('should have plain text alternative for magic link', () => {
      const result = emailTemplates.magicLink('https://example.com/login');

      // URL will have < and > but no HTML tags
      const textWithoutUrl = result.text.replace(/https?:\/\/[^\s]+/g, '');
      expect(textWithoutUrl).not.toMatch(/<[a-z]+/i);
    });

    test('should have plain text alternative for email verification', () => {
      const result = emailTemplates.emailVerification('https://example.com/verify');

      const textWithoutUrl = result.text.replace(/https?:\/\/[^\s]+/g, '');
      expect(textWithoutUrl).not.toMatch(/<[a-z]+/i);
    });

    test('should have plain text alternative for password changed', () => {
      const result = emailTemplates.passwordChanged();

      expect(result.text).not.toMatch(/<[a-z]+/i);
    });
  });
});
