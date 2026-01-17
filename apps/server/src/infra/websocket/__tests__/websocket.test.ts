// apps/server/src/infra/websocket/__tests__/websocket.test.ts
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

// Mock external dependencies
vi.mock('@fastify/websocket', () => ({
  default: vi.fn(),
}));

vi.mock('@modules/auth/utils/jwt', () => ({
  verifyToken: vi.fn(() => ({ userId: 'test-user-123' })),
}));

describe('WebSocket Module', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getWebSocketStats', () => {
    test('should return initial stats with zero connections', async () => {
      const { getWebSocketStats } = await import('@websocket/websocket');
      const stats = getWebSocketStats();

      expect(stats).toEqual({
        activeConnections: 0,
        pluginRegistered: false,
      });
    });

    test('should report pluginRegistered as true after registerWebSocket', async () => {
      const { getWebSocketStats, registerWebSocket } = await import('@websocket/websocket');

      const mockServer = {
        register: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
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

      await registerWebSocket(mockServer as never, mockCtx as never);

      const stats = getWebSocketStats();
      expect(stats.pluginRegistered).toBe(true);
    });
  });

  describe('registerWebSocket', () => {
    test('should register websocket plugin', async () => {
      const { registerWebSocket } = await import('@websocket/websocket');

      const mockServer = {
        register: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
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

      await registerWebSocket(mockServer as never, mockCtx as never);

      expect(mockServer.register).toHaveBeenCalled();
    });

    test('should register /ws route with websocket option', async () => {
      const { registerWebSocket } = await import('@websocket/websocket');

      const mockServer = {
        register: vi.fn().mockResolvedValue(undefined),
        get: vi.fn(),
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
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

      await registerWebSocket(mockServer as never, mockCtx as never);

      expect(mockServer.get).toHaveBeenCalledWith(
        '/ws',
        { websocket: true },
        expect.any(Function),
      );
    });
  });

  describe('handleConnection (via route handler)', () => {
    test('should close socket if no token provided', async () => {
      const { registerWebSocket } = await import('@websocket/websocket');

      let routeHandler: (connection: unknown, req: unknown) => void = () => {};

      const mockServer = {
        register: vi.fn().mockResolvedValue(undefined),
        get: vi.fn((path: string, options: unknown, handler: typeof routeHandler) => {
          routeHandler = handler;
        }),
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
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

      await registerWebSocket(mockServer as never, mockCtx as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
        send: vi.fn(),
      };

      const mockConnection = { socket: mockSocket };
      const mockRequest = {
        query: {},
        headers: {},
        cookies: {},
      };

      routeHandler(mockConnection, mockRequest);

      expect(mockSocket.close).toHaveBeenCalledWith(1008, 'Authentication required');
    });

    test('should accept connection with token in query param', async () => {
      const { registerWebSocket } = await import('@websocket/websocket');
      const { verifyToken } = await import('@modules/auth/utils/jwt');

      let routeHandler: (connection: unknown, req: unknown) => void = () => {};

      const mockServer = {
        register: vi.fn().mockResolvedValue(undefined),
        get: vi.fn((path: string, options: unknown, handler: typeof routeHandler) => {
          routeHandler = handler;
        }),
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
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

      await registerWebSocket(mockServer as never, mockCtx as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
        send: vi.fn(),
      };

      const mockConnection = { socket: mockSocket };
      const mockRequest = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      };

      routeHandler(mockConnection, mockRequest);

      expect(verifyToken).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockSocket.close).not.toHaveBeenCalled();
      expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should accept connection with token in cookie', async () => {
      const { registerWebSocket } = await import('@websocket/websocket');
      const { verifyToken } = await import('@modules/auth/utils/jwt');

      let routeHandler: (connection: unknown, req: unknown) => void = () => {};

      const mockServer = {
        register: vi.fn().mockResolvedValue(undefined),
        get: vi.fn((path: string, options: unknown, handler: typeof routeHandler) => {
          routeHandler = handler;
        }),
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
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

      await registerWebSocket(mockServer as never, mockCtx as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
        send: vi.fn(),
      };

      const mockConnection = { socket: mockSocket };
      const mockRequest = {
        query: {},
        headers: {},
        cookies: { accessToken: 'cookie-token' },
      };

      routeHandler(mockConnection, mockRequest);

      expect(verifyToken).toHaveBeenCalledWith('cookie-token', 'test-secret');
      expect(mockSocket.close).not.toHaveBeenCalled();
    });

    test('should close socket if token is invalid', async () => {
      const { registerWebSocket } = await import('@websocket/websocket');
      const { verifyToken } = await import('@modules/auth/utils/jwt');

      (verifyToken as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      let routeHandler: (connection: unknown, req: unknown) => void = () => {};

      const mockServer = {
        register: vi.fn().mockResolvedValue(undefined),
        get: vi.fn((path: string, options: unknown, handler: typeof routeHandler) => {
          routeHandler = handler;
        }),
      };

      const mockCtx = {
        log: {
          debug: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
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

      await registerWebSocket(mockServer as never, mockCtx as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
        send: vi.fn(),
      };

      const mockConnection = { socket: mockSocket };
      const mockRequest = {
        query: { token: 'invalid-token' },
        headers: {},
        cookies: {},
      };

      routeHandler(mockConnection, mockRequest);

      expect(mockSocket.close).toHaveBeenCalledWith(1008, 'Invalid token');
    });
  });
});
