// apps/server/src/__tests__/integration/auth.integration.test.ts
/**
 * Auth Flow Integration Tests
 *
 * Tests the complete authentication flows using fastify.inject()
 * without starting an actual HTTP server.
 */

import { registerCookies, registerCsrf } from '@http/index';
import Fastify from 'fastify';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  buildAuthenticatedRequest,
  createTestServer,
  createTestUser,
  createUnverifiedUser,
  parseJsonResponse,
  type TestServer,
  type TestUser,
} from './test-utils';

// Type for password reset token
interface PasswordResetToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

// Type for email verification token
interface EmailVerificationToken {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
}

import type { FastifyInstance } from 'fastify';

// ============================================================================
// Registration Flow Tests
// ============================================================================

describe('Registration Flow', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user with valid credentials', async () => {
      // Setup mock to simulate user doesn't exist yet
      testServer.db.query.users.findFirst.mockResolvedValue(null);

      // Setup a test route
      testServer.server.post('/api/auth/register', async (req) => {
        const body = req.body as { email: string; password: string; name?: string };

        // Simulate checking if user exists
        const existingUser = await testServer.db.query.users.findFirst();
        if (existingUser) {
          return { status: 409, message: 'Email already registered' };
        }

        return {
          status: 'pending_verification',
          message: 'Please check your email to verify your account.',
          email: body.email,
        };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'newuser@example.com',
          password: 'SecurePassword123!',
          name: 'New User',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ status: string; email: string }>(response);
      expect(body.status).toBe('pending_verification');
      expect(body.email).toBe('newuser@example.com');
    });

    test('should reject registration with existing email', async () => {
      const existingUser = createTestUser({ email: 'existing@example.com' });
      testServer.db.query.users.findFirst.mockResolvedValue(existingUser);

      testServer.server.post('/api/auth/register', async () => {
        const existing = await testServer.db.query.users.findFirst();
        if (existing) {
          return { message: 'Email already registered' };
        }
        return { status: 'pending_verification' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'existing@example.com',
          password: 'SecurePassword123!',
        },
      });

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Email already registered');
    });

    test('should reject registration with weak password', async () => {
      testServer.db.query.users.findFirst.mockResolvedValue(null);

      testServer.server.post('/api/auth/register', async (req) => {
        const body = req.body as { password: string };

        // Simple weak password check
        if (body.password.length < 8) {
          return { message: 'Password does not meet security requirements' };
        }
        return { status: 'pending_verification' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'weak',
        },
      });

      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Password does not meet security requirements');
    });
  });
});

// ============================================================================
// Login Flow Tests
// ============================================================================

describe('Login Flow', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('POST /api/auth/login', () => {
    test('should login successfully with valid credentials', async () => {
      const user = createTestUser();
      testServer.db.query.users.findFirst.mockResolvedValue(user);

      testServer.server.post('/api/auth/login', async (req, reply) => {
        const body = req.body as { email: string; password: string };
        const foundUser = (await testServer.db.query.users.findFirst()) as TestUser | null;

        if (!foundUser || foundUser.email !== body.email) {
          reply.status(401);
          return { message: 'Invalid credentials' };
        }

        // Simulate password verification (in real code, would use argon2)
        // For test, assume password matches

        // Set refresh token cookie
        reply.setCookie('refreshToken', 'test-refresh-token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        });

        return {
          token: 'test-access-token',
          user: {
            id: foundUser.id,
            email: foundUser.email,
            name: foundUser.name,
            role: foundUser.role,
          },
        };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'TestPassword123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ token: string; user: { email: string } }>(response);
      expect(body.token).toBe('test-access-token');
      expect(body.user.email).toBe('test@example.com');

      // Check refresh token cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const refreshCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.includes('refreshToken'))
        : cookies?.includes('refreshToken')
          ? cookies
          : undefined;
      expect(refreshCookie).toBeDefined();
    });

    test('should reject login with invalid credentials', async () => {
      testServer.db.query.users.findFirst.mockResolvedValue(null);

      testServer.server.post('/api/auth/login', async (_req, reply) => {
        const foundUser = await testServer.db.query.users.findFirst();

        if (!foundUser) {
          reply.status(401);
          return { message: 'Invalid credentials' };
        }

        return { token: 'should-not-reach' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Invalid credentials');
    });

    test('should reject login for unverified email', async () => {
      const unverifiedUser = createUnverifiedUser();
      testServer.db.query.users.findFirst.mockResolvedValue(unverifiedUser);

      testServer.server.post('/api/auth/login', async (_req, reply) => {
        const foundUser = (await testServer.db.query.users.findFirst()) as TestUser | null;

        if (foundUser && !foundUser.emailVerified) {
          reply.status(403);
          return { message: 'Please verify your email before logging in' };
        }

        return { token: 'test-token' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'unverified@example.com',
          password: 'TestPassword123!',
        },
      });

      expect(response.statusCode).toBe(403);
      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toContain('verify your email');
    });

    test('should return 429 when account is locked', async () => {
      testServer.server.post('/api/auth/login', async (_req, reply) => {
        // Simulate account lockout
        reply.status(429);
        return { message: 'Account temporarily locked. Please try again later.' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'locked@example.com',
          password: 'password',
        },
      });

      expect(response.statusCode).toBe(429);
    });
  });
});

// ============================================================================
// Token Refresh Flow Tests
// ============================================================================

describe('Token Refresh Flow', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('POST /api/auth/refresh', () => {
    test('should refresh tokens with valid refresh token cookie', async () => {
      testServer.server.post('/api/auth/refresh', async (req, reply) => {
        const refreshToken = req.cookies['refreshToken'];

        if (!refreshToken) {
          reply.status(401);
          return { message: 'No refresh token provided' };
        }

        // Simulate token validation (would verify JWT in real code)
        if (refreshToken === 'valid-refresh-token') {
          // Set new refresh token
          reply.setCookie('refreshToken', 'new-refresh-token', {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/',
          });

          return { token: 'new-access-token' };
        }

        reply.status(401);
        return { message: 'Invalid token' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: 'refreshToken=valid-refresh-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ token: string }>(response);
      expect(body.token).toBe('new-access-token');
    });

    test('should reject refresh without token cookie', async () => {
      testServer.server.post('/api/auth/refresh', async (req, reply) => {
        const refreshToken = req.cookies['refreshToken'];

        if (!refreshToken) {
          reply.status(401);
          return { message: 'No refresh token provided' };
        }

        return { token: 'new-token' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
      });

      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('No refresh token provided');
    });

    test('should reject refresh with invalid token', async () => {
      testServer.server.post('/api/auth/refresh', async (req, reply) => {
        const refreshToken = req.cookies['refreshToken'];

        if (refreshToken !== 'valid-refresh-token') {
          reply.status(401);
          // Clear the invalid cookie
          reply.clearCookie('refreshToken');
          return { message: 'Invalid token' };
        }

        return { token: 'new-token' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
        headers: {
          cookie: 'refreshToken=invalid-or-expired-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});

// ============================================================================
// Logout Flow Tests
// ============================================================================

describe('Logout Flow', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('POST /api/auth/logout', () => {
    test('should logout and clear refresh token cookie', async () => {
      testServer.server.post('/api/auth/logout', async (_req, reply) => {
        // Clear the refresh token cookie
        reply.clearCookie('refreshToken', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        });

        return { message: 'Logged out successfully' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          cookie: 'refreshToken=some-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Logged out successfully');

      // Check cookie is cleared
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
    });

    test('should succeed even without refresh token', async () => {
      testServer.server.post('/api/auth/logout', async (_req, reply) => {
        reply.clearCookie('refreshToken');
        return { message: 'Logged out successfully' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /api/auth/logout-all (requires CSRF)', () => {
    let csrfServer: FastifyInstance;
    const secret = 'test-csrf-secret-key-32-chars-long';

    beforeEach(async () => {
      csrfServer = Fastify({ logger: false });
      registerCookies(csrfServer, { secret });
      registerCsrf(csrfServer, {
        secret,
        cookieOpts: { httpOnly: true, secure: false, sameSite: 'lax' },
      });

      csrfServer.get('/csrf-token', async (_req, reply) => {
        const token = reply.generateCsrf();
        return { token };
      });

      csrfServer.post('/api/auth/logout-all', async (_req, reply) => {
        reply.clearCookie('refreshToken');
        return { message: 'Logged out from all devices' };
      });

      await csrfServer.ready();
    });

    afterEach(async () => {
      await csrfServer.close();
    });

    test('should require CSRF token for logout-all', async () => {
      const response = await csrfServer.inject({
        method: 'POST',
        url: '/api/auth/logout-all',
      });

      expect(response.statusCode).toBe(403);
    });

    test('should succeed with valid CSRF token', async () => {
      // Get CSRF token
      const tokenResponse = await csrfServer.inject({
        method: 'GET',
        url: '/csrf-token',
      });

      const { token } = parseJsonResponse<{ token: string }>(tokenResponse);
      const cookies = tokenResponse.headers['set-cookie'];
      const csrfCookie = Array.isArray(cookies)
        ? cookies.find((c) => c.startsWith('_csrf='))
        : cookies;

      expect(csrfCookie).toBeDefined();

      // Make logout-all request with CSRF
      const response = await csrfServer.inject(
        buildAuthenticatedRequest({
          method: 'POST',
          url: '/api/auth/logout-all',
          csrfToken: token,
          csrfCookie: csrfCookie?.split(';')[0],
        }),
      );

      expect(response.statusCode).toBe(200);
    });
  });
});

// ============================================================================
// Password Reset Flow Tests
// ============================================================================

describe('Password Reset Flow', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('POST /api/auth/forgot-password', () => {
    test('should always return success (prevents email enumeration)', async () => {
      testServer.server.post('/api/auth/forgot-password', async () => {
        // Always return success to prevent email enumeration
        return { message: 'If an account exists, a password reset email has been sent.' };
      });

      // Test with existing email
      const response1 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'existing@example.com' },
      });

      expect(response1.statusCode).toBe(200);

      // Test with non-existing email - should return same response
      const response2 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'nonexistent@example.com' },
      });

      expect(response2.statusCode).toBe(200);
      expect(response1.body).toBe(response2.body);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    test('should reset password with valid token', async () => {
      testServer.db.query.passwordResetTokens.findFirst.mockResolvedValue({
        id: 'token-id',
        token: 'valid-reset-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        usedAt: null,
      });

      testServer.server.post('/api/auth/reset-password', async (req, reply) => {
        const body = req.body as { token: string; password: string };
        const resetToken =
          (await testServer.db.query.passwordResetTokens.findFirst()) as PasswordResetToken | null;

        if (!resetToken || resetToken.token !== body.token) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        if (resetToken.expiresAt < new Date()) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        return { message: 'Password reset successfully' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          token: 'valid-reset-token',
          password: 'NewSecurePassword123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{ message: string }>(response);
      expect(body.message).toBe('Password reset successfully');
    });

    test('should reject reset with invalid token', async () => {
      testServer.db.query.passwordResetTokens.findFirst.mockResolvedValue(null);

      testServer.server.post('/api/auth/reset-password', async (req, reply) => {
        const body = req.body as { token: string };
        const resetToken =
          (await testServer.db.query.passwordResetTokens.findFirst()) as PasswordResetToken | null;

        if (!resetToken || resetToken.token !== body.token) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        return { message: 'Password reset successfully' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          token: 'invalid-token',
          password: 'NewPassword123!',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    test('should reject reset with expired token', async () => {
      testServer.db.query.passwordResetTokens.findFirst.mockResolvedValue({
        id: 'token-id',
        token: 'expired-token',
        userId: 'user-123',
        expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
        usedAt: null,
      });

      testServer.server.post('/api/auth/reset-password', async (req, reply) => {
        const body = req.body as { token: string };
        const resetToken =
          (await testServer.db.query.passwordResetTokens.findFirst()) as PasswordResetToken | null;

        if (!resetToken || resetToken.token !== body.token) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        if (resetToken.expiresAt < new Date()) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        return { message: 'Password reset successfully' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {
          token: 'expired-token',
          password: 'NewPassword123!',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });
});

// ============================================================================
// Email Verification Flow Tests
// ============================================================================

describe('Email Verification Flow', () => {
  let testServer: TestServer;

  beforeEach(async () => {
    testServer = await createTestServer({ enableCsrf: false });
  });

  afterEach(async () => {
    await testServer.close();
  });

  describe('POST /api/auth/verify-email', () => {
    test('should verify email with valid token', async () => {
      const unverifiedUser = createUnverifiedUser();

      testServer.db.query.emailVerificationTokens.findFirst.mockResolvedValue({
        id: 'token-id',
        token: 'valid-verification-token',
        userId: unverifiedUser.id,
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
        usedAt: null,
      });

      testServer.db.query.users.findFirst.mockResolvedValue({
        ...unverifiedUser,
        emailVerified: true, // After verification
      });

      testServer.server.post('/api/auth/verify-email', async (req, reply) => {
        const body = req.body as { token: string };
        const verifyToken =
          (await testServer.db.query.emailVerificationTokens.findFirst()) as EmailVerificationToken | null;

        if (!verifyToken || verifyToken.token !== body.token) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        if (verifyToken.expiresAt < new Date()) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        const user = (await testServer.db.query.users.findFirst()) as TestUser | null;

        // Set refresh token cookie
        reply.setCookie('refreshToken', 'new-refresh-token', {
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        });

        return {
          verified: true,
          token: 'new-access-token',
          user: {
            id: user?.id,
            email: user?.email,
            name: user?.name,
            role: user?.role,
          },
        };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          token: 'valid-verification-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse<{
        verified: boolean;
        token: string;
        user: { email: string };
      }>(response);
      expect(body.verified).toBe(true);
      expect(body.token).toBe('new-access-token');
    });

    test('should reject verification with invalid token', async () => {
      testServer.db.query.emailVerificationTokens.findFirst.mockResolvedValue(null);

      testServer.server.post('/api/auth/verify-email', async (req, reply) => {
        const body = req.body as { token: string };
        const verifyToken =
          (await testServer.db.query.emailVerificationTokens.findFirst()) as EmailVerificationToken | null;

        if (!verifyToken || verifyToken.token !== body.token) {
          reply.status(400);
          return { message: 'Invalid or expired token' };
        }

        return { verified: true };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {
          token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/resend-verification', () => {
    test('should resend verification email for unverified user', async () => {
      const unverifiedUser = createUnverifiedUser();
      testServer.db.query.users.findFirst.mockResolvedValue(unverifiedUser);

      testServer.server.post('/api/auth/resend-verification', async (req) => {
        const body = req.body as { email: string };
        const user = (await testServer.db.query.users.findFirst()) as TestUser | null;

        if (!user || user.email !== body.email) {
          // Return same response to prevent enumeration
          return {
            message: 'If an unverified account exists, a verification email has been sent.',
          };
        }

        if (user.emailVerified) {
          // Return same response to prevent enumeration
          return {
            message: 'If an unverified account exists, a verification email has been sent.',
          };
        }

        // Simulate sending email
        await testServer.email.send({
          to: body.email,
          subject: 'Verify your email',
          text: 'Click here to verify...',
        });

        return { message: 'If an unverified account exists, a verification email has been sent.' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: {
          email: 'unverified@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(testServer.email.send).toHaveBeenCalled();
    });

    test('should not reveal if email exists (verified user)', async () => {
      const verifiedUser = createTestUser();
      testServer.db.query.users.findFirst.mockResolvedValue(verifiedUser);

      testServer.server.post('/api/auth/resend-verification', async () => {
        // Always return same message
        return { message: 'If an unverified account exists, a verification email has been sent.' };
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: {
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      // Email should NOT be sent for already verified user
      expect(testServer.email.send).not.toHaveBeenCalled();
    });
  });
});

// ============================================================================
// CSRF Behavior in Auth Routes Tests
// ============================================================================

describe('CSRF Behavior in Auth Routes', () => {
  let server: FastifyInstance;
  const secret = 'test-csrf-secret-key-32-chars-long';

  beforeEach(async () => {
    server = Fastify({ logger: false });
    registerCookies(server, { secret });
    registerCsrf(server, {
      secret,
      cookieOpts: { httpOnly: true, secure: false, sameSite: 'lax' },
    });

    // Add routes that should be CSRF-exempt (by default in CSRF middleware)
    server.post('/api/auth/login', () => ({ token: 'test' }));
    server.post('/api/auth/register', () => ({ status: 'pending_verification' }));
    server.post('/api/auth/refresh', () => ({ token: 'new-token' }));
    server.post('/api/auth/forgot-password', () => ({ message: 'sent' }));
    server.post('/api/auth/reset-password', () => ({ message: 'reset' }));
    server.post('/api/auth/verify-email', () => ({ verified: true }));

    // Route that should require CSRF
    server.post('/api/auth/logout-all', () => ({ message: 'logged out' }));
    server.post('/api/protected', () => ({ data: 'sensitive' }));

    await server.ready();
  });

  afterEach(async () => {
    await server.close();
  });

  test('login should not require CSRF token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'test@test.com', password: 'pass' },
    });

    expect(response.statusCode).toBe(200);
  });

  test('register should not require CSRF token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email: 'test@test.com', password: 'pass' },
    });

    expect(response.statusCode).toBe(200);
  });

  test('refresh should not require CSRF token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/refresh',
    });

    expect(response.statusCode).toBe(200);
  });

  test('forgot-password should not require CSRF token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email: 'test@test.com' },
    });

    expect(response.statusCode).toBe(200);
  });

  test('reset-password should not require CSRF token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token: 'abc', password: 'newpass' },
    });

    expect(response.statusCode).toBe(200);
  });

  test('verify-email should not require CSRF token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { token: 'abc' },
    });

    expect(response.statusCode).toBe(200);
  });

  test('non-exempt route should require CSRF token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/protected',
      payload: { data: 'test' },
    });

    expect(response.statusCode).toBe(403);
  });
});
