// main/server/websocket/src/auth.test.ts
/**
 * WebSocket Authentication Unit Tests
 *
 * Focused tests for the WebSocket authentication handshake and token validation.
 * Covers edge cases in JWT extraction, cookie-based auth, subprotocol parsing,
 * and the interplay between CSRF validation and token verification.
 *
 * Complements lifecycle.test.ts with deeper auth-specific scenarios.
 */

import { EventEmitter } from 'node:events';

import { AUTH_CONSTANTS } from '@bslt/shared';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const { WS_CLOSE_POLICY_VIOLATION } = AUTH_CONSTANTS;

// Use vi.hoisted() for mock references in vi.mock() factories
const { mockHandleUpgrade, mockVerifyToken, mockValidateCsrfToken, mockParseCookies } = vi.hoisted(
  () => ({
    mockHandleUpgrade: vi.fn(),
    mockVerifyToken: vi.fn(() => ({ userId: 'auth-test-user' })),
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
import { resetStats } from './stats';

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
        jwt: { secret: 'test-jwt-secret-32chars-minimum!!' },
        cookie: { secret: 'test-cookie-secret-32chars-min!!' },
      },
    },
    ...overrides,
  } as unknown as WebSocketDeps;
}

function createMockServer(): { server: EventEmitter } {
  return { server: new EventEmitter() };
}

function createMockWs() {
  return {
    close: vi.fn(),
    on: vi.fn(),
    send: vi.fn(),
    readyState: 1, // OPEN
  };
}

function simulateUpgrade(
  mockServer: { server: EventEmitter },
  request: { url: string; headers: Record<string, string | undefined> },
) {
  const mockSocket = { write: vi.fn(), destroy: vi.fn() };
  mockServer.server.emit('upgrade', request, mockSocket, Buffer.alloc(0));
  return mockSocket;
}

// ============================================================================
// Tests
// ============================================================================

describe('WebSocket Authentication Handshake', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStats();
    mockHandleUpgrade.mockReset();
    mockVerifyToken.mockReset().mockReturnValue({ userId: 'auth-test-user' });
    mockValidateCsrfToken.mockReset().mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetStats();
  });

  describe('Token Extraction', () => {
    test('should extract JWT from sec-websocket-protocol header, skipping known subprotocols', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'graphql, json, my-jwt-token-here',
        },
      });

      // The token should be 'my-jwt-token-here', not 'graphql' or 'json'
      expect(mockVerifyToken).toHaveBeenCalledWith('my-jwt-token-here', expect.any(String));
      expect(mockWs.close).not.toHaveBeenCalled();
    });

    test('should skip csrf.* prefixed subprotocols when extracting JWT', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'csrf.some-csrf-token, Bearer, actual-jwt-token',
        },
      });

      // Should use 'actual-jwt-token', not 'csrf.some-csrf-token' or 'Bearer'
      expect(mockVerifyToken).toHaveBeenCalledWith('actual-jwt-token', expect.any(String));
    });

    test('should fall back to accessToken cookie when no subprotocol token', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie; accessToken=cookie-jwt-token',
          // No sec-websocket-protocol header
        },
      });

      expect(mockVerifyToken).toHaveBeenCalledWith('cookie-jwt-token', expect.any(String));
      expect(mockWs.close).not.toHaveBeenCalled();
    });

    test('should reject connection when neither subprotocol nor cookie provides a token', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          // No sec-websocket-protocol, no accessToken cookie
        },
      });

      expect(mockWs.close).toHaveBeenCalledWith(
        WS_CLOSE_POLICY_VIOLATION,
        'Authentication required',
      );
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });

  describe('Token Validation', () => {
    test('should verify token using the configured JWT secret', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'valid-token',
        },
      });

      expect(mockVerifyToken).toHaveBeenCalledWith(
        'valid-token',
        'test-jwt-secret-32chars-minimum!!',
      );
    });

    test('should close connection with policy violation on expired token', () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'expired-token',
        },
      });

      expect(mockWs.close).toHaveBeenCalledWith(WS_CLOSE_POLICY_VIOLATION, 'Invalid token');
      expect(mockCtx.log.warn).toHaveBeenCalledWith(
        'WebSocket token verification failed',
        expect.objectContaining({ err: expect.any(Error) }),
      );
    });

    test('should close connection with policy violation on malformed token', () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('jwt malformed');
      });

      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'not-a-jwt',
        },
      });

      expect(mockWs.close).toHaveBeenCalledWith(WS_CLOSE_POLICY_VIOLATION, 'Invalid token');
    });

    test('should register message, close, and error handlers on successful auth', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'valid-token',
        },
      });

      // After successful auth, handlers should be registered
      expect(mockWs.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockWs.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    test('should not register handlers when auth fails', () => {
      mockVerifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'bad-token',
        },
      });

      // Close should be called, but no message/close/error handlers registered
      expect(mockWs.close).toHaveBeenCalled();
      expect(mockWs.on).not.toHaveBeenCalled();
    });
  });

  describe('CSRF + Auth Interaction', () => {
    test('should reject before auth if CSRF is invalid', () => {
      mockValidateCsrfToken.mockReturnValue(false);

      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = simulateUpgrade(mockServer, {
        url: '/ws',
        headers: {
          host: 'localhost',
          cookie: '_csrf=invalid',
          'sec-websocket-protocol': 'valid-jwt-token',
        },
      });

      // Should reject at CSRF stage, never reaching token verification
      expect(mockSocket.write).toHaveBeenCalledWith(expect.stringContaining('403'));
      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });

    test('should extract CSRF token from query parameter', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=query-csrf-token',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'jwt-token',
        },
      });

      // CSRF should have been validated (passed)
      expect(mockValidateCsrfToken).toHaveBeenCalled();
      // Should proceed to JWT verification
      expect(mockVerifyToken).toHaveBeenCalled();
    });

    test('should extract CSRF token from sec-websocket-protocol csrf.* prefix', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'csrf.my-csrf-token, jwt-token',
        },
      });

      // CSRF should have been called with the extracted token
      expect(mockValidateCsrfToken).toHaveBeenCalled();
      // Should also proceed to JWT verification
      expect(mockVerifyToken).toHaveBeenCalled();
    });
  });

  describe('Connection Lifecycle After Auth', () => {
    test('should log userId on successful connection', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();
      const mockWs = createMockWs();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      mockHandleUpgrade.mockImplementation(
        (_req: unknown, _socket: unknown, _head: unknown, cb: (ws: typeof mockWs) => void) => {
          cb(mockWs);
        },
      );

      simulateUpgrade(mockServer, {
        url: '/ws?csrf=valid',
        headers: {
          host: 'localhost',
          cookie: '_csrf=csrf-cookie',
          'sec-websocket-protocol': 'valid-token',
        },
      });

      expect(mockCtx.log.debug).toHaveBeenCalledWith(
        'WebSocket client connected',
        expect.objectContaining({
          userId: 'auth-test-user',
          activeConnections: 1,
        }),
      );
    });

    test('should ignore non-websocket path upgrades', () => {
      const mockServer = createMockServer();
      const mockCtx = createMockCtx();

      registerWebSocket(mockServer as never, mockCtx, { verifyToken: mockVerifyToken });

      const mockSocket = simulateUpgrade(mockServer, {
        url: '/api/not-ws',
        headers: { host: 'localhost' },
      });

      expect(mockSocket.destroy).toHaveBeenCalled();
      expect(mockVerifyToken).not.toHaveBeenCalled();
    });
  });
});
