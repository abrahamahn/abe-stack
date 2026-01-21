// apps/server/src/infrastructure/messaging/email/__tests__/email.test.ts

import { ConsoleEmailService } from '@email/consoleEmailService';
import { createEmailService } from '@email/factory';
import { SmtpEmailService } from '@email/smtpEmailService';
import { emailTemplates } from '@email/templates';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { EmailConfig } from '@config';
import type { EmailOptions } from '@email/types';

// Mock the SmtpClient
const mockSend = vi.fn().mockResolvedValue({ success: true, messageId: 'smtp-123' });

vi.mock('../smtp.js', () => ({
  SmtpClient: class MockSmtpClient {
    send = mockSend;
    constructor(public config: unknown) {}
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEmailConfig(provider: 'console' | 'smtp' = 'smtp'): EmailConfig {
  return {
    provider,
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'test-password',
      },
    },
    from: {
      name: 'Test App',
      address: 'noreply@example.com',
    },
  };
}

const testEmailOptions: EmailOptions = {
  to: 'user@example.com',
  subject: 'Test Subject',
  text: 'Test email body',
  html: '<p>Test email body</p>',
};

// ============================================================================
// ConsoleEmailService Tests
// ============================================================================

describe('ConsoleEmailService', () => {
  let consoleService: ConsoleEmailService;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleService = new ConsoleEmailService();
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
  });

  test('should return success result with messageId', async () => {
    const result = await consoleService.send(testEmailOptions);

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
    expect(result.messageId).toMatch(/^dev-\d+-[a-z0-9]+$/);
  });

  test('should log email details to console', async () => {
    await consoleService.send(testEmailOptions);

    expect(stdoutSpy).toHaveBeenCalled();
    const calls = (stdoutSpy as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    const logCalls = calls.flat().map(String).join(' ');
    expect(logCalls).toContain(testEmailOptions.to);
    expect(logCalls).toContain(testEmailOptions.subject);
    expect(logCalls).toContain(testEmailOptions.text);
  });

  test('should generate unique messageIds for each send', async () => {
    const result1 = await consoleService.send(testEmailOptions);
    const result2 = await consoleService.send(testEmailOptions);

    expect(result1.messageId).not.toBe(result2.messageId);
  });
});

// ============================================================================
// SmtpEmailService Tests
// ============================================================================

describe('SmtpEmailService', () => {
  let smtpService: SmtpEmailService;
  const config = createMockEmailConfig('smtp');

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ success: true, messageId: 'smtp-123' });
    smtpService = new SmtpEmailService(config);
  });

  test('should send email with correct parameters', async () => {
    await smtpService.send(testEmailOptions);

    expect(mockSend).toHaveBeenCalledWith({
      from: `"${config.from.name}" <${config.from.address}>`,
      to: testEmailOptions.to,
      subject: testEmailOptions.subject,
      text: testEmailOptions.text,
      html: testEmailOptions.html,
    });
  });

  test('should return success result on successful send', async () => {
    const result = await smtpService.send(testEmailOptions);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('smtp-123');
  });

  test('should return error result when send fails', async () => {
    mockSend.mockResolvedValueOnce({ success: false, error: 'SMTP connection failed' });

    const result = await smtpService.send(testEmailOptions);

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP connection failed');
  });
});

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
  });
});

// ============================================================================
// Factory Tests
// ============================================================================

describe('createEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should create SmtpEmailService when provider is smtp', () => {
    const config = createMockEmailConfig('smtp');
    const service = createEmailService(config);

    expect(service).toBeInstanceOf(SmtpEmailService);
  });

  test('should create ConsoleEmailService when provider is console', () => {
    const config = createMockEmailConfig('console');
    const service = createEmailService(config);

    expect(service).toBeInstanceOf(ConsoleEmailService);
  });

  test('should default to ConsoleEmailService for unknown providers', () => {
    const config = {
      ...createMockEmailConfig('console'),
      provider: 'unknown' as 'console',
    };
    const service = createEmailService(config);

    expect(service).toBeInstanceOf(ConsoleEmailService);
  });
});
