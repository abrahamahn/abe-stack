// backend/engine/src/mailer/templates/templates.test.ts
import { describe, expect, test } from 'vitest';

import { emailTemplates } from './templates';

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

      expect(result.text).toBeDefined();
      expect(result.text?.toLowerCase()).toContain('sign in');
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

      expect(result.text).toBeDefined();
      expect(result.text?.toLowerCase()).toContain('verify');
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

      expect(result.text).toBeDefined();
      expect(result.text?.toLowerCase()).toContain('contact');
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

      expect(result.text).toBeDefined();
      // URL will have < and > but no HTML tags
      const textWithoutUrl = result.text?.replace(/https?:\/\/[^\s]+/g, '') ?? '';
      expect(textWithoutUrl).not.toMatch(/<[a-z]+/i);
    });

    test('should have plain text alternative for email verification', () => {
      const result = emailTemplates.emailVerification('https://example.com/verify');

      expect(result.text).toBeDefined();
      const textWithoutUrl = result.text?.replace(/https?:\/\/[^\s]+/g, '') ?? '';
      expect(textWithoutUrl).not.toMatch(/<[a-z]+/i);
    });

    test('should have plain text alternative for password changed', () => {
      const result = emailTemplates.passwordChanged();

      expect(result.text).not.toMatch(/<[a-z]+/i);
    });
  });

  describe('tokenReuseAlert', () => {
    const testIp = '192.168.1.100';
    const testUserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    const testTimestamp = new Date('2026-01-21T15:30:00Z');

    test('should generate security alert email with correct subject', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      expect(result.subject).toBe('Security Alert: Suspicious Activity on Your Account');
      expect(result.to).toBe('');
    });

    test('should include IP address in both text and HTML', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      expect(result.text).toContain(testIp);
      expect(result.html).toContain(testIp);
    });

    test('should include user agent in both text and HTML', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      expect(result.text).toContain(testUserAgent);
      expect(result.html).toContain(testUserAgent);
    });

    test('should include formatted timestamp', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      // Check for ISO timestamp
      expect(result.html).toContain('2026-01-21T15:30:00.000Z');
    });

    test('should explain what happened', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      expect(result.text).toContain('authentication token was reused');
      expect(result.text).toContain('sessions have been terminated');
      expect(result.html).toContain('authentication token was reused');
      expect(result.html).toContain('sessions have been terminated');
    });

    test('should include security recommendations', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      expect(result.text).toContain('Change your password');
      expect(result.text).toContain('two-factor authentication');
      expect(result.text).toContain('Review your recent account activity');
      expect(result.html).toContain('Change your password');
      expect(result.html).toContain('two-factor authentication');
    });

    test('should handle empty user agent', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, '', testTimestamp);

      expect(result.text).toContain('Unknown');
      expect(result.html).toContain('Unknown');
    });

    test('should generate valid HTML structure', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('<html>');
      expect(result.html).toContain('</html>');
      expect(result.html).toContain('Security Alert');
    });

    test('should have plain text alternative without HTML tags', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      // Text version should not contain HTML tags
      expect(result.text).not.toMatch(/<[a-z]+/i);
    });

    test('should include warning styling in HTML', () => {
      const result = emailTemplates.tokenReuseAlert(testIp, testUserAgent, testTimestamp);

      // Should have warning-colored elements
      expect(result.html).toContain('#dc2626'); // Red color for alert
      expect(result.html).toContain('#fef2f2'); // Light red background
    });
  });
});
