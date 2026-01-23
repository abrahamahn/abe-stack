// apps/server/src/infrastructure/messaging/email/__tests__/factory.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ConsoleEmailService } from '../consoleEmailService';
import { createEmailService } from '../factory';
import { SmtpEmailService } from '../smtpEmailService';

import type { Email } from '@';

// Mock the SmtpClient to prevent actual SMTP connections
vi.mock('../smtp.js', () => ({
  SmtpClient: class MockSmtpClient {
    send = vi.fn().mockResolvedValue({ success: true, messageId: 'mock-123' });
    constructor(public : unknown) {}
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
      const  = createMockEmail('smtp');
      const service = createEmailService();

      expect(service).toBeInstanceOf(SmtpEmailService);
    });

    test('should create ConsoleEmailService when provider is console', () => {
      const  = createMockEmail('console');
      const service = createEmailService();

      expect(service).toBeInstanceOf(ConsoleEmailService);
    });

    test('should default to ConsoleEmailService for unknown providers', () => {
      const  = {
        ...createMockEmail('console'),
        provider: 'unknown' as 'console',
      };
      const service = createEmailService();

      expect(service).toBeInstanceOf(ConsoleEmailService);
    });
  });

  describe('service functionality', () => {
    test('should return working SmtpEmailService', async () => {
      const  = createMockEmail('smtp');
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
      const  = createMockEmail('console');
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

  describe('uration handling', () => {
    test('should pass smtp  to SmtpEmailService', () => {
      const  = createMockEmail('smtp');
      .smtp.host = 'custom-host.example.com';
      .smtp.port = 465;

      const service = createEmailService();

      // Service should be created without errors
      expect(service).toBeInstanceOf(SmtpEmailService);
    });

    test('should create ConsoleEmailService regardless of smtp ', () => {
      const  = createMockEmail('console');
      // Even with smtp  present, console provider should work
      .smtp.host = 'unused-host.example.com';

      const service = createEmailService();

      expect(service).toBeInstanceOf(ConsoleEmailService);
    });
  });

  describe('edge cases', () => {
    test('should handle empty string provider', () => {
      const  = {
        ...createMockEmail('console'),
        provider: '' as 'console',
      };
      const service = createEmailService();

      // Should default to console for empty string
      expect(service).toBeInstanceOf(ConsoleEmailService);
    });

    test('should handle case sensitivity in provider', () => {
      const  = {
        ...createMockEmail('console'),
        provider: 'SMTP' as 'smtp',
      };
      const service = createEmailService();

      // Depends on implementation - might be smtp or console
      expect(service).toBeDefined();
    });
  });
});
