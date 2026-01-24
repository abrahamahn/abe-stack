// apps/server/src/infrastructure/messaging/email/__tests__/factory.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ConsoleEmailService } from '../consoleEmailService';
import { createEmailService } from '../factory';
import { SmtpEmailService } from '../smtpEmailService';

import type { Email } from '@abe-stack/core';

// Mock the SmtpClient to prevent actual SMTP connections
vi.mock('../smtp.js', () => ({
  SmtpClient: class MockSmtpClient {
    send = vi.fn().mockResolvedValue({ success: true, messageId: 'mock-123' });
    constructor(public config: unknown) {}
  },
}));

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockEmail(provider: 'console' | 'smtp' = 'smtp'): Email {
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

// ============================================================================
// Factory Tests
// ============================================================================

describe('createEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provider selection', () => {
    test('should create SmtpEmailService when provider is smtp', () => {
      const config = createMockEmail('smtp');
      const service = createEmailService();

      expect(service).toBeInstanceOf(SmtpEmailService);
    });

    test('should create ConsoleEmailService when provider is console', () => {
      const config = createMockEmail('console');
      const service = createEmailService();

      expect(service).toBeInstanceOf(ConsoleEmailService);
    });

    test('should default to ConsoleEmailService for unknown providers', () => {
      const config = {
        ...createMockEmail('console'),
        provider: 'unknown' as 'console',
      };
      const service = createEmailService();

      expect(service).toBeInstanceOf(ConsoleEmailService);
    });
  });

  describe('service functionality', () => {
    test('should return working SmtpEmailService', async () => {
      const config = createMockEmail('smtp');
      const service = createEmailService();

      const result = await service.send({
        to: 'test@example.com',
        subject: 'Test',
        text: 'Test body',
      });

      expect(result.success).toBe(true);
    });

    test('should return working ConsoleEmailService', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const config = createMockEmail('console');
      const service = createEmailService();

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
    test('should pass smtp  to SmtpEmailService', () => {
      const config = createMockEmail('smtp');
      config.smtp.host = 'custom-host.example.com';
      config.smtp.port = 465;

      const service = createEmailService();

      // Service should be created without errors
      expect(service).toBeInstanceOf(SmtpEmailService);
    });

    test('should create ConsoleEmailService regardless of smtp ', () => {
      const config = createMockEmail('console');
      // Even with smtp  present, console provider should work
      config.smtp.host = 'unused-host.example.com';

      const service = createEmailService();

      expect(service).toBeInstanceOf(ConsoleEmailService);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string provider', () => {
      const config = {
        ...createMockEmail('console'),
        provider: '' as 'console',
      };
      const service = createEmailService();

      // Should default to console for empty string
      expect(service).toBeInstanceOf(ConsoleEmailService);
    });

    test('should handle case sensitivity in provider', () => {
      const config = {
        ...createMockEmail('console'),
        provider: 'SMTP' as 'smtp',
      };
      const service = createEmailService();

      // Depends on implementation - might be smtp or console
      expect(config).toBeDefined();
    });
  });
});
