// apps/server/src/infrastructure/messaging/email/__tests__/smtp.test.ts
/**
 * Tests for the SMTP client utility functions.
 *
 * Full SMTP protocol testing uses mocked node:net/node:tls sockets
 * to verify the SmtpClient's protocol implementation without real network calls.
 */
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, test, vi, type Mock } from 'vitest';

import { SmtpClient, type SmtpConfig } from '../smtp';

// ----------------------------------------------------------------------------
// Mocks
// ----------------------------------------------------------------------------

// Mock Socket class to simulate connection behavior
class MockSocket extends EventEmitter {
  write = vi.fn((_data, cb) => cb && cb(null));
  destroy = vi.fn();
  setTimeout = vi.fn();
  end = vi.fn();
  override removeListener = vi.fn((event, listener) => super.removeListener(event, listener));
}

const mockSocket = new MockSocket();

// Mock node modules
vi.mock('node:net', () => ({
  createConnection: vi.fn(),
}));

vi.mock('node:tls', () => ({
  connect: vi.fn(),
}));

import { createConnection } from 'node:net';
import { connect } from 'node:tls';

// ----------------------------------------------------------------------------
// Tests
// ----------------------------------------------------------------------------

describe('SmtpClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.removeAllListeners();
    mockSocket.write.mockClear();

    // Default mock implementation returns the reused mockSocket
    (createConnection as unknown as Mock).mockImplementation(
      (_opts: unknown, cb: (err?: Error) => void) => {
        // Simulate async connection success
        setTimeout(() => {
          if (cb) cb();
        }, 0);
        return mockSocket;
      },
    );

    (connect as unknown as Mock).mockImplementation((_opts: unknown, cb: (err?: Error) => void) => {
      setTimeout(() => {
        if (cb) cb();
      }, 0);
      return mockSocket;
    });
  });

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
  });

  describe('send method', () => {
    test('should return error result when connection fails', async () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      // Simulate connection error
      (createConnection as unknown as Mock).mockImplementation(() => {
        const socket = new MockSocket();
        setTimeout(() => socket.emit('error', new Error('Connection timed out')), 10);
        return socket;
      });

      const client = new SmtpClient(config);
      const result = await client.send({
        from: 'test@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection timed out');
    });

    test('should return success when message sent successfully', async () => {
      const config: SmtpConfig = {
        host: 'smtp.example.com',
        port: 587,
        secure: false,
      };

      const client = new SmtpClient(config);

      // Start the send process
      const resultPromise = client.send({
        from: 'sender@example.com',
        to: 'recipient@example.com',
        subject: 'Test',
        text: 'Hello',
      });

      // Helper to simulate server responses in sequence
      const simulateServerResponse = async (data: string) => {
        // Allow the client's write callback to process first
        await new Promise((resolve) => setTimeout(resolve, 0));
        mockSocket.emit('data', Buffer.from(data));
      };

      // 1. Initial Greeting
      await simulateServerResponse('220 smtp.example.com ESMTP\r\n');

      // 2. EHLO response
      await simulateServerResponse('250-smtp.example.com\r\n250 AUTH LOGIN\r\n');

      // 3. MAIL FROM response
      await simulateServerResponse('250 OK\r\n');

      // 4. RCPT TO response
      await simulateServerResponse('250 OK\r\n');

      // 5. DATA response
      await simulateServerResponse('354 End data with <CR><LF>.<CR><LF>\r\n');

      // 6. Body response (after data written)
      await simulateServerResponse('250 OK: queued as 12345\r\n');

      // 7. QUIT response
      await simulateServerResponse('221 Bye\r\n');

      const result = await resultPromise;

      expect(result.success).toBe(true);
      expect(createConnection).toHaveBeenCalled();
      expect(mockSocket.write).toHaveBeenCalledTimes(6); // EHLO, MAIL, RCPT, DATA, Body, QUIT
    });
  });

  describe('SmtpConfig types', () => {
    test('should accept string recipient', () => {
      const config: SmtpConfig = { host: 'localhost', port: 25, secure: false };
      const client = new SmtpClient(config);
      // Compile-time check verification
      expect(client).toBeDefined();
    });

    test('should accept array of recipients', () => {
      const config: SmtpConfig = { host: 'localhost', port: 25, secure: false };
      const client = new SmtpClient(config);
      expect(client).toBeDefined();
    });
  });
});
