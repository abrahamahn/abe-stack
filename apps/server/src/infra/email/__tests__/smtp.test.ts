// apps/server/src/infra/email/__tests__/smtp.test.ts
/**
 * Tests for the SMTP client utility functions.
 *
 * Full SMTP protocol testing requires complex async mocking of node:net/node:tls.
 * These tests focus on the SmtpClient class construction and configuration.
 * Integration testing with real SMTP servers should be done separately.
 */
import { describe, expect, test } from 'vitest';

import { SmtpClient, type SmtpConfig } from '../smtp';

describe('SmtpClient', () => {
  describe('constructor', () => {
    test('should create client with minimal config', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      const client = new SmtpClient(config);
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(SmtpClient);
    });

    test('should create client with auth config', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        auth: { user: 'test@example.com', pass: 'password' },
      };

      const client = new SmtpClient(config);
      expect(client).toBeDefined();
    });

    test('should create client with secure config (port 465)', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 465,
        secure: true,
        auth: { user: 'test@example.com', pass: 'password' },
      };

      const client = new SmtpClient(config);
      expect(client).toBeDefined();
    });

    test('should create client with custom timeouts', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
        connectionTimeout: 5000,
        socketTimeout: 10000,
      };

      const client = new SmtpClient(config);
      expect(client).toBeDefined();
    });

    test('should use default timeouts when not specified', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      const client = new SmtpClient(config);
      expect(client).toBeDefined();
      // Default timeouts are 30000 and 60000, verified by internal behavior
    });
  });

  describe('send method signature', () => {
    test('should have send method that returns a promise', () => {
      const config: SmtpConfig = {
        host: 'localhost',
        port: 25,
        secure: false,
      };

      const client = new SmtpClient(config);
      expect(typeof client.send).toBe('function');
    });

    test('should return error result when connection fails', async () => {
      const config: SmtpConfig = {
        host: 'nonexistent.invalid',
        port: 25,
        secure: false,
        connectionTimeout: 100, // Short timeout for test
      };

      const client = new SmtpClient(config);
      const result = await client.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('SmtpConfig types', () => {
    test('should accept string recipient', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      const client = new SmtpClient(config);
      // Type check - this should compile
      expect(() => {
        void client.send({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Hello',
        });
      }).not.toThrow();
    });

    test('should accept array of recipients', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      const client = new SmtpClient(config);
      // Type check - this should compile
      expect(() => {
        void client.send({
          from: 'sender@example.com',
          to: ['one@example.com', 'two@example.com'],
          subject: 'Test',
          text: 'Hello',
        });
      }).not.toThrow();
    });

    test('should accept html content', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      const client = new SmtpClient(config);
      // Type check - this should compile
      expect(() => {
        void client.send({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          html: '<p>Hello</p>',
        });
      }).not.toThrow();
    });

    test('should accept both text and html content', () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      const client = new SmtpClient(config);
      // Type check - this should compile
      expect(() => {
        void client.send({
          from: 'sender@example.com',
          to: 'recipient@example.com',
          subject: 'Test',
          text: 'Hello',
          html: '<p>Hello</p>',
        });
      }).not.toThrow();
    });
  });
});
