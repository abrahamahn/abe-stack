// packages/email/src/providers/smtp-service.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SmtpEmailService } from './smtp-service';

import type { EmailOptions } from '../types';
import type { EmailConfig } from '@abe-stack/core/config';

// Mock the SmtpClient
const mockSend = vi.fn().mockResolvedValue({ success: true, messageId: 'smtp-123' });

vi.mock('../smtp', () => ({
  SmtpClient: class MockSmtpClient {
    send = mockSend;
    constructor(public config: unknown) {}
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEmailConfig(): EmailConfig {
  return {
    provider: 'smtp',
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      auth: {
        user: 'test@example.com',
        pass: 'test-password',
      },
      connectionTimeout: 30000,
      socketTimeout: 30000,
    },
    from: {
      name: 'Test App',
      address: 'noreply@example.com',
    },
    replyTo: 'noreply@example.com',
  };
}

const testEmailOptions: EmailOptions = {
  to: 'user@example.com',
  subject: 'Test Subject',
  text: 'Test email body',
  html: '<p>Test email body</p>',
};

// ============================================================================
// SmtpEmailService Tests
// ============================================================================

describe('SmtpEmailService', () => {
  let smtpService: SmtpEmailService;
  const config = createMockEmailConfig();

  beforeEach(() => {
    vi.clearAllMocks();
    mockSend.mockResolvedValue({ success: true, messageId: 'smtp-123' });
    smtpService = new SmtpEmailService(config);
  });

  describe('send', () => {
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

    test('should handle email without HTML', async () => {
      const textOnly: EmailOptions = {
        to: 'test@example.com',
        subject: 'Text only',
        text: 'Plain text body',
      };

      await smtpService.send(textOnly);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Plain text body',
        }),
      );
      // Verify html is not included when not provided
      const callArg = mockSend.mock.calls[0][0] as Record<string, unknown>;
      expect(callArg).not.toHaveProperty('html');
    });

    test('should format from address correctly', async () => {
      await smtpService.send(testEmailOptions);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: '"Test App" <noreply@example.com>',
        }),
      );
    });

    test('should handle smtp timeout error', async () => {
      mockSend.mockResolvedValueOnce({ success: false, error: 'Connection timeout' });

      const result = await smtpService.send(testEmailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timeout');
    });

    test('should handle authentication error', async () => {
      mockSend.mockResolvedValueOnce({ success: false, error: 'Authentication failed' });

      const result = await smtpService.send(testEmailOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Authentication failed');
    });
  });

  describe('configuration', () => {
    test('should use smtp config from constructor', () => {
      const customConfig = createMockEmailConfig();
      customConfig.smtp.host = 'custom-smtp.example.com';
      customConfig.smtp.port = 465;

      const service = new SmtpEmailService(customConfig);

      // Service should be created without errors
      expect(service).toBeDefined();
    });

    test('should use secure connection when configured', () => {
      const secureConfig = createMockEmailConfig();
      secureConfig.smtp.secure = true;

      const service = new SmtpEmailService(secureConfig);

      expect(service).toBeDefined();
    });
  });
});
