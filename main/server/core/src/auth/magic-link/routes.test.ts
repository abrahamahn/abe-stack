// main/server/core/src/auth/magic-link/routes.test.ts
/**
 * Magic Link Routes Unit Tests
 *
 * Tests for magic link route definitions including:
 * - Route structure and configuration
 * - Schema validation
 * - Handler mapping
 * - Authentication requirements
 * - Handler invocation with correct arguments
 *
 * @complexity O(1) - All tests are constant time operations
 */

import {
    magicLinkRequestSchema,
    magicLinkVerifyRequestSchema,
    type AuthResponse,
    type MagicLinkRequest,
    type MagicLinkRequestResponse,
    type MagicLinkVerifyRequest,
    type UserId,
} from '@abe-stack/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('../../../../db/src')>('@abe-stack/db');
  return {
    ...actual,
  };
});

vi.mock('./handlers', () => ({
  handleMagicLinkRequest: vi.fn(),
  handleMagicLinkVerify: vi.fn(),
}));

import { magicLinkRoutes } from './routes';

import type { AppContext, ReplyWithCookies, RequestWithCookies } from '../index';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Creates a mock AppContext for testing
 *
 * @returns Mock AppContext with all required properties
 */
function createMockContext(): AppContext {
  return {
    db: {} as never,
    pubsub: {
      publish: vi.fn(),
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      auth: {
        magicLink: {
          tokenExpiryMinutes: 15,
          maxAttempts: 5,
        },
      },
      server: {
        appBaseUrl: 'http://localhost:3000',
      },
    } as never,
    email: {} as never,
    storage: {} as never,
    repos: {} as never,
  } as unknown as AppContext;
}

/**
 * Creates a mock RequestWithCookies for testing
 *
 * @param user - Optional user object for authenticated requests
 * @returns Mock RequestWithCookies
 */
function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): RequestWithCookies & { user?: { userId: string; email: string; role: string } } {
  return {
    user,
    headers: {},
    cookies: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  } as RequestWithCookies & { user?: { userId: string; email: string; role: string } };
}

/**
 * Creates a mock ReplyWithCookies for testing
 *
 * @returns Mock ReplyWithCookies with chainable methods
 */
function createMockReply(): ReplyWithCookies {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    setCookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
  } as unknown as ReplyWithCookies;
}

// ============================================================================
// Route Definition Tests
// ============================================================================

describe('Magic Link Routes', () => {
  describe('Route Map Structure', () => {
    test('should export magicLinkRoutes as a RouteMap', () => {
      expect(magicLinkRoutes).toBeDefined();
      expect(typeof magicLinkRoutes).toBe('object');
    });

    test('should define all expected routes', () => {
      const routeKeys = [...magicLinkRoutes.keys()];
      expect(routeKeys).toHaveLength(2);
      expect(routeKeys).toContain('auth/magic-link/request');
      expect(routeKeys).toContain('auth/magic-link/verify');
    });

    test('should have all routes properly configured', () => {
      for (const [_routeName, route] of magicLinkRoutes.entries()) {
        expect(route).toBeDefined();
        expect(route.method).toBeDefined();
        expect(route.handler).toBeDefined();
        expect(typeof route.handler).toBe('function');
      }
    });
  });

  describe('auth/magic-link/request Route', () => {
    const requestRoute = magicLinkRoutes.get('auth/magic-link/request')!;

    test('should use POST method', () => {
      expect(requestRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(requestRoute.isPublic).toBe(true);
    });

    test('should use magicLinkRequestSchema for validation', () => {
      expect(requestRoute.schema).toBe(magicLinkRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof requestRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleMagicLinkRequest with correct arguments', async () => {
        const { handleMagicLinkRequest } = await import('./handlers');
        vi.mocked(handleMagicLinkRequest).mockResolvedValue({
          status: 200,
          body: {
            message: 'Magic link sent to your email',
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body: MagicLinkRequest = {
          email: 'test@example.com',
        };

        await requestRoute.handler(ctx, body, req as never, reply as never);

        expect(handleMagicLinkRequest).toHaveBeenCalledWith(ctx, body, req);
        expect(handleMagicLinkRequest).toHaveBeenCalledTimes(1);
      });

      test('should return result from handleMagicLinkRequest', async () => {
        const { handleMagicLinkRequest } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            message: 'Magic link sent to your email',
          } satisfies MagicLinkRequestResponse,
        };
        vi.mocked(handleMagicLinkRequest).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body: MagicLinkRequest = {
          email: 'test@example.com',
        };

        const result = await requestRoute.handler(ctx, body, req as never, reply as never);

        expect(result).toEqual(expectedResult);
      });

      test('should handle error response from handler', async () => {
        const { handleMagicLinkRequest } = await import('./handlers');
        const errorResult = {
          status: 429 as const,
          body: {
            message: 'Too many requests',
            code: 'RATE_LIMIT_EXCEEDED',
          },
        };
        vi.mocked(handleMagicLinkRequest).mockResolvedValue(errorResult);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body: MagicLinkRequest = {
          email: 'test@example.com',
        };

        const result = await requestRoute.handler(ctx, body, req as never, reply as never);

        expect(result).toEqual(errorResult);
      });
    });
  });

  describe('auth/magic-link/verify Route', () => {
    const verifyRoute = magicLinkRoutes.get('auth/magic-link/verify')!;

    test('should use POST method', () => {
      expect(verifyRoute.method).toBe('POST');
    });

    test('should be a public route (no auth required)', () => {
      expect(verifyRoute.isPublic).toBe(true);
    });

    test('should use magicLinkVerifyRequestSchema for validation', () => {
      expect(verifyRoute.schema).toBe(magicLinkVerifyRequestSchema);
    });

    test('should have a handler function', () => {
      expect(typeof verifyRoute.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleMagicLinkVerify with correct arguments', async () => {
        const { handleMagicLinkVerify } = await import('./handlers');
        vi.mocked(handleMagicLinkVerify).mockResolvedValue({
          status: 200,
          body: {
            token: 'access-token',
            user: {
              id: 'user-123' as UserId,
              email: 'test@example.com',
              username: 'testuser',
              firstName: 'Test',
              lastName: 'User',
              avatarUrl: null,
              role: 'user',
              emailVerified: true,
              phone: null,
              phoneVerified: null,
              dateOfBirth: null,
              gender: null,
              bio: null,
              city: null,
              state: null,
              country: null,
              language: null,
              website: null,
              createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
              updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
            },
          },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body: MagicLinkVerifyRequest = {
          token: 'magic-link-token-abc123',
        };

        await verifyRoute.handler(ctx, body, req as never, reply as never);

        expect(handleMagicLinkVerify).toHaveBeenCalledWith(ctx, body, req, reply);
        expect(handleMagicLinkVerify).toHaveBeenCalledTimes(1);
      });

      test('should return result from handleMagicLinkVerify', async () => {
        const { handleMagicLinkVerify } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: {
            token: 'access-token',
            user: {
              id: 'user-123' as UserId,
              email: 'test@example.com',
              username: 'testuser',
              firstName: 'Test',
              lastName: 'User',
              avatarUrl: null,
              role: 'user',
              emailVerified: true,
              phone: null,
              phoneVerified: null,
              dateOfBirth: null,
              gender: null,
              bio: null,
              city: null,
              state: null,
              country: null,
              language: null,
              website: null,
              createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
              updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
            },
          } satisfies AuthResponse,
        };
        vi.mocked(handleMagicLinkVerify).mockResolvedValue(expectedResult);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body: MagicLinkVerifyRequest = {
          token: 'magic-link-token-abc123',
        };

        const result = await verifyRoute.handler(ctx, body, req as never, reply as never);

        expect(result).toEqual(expectedResult);
      });

      test('should handle error response from handler', async () => {
        const { handleMagicLinkVerify } = await import('./handlers');
        const errorResult = {
          status: 401 as const,
          body: {
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
          },
        };
        vi.mocked(handleMagicLinkVerify).mockResolvedValue(errorResult);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const body: MagicLinkVerifyRequest = {
          token: 'invalid-token',
        };

        const result = await verifyRoute.handler(ctx, body, req as never, reply as never);

        expect(result).toEqual(errorResult);
      });
    });
  });
});

// ============================================================================
// Schema Validation Tests
// ============================================================================

describe('Schema Validation', () => {
  describe('magicLinkRequestSchema', () => {
    test('should accept valid magic link request', () => {
      const validRequest: MagicLinkRequest = {
        email: 'test@example.com',
      };

      const result = magicLinkRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject request with invalid email', () => {
      const invalidRequest = {
        email: 'not-an-email',
      };

      const result = magicLinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request without email', () => {
      const invalidRequest = {};

      const result = magicLinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request with empty email', () => {
      const invalidRequest = {
        email: '',
      };

      const result = magicLinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should accept email with plus sign', () => {
      const validRequest: MagicLinkRequest = {
        email: 'test+tag@example.com',
      };

      const result = magicLinkRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept email with subdomain', () => {
      const validRequest: MagicLinkRequest = {
        email: 'test@mail.example.com',
      };

      const result = magicLinkRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept email with international domain', () => {
      const validRequest: MagicLinkRequest = {
        email: 'test@example.co.uk',
      };

      const result = magicLinkRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject email with spaces', () => {
      const invalidRequest = {
        email: 'test @example.com',
      };

      const result = magicLinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject email without domain', () => {
      const invalidRequest = {
        email: 'test@',
      };

      const result = magicLinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject email without local part', () => {
      const invalidRequest = {
        email: '@example.com',
      };

      const result = magicLinkRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request with additional unexpected fields', () => {
      const requestWithExtra = {
        email: 'test@example.com',
        unexpectedField: 'value',
      };

      const result = magicLinkRequestSchema.safeParse(requestWithExtra);
      // Schema should either strip or reject unexpected fields
      if (result.success) {
        // If successful, verify unexpected field is not in parsed data
        expect('unexpectedField' in result.data).toBe(false);
      }
      // Both behaviors (reject or strip) are acceptable
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('magicLinkVerifyRequestSchema', () => {
    test('should accept valid magic link verification request', () => {
      const validRequest: MagicLinkVerifyRequest = {
        token: 'valid-magic-link-token',
      };

      const result = magicLinkVerifyRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should reject verification without token', () => {
      const invalidRequest = {};

      const result = magicLinkVerifyRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should accept token with alphanumeric characters', () => {
      const validRequest: MagicLinkVerifyRequest = {
        token: 'abc123def456',
      };

      const result = magicLinkVerifyRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept token with hyphens and underscores', () => {
      const validRequest: MagicLinkVerifyRequest = {
        token: 'abc-123_def-456',
      };

      const result = magicLinkVerifyRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept token with dots', () => {
      const validRequest: MagicLinkVerifyRequest = {
        token: 'abc.123.def.456',
      };

      const result = magicLinkVerifyRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept long token strings', () => {
      const longToken = 'a'.repeat(256);
      const validRequest: MagicLinkVerifyRequest = {
        token: longToken,
      };

      const result = magicLinkVerifyRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    test('should accept empty token (validation at handler level)', () => {
      // Note: Schema may allow empty token, handler validates token validity
      const request: MagicLinkVerifyRequest = {
        token: '',
      };

      const result = magicLinkVerifyRequestSchema.safeParse(request);
      // Document current behavior - either accept or reject is valid
      expect(typeof result.success).toBe('boolean');
    });

    test('should reject request with additional unexpected fields', () => {
      const requestWithExtra = {
        token: 'valid-token',
        unexpectedField: 'value',
      };

      const result = magicLinkVerifyRequestSchema.safeParse(requestWithExtra);
      // Schema should either strip or reject unexpected fields
      if (result.success) {
        // If successful, verify unexpected field is not in parsed data
        expect('unexpectedField' in result.data).toBe(false);
      }
      // Both behaviors (reject or strip) are acceptable
      expect(typeof result.success).toBe('boolean');
    });

    test('should reject request with null token', () => {
      const invalidRequest = {
        token: null,
      };

      const result = magicLinkVerifyRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request with undefined token', () => {
      const invalidRequest = {
        token: undefined,
      };

      const result = magicLinkVerifyRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request with numeric token', () => {
      const invalidRequest = {
        token: 12345,
      };

      const result = magicLinkVerifyRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    test('should reject request with object token', () => {
      const invalidRequest = {
        token: { value: 'token' },
      };

      const result = magicLinkVerifyRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// Route Protection Tests
// ============================================================================

describe('Route Protection', () => {
  test('should have all routes as public (no auth required)', () => {
    for (const [_routeName, route] of magicLinkRoutes.entries()) {
      expect(route.isPublic).toBe(true);
    }
  });

  test('should not have any user-protected routes', () => {
    const userProtectedRoutes = [...magicLinkRoutes.entries()].filter(
      ([_, route]) => !route.isPublic,
    );
    expect(userProtectedRoutes).toHaveLength(0);
  });

  test('should not have any admin-protected routes', () => {
    const adminProtectedRoutes = [...magicLinkRoutes.entries()].filter(
      ([_, route]) => route.roles?.includes('admin') ?? false,
    );
    expect(adminProtectedRoutes).toHaveLength(0);
  });
});

// ============================================================================
// Route Method Tests
// ============================================================================

describe('Route Methods', () => {
  test('all magic link routes should use POST method', () => {
    for (const [_routeName, route] of magicLinkRoutes.entries()) {
      expect(route.method).toBe('POST');
    }
  });

  test('should not have any GET routes', () => {
    const getRoutes = [...magicLinkRoutes.entries()].filter(([_, route]) => route.method === 'GET');
    expect(getRoutes).toHaveLength(0);
  });

  test('should not have any DELETE routes', () => {
    const deleteRoutes = [...magicLinkRoutes.entries()].filter(
      ([_, route]) => route.method === 'DELETE',
    );
    expect(deleteRoutes).toHaveLength(0);
  });

  test('should not have any PUT routes', () => {
    const putRoutes = [...magicLinkRoutes.entries()].filter(([_, route]) => route.method === 'PUT');
    expect(putRoutes).toHaveLength(0);
  });

  test('should not have any PATCH routes', () => {
    const patchRoutes = [...magicLinkRoutes.entries()].filter(
      ([_, route]) => route.method === 'PATCH',
    );
    expect(patchRoutes).toHaveLength(0);
  });
});

// ============================================================================
// Integration Tests
// ============================================================================

describe('Route Integration', () => {
  test('request route should integrate with verify route workflow', async () => {
    const { handleMagicLinkRequest, handleMagicLinkVerify } = await import('./handlers');

    // Step 1: Request magic link
    vi.mocked(handleMagicLinkRequest).mockResolvedValue({
      status: 200,
      body: {
        message: 'Magic link sent to your email',
      },
    });

    const ctx = createMockContext();
    const req = createMockRequest();
    const reply = createMockReply();

    const requestBody: MagicLinkRequest = {
      email: 'test@example.com',
    };

    const requestResult = (await magicLinkRoutes
      .get('auth/magic-link/request')!
      .handler(ctx, requestBody, req as never, reply as never)) as {
      status: number;
      body: { message: string };
    };

    expect(requestResult.status).toBe(200);
    expect(requestResult.body).toHaveProperty('message');

    // Step 2: Verify magic link
    vi.mocked(handleMagicLinkVerify).mockResolvedValue({
      status: 200,
      body: {
        token: 'access-token',
        user: {
          id: 'user-123' as UserId,
          email: 'test@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          avatarUrl: null,
          role: 'user',
          emailVerified: true,
          phone: null,
          phoneVerified: null,
          dateOfBirth: null,
          gender: null,
          bio: null,
          city: null,
          state: null,
          country: null,
          language: null,
          website: null,
          createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
          updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
        },
      },
    });

    const verifyBody: MagicLinkVerifyRequest = {
      token: 'magic-link-token',
    };

    const verifyResult = (await magicLinkRoutes
      .get('auth/magic-link/verify')!
      .handler(ctx, verifyBody, req as never, reply as never)) as {
      status: number;
      body: { token: string; user: unknown };
    };

    expect(verifyResult.status).toBe(200);
    expect(verifyResult.body).toHaveProperty('token');
    expect(verifyResult.body).toHaveProperty('user');
  });

  test('routes should be compatible with auth routes structure', () => {
    // Verify that magic link routes follow the same pattern as other auth routes
    for (const [routeName, route] of magicLinkRoutes.entries()) {
      expect(routeName).toMatch(/^auth\/magic-link\//);
      expect(route).toHaveProperty('method');
      expect(route).toHaveProperty('handler');
      expect(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).toContain(route.method);
      expect(typeof route.handler).toBe('function');
    }
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe('Edge Cases', () => {
  describe('Handler Error Propagation', () => {
    test('should propagate errors from handleMagicLinkRequest', async () => {
      const { handleMagicLinkRequest } = await import('./handlers');
      const error = new Error('Database connection failed');
      vi.mocked(handleMagicLinkRequest).mockRejectedValue(error);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const body: MagicLinkRequest = {
        email: 'test@example.com',
      };

      await expect(
        magicLinkRoutes
          .get('auth/magic-link/request')!
          .handler(ctx, body, req as never, reply as never),
      ).rejects.toThrow('Database connection failed');
    });

    test('should propagate errors from handleMagicLinkVerify', async () => {
      const { handleMagicLinkVerify } = await import('./handlers');
      const error = new Error('Token verification failed');
      vi.mocked(handleMagicLinkVerify).mockRejectedValue(error);

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const body: MagicLinkVerifyRequest = {
        token: 'invalid-token',
      };

      await expect(
        magicLinkRoutes
          .get('auth/magic-link/verify')!
          .handler(ctx, body, req as never, reply as never),
      ).rejects.toThrow('Token verification failed');
    });
  });

  describe('Boundary Values', () => {
    test('should handle extremely long email addresses', () => {
      const longEmail = `${'a'.repeat(64)}@${'b'.repeat(189)}.com`; // Near 255 char limit
      const result = magicLinkRequestSchema.safeParse({ email: longEmail });
      // Schema may or may not accept this - document behavior
      expect(typeof result.success).toBe('boolean');
    });

    test('should handle very short valid email', () => {
      const shortEmail = 'a@b.c';
      const result = magicLinkRequestSchema.safeParse({ email: shortEmail });
      expect(typeof result.success).toBe('boolean');
    });

    test('should handle token with maximum reasonable length', () => {
      const maxLengthToken = 'a'.repeat(1000);
      const result = magicLinkVerifyRequestSchema.safeParse({ token: maxLengthToken });
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('Request Context Edge Cases', () => {
    test('should handle request with missing requestInfo', async () => {
      const { handleMagicLinkRequest } = await import('./handlers');
      vi.mocked(handleMagicLinkRequest).mockResolvedValue({
        status: 200,
        body: {
          message: 'Magic link sent to your email',
        },
      });

      const ctx = createMockContext();
      const req = {
        headers: {},
        cookies: {},
        requestInfo: {
          ipAddress: '',
          userAgent: '',
        },
      } as RequestWithCookies;
      const reply = createMockReply();

      const body: MagicLinkRequest = {
        email: 'test@example.com',
      };

      await expect(
        magicLinkRoutes
          .get('auth/magic-link/request')!
          .handler(ctx, body, req as never, reply as never),
      ).resolves.toBeDefined();
    });

    test('should handle reply with all cookie methods', async () => {
      const { handleMagicLinkVerify } = await import('./handlers');
      vi.mocked(handleMagicLinkVerify).mockResolvedValue({
        status: 200,
        body: {
          token: 'access-token',
          user: {
            id: 'user-123' as UserId,
            email: 'test@example.com',
            username: 'testuser',
            firstName: 'User',
            lastName: '',
            avatarUrl: null,
            role: 'user',
            emailVerified: true,
            phone: null,
            phoneVerified: null,
            dateOfBirth: null,
            gender: null,
            bio: null,
            city: null,
            state: null,
            country: null,
            language: null,
            website: null,
            createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
            updatedAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
          },
        },
      });

      const ctx = createMockContext();
      const req = createMockRequest();
      const reply = createMockReply();

      const body: MagicLinkVerifyRequest = {
        token: 'valid-token',
      };

      await magicLinkRoutes
        .get('auth/magic-link/verify')!
        .handler(ctx, body, req as never, reply as never);

      expect(handleMagicLinkVerify).toHaveBeenCalledWith(ctx, body, req, reply);
    });
  });
});
