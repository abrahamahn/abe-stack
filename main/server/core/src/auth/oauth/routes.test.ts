// main/server/core/src/auth/oauth/routes.test.ts
/**
 * OAuth Routes Unit Tests
 *
 * Tests for OAuth route definitions including:
 * - Route structure and configuration
 * - Handler mapping and invocation
 * - Authentication requirements
 * - HTTP method correctness
 * - Provider-specific route registration
 *
 * @complexity O(1) - Direct route definition validation
 */

import { emptyBodySchema } from '@bslt/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('@bslt/server-system', async () => {
  const actual = await vi.importActual<typeof import('../../../../system/src')>(
    '@bslt/server-system',
  );
  return {
    ...actual,
  };
});

vi.mock('./handlers', () => ({
  handleGetConnections: vi.fn(),
  handleOAuthCallbackRequest: vi.fn(),
  handleOAuthInitiate: vi.fn(),
  handleOAuthLink: vi.fn(),
  handleOAuthUnlink: vi.fn(),
}));

import { oauthRoutes } from './routes';

import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RouteDefinition } from '../../../../system/src';
import type { AppContext } from '../index';

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create mock AppContext for testing
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
        oauth: {
          google: {
            enabled: true,
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
          },
          github: {
            enabled: true,
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
          },
          apple: {
            enabled: true,
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret',
          },
        },
      },
      server: {
        appBaseUrl: 'http://localhost:3000',
      },
    } as never,
    email: {} as never,
    storage: {} as never,
  } as unknown as AppContext;
}

/**
 * Create mock FastifyRequest for testing
 */
function createMockRequest(user?: {
  userId: string;
  email: string;
  role: string;
}): FastifyRequest & {
  user?: { userId: string; email: string; role: string };
  requestInfo: { ipAddress: string; userAgent: string };
} {
  return {
    user,
    headers: {},
    query: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  } as FastifyRequest & {
    user?: { userId: string; email: string; role: string };
    requestInfo: { ipAddress: string; userAgent: string };
  };
}

/**
 * Create mock FastifyReply for testing
 */
function createMockReply(): FastifyReply {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
  } as unknown as FastifyReply;
}

// ============================================================================
// Route Map Structure Tests
// ============================================================================

describe('OAuth Routes', () => {
  describe('Route Map Structure', () => {
    test('should export oauthRoutes as a RouteMap', () => {
      expect(oauthRoutes).toBeDefined();
      expect(typeof oauthRoutes).toBe('object');
    });

    test('should define all expected OAuth routes', () => {
      const routeKeys = Array.from(oauthRoutes.keys());
      // 1 providers + 3 initiate + 3 callback + 3 link + 3 unlink + 1 connections = 14 routes
      expect(routeKeys).toHaveLength(14);

      // Providers route
      expect(routeKeys).toContain('auth/oauth/providers');

      // Initiate routes
      expect(routeKeys).toContain('auth/oauth/google');
      expect(routeKeys).toContain('auth/oauth/github');
      expect(routeKeys).toContain('auth/oauth/apple');

      // Callback routes
      expect(routeKeys).toContain('auth/oauth/google/callback');
      expect(routeKeys).toContain('auth/oauth/github/callback');
      expect(routeKeys).toContain('auth/oauth/apple/callback');

      // Link routes
      expect(routeKeys).toContain('auth/oauth/google/link');
      expect(routeKeys).toContain('auth/oauth/github/link');
      expect(routeKeys).toContain('auth/oauth/apple/link');

      // Unlink routes
      expect(routeKeys).toContain('auth/oauth/google/unlink');
      expect(routeKeys).toContain('auth/oauth/github/unlink');
      expect(routeKeys).toContain('auth/oauth/apple/unlink');

      // Connections route
      expect(routeKeys).toContain('auth/oauth/connections');
    });

    test('should have valid route definitions for all routes', () => {
      for (const [_path, definition] of oauthRoutes.entries()) {
        expect(definition).toBeDefined();
        expect(definition.method).toBeDefined();
        expect(definition.handler).toBeDefined();
        expect(typeof definition.handler).toBe('function');
      }
    });
  });

  // ==========================================================================
  // OAuth Initiate Routes
  // ==========================================================================

  describe('OAuth Initiate Routes', () => {
    const providers = ['google', 'github', 'apple'] as const;

    for (const provider of providers) {
      describe(`auth/oauth/${provider}`, () => {
        const routeKey = `auth/oauth/${provider}`;
        const route = oauthRoutes.get(routeKey)!;

        test('should use GET method', () => {
          expect(route.method).toBe('GET');
        });

        test('should be a public route (no auth required)', () => {
          expect(route.isPublic).toBe(true);
        });

        test('should not require a request body schema', () => {
          expect(route.schema).toBeUndefined();
        });

        test('should have a handler function', () => {
          expect(typeof route.handler).toBe('function');
        });

        describe('Handler Invocation', () => {
          beforeEach(() => {
            vi.clearAllMocks();
          });

          test('should call handleOAuthInitiate with correct provider', async () => {
            const { handleOAuthInitiate } = await import('./handlers');
            const mockResult = {
              status: 302 as const,
              body: { url: `https://${provider}.com/oauth/authorize` },
            };
            vi.mocked(handleOAuthInitiate).mockResolvedValue(mockResult);

            const ctx = createMockContext();
            const req = createMockRequest();
            const reply = createMockReply();

            await route.handler(ctx, undefined, req, reply);

            expect(handleOAuthInitiate).toHaveBeenCalledWith(ctx, { provider }, req, reply);
          });

          test('should return result from handleOAuthInitiate', async () => {
            const { handleOAuthInitiate } = await import('./handlers');
            const expectedResult = {
              status: 302 as const,
              body: { url: `https://${provider}.com/oauth/authorize?state=abc123` },
            };
            vi.mocked(handleOAuthInitiate).mockResolvedValue(expectedResult);

            const ctx = createMockContext();
            const req = createMockRequest();
            const reply = createMockReply();

            const result = await route.handler(ctx, undefined, req, reply);

            expect(result).toEqual(expectedResult);
          });
        });
      });
    }
  });

  // ==========================================================================
  // OAuth Callback Routes
  // ==========================================================================

  describe('OAuth Callback Routes', () => {
    const providers = ['google', 'github', 'apple'] as const;

    for (const provider of providers) {
      describe(`auth/oauth/${provider}/callback`, () => {
        const routeKey = `auth/oauth/${provider}/callback`;
        const route = oauthRoutes.get(routeKey)!;

        test('should use GET method', () => {
          expect(route.method).toBe('GET');
        });

        test('should be a public route (no auth required)', () => {
          expect(route.isPublic).toBe(true);
        });

        test('should not require a request body schema', () => {
          expect(route.schema).toBeUndefined();
        });

        test('should have a handler function', () => {
          expect(typeof route.handler).toBe('function');
        });

        describe('Handler Invocation', () => {
          beforeEach(() => {
            vi.clearAllMocks();
          });

          test('should call handleOAuthCallbackRequest with query parameters', async () => {
            const { handleOAuthCallbackRequest } = await import('./handlers');
            const mockResult = {
              status: 200 as const,
              body: {
                token: 'access-token',
                user: {
                  id: 'user-123',
                  email: 'test@example.com',
                  username: 'testuser',
                  firstName: 'Test',
                  lastName: 'User',
                  role: 'user',
                  avatarUrl: null,
                  emailVerified: true,
                  phone: null,
                  phoneVerified: null,
                  dateOfBirth: null,
                  gender: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                isNewUser: false,
              },
            };
            vi.mocked(handleOAuthCallbackRequest).mockResolvedValue(
              mockResult as Awaited<ReturnType<typeof handleOAuthCallbackRequest>>,
            );

            const ctx = createMockContext();
            const req = createMockRequest();
            const reply = createMockReply();

            // Mock query parameters
            req.query = {
              code: 'auth-code-123',
              state: 'state-token-456',
            };

            await route.handler(ctx, undefined, req, reply);

            expect(handleOAuthCallbackRequest).toHaveBeenCalledWith(
              ctx,
              { provider },
              {
                code: 'auth-code-123',
                state: 'state-token-456',
                error: undefined,
                error_description: undefined,
              },
              req,
              reply,
            );
          });

          test('should handle OAuth error in query parameters', async () => {
            const { handleOAuthCallbackRequest } = await import('./handlers');
            const mockResult = {
              status: 400 as const,
              body: { message: 'User denied access', code: 'access_denied' },
            };
            vi.mocked(handleOAuthCallbackRequest).mockResolvedValue(
              mockResult as Awaited<ReturnType<typeof handleOAuthCallbackRequest>>,
            );

            const ctx = createMockContext();
            const req = createMockRequest();
            const reply = createMockReply();

            // Mock error in query parameters
            req.query = {
              error: 'access_denied',
              error_description: 'User denied access',
            };

            await route.handler(ctx, undefined, req, reply);

            expect(handleOAuthCallbackRequest).toHaveBeenCalledWith(
              ctx,
              { provider },
              {
                code: undefined,
                state: undefined,
                error: 'access_denied',
                error_description: 'User denied access',
              },
              req,
              reply,
            );
          });

          test('should return result from handleOAuthCallbackRequest', async () => {
            const { handleOAuthCallbackRequest } = await import('./handlers');
            const expectedResult = {
              status: 200 as const,
              body: {
                token: 'access-token',
                user: {
                  id: 'user-123',
                  email: 'test@example.com',
                  username: 'testuser',
                  firstName: 'Test',
                  lastName: 'User',
                  role: 'user',
                  avatarUrl: null,
                  emailVerified: true,
                  phone: null,
                  phoneVerified: null,
                  dateOfBirth: null,
                  gender: null,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                },
                isNewUser: false,
              },
            };
            vi.mocked(handleOAuthCallbackRequest).mockResolvedValue(
              expectedResult as Awaited<ReturnType<typeof handleOAuthCallbackRequest>>,
            );

            const ctx = createMockContext();
            const req = createMockRequest();
            const reply = createMockReply();
            req.query = { code: 'test-code', state: 'test-state' };

            const result = await route.handler(ctx, undefined, req, reply);

            expect(result).toEqual(expectedResult);
          });
        });
      });
    }
  });

  // ==========================================================================
  // OAuth Link Routes
  // ==========================================================================

  describe('OAuth Link Routes', () => {
    const providers = ['google', 'github', 'apple'] as const;

    for (const provider of providers) {
      describe(`auth/oauth/${provider}/link`, () => {
        const routeKey = `auth/oauth/${provider}/link`;
        const route = oauthRoutes.get(routeKey)!;

        test('should use POST method', () => {
          expect(route.method).toBe('POST');
        });

        test('should require user authentication', () => {
          expect(route.isPublic).toBe(false);
        });

        test('should not require a request body schema', () => {
          expect(route.schema).toBe(emptyBodySchema);
        });

        test('should have a handler function', () => {
          expect(typeof route.handler).toBe('function');
        });

        describe('Handler Invocation', () => {
          beforeEach(() => {
            vi.clearAllMocks();
          });

          test('should call handleOAuthLink with correct provider', async () => {
            const { handleOAuthLink } = await import('./handlers');
            const mockResult = {
              status: 200,
              body: { url: `https://${provider}.com/oauth/authorize?prompt=consent` },
            } as const;
            vi.mocked(handleOAuthLink).mockResolvedValue(mockResult);

            const ctx = createMockContext();
            const req = createMockRequest({
              userId: 'user-123',
              email: 'test@example.com',
              role: 'user',
            });
            const reply = createMockReply();

            await route.handler(ctx, undefined, req, reply);

            expect(handleOAuthLink).toHaveBeenCalledWith(ctx, { provider }, req, reply);
          });

          test('should return result from handleOAuthLink', async () => {
            const { handleOAuthLink } = await import('./handlers');
            const expectedResult = {
              status: 200,
              body: { url: `https://${provider}.com/oauth/authorize` },
            } as const;
            vi.mocked(handleOAuthLink).mockResolvedValue(expectedResult);

            const ctx = createMockContext();
            const req = createMockRequest({
              userId: 'user-123',
              email: 'test@example.com',
              role: 'user',
            });
            const reply = createMockReply();

            const result = await route.handler(ctx, undefined, req, reply);

            expect(result).toEqual(expectedResult);
          });
        });
      });
    }
  });

  // ==========================================================================
  // OAuth Unlink Routes
  // ==========================================================================

  describe('OAuth Unlink Routes', () => {
    const providers = ['google', 'github', 'apple'] as const;

    for (const provider of providers) {
      describe(`auth/oauth/${provider}/unlink`, () => {
        const routeKey = `auth/oauth/${provider}/unlink`;
        const route = oauthRoutes.get(routeKey)!;

        test('should use DELETE method', () => {
          expect(route.method).toBe('DELETE');
        });

        test('should require user authentication', () => {
          expect(route.isPublic).toBe(false);
        });

        test('should not require a request body schema', () => {
          expect(route.schema).toBe(emptyBodySchema);
        });

        test('should have a handler function', () => {
          expect(typeof route.handler).toBe('function');
        });

        describe('Handler Invocation', () => {
          beforeEach(() => {
            vi.clearAllMocks();
          });

          test('should call handleOAuthUnlink with correct provider', async () => {
            const { handleOAuthUnlink } = await import('./handlers');
            const mockResult = {
              status: 200 as const,
              body: { message: `${provider} account unlinked successfully` },
            };
            vi.mocked(handleOAuthUnlink).mockResolvedValue(mockResult);

            const ctx = createMockContext();
            const req = createMockRequest({
              userId: 'user-123',
              email: 'test@example.com',
              role: 'user',
            });
            const reply = createMockReply();

            await route.handler(ctx, undefined, req, reply);

            expect(handleOAuthUnlink).toHaveBeenCalledWith(ctx, { provider }, req, reply);
          });

          test('should return result from handleOAuthUnlink', async () => {
            const { handleOAuthUnlink } = await import('./handlers');
            const expectedResult = {
              status: 200 as const,
              body: { message: 'Account unlinked' },
            };
            vi.mocked(handleOAuthUnlink).mockResolvedValue(expectedResult);

            const ctx = createMockContext();
            const req = createMockRequest({
              userId: 'user-123',
              email: 'test@example.com',
              role: 'user',
            });
            const reply = createMockReply();

            const result = await route.handler(ctx, undefined, req, reply);

            expect(result).toEqual(expectedResult);
          });
        });
      });
    }
  });

  // ==========================================================================
  // OAuth Connections Route
  // ==========================================================================

  describe('auth/oauth/connections', () => {
    const route = oauthRoutes.get('auth/oauth/connections')!;

    test('should use GET method', () => {
      expect(route.method).toBe('GET');
    });

    test('should require user authentication', () => {
      expect(route.isPublic).toBe(false);
    });

    test('should not require a request body schema', () => {
      expect(route.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof route.handler).toBe('function');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleGetConnections with correct arguments', async () => {
        const { handleGetConnections } = await import('./handlers');
        const mockResult = {
          status: 200 as const,
          body: {
            connections: [
              {
                id: 'conn-1',
                provider: 'google',
                providerEmail: 'user@gmail.com',
                connectedAt: new Date('2024-01-01T00:00:00Z'),
              },
              {
                id: 'conn-2',
                provider: 'github',
                providerEmail: 'user@github.com',
                connectedAt: new Date('2024-01-02T00:00:00Z'),
              },
            ],
          },
        };
        vi.mocked(handleGetConnections).mockResolvedValue(
          mockResult as unknown as Awaited<ReturnType<typeof handleGetConnections>>,
        );

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        await route.handler(ctx, undefined, req, reply);

        expect(handleGetConnections).toHaveBeenCalledWith(ctx, req, reply);
      });

      test('should return result from handleGetConnections', async () => {
        const { handleGetConnections } = await import('./handlers');
        const expectedResult = {
          status: 200 as const,
          body: { connections: [] },
        };
        vi.mocked(handleGetConnections).mockResolvedValue(
          expectedResult as Awaited<ReturnType<typeof handleGetConnections>>,
        );

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(expectedResult);
      });
    });
  });

  // ==========================================================================
  // Route Protection Tests
  // ==========================================================================

  describe('Route Protection', () => {
    test('should have expected protected routes', () => {
      const protectedRoutes = Array.from(oauthRoutes.entries()).filter(
        ([_, def]: [string, RouteDefinition]) => !def.isPublic,
      );

      // 3 link + 3 unlink + 1 connections = 7 protected routes
      expect(protectedRoutes).toHaveLength(7);

      const protectedRouteNames = protectedRoutes.map(([name]) => name);
      expect(protectedRouteNames).toContain('auth/oauth/google/link');
      expect(protectedRouteNames).toContain('auth/oauth/github/link');
      expect(protectedRouteNames).toContain('auth/oauth/apple/link');
      expect(protectedRouteNames).toContain('auth/oauth/google/unlink');
      expect(protectedRouteNames).toContain('auth/oauth/github/unlink');
      expect(protectedRouteNames).toContain('auth/oauth/apple/unlink');
      expect(protectedRouteNames).toContain('auth/oauth/connections');

      // All protected routes should be non-public
      for (const [_, def] of protectedRoutes) {
        expect(def.isPublic).toBe(false);
      }
    });

    test('should have all public routes (initiate and callback)', () => {
      const publicRoutes = Array.from(oauthRoutes.entries()).filter(
        ([_, def]: [string, RouteDefinition]) => def.isPublic,
      );

      // providers + 3 initiate + 3 callback = 7 public routes
      expect(publicRoutes).toHaveLength(7);

      const publicRouteNames = publicRoutes.map(([name]) => name);
      expect(publicRouteNames).toContain('auth/oauth/providers');
      expect(publicRouteNames).toContain('auth/oauth/google');
      expect(publicRouteNames).toContain('auth/oauth/github');
      expect(publicRouteNames).toContain('auth/oauth/apple');
      expect(publicRouteNames).toContain('auth/oauth/google/callback');
      expect(publicRouteNames).toContain('auth/oauth/github/callback');
      expect(publicRouteNames).toContain('auth/oauth/apple/callback');
    });

    test('should not have any admin-only routes', () => {
      const adminOnlyRoutes = Array.from(oauthRoutes.entries()).filter(
        ([_, def]: [string, RouteDefinition]) => def.roles?.includes('admin') ?? false,
      );
      expect(adminOnlyRoutes).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Route Method Tests
  // ==========================================================================

  describe('Route Methods', () => {
    test('initiate routes should use GET method', () => {
      const initiateRoutes = ['auth/oauth/google', 'auth/oauth/github', 'auth/oauth/apple'];

      for (const routeName of initiateRoutes) {
        const route = oauthRoutes.get(routeName);
        expect(route).toBeDefined();
        expect(route?.method).toBe('GET');
      }
    });

    test('callback routes should use GET method', () => {
      const callbackRoutes = [
        'auth/oauth/google/callback',
        'auth/oauth/github/callback',
        'auth/oauth/apple/callback',
      ];

      for (const routeName of callbackRoutes) {
        const route = oauthRoutes.get(routeName);
        expect(route).toBeDefined();
        expect(route?.method).toBe('GET');
      }
    });

    test('link routes should use POST method', () => {
      const linkRoutes = [
        'auth/oauth/google/link',
        'auth/oauth/github/link',
        'auth/oauth/apple/link',
      ];

      for (const routeName of linkRoutes) {
        const route = oauthRoutes.get(routeName);
        expect(route).toBeDefined();
        expect(route?.method).toBe('POST');
      }
    });

    test('unlink routes should use DELETE method', () => {
      const unlinkRoutes = [
        'auth/oauth/google/unlink',
        'auth/oauth/github/unlink',
        'auth/oauth/apple/unlink',
      ];

      for (const routeName of unlinkRoutes) {
        const route = oauthRoutes.get(routeName);
        expect(route).toBeDefined();
        expect(route?.method).toBe('DELETE');
      }
    });

    test('connections route should use GET method', () => {
      const route = oauthRoutes.get('auth/oauth/connections');
      expect(route).toBeDefined();
      expect(route?.method).toBe('GET');
    });
  });

  // ==========================================================================
  // Provider Consistency Tests
  // ==========================================================================

  describe('Provider Consistency', () => {
    const providers = ['google', 'github', 'apple'] as const;

    test('should have consistent route structure for all providers', () => {
      for (const provider of providers) {
        // Each provider should have: initiate, callback, link, unlink
        expect(oauthRoutes.get(`auth/oauth/${provider}`)).toBeDefined();
        expect(oauthRoutes.get(`auth/oauth/${provider}/callback`)).toBeDefined();
        expect(oauthRoutes.get(`auth/oauth/${provider}/link`)).toBeDefined();
        expect(oauthRoutes.get(`auth/oauth/${provider}/unlink`)).toBeDefined();
      }
    });

    test('should have consistent auth requirements across providers', () => {
      for (const provider of providers) {
        // Initiate and callback are public
        expect(oauthRoutes.get(`auth/oauth/${provider}`)?.isPublic).toBe(true);
        expect(oauthRoutes.get(`auth/oauth/${provider}/callback`)?.isPublic).toBe(true);

        // Link and unlink require user auth (non-public)
        expect(oauthRoutes.get(`auth/oauth/${provider}/link`)?.isPublic).toBe(false);
        expect(oauthRoutes.get(`auth/oauth/${provider}/unlink`)?.isPublic).toBe(false);
      }
    });

    test('should have consistent HTTP methods across providers', () => {
      for (const provider of providers) {
        expect(oauthRoutes.get(`auth/oauth/${provider}`)?.method).toBe('GET');
        expect(oauthRoutes.get(`auth/oauth/${provider}/callback`)?.method).toBe('GET');
        expect(oauthRoutes.get(`auth/oauth/${provider}/link`)?.method).toBe('POST');
        expect(oauthRoutes.get(`auth/oauth/${provider}/unlink`)?.method).toBe('DELETE');
      }
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    describe('Callback Query Parameters', () => {
      test('should handle callback with missing code parameter', async () => {
        const { handleOAuthCallbackRequest } = await import('./handlers');
        vi.mocked(handleOAuthCallbackRequest).mockResolvedValue({
          status: 400 as const,
          body: { message: 'Missing authorization code', code: 'invalid_request' },
        } as Awaited<ReturnType<typeof handleOAuthCallbackRequest>>);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = { state: 'test-state' };

        const route = oauthRoutes.get('auth/oauth/google/callback')!;
        await route.handler(ctx, undefined, req, reply);

        expect(handleOAuthCallbackRequest).toHaveBeenCalledWith(
          ctx,
          { provider: 'google' },
          {
            code: undefined,
            state: 'test-state',
            error: undefined,
            error_description: undefined,
          },
          req,
          reply,
        );
      });

      test('should handle callback with missing state parameter', async () => {
        const { handleOAuthCallbackRequest } = await import('./handlers');
        vi.mocked(handleOAuthCallbackRequest).mockResolvedValue({
          status: 400 as const,
          body: { message: 'Invalid state parameter', code: 'invalid_state' },
        } as Awaited<ReturnType<typeof handleOAuthCallbackRequest>>);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = { code: 'test-code' };

        const route = oauthRoutes.get('auth/oauth/github/callback')!;
        await route.handler(ctx, undefined, req, reply);

        expect(handleOAuthCallbackRequest).toHaveBeenCalledWith(
          ctx,
          { provider: 'github' },
          {
            code: 'test-code',
            state: undefined,
            error: undefined,
            error_description: undefined,
          },
          req,
          reply,
        );
      });

      test('should handle callback with empty query object', async () => {
        const { handleOAuthCallbackRequest } = await import('./handlers');
        vi.mocked(handleOAuthCallbackRequest).mockResolvedValue({
          status: 400 as const,
          body: { message: 'Invalid callback request', code: 'invalid_request' },
        } as Awaited<ReturnType<typeof handleOAuthCallbackRequest>>);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = {};

        const route = oauthRoutes.get('auth/oauth/apple/callback')!;
        await route.handler(ctx, undefined, req, reply);

        expect(handleOAuthCallbackRequest).toHaveBeenCalledWith(
          ctx,
          { provider: 'apple' },
          {
            code: undefined,
            state: undefined,
            error: undefined,
            error_description: undefined,
          },
          req,
          reply,
        );
      });

      test('should handle callback with both error and code (edge case)', async () => {
        const { handleOAuthCallbackRequest } = await import('./handlers');
        vi.mocked(handleOAuthCallbackRequest).mockResolvedValue({
          status: 400 as const,
          body: { message: 'User denied access', code: 'access_denied' },
        } as Awaited<ReturnType<typeof handleOAuthCallbackRequest>>);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = {
          code: 'test-code',
          error: 'access_denied',
          error_description: 'User denied access',
        };

        const route = oauthRoutes.get('auth/oauth/google/callback')!;
        await route.handler(ctx, undefined, req, reply);

        expect(handleOAuthCallbackRequest).toHaveBeenCalledWith(
          ctx,
          { provider: 'google' },
          {
            code: 'test-code',
            state: undefined,
            error: 'access_denied',
            error_description: 'User denied access',
          },
          req,
          reply,
        );
      });
    });

    describe('Handler Return Values', () => {
      test('should handle initiate returning error response', async () => {
        const { handleOAuthInitiate } = await import('./handlers');
        const errorResult = {
          status: 500 as const,
          body: { message: 'OAuth provider configuration error' },
        };
        vi.mocked(handleOAuthInitiate).mockResolvedValue(
          errorResult as Awaited<ReturnType<typeof handleOAuthInitiate>>,
        );

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const route = oauthRoutes.get('auth/oauth/google')!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(errorResult);
      });

      test('should handle link returning error when already linked', async () => {
        const { handleOAuthLink } = await import('./handlers');
        const errorResult = {
          status: 400 as const,
          body: { message: 'Account already linked' },
        };
        vi.mocked(handleOAuthLink).mockResolvedValue(
          errorResult as Awaited<ReturnType<typeof handleOAuthLink>>,
        );

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const route = oauthRoutes.get('auth/oauth/github/link')!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(errorResult);
      });

      test('should handle unlink returning error when not linked', async () => {
        const { handleOAuthUnlink } = await import('./handlers');
        const errorResult = {
          status: 404 as const,
          body: { message: 'OAuth account not linked' },
        };
        vi.mocked(handleOAuthUnlink).mockResolvedValue(
          errorResult as Awaited<ReturnType<typeof handleOAuthUnlink>>,
        );

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const route = oauthRoutes.get('auth/oauth/apple/unlink')!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(errorResult);
      });

      test('should handle connections returning empty array', async () => {
        const { handleGetConnections } = await import('./handlers');
        const emptyResult = {
          status: 200 as const,
          body: { connections: [] },
        };
        vi.mocked(handleGetConnections).mockResolvedValue(
          emptyResult as Awaited<ReturnType<typeof handleGetConnections>>,
        );

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const route = oauthRoutes.get('auth/oauth/connections')!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(emptyResult);
      });
    });
  });
});
