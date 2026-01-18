// packages/tests/src/mocks/http.ts
/**
 * Mock HTTP Request/Response Factories
 *
 * Creates mock Fastify-like request and reply objects for testing handlers.
 */

import { vi } from 'vitest';

/**
 * Mock request with cookies and headers
 */
export interface MockRequest {
  cookies: Record<string, string | undefined>;
  headers: Record<string, string | undefined>;
  user?: {
    userId: string;
    email?: string;
    role?: string;
  };
  ip?: string;
  body?: unknown;
  params?: Record<string, string>;
  query?: Record<string, string>;
}

/**
 * Mock reply with cookie methods
 */
export interface MockReply {
  setCookie: ReturnType<typeof vi.fn>;
  clearCookie: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  header: ReturnType<typeof vi.fn>;
}

/**
 * Create a mock request
 */
export function createMockRequest(overrides?: Partial<MockRequest>): MockRequest {
  return {
    cookies: {},
    headers: {},
    user: undefined,
    ip: '127.0.0.1',
    body: undefined,
    params: {},
    query: {},
    ...overrides,
  };
}

/**
 * Create a mock request with authentication
 */
export function createMockAuthenticatedRequest(
  userId: string,
  overrides?: Partial<MockRequest>,
): MockRequest {
  return createMockRequest({
    user: { userId },
    headers: { authorization: 'Bearer mock-token' },
    ...overrides,
  });
}

/**
 * Create a mock reply
 */
export function createMockReply(): MockReply {
  const reply: MockReply = {
    setCookie: vi.fn(),
    clearCookie: vi.fn(),
    status: vi.fn(),
    send: vi.fn(),
    header: vi.fn(),
  };

  // Chain methods
  reply.status.mockReturnValue(reply);
  reply.header.mockReturnValue(reply);

  return reply;
}

/**
 * Mock request info (IP, user agent, etc.)
 */
export interface MockRequestInfo {
  ipAddress: string;
  userAgent: string;
  origin?: string;
}

export function createMockRequestInfo(overrides?: Partial<MockRequestInfo>): MockRequestInfo {
  return {
    ipAddress: '127.0.0.1',
    userAgent: 'test-agent/1.0',
    origin: 'http://localhost:3000',
    ...overrides,
  };
}
