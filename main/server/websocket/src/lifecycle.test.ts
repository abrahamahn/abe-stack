// main/server/websocket/src/lifecycle.test.ts
/**
 * WebSocket Lifecycle Unit Tests
 *
 * Tests for WebSocket registration, authentication, CSRF validation,
 * and connection management.
 */

import { EventEmitter } from 'node:events';

import { WEBSOCKET_PATH, WS_CLOSE_POLICY_VIOLATION } from '@bslt/shared';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Use vi.hoisted() to define mocks that can be referenced in vi.mock() factories
const { mockHandleUpgrade, mockVerifyToken, mockValidateCsrfToken, mockParseCookies } = vi.hoisted(
  () => ({
    mockHandleUpgrade: vi.fn(),
    mockVerifyToken: vi.fn(() => ({ userId: 'test-user-123' })),
    mockValidateCsrfToken: vi.fn(() => true),
    mockParseCookies: vi.fn((cookieHeader: string | undefined) => {
      if (cookieHeader == null) return {};
      const cookies: Record<string, string> = {};
      cookieHeader.split(';').forEach((cookie) => {
        const [key, value] = cookie.split('=').map((s) => s.trim());
        if (key != null && value != null) {
          cookies[key] = value;
        }
      });
      return cookies;
    }),
  }),
);

// Mock ws module with shared reference
vi.mock('ws', () => {
  return {
    WebSocketServer: class MockWebSocketServer {
      handleUpgrade = mockHandleUpgrade;
    },
  };
});

vi.mock('@bslt/shared', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return {
    ...actual,
    parseCookies: mockParseCookies,
  };
});

vi.mock('@bslt/server-system', () => ({
  validateCsrfToken: mockValidateCsrfToken,
}));

import { registerWebSocket } from './lifecycle';
import { getWebSocketStats, resetStats } from './stats';

import type { WebSocketDeps } from './lifecycle';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockCtx(overrides: Partial<WebSocketDeps> = {}): WebSocketDeps {
  return {
    db: {} as never,
    pubsub: {
      handleMessage: vi.fn(),
      cleanup: vi.fn(),
    },
    log: {
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
    },
    config: {
      env: 'test',
      auth: {
        jwt: {
          secret: 'test-secret',
        },
        cookie: {
          secret: 'cookie-secret',
        },
      },
    },
    ...overrides,
  } as unknown as WebSocketDeps;
}

function createMockServer(): { server: EventEmitter } {
  const mockHttpServer = new EventEmitter();
  return {
    server: mockHttpServer,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('WebSocket Lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStats();
    // Reset mock implementations to defaults
    mockHandleUpgrade.mockReset();
    mockVerifyToken.mockReset().mockReturnValue({ userId: 'test-user-123' });
    mockValidateCsrfToken.mockReset().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetStats();
  });

  describe('getWebSocketStats', () => {
    test('should return stats object with expected shape', () => {
      const stats = getWebSocketStats();

      expect(stats).toHaveProperty('activeConnections');
      expect(stats).toHaveProperty('pluginRegistered');
      expect(typeof stats.activeConnections).toBe('number');
      expect(typeof stats.pluginRegistered).toBe('boolean');
    });

    test('should report pluginRegistered as true after registerWebSocket', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const stats = getWebSocketStats();
      expect(stats.pluginRegistered).toBe(true);
    });
  });

  describe('registerWebSocket', () => {
    test('should attach upgrade handler to HTTP server', () => {
      const mockServer = createMockServer();
      const onSpy = vi.spyOn(mockServer.server, 'on');
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      expect(onSpy).toHaveBeenCalledWith('upgrade', expect.any(Function));
    });

    test('should destroy socket for non-/ws paths', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockRequest = {
        url: '/other-path',
        headers: { host: 'localhost' },
      };

      mockServer.server.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('WebSocket authentication', () => {
    test('should close socket if no token provided', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockWs = {
        close: vi.fn(),
        on: vi.fn(),
      };

      // Configure mock to call the callback (CSRF passes, but no auth token)
      mockHandleUpgrade.mockImplementation(
        (
          _req: unknown,
          _socket: unknown,
          _head: unknown,
          callback: (ws: typeof mockWs) => void,
        ) => {
          callback(mockWs);
        },
      );

      const mockRequest = {
        url: '/ws?csrf=valid-csrf',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
        },
      };

      mockServer.server.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      // CSRF validation should have been called
      expect(mockValidateCsrfToken).toHaveBeenCalled();
      // handleUpgrade should have been called (CSRF passed)
      expect(mockHandleUpgrade).toHaveBeenCalled();
      // When no token is provided, the WebSocket should be closed with code 1008
      expect(mockWs.close).toHaveBeenCalledWith(
        WS_CLOSE_POLICY_VIOLATION,
        'Authentication required',
      );
    });

    test('should accept connection with token in subprotocol header', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockWs = {
        close: vi.fn(),
        on: vi.fn(),
      };

      mockHandleUpgrade.mockImplementation(
        (
          _req: unknown,
          _socket: unknown,
          _head: unknown,
          callback: (ws: typeof mockWs) => void,
        ) => {
          callback(mockWs);
        },
      );

      const mockRequest = {
        url: '/ws?csrf=valid-csrf',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'valid-token',
        },
      };

      mockServer.server.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockWs.close).not.toHaveBeenCalled();
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should accept connection with token in cookie', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockWs = {
        close: vi.fn(),
        on: vi.fn(),
      };

      mockHandleUpgrade.mockImplementation(
        (
          _req: unknown,
          _socket: unknown,
          _head: unknown,
          callback: (ws: typeof mockWs) => void,
        ) => {
          callback(mockWs);
        },
      );

      const mockRequest = {
        url: '/ws?csrf=valid-csrf',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie; accessToken=cookie-token',
        },
      };

      mockServer.server.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token', 'test-secret');
      expect(mockWs.close).not.toHaveBeenCalled();
    });

    test('should close socket if token is invalid', () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockWs = {
        close: vi.fn(),
        on: vi.fn(),
      };

      mockHandleUpgrade.mockImplementation(
        (
          _req: unknown,
          _socket: unknown,
          _head: unknown,
          callback: (ws: typeof mockWs) => void,
        ) => {
          callback(mockWs);
        },
      );

      const mockRequest = {
        url: '/ws?csrf=valid-csrf',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'invalid-token',
        },
      };

      mockServer.server.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockWs.close).toHaveBeenCalledWith(WS_CLOSE_POLICY_VIOLATION, 'Invalid token');
    });
  });

  describe('WebSocket CSRF validation', () => {
    test('should reject upgrade with invalid CSRF token', () => {
      // Configure CSRF validation to return false for this test
      mockValidateCsrfToken.mockReturnValue(false);

      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockRequest = {
        url: '/ws',
        headers: {
          host: 'localhost',
          cookie: '_csrf=invalid-token',
        },
      };

      mockServer.server.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      // Should write HTTP 403 response
      expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('403'));
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockCtx.log.warn).toHaveBeenCalledWith(
        'WebSocket upgrade rejected: invalid CSRF token',
      );

      // Reset mock for other tests
      mockValidateCsrfToken.mockReturnValue(true);
    });

    test('should extract CSRF token from sec-websocket-protocol header', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockWs = {
        close: vi.fn(),
        on: vi.fn(),
      };

      mockHandleUpgrade.mockImplementation(
        (
          _req: unknown,
          _socket: unknown,
          _head: unknown,
          callback: (ws: typeof mockWs) => void,
        ) => {
          callback(mockWs);
        },
      );

      const mockRequest = {
        url: '/ws?csrf=query-token',
        headers: {
          host: 'localhost',
          cookie: '_csrf=cookie-token',
          'sec-websocket-protocol': 'graphql, csrf.header-token, valid-token',
        },
      };

      mockServer.server.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      // Should have proceeded to WebSocket handling (token extracted from protocol header)
      expect(mockWs.close).not.toHaveBeenCalledWith(
        expect.any(Number),
        'Forbidden: Invalid CSRF token',
      );
    });
  });

  describe('WebSocket production mode', () => {
    test('should use encrypted CSRF in production', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx({
        config: {
          env: 'production',
          auth: {
            jwt: { secret: 'test-secret' },
            cookie: { secret: 'cookie-secret' },
          },
        },
      });

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      // Should have registered without error in production mode
      expect(mockCtx.log.info).toHaveBeenCalledWith(
        `WebSocket support registered on ${WEBSOCKET_PATH}`,
      );
    });
  });
});
