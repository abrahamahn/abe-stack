// main/server/core/src/auth/middleware.test.ts
import { ForbiddenError, UnauthorizedError } from '@bslt/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
  assertUserActive,
  createAuthGuard,
  createRequireAuth,
  createRequireRole,
  extractTokenPayload,
  isAdmin,
} from './middleware';
import { verifyToken } from './utils/jwt';

import type { UserRole } from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Repositories } from '../../../db/src';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock the JWT utils to intercept verifyToken used by middleware.ts
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
    headers: authHeader !== undefined && authHeader !== '' ? { authorization: authHeader } : {},
  };
}

function createMockReply(): MockReply {
  const reply = {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

const mockUnlockAccount = vi.fn();
const mockFindById = vi.fn();

const mockRepos = {
  users: {
    findById: mockFindById,
    unlockAccount: mockUnlockAccount,
  },
} as unknown as Repositories;

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
    expect(verifyToken).toHaveBeenCalledWith('valid-token', TEST_SECRET, undefined);
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

    expect(verifyToken).toHaveBeenCalledWith('my.jwt.token', TEST_SECRET, undefined);
  });
});

// ============================================================================
// Tests: createRequireAuth
// ============================================================================

describe('createRequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should set user on request when token is valid', async () => {
    const mockPayload = { userId: 'user-123', email: 'test@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireAuth = createRequireAuth(TEST_SECRET, mockRepos);

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

    await requireAuth(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
    expect(reply.send).not.toHaveBeenCalled();
  });

  test('should return 401 when no token is provided', async () => {
    const request = createMockRequest();
    const reply = createMockReply();
    const requireAuth = createRequireAuth(TEST_SECRET, mockRepos);

    await requireAuth(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(request.user).toBeUndefined();
  });

  test('should return 401 when token is invalid', async () => {
    vi.mocked(verifyToken).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const request = createMockRequest('Bearer invalid-token');
    const reply = createMockReply();
    const requireAuth = createRequireAuth(TEST_SECRET, mockRepos);

    await requireAuth(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
    expect(request.user).toBeUndefined();
  });

  test('should return 403 when user is locked', async () => {
    const mockPayload = { userId: 'user-123', email: 'test@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);
    mockFindById.mockResolvedValue({
      lockedUntil: new Date(Date.now() + 10000),
      lockReason: 'Banned',
    });

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireAuth = createRequireAuth(TEST_SECRET, mockRepos);

    await requireAuth(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(403);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Account locked: Banned' });
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
    const requireRole = createRequireRole(TEST_SECRET, mockRepos, 'admin');

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

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
    const requireRole = createRequireRole(TEST_SECRET, mockRepos, 'admin', 'moderator');

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

    await requireRole(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
  });

  test('should return 401 when no token is provided', async () => {
    const request = createMockRequest();
    const reply = createMockReply();
    const requireRole = createRequireRole(TEST_SECRET, mockRepos, 'admin');

    await requireRole(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  test('should return 403 when role is not allowed', async () => {
    const mockPayload = { userId: 'user-123', email: 'user@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const requireRole = createRequireRole(TEST_SECRET, mockRepos, 'admin');

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

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
    const requireRole = createRequireRole(TEST_SECRET, mockRepos, 'admin', 'moderator');

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

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
    const guard = createAuthGuard(TEST_SECRET, mockRepos);

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
  });

  test('should create requireRole guard when roles are specified', async () => {
    const mockPayload = { userId: 'user-123', email: 'user@example.com', role: 'user' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const guard = createAuthGuard(TEST_SECRET, mockRepos, 'admin');

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    // Should fail because user is not admin
    expect(reply.status).toHaveBeenCalledWith(403);
  });

  test('should allow access when user has required role', async () => {
    const mockPayload = { userId: 'user-123', email: 'admin@example.com', role: 'admin' as const };
    vi.mocked(verifyToken).mockReturnValue(mockPayload);

    const request = createMockRequest('Bearer valid-token');
    const reply = createMockReply();
    const guard = createAuthGuard(TEST_SECRET, mockRepos, 'admin', 'moderator');

    mockFindById.mockResolvedValue({ lockedUntil: null }); // Active user

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(request.user).toEqual(mockPayload);
    expect(reply.status).not.toHaveBeenCalled();
  });

  test('should return 401 when no token provided with empty roles', async () => {
    const request = createMockRequest();
    const reply = createMockReply();
    const guard = createAuthGuard(TEST_SECRET, mockRepos);

    await guard(request as FastifyRequest, reply as unknown as FastifyReply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(reply.send).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });
});

// ============================================================================
// Tests: assertUserActive
// ============================================================================

describe('assertUserActive', () => {
  test('should pass when user is active (lockedUntil is null)', async () => {
    const getUserById = vi.fn().mockResolvedValue({ lockedUntil: null, lockReason: null });

    await expect(assertUserActive(getUserById, 'user-123')).resolves.toBeUndefined();
    expect(getUserById).toHaveBeenCalledWith('user-123');
  });

  test('should pass when user lock has expired (lockedUntil in the past)', async () => {
    const pastDate = new Date(Date.now() - 60_000); // 1 minute ago
    const getUserById = vi.fn().mockResolvedValue({ lockedUntil: pastDate, lockReason: 'old' });

    await expect(assertUserActive(getUserById, 'user-123')).resolves.toBeUndefined();
  });

  test('should call onAutoUnlock when lock has expired', async () => {
    const pastDate = new Date(Date.now() - 60_000); // 1 minute ago
    const getUserById = vi.fn().mockResolvedValue({ lockedUntil: pastDate, lockReason: 'old' });
    const onAutoUnlock = vi.fn().mockResolvedValue(undefined);

    await assertUserActive(getUserById, 'user-123', onAutoUnlock);

    expect(onAutoUnlock).toHaveBeenCalledWith('user-123');
  });

  test('should not call onAutoUnlock when lock is still active', async () => {
    const futureDate = new Date(Date.now() + 3_600_000);
    const getUserById = vi
      .fn()
      .mockResolvedValue({ lockedUntil: futureDate, lockReason: 'Terms violation' });
    const onAutoUnlock = vi.fn().mockResolvedValue(undefined);

    await expect(assertUserActive(getUserById, 'user-123', onAutoUnlock)).rejects.toThrow(
      ForbiddenError,
    );
    expect(onAutoUnlock).not.toHaveBeenCalled();
  });

  test('should throw ForbiddenError when user is locked (lockedUntil in the future)', async () => {
    const futureDate = new Date(Date.now() + 3_600_000); // 1 hour from now
    const getUserById = vi
      .fn()
      .mockResolvedValue({ lockedUntil: futureDate, lockReason: 'Terms violation' });

    await expect(assertUserActive(getUserById, 'user-123')).rejects.toThrow(ForbiddenError);
    await expect(assertUserActive(getUserById, 'user-123')).rejects.toThrow(
      'Account locked: Terms violation',
    );
  });

  test('should include default reason when lockReason is null', async () => {
    const futureDate = new Date(Date.now() + 3_600_000);
    const getUserById = vi.fn().mockResolvedValue({ lockedUntil: futureDate, lockReason: null });

    await expect(assertUserActive(getUserById, 'user-123')).rejects.toThrow(
      'Account locked: Account suspended',
    );
  });

  test('should throw UnauthorizedError when user is not found', async () => {
    const getUserById = vi.fn().mockResolvedValue(null);

    await expect(assertUserActive(getUserById, 'nonexistent')).rejects.toThrow(UnauthorizedError);
    await expect(assertUserActive(getUserById, 'nonexistent')).rejects.toThrow('User not found');
  });
});
