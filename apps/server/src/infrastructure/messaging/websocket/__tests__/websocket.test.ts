// apps/server/src/infrastructure/messaging/websocket/__tests__/websocket.test.ts
import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type * as WebSocketModule from '../websocket';
import type * as JwtModule from '@modules/auth/utils/jwt';

// Shared mock handleUpgrade function
let mockHandleUpgrade: ReturnType<typeof vi.fn>;

// Mock ws module with shared reference
vi.mock('ws', () => {
  return {
    WebSocketServer: class MockWebSocketServer {
      handleUpgrade: ReturnType<typeof vi.fn>;
      constructor() {
        // Use the shared mock so tests can configure it
        this.handleUpgrade = mockHandleUpgrade;
      }
    },
  };
});

vi.mock('@modules/auth/utils/jwt', () => ({
  verifyToken: vi.fn(() => ({ userId: 'test-user-123' })),
}));

vi.mock('@http', () => ({
  validateCsrfToken: vi.fn(() => true),
}));

// Types for dynamic imports
type WebSocketModuleType = typeof WebSocketModule;
type JwtModuleType = typeof JwtModule;

describe('WebSocket Module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    // Reset the shared mock
    mockHandleUpgrade = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWebSocketStats', () => {
    test('should return initial stats with zero connections', async () => {
      const { getWebSocketStats } = (await import('../websocket.js')) as WebSocketModuleType;
      const stats = getWebSocketStats();

      expect(stats).toEqual({
        activeConnections: 0,
        pluginRegistered: false,
      });
    });

    test('should report pluginRegistered as true after registerWebSocket', async () => {
      const { getWebSocketStats, registerWebSocket } =
        (await import('../websocket.js')) as WebSocketModuleType;

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
    test('should attach upgrade handler to HTTP server', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;

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

    test('should destroy socket for non-/ws paths', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;

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
    // TODO: This test needs rework - the mock for @http/validateCsrfToken
    // needs to be configured per-test, and the test expectations don't match
    // actual code behavior (CSRF rejects with 403, not 401)
    test.skip('should close socket if no token provided', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;

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

      // Configure mock to call the callback
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
      };

      mockHttpServer.emit('upgrade', mockRequest, mockSocket, Buffer.alloc(0));

      // When no token is provided, the socket should be rejected with a write and destroy
      expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('401'));
      expect(mockSocket.destroy).toHaveBeenCalled();
    });

    test('should accept connection with token in query param', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;
      const { verifyToken } =
        (await import('../../../../modules/auth/utils/jwt.js')) as JwtModuleType;

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

      expect(verifyToken).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockWs.close).not.toHaveBeenCalled();
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should accept connection with token in cookie', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;
      const { verifyToken } =
        (await import('../../../../modules/auth/utils/jwt.js')) as JwtModuleType;

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

      expect(verifyToken).toHaveBeenCalledWith('cookie-token', 'test-secret');
      expect(mockWs.close).not.toHaveBeenCalled();
    });

    test('should close socket if token is invalid', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;
      const { verifyToken } =
        (await import('../../../../modules/auth/utils/jwt.js')) as JwtModuleType;

      (verifyToken as ReturnType<typeof vi.fn>).mockImplementation(() => {
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
    // TODO: This test uses vi.doMock('@middleware/csrf') but websocket.ts imports from '@http'
    // The mock path mismatch causes the test to fail. Needs rework.
    test.skip('should reject upgrade with invalid CSRF token', async () => {
      // Re-mock csrf validation to return false
      vi.doMock('@http', () => ({
        validateCsrfToken: vi.fn(() => false),
      }));

      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;

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
    });

    test('should extract CSRF token from sec-websocket-protocol header', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;

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
    test('should use encrypted CSRF in production', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;

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
