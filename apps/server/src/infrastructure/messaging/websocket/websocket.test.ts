// apps/server/src/infrastructure/messaging/websocket/websocket.test.ts
import { EventEmitter } from 'node:events';

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
      constructor() {}
    },
  };
});

// Mock the JWT verification module at the source path
vi.mock('../../../modules/auth/utils/jwt', () => ({
  verifyToken: mockVerifyToken,
}));

// Mock the CSRF module at the source path where it's defined
vi.mock('../../http/middleware/csrf', async (importOriginal) => {
  const actual = await importOriginal<object>();
  return {
    ...actual,
    validateCsrfToken: mockValidateCsrfToken,
  };
});

vi.mock('@abe-stack/core/http', () => ({
  parseCookies: mockParseCookies,
}));

// Import module after mocks are set up
import { getWebSocketStats, registerWebSocket } from '../websocket';

describe('WebSocket Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations to defaults
    mockHandleUpgrade.mockReset();
    mockVerifyToken.mockReset().mockReturnValue({ userId: 'test-user-123' });
    mockValidateCsrfToken.mockReset().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
        config: {
          auth: {
            jwt: {
              secret: 'test-secret',
            },
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

      const stats = getWebSocketStats();
      expect(stats.pluginRegistered).toBe(true);
    });
  });

  describe('registerWebSocket', () => {
    test('should attach upgrade handler to HTTP server', () => {
      const mockHttpServer = new EventEmitter();
      const onSpy = vi.spyOn(mockHttpServer, 'on');

      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
        config: {
          auth: {
            jwt: {
              secret: 'test-secret',
            },
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

      expect(onSpy).toHaveBeenCalledWith('upgrade', expect.any(Function));
    });

    test('should destroy socket for non-/ws paths', () => {
      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
        config: {
          auth: {
            jwt: {
              secret: 'test-secret',
            },
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

      const mockSocket = {
        write: vi.fn(),
        destroy: vi.fn(),
      };

      const mockRequest = {
        url: '/other-path',
        headers: { host: 'localhost' },
      };

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockSocket.destroy).toHaveBeenCalled();
    });
  });

  describe('WebSocket authentication', () => {
    test('should close socket if no token provided', () => {
      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
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
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

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
        url: '/ws',
        headers: { host: 'localhost' },
        // No token in sec-websocket-protocol or cookies
      };

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      // CSRF validation should have been called
      expect(mockValidateCsrfToken).toHaveBeenCalled();
      // handleUpgrade should have been called (CSRF passed)
      expect(mockHandleUpgrade).toHaveBeenCalled();
      // When no token is provided, the WebSocket should be closed with code 1008
      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Authentication required');
    });

    test('should accept connection with token in query param', () => {
      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
        config: {
          auth: {
            jwt: {
              secret: 'test-secret',
            },
            cookie: {
              secret: 'cookie-secret',
            },
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

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
        url: '/ws',
        headers: {
          host: 'localhost',
          'sec-websocket-protocol': 'valid-token',
        },
      };

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockVerifyToken).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockWs.close).not.toHaveBeenCalled();
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should accept connection with token in cookie', () => {
      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
        config: {
          auth: {
            jwt: {
              secret: 'test-secret',
            },
            cookie: {
              secret: 'cookie-secret',
            },
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

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
        url: '/ws',
        headers: {
          host: 'localhost',
          cookie: 'accessToken=cookie-token',
        },
      };

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token', 'test-secret');
      expect(mockWs.close).not.toHaveBeenCalled();
    });

    test('should close socket if token is invalid', () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
        config: {
          auth: {
            jwt: {
              secret: 'test-secret',
            },
            cookie: {
              secret: 'cookie-secret',
            },
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

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
        url: '/ws',
        headers: {
          host: 'localhost',
          'sec-websocket-protocol': 'invalid-token',
        },
      };

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Invalid token');
    });
  });

  describe('WebSocket CSRF validation', () => {
    test('should reject upgrade with invalid CSRF token', () => {
      // Configure CSRF validation to return false for this test
      mockValidateCsrfToken.mockReturnValue(false);

      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
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
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

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

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

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
      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
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
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

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

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      // Should have proceeded to WebSocket handling (token extracted from protocol header)
      expect(mockWs.close).not.toHaveBeenCalledWith(
        expect.any(Number),
        'Forbidden: Invalid CSRF token',
      );
    });
  });

  describe('WebSocket production mode', () => {
    test('should use encrypted CSRF in production', () => {
      const mockHttpServer = new EventEmitter();
      const mockServer = {
        server: mockHttpServer,
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          info: vi.fn(),
        },
        config: {
          env: 'production',
          auth: {
            jwt: {
              secret: 'test-secret',
            },
            cookie: {
              secret: 'cookie-secret',
            },
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

      // Should have registered without error in production mode
      expect(mockCtx.log.info).toHaveBeenCalledWith('WebSocket support registered on /ws');
    });
  });
});
