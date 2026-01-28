// apps/server/src/modules/auth/oauth/routes.test.ts
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

import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('./handlers', () => ({
  handleGetConnections: vi.fn(),
  handleOAuthCallbackRequest: vi.fn(),
  handleOAuthInitiate: vi.fn(),
  handleOAuthLink: vi.fn(),
  handleOAuthUnlink: vi.fn(),
}));

import { oauthRoutes } from './routes';

import type { BaseRouteDefinition, RouteResult } from '@router';
import type { AppContext } from '../../shared';
import type { FastifyReply, FastifyRequest } from 'fastify';

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
}): FastifyRequest & { user?: { userId: string; email: string; role: string } } {
  return {
    user,
    headers: {},
    query: {},
    requestInfo: {
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    },
  } as FastifyRequest & { user?: { userId: string; email: string; role: string } };
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
      const routeKeys = Object.keys(oauthRoutes);
      // 3 initiate + 3 callback + 3 link + 3 unlink + 1 connections = 13 routes
      expect(routeKeys).toHaveLength(13);

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
      for (const [_path, definition] of Object.entries(oauthRoutes)) {
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
        const route = oauthRoutes[routeKey]!;

        test('should use GET method', () => {
          expect(route.method).toBe('GET');
        });

        test('should be a public route (no auth required)', () => {
          expect(route.auth).toBeUndefined();
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
            const mockResult: RouteResult<{ url: string }> = {
              status: 302,
              body: { url: `https://${provider}.com/oauth/authorize` },
            };
            vi.mocked(handleOAuthInitiate).mockResolvedValue(mockResult);

            const ctx = createMockContext();
            const req = createMockRequest();
            const reply = createMockReply();

            await route.handler(ctx, undefined, req, reply);

            expect(handleOAuthInitiate).toHaveBeenCalledWith(
              ctx,
              { provider },
              req,
              reply,
            );
          });

          test('should return result from handleOAuthInitiate', async () => {
            const { handleOAuthInitiate } = await import('./handlers');
            const expectedResult: RouteResult<{ url: string }> = {
              status: 302,
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
        const route = oauthRoutes[routeKey]!;

        test('should use GET method', () => {
          expect(route.method).toBe('GET');
        });

        test('should be a public route (no auth required)', () => {
          expect(route.auth).toBeUndefined();
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
            const mockResult: RouteResult = {
              status: 200,
              body: {
                token: 'access-token',
                user: {
                  id: 'user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                  role: 'user',
                  avatarUrl: null,
                  createdAt: new Date().toISOString(),
                },
                isNewUser: false,
              },
            };
            vi.mocked(handleOAuthCallbackRequest).mockResolvedValue(mockResult);

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
            const mockResult: RouteResult = {
              status: 400,
              body: { message: 'User denied access', code: 'access_denied' },
            };
            vi.mocked(handleOAuthCallbackRequest).mockResolvedValue(mockResult);

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
            const expectedResult: RouteResult = {
              status: 200,
              body: {
                token: 'access-token',
                user: {
                  id: 'user-123',
                  email: 'test@example.com',
                  name: 'Test User',
                  role: 'user',
                  avatarUrl: null,
                  createdAt: new Date().toISOString(),
                },
                isNewUser: false,
              },
            };
            vi.mocked(handleOAuthCallbackRequest).mockResolvedValue(expectedResult);

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
        const route = oauthRoutes[routeKey]!;

        test('should use POST method', () => {
          expect(route.method).toBe('POST');
        });

        test('should require user authentication', () => {
          expect(route.auth).toBe('user');
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

          test('should call handleOAuthLink with correct provider', async () => {
            const { handleOAuthLink } = await import('./handlers');
            const mockResult: RouteResult<{ url: string }> = {
              status: 302,
              body: { url: `https://${provider}.com/oauth/authorize?prompt=consent` },
            };
            vi.mocked(handleOAuthLink).mockResolvedValue(mockResult);

            const ctx = createMockContext();
            const req = createMockRequest({
              userId: 'user-123',
              email: 'test@example.com',
              role: 'user',
            });
            const reply = createMockReply();

            await route.handler(ctx, undefined, req, reply);

            expect(handleOAuthLink).toHaveBeenCalledWith(
              ctx,
              { provider },
              req,
              reply,
            );
          });

          test('should return result from handleOAuthLink', async () => {
            const { handleOAuthLink } = await import('./handlers');
            const expectedResult: RouteResult<{ url: string }> = {
              status: 302,
              body: { url: `https://${provider}.com/oauth/authorize` },
            };
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
        const route = oauthRoutes[routeKey]!;

        test('should use DELETE method', () => {
          expect(route.method).toBe('DELETE');
        });

        test('should require user authentication', () => {
          expect(route.auth).toBe('user');
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

          test('should call handleOAuthUnlink with correct provider', async () => {
            const { handleOAuthUnlink } = await import('./handlers');
            const mockResult: RouteResult<{ message: string }> = {
              status: 200,
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

            expect(handleOAuthUnlink).toHaveBeenCalledWith(
              ctx,
              { provider },
              req,
              reply,
            );
          });

          test('should return result from handleOAuthUnlink', async () => {
            const { handleOAuthUnlink } = await import('./handlers');
            const expectedResult: RouteResult<{ message: string }> = {
              status: 200,
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
    const route = oauthRoutes['auth/oauth/connections']!;

    test('should use GET method', () => {
      expect(route.method).toBe('GET');
    });

    test('should require user authentication', () => {
      expect(route.auth).toBe('user');
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
        const mockResult: RouteResult = {
          status: 200,
          body: {
            connections: [
              { provider: 'google', linkedAt: '2024-01-01T00:00:00Z' },
              { provider: 'github', linkedAt: '2024-01-02T00:00:00Z' },
            ],
          },
        };
        vi.mocked(handleGetConnections).mockResolvedValue(mockResult);

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
        const expectedResult: RouteResult = {
          status: 200,
          body: { connections: [] },
        };
        vi.mocked(handleGetConnections).mockResolvedValue(expectedResult);

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
      const protectedRoutes = Object.entries(oauthRoutes).filter(
        ([_, def]: [string, BaseRouteDefinition]) => def.auth !== undefined,
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

      // All protected routes should require 'user' auth level
      for (const [_, def] of protectedRoutes) {
        expect(def.auth).toBe('user');
      }
    });

    test('should have all public routes (initiate and callback)', () => {
      const publicRoutes = Object.entries(oauthRoutes).filter(
        ([_, def]: [string, BaseRouteDefinition]) => def.auth === undefined,
      );

      // 3 initiate + 3 callback = 6 public routes
      expect(publicRoutes).toHaveLength(6);

      const publicRouteNames = publicRoutes.map(([name]) => name);
      expect(publicRouteNames).toContain('auth/oauth/google');
      expect(publicRouteNames).toContain('auth/oauth/github');
      expect(publicRouteNames).toContain('auth/oauth/apple');
      expect(publicRouteNames).toContain('auth/oauth/google/callback');
      expect(publicRouteNames).toContain('auth/oauth/github/callback');
      expect(publicRouteNames).toContain('auth/oauth/apple/callback');
    });

    test('should not have any admin-only routes', () => {
      const adminOnlyRoutes = Object.entries(oauthRoutes).filter(
        ([_, def]: [string, BaseRouteDefinition]) => def.auth === 'admin',
      );
      expect(adminOnlyRoutes).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Route Method Tests
  // ==========================================================================

  describe('Route Methods', () => {
    test('initiate routes should use GET method', () => {
      const initiateRoutes = [
        'auth/oauth/google',
        'auth/oauth/github',
        'auth/oauth/apple',
      ];

      for (const routeName of initiateRoutes) {
        const route = oauthRoutes[routeName];
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
        const route = oauthRoutes[routeName];
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
        const route = oauthRoutes[routeName];
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
        const route = oauthRoutes[routeName];
        expect(route).toBeDefined();
        expect(route?.method).toBe('DELETE');
      }
    });

    test('connections route should use GET method', () => {
      const route = oauthRoutes['auth/oauth/connections'];
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
        expect(oauthRoutes[`auth/oauth/${provider}`]).toBeDefined();
        expect(oauthRoutes[`auth/oauth/${provider}/callback`]).toBeDefined();
        expect(oauthRoutes[`auth/oauth/${provider}/link`]).toBeDefined();
        expect(oauthRoutes[`auth/oauth/${provider}/unlink`]).toBeDefined();
      }
    });

    test('should have consistent auth requirements across providers', () => {
      for (const provider of providers) {
        // Initiate and callback are public
        expect(oauthRoutes[`auth/oauth/${provider}`]?.auth).toBeUndefined();
        expect(oauthRoutes[`auth/oauth/${provider}/callback`]?.auth).toBeUndefined();

        // Link and unlink require user auth
        expect(oauthRoutes[`auth/oauth/${provider}/link`]?.auth).toBe('user');
        expect(oauthRoutes[`auth/oauth/${provider}/unlink`]?.auth).toBe('user');
      }
    });

    test('should have consistent HTTP methods across providers', () => {
      for (const provider of providers) {
        expect(oauthRoutes[`auth/oauth/${provider}`]?.method).toBe('GET');
        expect(oauthRoutes[`auth/oauth/${provider}/callback`]?.method).toBe('GET');
        expect(oauthRoutes[`auth/oauth/${provider}/link`]?.method).toBe('POST');
        expect(oauthRoutes[`auth/oauth/${provider}/unlink`]?.method).toBe('DELETE');
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
          status: 400,
          body: { message: 'Missing authorization code', code: 'invalid_request' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = { state: 'test-state' };

        const route = oauthRoutes['auth/oauth/google/callback']!;
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
          status: 400,
          body: { message: 'Invalid state parameter', code: 'invalid_state' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = { code: 'test-code' };

        const route = oauthRoutes['auth/oauth/github/callback']!;
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
          status: 400,
          body: { message: 'Invalid callback request', code: 'invalid_request' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = {};

        const route = oauthRoutes['auth/oauth/apple/callback']!;
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
          status: 400,
          body: { message: 'User denied access', code: 'access_denied' },
        });

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();
        req.query = {
          code: 'test-code',
          error: 'access_denied',
          error_description: 'User denied access',
        };

        const route = oauthRoutes['auth/oauth/google/callback']!;
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
        const errorResult: RouteResult = {
          status: 500,
          body: { message: 'OAuth provider configuration error' },
        };
        vi.mocked(handleOAuthInitiate).mockResolvedValue(errorResult);

        const ctx = createMockContext();
        const req = createMockRequest();
        const reply = createMockReply();

        const route = oauthRoutes['auth/oauth/google']!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(errorResult);
      });

      test('should handle link returning error when already linked', async () => {
        const { handleOAuthLink } = await import('./handlers');
        const errorResult: RouteResult<{ message: string }> = {
          status: 400,
          body: { message: 'Account already linked' },
        };
        vi.mocked(handleOAuthLink).mockResolvedValue(errorResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const route = oauthRoutes['auth/oauth/github/link']!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(errorResult);
      });

      test('should handle unlink returning error when not linked', async () => {
        const { handleOAuthUnlink } = await import('./handlers');
        const errorResult: RouteResult<{ message: string }> = {
          status: 404,
          body: { message: 'OAuth account not linked' },
        };
        vi.mocked(handleOAuthUnlink).mockResolvedValue(errorResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const route = oauthRoutes['auth/oauth/apple/unlink']!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(errorResult);
      });

      test('should handle connections returning empty array', async () => {
        const { handleGetConnections } = await import('./handlers');
        const emptyResult: RouteResult = {
          status: 200,
          body: { connections: [] },
        };
        vi.mocked(handleGetConnections).mockResolvedValue(emptyResult);

        const ctx = createMockContext();
        const req = createMockRequest({
          userId: 'user-123',
          email: 'test@example.com',
          role: 'user',
        });
        const reply = createMockReply();

        const route = oauthRoutes['auth/oauth/connections']!;
        const result = await route.handler(ctx, undefined, req, reply);

        expect(result).toEqual(emptyResult);
      });
    });
  });
});
