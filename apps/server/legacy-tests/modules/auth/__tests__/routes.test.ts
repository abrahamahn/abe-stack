// apps/server/src/modules/users/__tests__/routes.test.ts
/**
 * User Routes Tests
 *
 * Tests route registration, handler mapping, pagination handling,
 * and authentication requirements for user routes.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { userRoutes } from '@users/routes';

import type { CursorPaginatedResult, CursorPaginationOptions, User } from '@abe-stack/core';
import type { AppContext, RequestWithCookies } from '@shared';

// ============================================================================
// Mock Dependencies
// ============================================================================

// Mock the service module so real handlers can run with mocked DB calls
vi.mock('@users/service', () => ({
  getUserById: vi.fn(),
  listUsers: vi.fn(),
}));

vi.mock('@users/profile.service', () => ({
  getAvatarUrl: vi.fn().mockResolvedValue(null),
  updateProfile: vi.fn(),
  changePassword: vi.fn(),
  deleteAvatar: vi.fn(),
  uploadAvatar: vi.fn(),
}));

// Import mocked service functions
import * as userService from '@users/service';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AppContext {
  return {
    db: {} as never,
    repos: {
      users: {} as never,
      refreshTokens: {} as never,
      refreshTokenFamilies: {} as never,
      loginAttempts: {} as never,
      passwordResetTokens: {} as never,
      emailVerificationTokens: {} as never,
      securityEvents: {} as never,
      magicLinkTokens: {} as never,
      oauthConnections: {} as never,
      pushSubscriptions: {} as never,
      notificationPreferences: {} as never,
      plans: {} as never,
      subscriptions: {} as never,
      customerMappings: {} as never,
      invoices: {} as never,
      paymentMethods: {} as never,
      billingEvents: {} as never,
    },
    config: {
      auth: {
        jwt: { secret: 'test-secret-32-characters-long!!' },
        argon2: {},
        refreshToken: { expiryDays: 7 },
      },
      server: {
        port: 8080,
        appBaseUrl: 'http://localhost:8080',
      },
    } as never,
    log: {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      child: vi.fn().mockReturnThis(),
    } as never,
    pubsub: {} as never,
    email: {} as never,
    storage: {} as never,
    cache: {} as never,
  };
}

interface PaginationRequest {
  pagination: {
    type: 'cursor' | 'offset';
    cursor?: CursorPaginationOptions;
    helpers: {
      createCursorResult: <T>(
        data: T[],
        nextCursor: string | null,
        hasNext: boolean,
        limit: number,
      ) => CursorPaginatedResult<T>;
      applyCursorPagination: () => void;
    };
  };
}

function createMockRequest(
  user?: { userId: string; email: string; role: string },
  pagination?: PaginationRequest['pagination'],
): RequestWithCookies & Partial<PaginationRequest> {
  return {
    cookies: {},
    headers: { authorization: user ? 'Bearer test-token' : undefined },
    user,
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
    ...(pagination && { pagination }),
  };
}

function createMockCursorPagination(
  options?: Partial<CursorPaginationOptions>,
): PaginationRequest['pagination'] {
  return {
    type: 'cursor',
    cursor: {
      limit: 10,
      cursor: undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      ...options,
    },
    helpers: {
      createCursorResult: <T>(
        data: T[],
        nextCursor: string | null,
        hasNext: boolean,
        limit: number,
      ): CursorPaginatedResult<T> => ({
        data,
        nextCursor,
        hasNext,
        limit,
      }),
      applyCursorPagination: vi.fn(),
    },
  };
}

function createMockOffsetPagination(): PaginationRequest['pagination'] {
  return {
    type: 'offset',
    helpers: {
      createCursorResult: vi.fn() as never,
      applyCursorPagination: vi.fn(),
    },
  };
}

// ============================================================================
// Route Definition Tests
// ============================================================================

describe('User Routes Definition', () => {
  describe('Route Map Structure', () => {
    test('should define all required user routes', () => {
      const expectedRoutes = [
        'users/me',
        'users/me/update',
        'users/me/password',
        'users/me/avatar',
        'users/me/avatar/delete',
        'users/me/sessions',
        'users/me/sessions/:id',
        'users/me/sessions/revoke-all',
        'users/list',
      ];

      for (const route of expectedRoutes) {
        expect(userRoutes[route]).toBeDefined();
      }
    });

    test('should have correct number of routes', () => {
      expect(Object.keys(userRoutes)).toHaveLength(9);
    });
  });

  describe('Route Methods', () => {
    test('users/me should be GET', () => {
      expect(userRoutes['users/me']!.method).toBe('GET');
    });

    test('users/list should be GET', () => {
      expect(userRoutes['users/list']!.method).toBe('GET');
    });
  });

  describe('Route Authentication Requirements', () => {
    test('users/me should require user authentication', () => {
      expect(userRoutes['users/me']!.auth).toBe('user');
    });

    test('users/list should require admin authentication', () => {
      expect(userRoutes['users/list']!.auth).toBe('admin');
    });
  });

  describe('Route Schema Assignments', () => {
    test('users/me should not have a request body schema', () => {
      expect(userRoutes['users/me']!.schema).toBeUndefined();
    });

    test('users/list should not have a request body schema', () => {
      expect(userRoutes['users/list']!.schema).toBeUndefined();
    });
  });
});

// ============================================================================
// Handler Mapping Tests
// ============================================================================

describe('User Routes Handler Mapping', () => {
  let ctx: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  describe('users/me handler', () => {
    test('should return user data when user is found', async () => {
      const user = { userId: 'user-123', email: 'test@example.com', role: 'user' };
      const request = createMockRequest(user);

      // Mock the service to return a user
      (userService.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: new Date('2024-01-01T00:00:00.000Z'),
      });

      const result = await userRoutes['users/me']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('id', 'user-123');
      expect(result.body).toHaveProperty('email', 'test@example.com');
    });

    test('should handle unauthorized requests', async () => {
      const request = createMockRequest(undefined);

      const result = await userRoutes['users/me']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(401);
    });

    test('should handle user not found', async () => {
      const user = { userId: 'nonexistent-user', email: 'test@example.com', role: 'user' };
      const request = createMockRequest(user);

      // Mock the service to return null (user not found)
      (userService.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await userRoutes['users/me']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(404);
    });

    test('should handle internal server errors', async () => {
      const user = { userId: 'user-123', email: 'test@example.com', role: 'user' };
      const request = createMockRequest(user);

      // Mock the service to throw an error
      (userService.getUserById as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Database error'),
      );

      const result = await userRoutes['users/me']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(500);
    });
  });
});

// ============================================================================
// Pagination Tests for users/list
// ============================================================================

describe('User Routes Pagination (users/list)', () => {
  let ctx: AppContext;

  // Mock user data for tests
  const mockUsers = [
    {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'User One',
      role: 'user' as const,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'user-2',
      email: 'user2@example.com',
      name: 'User Two',
      role: 'user' as const,
      createdAt: new Date('2024-01-02'),
    },
    {
      id: 'user-3',
      email: 'user3@example.com',
      name: 'User Three',
      role: 'user' as const,
      createdAt: new Date('2024-01-03'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();

    // Default mock: return mock users
    (userService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      users: mockUsers,
      nextCursor: null,
      hasNext: false,
    });
  });

  describe('Cursor Pagination', () => {
    test('should return paginated users list with cursor pagination', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 2 });
      const request = createMockRequest(user, pagination);

      // Mock to return 2 users
      (userService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
        users: mockUsers.slice(0, 2),
        nextCursor: 'cursor-123',
        hasNext: true,
      });

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('data');
      expect(result.body).toHaveProperty('nextCursor');
      expect(result.body).toHaveProperty('hasNext');
      expect(result.body).toHaveProperty('limit');
      expect((result.body as CursorPaginatedResult<User>).data).toHaveLength(2);
    });

    test('should include pagination metadata in response', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 10 });
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      const body = result.body as CursorPaginatedResult<User>;
      expect(body).toHaveProperty('nextCursor');
      expect(body).toHaveProperty('hasNext');
      expect(body).toHaveProperty('limit');
      expect(body.limit).toBe(10);
    });

    test('should use pagination helpers to create result', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 5 });
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(200);
      // The handler should use pagination.helpers.createCursorResult
      const body = result.body as CursorPaginatedResult<User>;
      expect(body.limit).toBe(5);
    });
  });

  describe('Pagination Error Handling', () => {
    test('should return 400 when pagination type is not cursor', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockOffsetPagination();
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(400);
      expect(result.body).toEqual({ message: 'This endpoint only supports cursor pagination' });
    });

    test('should return 400 when cursor pagination options are missing', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination: PaginationRequest['pagination'] = {
        type: 'cursor',
        cursor: undefined,
        helpers: {
          createCursorResult: vi.fn() as never,
          applyCursorPagination: vi.fn(),
        },
      };
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      expect(result.status).toBe(400);
      // Handler uses the same error message for both non-cursor type and missing cursor options
      expect(result.body).toEqual({ message: 'This endpoint only supports cursor pagination' });
    });
  });

  describe('Mock User Data', () => {
    test('should return mock users with correct structure', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 10 });
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      const body = result.body as CursorPaginatedResult<User>;
      expect(body.data.length).toBeGreaterThan(0);

      // Verify user structure
      const firstUser = body.data[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('email');
      expect(firstUser).toHaveProperty('name');
      expect(firstUser).toHaveProperty('role');
      expect(firstUser).toHaveProperty('createdAt');
    });

    test('should return users with valid email format', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 10 });
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      const body = result.body as CursorPaginatedResult<User>;
      for (const mockUser of body.data) {
        expect(mockUser.email).toMatch(/@example\.com$/);
      }
    });

    test('should return users with user role', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 10 });
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      const body = result.body as CursorPaginatedResult<User>;
      for (const mockUser of body.data) {
        expect(mockUser.role).toBe('user');
      }
    });
  });

  describe('Pagination Response Structure', () => {
    test('should have hasNext set to false for mock data', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 10 });
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      const body = result.body as CursorPaginatedResult<User>;
      expect(body.hasNext).toBe(false);
    });

    test('should have null nextCursor for mock data', async () => {
      const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
      const pagination = createMockCursorPagination({ limit: 10 });
      const request = createMockRequest(user, pagination);

      const result = await userRoutes['users/list']!.handler(
        ctx,
        undefined,
        request as never,
        {} as never,
      );

      const body = result.body as CursorPaginatedResult<User>;
      expect(body.nextCursor).toBeNull();
    });
  });
});

// ============================================================================
// Route Return Value Tests
// ============================================================================

describe('User Routes Return Values', () => {
  let ctx: AppContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();

    // Setup default service mocks
    (userService.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      role: 'user',
      createdAt: new Date('2024-01-01'),
    });
    (userService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      users: [
        {
          id: 'user-1',
          email: 'user1@example.com',
          name: 'User One',
          role: 'user',
          createdAt: new Date('2024-01-01'),
        },
      ],
      nextCursor: null,
      hasNext: false,
    });
  });

  test('users/me should return RouteResult with status and body', async () => {
    const user = { userId: 'user-123', email: 'test@example.com', role: 'user' };
    const request = createMockRequest(user);

    const result = await userRoutes['users/me']!.handler(
      ctx,
      undefined,
      request as never,
      {} as never,
    );

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('body');
    expect(typeof result.status).toBe('number');
  });

  test('users/list should return RouteResult with status and body', async () => {
    const user = { userId: 'admin-123', email: 'admin@example.com', role: 'admin' };
    const pagination = createMockCursorPagination({ limit: 10 });
    const request = createMockRequest(user, pagination);

    const result = await userRoutes['users/list']!.handler(
      ctx,
      undefined,
      request as never,
      {} as never,
    );

    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('body');
    expect(typeof result.status).toBe('number');
  });
});

// ============================================================================
// Route Type Tests
// ============================================================================

describe('User Routes Type Safety', () => {
  test('should have handler function defined', () => {
    expect(typeof userRoutes['users/me']!.handler).toBe('function');
    expect(typeof userRoutes['users/list']!.handler).toBe('function');
  });

  test('handler should be async', async () => {
    const meHandler = userRoutes['users/me']!.handler;
    const listHandler = userRoutes['users/list']!.handler;

    // Check that handlers return promises
    const ctx = createMockContext();
    const request = createMockRequest({ userId: '1', email: 'test@example.com', role: 'user' });

    // Setup service mocks
    (userService.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: '1',
      email: 'test@example.com',
      name: null,
      role: 'user',
      createdAt: new Date(),
    });
    (userService.listUsers as ReturnType<typeof vi.fn>).mockResolvedValue({
      users: [],
      nextCursor: null,
      hasNext: false,
    });

    const meResult = meHandler(ctx, undefined, request as never, {} as never);
    expect(meResult).toBeInstanceOf(Promise);

    const pagination = createMockCursorPagination({ limit: 10 });
    const adminRequest = createMockRequest(
      { userId: 'admin', email: 'admin@example.com', role: 'admin' },
      pagination,
    );
    const listResult = listHandler(ctx, undefined, adminRequest as never, {} as never);
    expect(listResult).toBeInstanceOf(Promise);
  });
});
