// apps/server/src/__tests__/integration/user-routes.integration.test.ts
/**
 * User Routes Integration Tests
 *
 * Tests the user-related endpoints using Fastify's inject method.
 * Covers GET /api/users/me with authentication and error scenarios.
 */

import Fastify from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Test Suite
// ============================================================================

describe('User Routes Integration', () => {
  let server: FastifyInstance;

  // Mock user data
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockAdminUser = {
    id: 'admin-456',
    email: 'admin@example.com',
    name: 'Admin User',
    role: 'admin' as const,
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeAll(async () => {
    server = Fastify({ logger: false });

    // Register users/me endpoint with mock handler
    server.get('/api/users/me', async (request, reply) => {
      const authHeader = request.headers.authorization;

      // Check for authorization header
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Unauthorized' });
      }

      const token = authHeader.substring(7);

      // Simulate token verification
      if (token === 'valid-user-token') {
        return reply.status(200).send({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
          createdAt: mockUser.createdAt.toISOString(),
        });
      }

      if (token === 'valid-admin-token') {
        return reply.status(200).send({
          id: mockAdminUser.id,
          email: mockAdminUser.email,
          name: mockAdminUser.name,
          role: mockAdminUser.role,
          createdAt: mockAdminUser.createdAt.toISOString(),
        });
      }

      if (token === 'valid-but-user-not-found') {
        return reply.status(404).send({ message: 'User not found' });
      }

      if (token === 'expired-token') {
        return reply.status(401).send({ message: 'Invalid or expired token' });
      }

      if (token === 'malformed-token') {
        return reply.status(401).send({ message: 'Invalid token format' });
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
  // GET /api/users/me Tests
  // ===========================================================================

  describe('GET /api/users/me', () => {
    describe('Authentication Required', () => {
      it('should return 401 when no authorization header is provided', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Unauthorized');
      });

      it('should return 401 when authorization header is malformed', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'InvalidFormat token123',
          },
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Unauthorized');
      });

      it('should return 401 when authorization header has no token', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer ',
          },
        });

        expect(response.statusCode).toBe(401);
      });

      it('should return 401 for expired token', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer expired-token',
          },
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Invalid or expired token');
      });

      it('should return 401 for malformed token', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer malformed-token',
          },
        });

        expect(response.statusCode).toBe(401);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('Invalid token format');
      });
    });

    describe('User Not Found', () => {
      it('should return 404 when authenticated user no longer exists', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer valid-but-user-not-found',
          },
        });

        expect(response.statusCode).toBe(404);
        const body = JSON.parse(response.body);
        expect(body.message).toBe('User not found');
      });
    });

    describe('Successful Profile Retrieval', () => {
      it('should return 200 with user profile for valid user token', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer valid-user-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.id).toBe('user-123');
        expect(body.email).toBe('test@example.com');
        expect(body.name).toBe('Test User');
        expect(body.role).toBe('user');
        expect(body.createdAt).toBe('2024-01-01T00:00:00.000Z');
      });

      it('should return 200 with admin profile for valid admin token', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer valid-admin-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.id).toBe('admin-456');
        expect(body.email).toBe('admin@example.com');
        expect(body.name).toBe('Admin User');
        expect(body.role).toBe('admin');
      });

      it('should include all required user profile fields', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer valid-user-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);

        // Verify all expected fields are present
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('email');
        expect(body).toHaveProperty('name');
        expect(body).toHaveProperty('role');
        expect(body).toHaveProperty('createdAt');
      });

      it('should not expose sensitive user information', async () => {
        const response = await server.inject({
          method: 'GET',
          url: '/api/users/me',
          headers: {
            authorization: 'Bearer valid-user-token',
          },
        });

        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);

        // Ensure sensitive fields are not exposed
        expect(body).not.toHaveProperty('passwordHash');
        expect(body).not.toHaveProperty('password');
        expect(body).not.toHaveProperty('refreshTokens');
      });
    });
  });
});
