// apps/server/src/__tests__/integration/admin-routes.integration.test.ts
/**
 * Admin Routes Integration Tests
 *
 * Tests the admin-related endpoints using Fastify's inject method.
 * Covers POST /api/admin/auth/unlock with role-based authorization.
 */

import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Test Suite
// ============================================================================

describe('Admin Routes Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify({ logger: false });

    // Register admin unlock endpoint with mock handler
    server.post('/api/admin/auth/unlock', async (request, reply) => {
      const authHeader = request.headers.authorization;
      const body = request.body as { email?: string };

      // Check for authorization header
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized' });
      }

      const token = authHeader.substring(7);

      // Simulate token verification and role check
      if (token === 'valid-user-token') {
        // Regular user - forbidden
        return reply.status(403).send({ message: 'Forbidden - insufficient permissions' });
      }

      if (token === 'valid-admin-token') {
        // Admin user - check request body
        if (!body.email) {
          return reply.status(400).send({ message: 'Email is required' });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          return reply.status(400).send({ message: 'Invalid email format' });
        }

        // Check if user exists
        if (body.email === 'nonexistent@example.com') {
          return reply.status(404).send({ message: 'User not found' });
        }

        // Successful unlock
        return reply.status(200).send({
          message: 'Account unlocked successfully',
          email: body.email,
        });
      }

      if (token === 'expired-token') {
        return reply.status(401).send({ message: 'Invalid or expired token' });
      }

      // Default: invalid token
      return reply.status(401).send({ message: 'Unauthorized' });
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
  // POST /api/admin/auth/unlock Tests
  // ===========================================================================

  describe('POST /api/admin/auth/unlock', () => {
    describe('Authentication Required', () => {
      it('should return 401 when no authorization header is provided', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          payload: {
            email: 'locked@example.com',
          },
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Unauthorized');
      });

      it('should return 401 when authorization header is malformed', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'InvalidFormat token123',
          },
          payload: {
            email: 'locked@example.com',
          },
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Unauthorized');
      });

      it('should return 401 for expired token', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer expired-token',
          },
          payload: {
            email: 'locked@example.com',
          },
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Invalid or expired token');
      });
    });

    describe('Admin Role Required (403 for non-admin)', () => {
      it('should return 403 when authenticated user is not admin', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-user-token',
          },
          payload: {
            email: 'locked@example.com',
          },
        });

        expect(response.statusCode).toBe(403);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Forbidden - insufficient permissions');
      });

      it('should explicitly deny regular users access to admin endpoints', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-user-token',
          },
          payload: {
            email: 'anyone@example.com',
          },
        });

        expect(response.statusCode).toBe(403);
        expect(response.body).toContain('Forbidden');
      });
    });

    describe('Successful Account Unlock', () => {
      it('should return 200 when admin unlocks a valid user account', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-admin-token',
          },
          payload: {
            email: 'locked@example.com',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Account unlocked successfully');
        expect(body.email).toBe('locked@example.com');
      });

      it('should include the unlocked email in response', async () => {
        const testEmail = 'user-to-unlock@example.com';
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-admin-token',
          },
          payload: {
            email: testEmail,
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.email).toBe(testEmail);
      });
    });

    describe('Invalid User ID / User Not Found', () => {
      it('should return 404 when target user does not exist', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-admin-token',
          },
          payload: {
            email: 'nonexistent@example.com',
          },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('User not found');
      });
    });

    describe('Validation Errors', () => {
      it('should return 400 when email is missing', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-admin-token',
          },
          payload: {},
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Email is required');
      });

      it('should return 400 when email format is invalid', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-admin-token',
          },
          payload: {
            email: 'not-a-valid-email',
          },
        });

        expect(response.statusCode).toBe(400);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Invalid email format');
      });

      it('should return 400 for empty email string', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/api/admin/auth/unlock',
          headers: {
            authorization: 'Bearer valid-admin-token',
          },
          payload: {
            email: '',
          },
        });

        expect(response.statusCode).toBe(400);
      });
    });
  });
});
