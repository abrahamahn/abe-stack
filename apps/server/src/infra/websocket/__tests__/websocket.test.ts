// apps/server/src/infra/websocket/__tests__/websocket.test.ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import websocketPlugin from '@fastify/websocket';
import { verifyToken } from '@modules/auth/utils/jwt';
import type { AppContext } from '@shared';

import { registerWebSocket } from '@websocket/websocket';

// Types for mock socket handlers
type SocketEventHandler = (data?: unknown) => void;
type MockOnCalls = Array<[string, SocketEventHandler]>;

function getMockHandler(
  mockCalls: MockOnCalls,
  eventName: string,
): SocketEventHandler {
  const found = mockCalls.find((call) => call[0] === eventName);
  if (!found) throw new Error(`Handler for '${eventName}' not found`);
  return found[1];
}

// Mock dependencies
vi.mock('@fastify/websocket', () => ({
  default: vi.fn(),
}));

vi.mock('@modules/auth/utils/jwt', () => ({
  verifyToken: vi.fn(),
}));

describe('registerWebSocket', () => {
  let mockServer: FastifyInstance;
  let mockCtx: AppContext;
  let registeredRoute: {
    path: string;
    options: { websocket: boolean };
    handler: (socket: unknown, req: FastifyRequest) => void;
  } | null;

  function getRoute() {
    if (!registeredRoute) throw new Error('Route not registered');
    return registeredRoute;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    registeredRoute = null;

    mockServer = {
      register: vi.fn().mockResolvedValue(undefined),
      get: vi.fn((path, options, handler) => {
        registeredRoute = { path, options, handler };
      }),
    } as unknown as FastifyInstance;

    mockCtx = {
      config: {
        auth: {
          jwt: {
            secret: 'test-secret',
          },
        },
      },
      log: {
        debug: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
      },
      pubsub: {
        handleMessage: vi.fn(),
        cleanup: vi.fn(),
      },
      db: {
        query: {},
      },
    } as unknown as AppContext;
  });

  describe('registration', () => {
    test('should register websocket plugin', async () => {
      await registerWebSocket(mockServer, mockCtx);

      expect(mockServer.register).toHaveBeenCalledWith(websocketPlugin);
    });

    test('should register /ws route with websocket option', async () => {
      await registerWebSocket(mockServer, mockCtx);

      expect(mockServer.get).toHaveBeenCalledWith('/ws', { websocket: true }, expect.any(Function));
    });
  });

  describe('connection handling', () => {
    beforeEach(async () => {
      await registerWebSocket(mockServer, mockCtx);
      expect(registeredRoute).not.toBeNull();
    });

    test('should close connection when no token provided', () => {
      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: {},
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(mockSocket.close).toHaveBeenCalledWith(1008, 'Authentication required');
    });

    test('should extract token from query parameter', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(verifyToken).toHaveBeenCalledWith('valid-token', 'test-secret');
      expect(mockSocket.close).not.toHaveBeenCalled();
    });

    test('should extract token from sec-websocket-protocol header', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: {},
        headers: { 'sec-websocket-protocol': 'token-value' },
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(verifyToken).toHaveBeenCalledWith('token-value', 'test-secret');
    });

    test('should filter out known protocols from sec-websocket-protocol', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: {},
        headers: { 'sec-websocket-protocol': 'graphql, actual-token' },
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(verifyToken).toHaveBeenCalledWith('actual-token', 'test-secret');
    });

    test('should extract token from cookies', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: {},
        headers: {},
        cookies: { accessToken: 'cookie-token' },
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(verifyToken).toHaveBeenCalledWith('cookie-token', 'test-secret');
    });

    test('should close connection with invalid token', () => {
      vi.mocked(verifyToken).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'invalid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(mockSocket.close).toHaveBeenCalledWith(1008, 'Invalid token');
    });

    test('should setup message handler on successful auth', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(mockSocket.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should log connection on successful auth', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      expect(mockCtx.log.debug).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
        'WebSocket client connected',
      );
    });
  });

  describe('message handling', () => {
    beforeEach(async () => {
      await registerWebSocket(mockServer, mockCtx);
    });

    test('should forward buffer messages to pubsub', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      // Get the message handler
      const mockCalls = mockSocket.on.mock.calls as MockOnCalls;
      const messageHandler = getMockHandler(mockCalls, 'message');

      // Call with buffer
      const bufferMessage = Buffer.from('{"type":"subscribe","key":"record:users:1"}');
      messageHandler(bufferMessage);

      expect(mockCtx.pubsub.handleMessage).toHaveBeenCalled();
    });

    test('should handle ArrayBuffer messages', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      const mockCalls = mockSocket.on.mock.calls as MockOnCalls;
      const messageHandler = getMockHandler(mockCalls, 'message');

      // Call with ArrayBuffer
      const encoder = new TextEncoder();
      const arrayBuffer = encoder.encode('{"type":"subscribe","key":"record:users:1"}').buffer;
      messageHandler(arrayBuffer);

      expect(mockCtx.pubsub.handleMessage).toHaveBeenCalled();
    });

    test('should handle array of buffers', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      const mockCalls = mockSocket.on.mock.calls as MockOnCalls;
      const messageHandler = getMockHandler(mockCalls, 'message');

      // Call with array of buffers
      const bufferArray = [
        Buffer.from('{"type":"sub'),
        Buffer.from('scribe","key":"record:users:1"}'),
      ];
      messageHandler(bufferArray);

      expect(mockCtx.pubsub.handleMessage).toHaveBeenCalled();
    });
  });

  describe('close handling', () => {
    beforeEach(async () => {
      await registerWebSocket(mockServer, mockCtx);
    });

    test('should cleanup subscriptions on close', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      // Get the close handler
      const mockCalls = mockSocket.on.mock.calls as MockOnCalls;
      const closeHandler = getMockHandler(mockCalls, 'close');

      closeHandler();

      expect(mockCtx.log.debug).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-123' }),
        'WebSocket client disconnected',
      );
      expect(mockCtx.pubsub.cleanup).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await registerWebSocket(mockServer, mockCtx);
    });

    test('should cleanup subscriptions on error', () => {
      vi.mocked(verifyToken).mockReturnValue({ userId: 'user-123' } as never);

      const mockSocket = {
        close: vi.fn(),
        on: vi.fn(),
      };

      const mockReq = {
        query: { token: 'valid-token' },
        headers: {},
        cookies: {},
      } as unknown as FastifyRequest;

      getRoute().handler({ socket: mockSocket }, mockReq);

      // Get the error handler
      const mockCalls = mockSocket.on.mock.calls as MockOnCalls;
      const errorHandler = getMockHandler(mockCalls, 'error');

      const testError = new Error('Connection error');
      errorHandler(testError);

      expect(mockCtx.log.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: testError, userId: 'user-123' }),
        'WebSocket error',
      );
      expect(mockCtx.pubsub.cleanup).toHaveBeenCalled();
    });
  });
});
