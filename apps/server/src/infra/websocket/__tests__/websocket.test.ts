// apps/server/src/infra/websocket/__tests__/websocket.test.ts
import { EventEmitter } from 'node:events';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type * as JwtModule from '../../../modules/auth/utils/jwt.js';
import type * as WebSocketModule from '../websocket.js';

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

vi.mock('../../../modules/auth/utils/jwt.js', () => ({
  verifyToken: vi.fn(() => ({ userId: 'test-user-123' })),
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
    test('should close socket if no token provided', async () => {
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

      expect(mockWs.close).toHaveBeenCalledWith(1008, 'Authentication required');
    });

    test('should accept connection with token in query param', async () => {
      const { registerWebSocket } = (await import('../websocket.js')) as WebSocketModuleType;
      const { verifyToken } = (await import('../../../modules/auth/utils/jwt.js')) as JwtModuleType;

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
      const { verifyToken } = (await import('../../../modules/auth/utils/jwt.js')) as JwtModuleType;

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
      const { verifyToken } = (await import('../../../modules/auth/utils/jwt.js')) as JwtModuleType;

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
          },
        },
        pubsub: {
          handleMessage: vi.fn(),
          cleanup: vi.fn(),
        },
      };

      registerWebSocket(mockServer as never, mockCtx as never);

      const mockSocket = {
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
});
