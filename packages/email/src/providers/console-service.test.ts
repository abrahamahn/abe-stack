// packages/email/src/providers/console-service.test.ts
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ConsoleEmailService } from './console-service';

import type { EmailOptions } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

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
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleService = new ConsoleEmailService();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('send', () => {
    test('should return success result with messageId', async () => {
      const result = await consoleService.send(testEmailOptions);

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toMatch(/^dev-\d+-[a-z0-9]+$/);
    });

    test('should log email details to console', async () => {
      await consoleService.send(testEmailOptions);

      expect(consoleSpy).toHaveBeenCalled();
      const calls = (consoleSpy as unknown as { mock: { calls: unknown[][] } }).mock.calls;
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

    test('should handle email without HTML', async () => {
      const textOnly: EmailOptions = {
        to: 'test@example.com',
        subject: 'Text only',
        text: 'Plain text body',
      };

      const result = await consoleService.send(textOnly);

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
    });

    test('should handle multiple recipients', async () => {
      const multiRecipient: EmailOptions = {
        to: 'user1@example.com, user2@example.com',
        subject: 'Multiple Recipients',
        text: 'Test body',
      };

      const result = await consoleService.send(multiRecipient);

      expect(result.success).toBe(true);
    });

    test('should never return an error', async () => {
      const result = await consoleService.send(testEmailOptions);

      expect(result.error).toBeUndefined();
    });
  });

  describe('messageId format', () => {
    test('should start with dev- prefix', async () => {
      const result = await consoleService.send(testEmailOptions);

      expect(result.messageId).toMatch(/^dev-/);
    });

    test('should include timestamp', async () => {
      const beforeSend = Date.now();
      const result = await consoleService.send(testEmailOptions);
      const afterSend = Date.now();

      // Extract timestamp from messageId (format: dev-{timestamp}-{random})
      const parts = result.messageId?.split('-');
      const timestamp = parseInt(parts?.[1] ?? '0', 10);

      expect(timestamp).toBeGreaterThanOrEqual(beforeSend);
      expect(timestamp).toBeLessThanOrEqual(afterSend);
    });
  });
});
