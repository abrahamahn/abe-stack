// apps/server/src/modules/auth/middleware.test.ts
import {
  createAuthGuard,
  createRequireAuth,
  createRequireRole,
  extractTokenPayload,
  isAdmin,
} from './middleware';
import { verifyToken } from './utils/jwt';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { UserRole } from '@abe-stack/core';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock the JWT verification module
vi.mock('./utils/jwt', () => ({
  verifyToken: vi.fn(),
}));

// ============================================================================
// Test Constants
// ============================================================================

const TEST_SECRET = 'test-secret-32-characters-long!!';

// ============================================================================
// Test Helpers
// ============================================================================

interface MockRequest extends Partial<FastifyRequest> {
  headers: { authorization?: string };
  user?: { userId: string; email: string; role: UserRole };
}

interface MockReply {
  status: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
}

function createMockRequest(authHeader?: string): MockRequest {
  return {
    headers: { authorization: authHeader },
    user: undefined,
  };
}

function createMockReply(): MockReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

// ============================================================================
// Tests: extractTokenPayload
// ============================================================================

describe('extractTokenPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should return null when no authorization header is present', () => {
    const request = createMockRequest();

    const result = extractTokenPayload(request as FastifyRequest, TEST_SECRET);

    expect(result).toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  test('should return null when authorization header does not start with Bearer', () => {
    const request = createMockRequest('Basic abc123');

    const result = extractTokenPayload(request as FastifyRequest, TEST_SECRET);

    expect(result).toBeNull();
    expect(verifyToken).not.toHaveBeenCalled();
  });

  test('should return payload for valid Bearer token', () => {
    const request = createMockRequest('Bearer valid-token');
    const mockPayload = { userId: 'user-123', email: 'test@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const result = extractTokenPayload(request as FastifyRequest, TEST_SECRET);

    expect(result).toEqual(mockPayload);
    expect(verifyToken).toHaveBeenCalledWith('valid-token', TEST_SECRET);
  });

  test('should return null when token verification fails', () => {
    const request = createMockRequest('Bearer invalid-token');
    vi.mocked(verifyToken).mockImplementation(() => {
      throw new Error('Token expired');
    });

    const result = extractTokenPayload(request as FastifyRequest, TEST_SECRET);

    expect(result).toBeNull();
  });

  test('should correctly extract token after "Bearer " prefix', () => {
    const request = createMockRequest('Bearer my.jwt.token');
    vi.mocked(verifyToken).mockReturnValue({
      userId: 'user-123',
      email: 'test@example.com',
      role: 'user',
    });

    extractTokenPayload(request as FastifyRequest, TEST_SECRET);

    expect(verifyToken).toHaveBeenCalledWith('my.jwt.token', TEST_SECRET);
  });
});

// ============================================================================
// Tests: createRequireAuth
// ============================================================================

describe('createRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should set user on request when token is valid', () => {
    const mockPayload = { userId: 'user-123', email: 'test@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireAuth = createRequireAuth(TEST_SECRET);

    requireAuth(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  test('should return 401 when no token is provided', () => {
    const request = createMockRequest();
    const reply = createMockReply();
    const requireAuth = createRequireAuth(TEST_SECRET);

    requireAuth(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(request.user).toBeUndefined();
  });

  test('should return 401 when token is invalid', () => {
    vi.mocked(verifyToken).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const request = createMockRequest('Bearer invalid-token');
    const reply = createMockReply();
    const requireAuth = createRequireAuth(TEST_SECRET);

    requireAuth(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(request.user).toBeUndefined();
  });
});

// ============================================================================
// Tests: createRequireRole
// ============================================================================

describe('createRequireRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should set user on request when token is valid and role is allowed', async () => {
    const mockPayload = { userId: 'user-123', email: 'admin@example.com', role: 'admin' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireRole = createRequireRole(TEST_SECRET, 'admin');

    await requireRole(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
  });

  test('should allow multiple roles', async () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'moderator@example.com',
      role: 'moderator' as const,
    };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireRole = createRequireRole(TEST_SECRET, 'admin', 'moderator');

    await requireRole(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
  });

  test('should return 401 when no token is provided', async () => {
    const request = createMockRequest();
    const reply = createMockReply();
    const requireRole = createRequireRole(TEST_SECRET, 'admin');

    await requireRole(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  test('should return 403 when role is not allowed', async () => {
    const mockPayload = { userId: 'user-123', email: 'user@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireRole = createRequireRole(TEST_SECRET, 'admin');

    await requireRole(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden: insufficient permissions' });
    expect(request.user).toBeUndefined();
  });

  test('should return 403 when user role not in allowed roles list', async () => {
    const mockPayload = { userId: 'user-123', email: 'user@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireRole = createRequireRole(TEST_SECRET, 'admin', 'moderator');

    await requireRole(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Forbidden: insufficient permissions' });
  });
});

// ============================================================================
// Tests: isAdmin
// ============================================================================

describe('isAdmin', () => {
  test('should return true when user role is admin', () => {
    const request = createMockRequest();
    request.user = { userId: 'user-123', email: 'admin@example.com', role: 'admin' };

    const result = isAdmin(request as FastifyRequest);

    expect(result).toBe(true);
  });

  test('should return false when user role is not admin', () => {
    const request = createMockRequest();
    request.user = { userId: 'user-123', email: 'user@example.com', role: 'user' };

    const result = isAdmin(request as FastifyRequest);

    expect(result).toBe(false);
  });

  test('should return false when user is undefined', () => {
    const request = createMockRequest();

    const result = isAdmin(request as FastifyRequest);

    expect(result).toBe(false);
  });

  test('should return false for moderator role', () => {
    const request = createMockRequest();
    request.user = { userId: 'user-123', email: 'mod@example.com', role: 'moderator' };

    const result = isAdmin(request as FastifyRequest);

    expect(result).toBe(false);
  });
});

// ============================================================================
// Tests: createAuthGuard
// ============================================================================

describe('createAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should create requireAuth guard when no roles are specified', async () => {
    const mockPayload = { userId: 'user-123', email: 'test@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const guard = createAuthGuard(TEST_SECRET);

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
  });

  test('should create requireRole guard when roles are specified', async () => {
    const mockPayload = { userId: 'user-123', email: 'user@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const guard = createAuthGuard(TEST_SECRET, 'admin');

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    // Should fail because user is not admin
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  test('should allow access when user has required role', async () => {
    const mockPayload = { userId: 'user-123', email: 'admin@example.com', role: 'admin' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const guard = createAuthGuard(TEST_SECRET, 'admin', 'moderator');

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
  });

  test('should return 401 when no token provided with empty roles', async () => {
    const request = createMockRequest();
    const reply = createMockReply();
    const guard = createAuthGuard(TEST_SECRET);

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });
});
