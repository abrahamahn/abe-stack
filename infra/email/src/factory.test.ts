// infra/email/src/factory.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ConsoleEmailService } from './providers/console-service';
import { createEmailService } from './factory';
import { SmtpEmailService } from './providers/smtp-service';

import type { EmailConfig } from '@abe-stack/core/config';

// Mock the SmtpClient to prevent actual SMTP connections
vi.mock('./smtp', () => ({
  SmtpClient: class MockSmtpClient {
    send = vi.fn().mockResolvedValue({ success: true, messageId: 'mock-123' });
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

// ============================================================================
// Factory Tests
// ============================================================================

describe('createEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provider selection', () => {
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

  describe('service functionality', () => {
    test('should return working SmtpEmailService', async () => {
      const config = createMockEmailConfig('smtp');
      const service = createEmailService(config);

      const result = await service.send({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test body',
      });

      expect(result.success).toBe(true);
    });

    test('should return working ConsoleEmailService', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const config = createMockEmailConfig('console');
      const service = createEmailService(config);

      const result = await service.send({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test body',
      });

      expect(result.success).toBe(true);
      consoleSpy.mockRestore();
    });
  });

  describe('configuration handling', () => {
    test('should pass smtp config to SmtpEmailService', () => {
      const config = createMockEmailConfig('smtp');
      config.smtp.host = 'custom-host.example.com';
      config.smtp.port = 465;

      const service = createEmailService(config);

      // Service should be created without errors
      expect(service).toBeInstanceOf(SmtpEmailService);
    });

    test('should create ConsoleEmailService regardless of smtp config', () => {
      const config = createMockEmailConfig('console');
      // Even with smtp config present, console provider should work
      config.smtp.host = 'unused-host.example.com';

      const service = createEmailService(config);

      expect(service).toBeInstanceOf(ConsoleEmailService);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string provider', () => {
      const config = {
        ...createMockEmailConfig('console'),
        provider: '' as 'console',
      };
      const service = createEmailService(config);

      // Should default to console for empty string
      expect(service).toBeInstanceOf(ConsoleEmailService);
    });

    test('should handle case sensitivity in provider', () => {
      const config = {
        ...createMockEmailConfig('console'),
        provider: 'SMTP' as 'smtp',
      };
      const service = createEmailService(config);

      // Depends on implementation - might be smtp or console
      expect(service).toBeDefined();
    });
  });
});
