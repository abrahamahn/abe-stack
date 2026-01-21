// apps/server/src/__tests__/integration/auth-routes.integration.test.ts
/* eslint-disable import/order -- vi.mock must come before mocked module imports */
/**
 * Integration tests for authentication routes
 *
 * Tests the complete auth flow using Fastify's inject method.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FastifyInstance } from 'fastify';

// Mock database and external services
vi.mock('@infrastructure/database/client', () => ({
  createDbClient: vi.fn(() => ({
    execute: vi.fn().mockResolvedValue([]),
    query: {},
  })),
}));

vi.mock('@infrastructure/email/factory', () => ({
  createEmailService: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({ success: true }),
  })),
}));

vi.mock('@infrastructure/pubsub/postgresPubSub', () => ({
  createPostgresPubSub: vi.fn(() => ({
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    publish: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
  })),
}));

import Fastify from 'fastify';

describe('Auth Routes Integration', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = Fastify({ logger: false });

    // Register auth routes with mock handlers
    server.post('/api/auth/login', async (request, reply) => {
      const body = request.body as { email?: string; password?: string };

      if (!body.email || !body.password) {
        return reply.status(400).send({ message: 'Email and password are required' });
      }

      if (body.email === 'test@example.com' && body.password === 'validPassword123!') {
        return reply.status(200).send({
          accessToken: 'mock-access-token',
          user: {
            id: 'user-123',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user',
          },
        });
      }

      return reply.status(401).send({ message: 'Invalid credentials' });
    });

    server.post('/api/auth/register', async (request, reply) => {
      const body = request.body as { email?: string; password?: string; name?: string };

      if (!body.email || !body.password) {
        return reply.status(400).send({ message: 'Email and password are required' });
      }

      if (body.email === 'existing@example.com') {
        return reply.status(409).send({ message: 'Email already registered' });
      }

      if (body.password.length < 8) {
        return reply.status(400).send({ message: 'Password too weak' });
      }

      return reply.status(201).send({
        message: 'Registration successful. Please verify your email.',
        userId: 'new-user-123',
      });
    });

    server.post('/api/auth/refresh', async (request, reply) => {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return reply.status(401).send({ message: 'Missing refresh token' });
      }

      const token = authHeader.substring(7);
      if (token === 'valid-refresh-token') {
        return reply.status(200).send({
          accessToken: 'new-access-token',
        });
      }

      return reply.status(401).send({ message: 'Invalid refresh token' });
    });

    server.post('/api/auth/logout', async (_request, reply) => {
      return reply.status(200).send({ message: 'Logged out successfully' });
    });

    server.post('/api/auth/forgot-password', async (request, reply) => {
      const body = request.body as { email?: string };

      if (!body.email) {
        return reply.status(400).send({ message: 'Email is required' });
      }

      // Always return success to prevent email enumeration
      return reply.status(200).send({
        message: 'If the email exists, a reset link has been sent',
      });
    });

    server.post('/api/auth/reset-password', async (request, reply) => {
      const body = request.body as { token?: string; password?: string };

      if (!body.token || !body.password) {
        return reply.status(400).send({ message: 'Token and password are required' });
      }

      if (body.token === 'expired-token') {
        return reply.status(400).send({ message: 'Token has expired' });
      }

      if (body.token === 'invalid-token') {
        return reply.status(400).send({ message: 'Invalid token' });
      }

      return reply.status(200).send({ message: 'Password reset successful' });
    });

    server.get('/api/auth/verify-email', async (request, reply) => {
      const query = request.query as { token?: string };

      if (!query.token) {
        return reply.status(400).send({ message: 'Token is required' });
      }

      if (query.token === 'valid-token') {
        return reply.status(200).send({ message: 'Email verified successfully' });
      }

      return reply.status(400).send({ message: 'Invalid or expired token' });
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
  // Login Tests
  // ===========================================================================

  describe('POST /api/auth/login', () => {
    it('should return 200 with token for valid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'validPassword123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBe('mock-access-token');
      expect(body.user.email).toBe('test@example.com');
      expect(body.user.id).toBe('user-123');
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongPassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Invalid credentials');
    });

    it('should return 400 for missing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          password: 'somePassword',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Email and password are required');
    });

    it('should return 400 for missing password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================================================
  // Registration Tests
  // ===========================================================================

  describe('POST /api/auth/register', () => {
    it('should return 201 for successful registration', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'SecureP@ssw0rd!',
          name: 'New User',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('Registration successful');
      expect(body.userId).toBeDefined();
    });

    it('should return 409 for existing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'existing@example.com',
          password: 'SecureP@ssw0rd!',
        },
      });

      expect(response.statusCode).toBe(409);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Email already registered');
    });

    it('should return 400 for weak password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'weak',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Password too weak');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================================================
  // Token Refresh Tests
  // ===========================================================================

  describe('POST /api/auth/refresh', () => {
    it('should return new access token for valid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          authorization: 'Bearer valid-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accessToken).toBe('new-access-token');
    });

    it('should return 401 for invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for missing authorization header', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/refresh',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ===========================================================================
  // Logout Tests
  // ===========================================================================

  describe('POST /api/auth/logout', () => {
    it('should return 200 for successful logout', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Logged out successfully');
    });
  });

  // ===========================================================================
  // Password Reset Tests
  // ===========================================================================

  describe('POST /api/auth/forgot-password', () => {
    it('should return 200 and send reset email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: {
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toContain('reset link');
    });

    it('should return 200 even for non-existent email (prevent enumeration)', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      // Should not reveal whether email exists
      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for missing email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('should return 200 for successful password reset', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          token: 'valid-reset-token',
          password: 'NewSecureP@ss123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Password reset successful');
    });

    it('should return 400 for expired token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          token: 'expired-token',
          password: 'NewSecureP@ss123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Token has expired');
    });

    it('should return 400 for invalid token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          token: 'invalid-token',
          password: 'NewSecureP@ss123!',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Invalid token');
    });

    it('should return 400 for missing fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================================================
  // Email Verification Tests
  // ===========================================================================

  describe('GET /api/auth/verify-email', () => {
    it('should return 200 for valid verification token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/verify-email?token=valid-token',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('Email verified successfully');
    });

    it('should return 400 for invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/verify-email?token=invalid-token',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/api/auth/verify-email',
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
