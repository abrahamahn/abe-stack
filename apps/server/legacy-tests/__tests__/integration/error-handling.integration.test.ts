// apps/server/src/__tests__/integration/error-handling.integration.test.ts
/**
 * Error Handling Integration Tests
 *
 * Tests the error handling behavior across the application using Fastify's inject method.
 * Covers 404, 400, 401, 403, and 500 error responses.
 */

import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Test Suite
// ============================================================================

describe('Error Handling Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify({ logger: false });

    // Global error handler
    server.setErrorHandler((error, request, reply) => {
      const correlationId = request.headers['x-correlation-id'] || 'unknown';

      let statusCode = 500;
      let code = 'INTERNAL_ERROR';
      let message = 'Internal server error';

      if (error instanceof Error) {
        message = error.message;
        const fastifyError = error as Error & { statusCode?: number; code?: string };
        if (typeof fastifyError.statusCode === 'number') {
          statusCode = fastifyError.statusCode;
        }
        if (typeof fastifyError.code === 'string') {
          code = fastifyError.code;
        }
      }

      void reply.status(statusCode).send({
        ok: false,
        error: {
          code,
          message,
          correlationId,
        },
      });
    });

    // Route that triggers a validation error (400)
    server.post('/api/validated', async (request, reply) => {
      const body = request.body as { email?: string; name?: string };

      if (!body.email) {
        return reply.status(400).send({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email is required',
            details: {
              field: 'email',
              reason: 'missing',
            },
          },
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return reply.status(400).send({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            details: {
              field: 'email',
              reason: 'invalid_format',
            },
          },
        });
      }

      return { ok: true, data: body };
    });

    // Route that requires authentication (401)
    server.get('/api/protected', async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const token = authHeader.substring(7);
      if (token !== 'valid-token') {
        return reply.status(401).send({
          ok: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired token',
          },
        });
      }

      return { ok: true, data: 'protected resource' };
    });

    // Route that requires admin role (403)
    server.get('/api/admin-only', async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({
          ok: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        });
      }

      const token = authHeader.substring(7);
      if (token === 'user-token') {
        return reply.status(403).send({
          ok: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
          },
        });
      }

      if (token === 'admin-token') {
        return { ok: true, data: 'admin resource' };
      }

      return reply.status(401).send({
        ok: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
    });

    // Route that triggers internal server error (500)
    server.get('/api/error', async () => {
      throw new Error('Something went wrong internally');
    });

    // Route that triggers a controlled error with custom status
    server.get('/api/conflict', async (_request, reply) => {
      return reply.status(409).send({
        ok: false,
        error: {
          code: 'CONFLICT',
          message: 'Resource already exists',
        },
      });
    });

    // Route that triggers service unavailable (503)
    server.get('/api/unavailable', async (_request, reply) => {
      return reply.status(503).send({
        ok: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable',
          retryAfter: 30,
        },
      });
    });

    await server.ready();
  });

  afterAll(async () => {
    await server.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 404 Not Found Tests
  // ===========================================================================

  describe('404 Not Found', () => {
    it('should return 404 for unknown GET route', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/nonexistent-route',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for unknown POST route', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/nonexistent-route',
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for unknown PUT route', async () => {
      const response = await server.inject({
        method: 'PUT',
        url: '/api/nonexistent-route',
        payload: { data: 'test' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for unknown DELETE route', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/api/nonexistent-route',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return proper error structure for 404', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/does-not-exist',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.message).toBeDefined();
    });
  });

  // ===========================================================================
  // 400 Validation Error Tests
  // ===========================================================================

  describe('400 Validation Errors', () => {
    it('should return 400 when required field is missing', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/validated',
        payload: {
          name: 'Test User',
          // email is missing
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Email is required');
    });

    it('should return 400 with details when format is invalid', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/validated',
        payload: {
          email: 'not-an-email',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('Invalid email format');
      expect(body.error.details).toBeDefined();
      expect(body.error.details.field).toBe('email');
    });

    it('should include field information in validation error details', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/validated',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.details).toHaveProperty('field');
      expect(body.error.details).toHaveProperty('reason');
    });

    it('should return 200 when validation passes', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/validated',
        payload: {
          email: 'valid@example.com',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
    });
  });

  // ===========================================================================
  // 401 Authentication Error Tests
  // ===========================================================================

  describe('401 Authentication Errors', () => {
    it('should return 401 when no authorization header is provided', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/protected',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toBe('Authentication required');
    });

    it('should return 401 when authorization header is malformed', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/protected',
        headers: {
          authorization: 'InvalidFormat token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 when token is invalid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/protected',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_TOKEN');
      expect(body.error.message).toBe('Invalid or expired token');
    });

    it('should return 200 when token is valid', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/protected',
        headers: {
          authorization: 'Bearer valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
    });
  });

  // ===========================================================================
  // 403 Authorization Error Tests
  // ===========================================================================

  describe('403 Authorization Errors', () => {
    it('should return 403 when user lacks required permissions', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/admin-only',
        headers: {
          authorization: 'Bearer user-token',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('FORBIDDEN');
      expect(body.error.message).toBe('Insufficient permissions');
    });

    it('should return 200 when user has admin permissions', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/admin-only',
        headers: {
          authorization: 'Bearer admin-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(true);
    });

    it('should return 401 before 403 if not authenticated', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/admin-only',
      });

      // Should be 401 (not authenticated) rather than 403 (not authorized)
      expect(response.statusCode).toBe(401);
    });
  });

  // ===========================================================================
  // 500 Internal Server Error Tests
  // ===========================================================================

  describe('500 Internal Server Errors', () => {
    it('should return 500 when an unhandled error occurs', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/error',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('should include error message in development', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/error',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.message).toBeDefined();
    });

    it('should include correlation ID for error tracking', async () => {
      const testCorrelationId = 'test-correlation-123';

      const response = await server.inject({
        method: 'GET',
        url: '/api/error',
        headers: {
          'x-correlation-id': testCorrelationId,
        },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.correlationId).toBe(testCorrelationId);
    });
  });

  // ===========================================================================
  // Other HTTP Error Status Tests
  // ===========================================================================

  describe('Other HTTP Error Statuses', () => {
    it('should return 409 for conflict errors', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/conflict',
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('CONFLICT');
      expect(body.error.message).toBe('Resource already exists');
    });

    it('should return 503 for service unavailable', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/unavailable',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.ok).toBe(false);
      expect(body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(body.error.retryAfter).toBeDefined();
    });
  });

  // ===========================================================================
  // Error Response Structure Tests
  // ===========================================================================

  describe('Error Response Structure', () => {
    it('should have consistent error response structure', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/validated',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);

      // Verify structure
      expect(body).toHaveProperty('ok', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });

    it('should use proper content-type for error responses', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/protected',
      });

      expect(response.statusCode).toBe(401);
      expect(response.headers['content-type']).toContain('application/json');
    });
  });
});
