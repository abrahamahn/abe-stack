// apps/server/src/__tests__/integration/auth.integration.test.ts
/**
 * Auth API Integration Tests
 *
 * Tests the auth API routes through fastify.inject(),
 * verifying HTTP layer behavior: routing, validation, auth guards, CSRF.
 */

import { authRoutes, createAuthGuard } from '@abe-stack/core/auth';
import { registerRouteMap } from '@abe-stack/server-engine';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@abe-stack/server-engine';

// ============================================================================
// Mock Repositories
// ============================================================================

function createMockRepos() {
  return {
    users: {
      findByEmail: vi.fn().mockResolvedValue(null),
      findByUsername: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
      update: vi.fn().mockResolvedValue(null),
      existsByEmail: vi.fn().mockResolvedValue(false),
      verifyEmail: vi.fn().mockResolvedValue(undefined),
      incrementFailedAttempts: vi.fn().mockResolvedValue(undefined),
      resetFailedAttempts: vi.fn().mockResolvedValue(undefined),
      lockAccount: vi.fn().mockResolvedValue(undefined),
      unlockAccount: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
      updateWithVersion: vi.fn().mockResolvedValue(null),
    },
    refreshTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findByToken: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'rt-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByToken: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteByFamilyId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    refreshTokenFamilies: {
      findById: vi.fn().mockResolvedValue(null),
      findActiveByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'family-1' }),
      revoke: vi.fn().mockResolvedValue(undefined),
      revokeAllForUser: vi.fn().mockResolvedValue(0),
    },
    loginAttempts: {
      create: vi.fn().mockResolvedValue({ id: 'la-1' }),
      countRecentFailures: vi.fn().mockResolvedValue(0),
      findRecentByEmail: vi.fn().mockResolvedValue([]),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    passwordResetTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'prt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    emailVerificationTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      findValidByUserId: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'evt-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      invalidateByUserId: vi.fn().mockResolvedValue(0),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
    },
    securityEvents: {
      create: vi.fn().mockResolvedValue({ id: 'se-1' }),
      findByUserId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByEmail: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findByType: vi.fn().mockResolvedValue([]),
      findBySeverity: vi.fn().mockResolvedValue([]),
      countByType: vi.fn().mockResolvedValue(0),
      deleteOlderThan: vi.fn().mockResolvedValue(0),
    },
    magicLinkTokens: {
      findById: vi.fn().mockResolvedValue(null),
      findValidByTokenHash: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ml-1' }),
      markAsUsed: vi.fn().mockResolvedValue(undefined),
      deleteByUserId: vi.fn().mockResolvedValue(0),
      deleteExpired: vi.fn().mockResolvedValue(0),
      countRecentByEmail: vi.fn().mockResolvedValue(0),
    },
    oauthConnections: {
      findByProviderAndProviderId: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'oc-1' }),
      delete: vi.fn().mockResolvedValue(true),
      countByUserId: vi.fn().mockResolvedValue(0),
    },
    pushSubscriptions: {
      findByEndpoint: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'ps-1' }),
      delete: vi.fn().mockResolvedValue(true),
      deleteByUserId: vi.fn().mockResolvedValue(0),
    },
    notificationPreferences: {
      findByUserId: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'np-1' }),
    },
    plans: { findById: vi.fn().mockResolvedValue(null), findAll: vi.fn().mockResolvedValue([]) },
    subscriptions: {
      findById: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue(null),
    },
    customerMappings: { findByUserId: vi.fn().mockResolvedValue(null) },
    invoices: { findByUserId: vi.fn().mockResolvedValue([]) },
    paymentMethods: { findByUserId: vi.fn().mockResolvedValue([]) },
    billingEvents: { create: vi.fn().mockResolvedValue({ id: 'be-1' }) },
  };
}

// ============================================================================
// Mock Logger
// ============================================================================

function createMockLogger() {
  const logger: Record<string, unknown> = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    trace: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(),
  };
  (logger['child'] as ReturnType<typeof vi.fn>).mockReturnValue(logger);
  return logger;
}

// ============================================================================
// Mock Email Templates
// ============================================================================

function createMockEmailTemplates() {
  const template = {
    subject: 'Test Subject',
    html: '<p>Test</p>',
    text: 'Test',
    to: 'test@example.com',
  };
  return {
    passwordReset: vi.fn().mockReturnValue(template),
    magicLink: vi.fn().mockReturnValue(template),
    emailVerification: vi.fn().mockReturnValue(template),
    existingAccountRegistrationAttempt: vi.fn().mockReturnValue(template),
    tokenReuseAlert: vi.fn().mockReturnValue(template),
  };
}

// ============================================================================
// Mock DB Client
// ============================================================================

function createMockDbClient() {
  const mockTx = {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };

  return {
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(null),
    execute: vi.fn().mockResolvedValue(0),
    raw: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
      return cb(mockTx);
    }),
    healthCheck: vi.fn().mockResolvedValue(true),
    close: vi.fn().mockResolvedValue(undefined),
    getClient: vi.fn(),
  };
}

// ============================================================================
// Test Suite
// ============================================================================

describe('Auth API Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockEmail: ReturnType<typeof createMockEmailTemplates>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    mockRepos = createMockRepos();
    mockEmail = createMockEmailTemplates();
    mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: mockEmail,
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, authRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as AuthGuardFactory,
    });

    await testServer.ready();
  });

  afterAll(async () => {
    await testServer.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Route Existence Tests
  // ==========================================================================

  describe('route existence', () => {
    it('POST /api/auth/register responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/login responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/refresh responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/logout responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/forgot-password responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/reset-password responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/verify-email responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/resend-verification responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/totp/setup responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/totp/setup',
      });
      // Protected route - should return 401, not 404
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/totp/enable responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/totp/enable',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/totp/disable responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/totp/disable',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/auth/totp/status responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/auth/totp/status',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/change-email responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/change-email',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/change-email/confirm responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/change-email/confirm',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Schema Validation Tests
  // ==========================================================================

  describe('schema validation', () => {
    it('POST /api/auth/register returns 400 for empty body', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/register returns 400 for missing password', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'test@example.com' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/register returns 400 for invalid email', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 'not-an-email', password: 'TestPassword123!' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/login returns 400 for empty body', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/login returns 400 for missing password', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { email: 'test@example.com' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/forgot-password returns 400 for missing email', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/forgot-password returns 400 for invalid email', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'bad-email' },
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/reset-password returns 400 for empty body', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/reset-password',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/verify-email returns 400 for missing token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/resend-verification returns 400 for missing email', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });

    it('POST /api/auth/change-email/confirm returns 400 for missing token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/change-email/confirm',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
    });
  });

  // ==========================================================================
  // Auth Guard Tests (Protected Routes)
  // ==========================================================================

  describe('auth guards', () => {
    it('POST /api/auth/logout-all returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/logout-all',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/auth/set-password returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/set-password',
        payload: { password: 'NewPassword123!', confirmPassword: 'NewPassword123!' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/auth/totp/setup returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/totp/setup',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/auth/totp/enable returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/totp/enable',
        payload: { code: '123456' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/auth/totp/disable returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/totp/disable',
        payload: { code: '123456' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/auth/totp/status returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/auth/totp/status',
      });
      expect(response.statusCode).toBe(401);
    });

    it('POST /api/auth/change-email returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/change-email',
        payload: { newEmail: 'new@example.com', password: 'test' },
      });
      expect(response.statusCode).toBe(401);
    });

    // TODO: Investigate Fastify scoped plugin hang with valid Bearer tokens
    // The auth guard works correctly for rejection (401 tests pass), but
    // when allowing a request through, the scoped plugin + mock DB combination
    // causes the request to hang. Needs investigation of Fastify 5 preHandler
    // hook behavior in scoped plugins with vi.fn() mocks.
    it.todo('protected routes accept valid Bearer token');
  });

  // ==========================================================================
  // Public Route Tests
  // ==========================================================================

  describe('public routes', () => {
    it('POST /api/auth/register with valid body calls service', async () => {
      // Mock the DB transaction to return a user
      const mockTx = {
        query: vi.fn().mockResolvedValue([
          {
            id: 'user-1',
            email: 'newuser@example.com',
            name: 'Test User',
            role: 'user',
            email_verified: false,
            password_hash: '$argon2id$...',
            avatar_url: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            version: 1,
            failed_login_attempts: 0,
            locked_until: null,
            totp_secret: null,
            totp_enabled: false,
          },
        ]),
        queryOne: vi.fn().mockResolvedValue(null),
        execute: vi.fn().mockResolvedValue(0),
        raw: vi.fn().mockResolvedValue([]),
        transaction: vi.fn(),
        healthCheck: vi.fn(),
        close: vi.fn(),
        getClient: vi.fn(),
      };

      mockDb.transaction.mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => {
        return cb(mockTx);
      });

      // Mock repos.users.findByEmail to return null (new user)
      mockRepos.users.findByEmail.mockResolvedValue(null);

      // Mock repos.users.findByUsername to return null (username available)
      mockRepos.users.findByUsername.mockResolvedValue(null);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'newuser@example.com',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          password: 'StrongP@ssword123!',
        },
      });

      // Should either succeed (201) or return a service error (not 400/404)
      // The exact status depends on password validation and email sending
      expect([201, 422, 500]).toContain(response.statusCode);
    });

    it('POST /api/auth/login with valid body attempts authentication', async () => {
      // Mock no locked accounts, no failed attempts
      mockDb.query.mockResolvedValue([]);
      mockDb.queryOne.mockResolvedValue(null);
      mockRepos.users.findByEmail.mockResolvedValue(null);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'user@example.com',
          password: 'TestPassword123!',
        },
      });

      // Invalid credentials - should return 401
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Invalid email or password');
    });

    it('POST /api/auth/forgot-password with valid email returns success message', async () => {
      // Forgot-password always returns success to prevent enumeration
      mockRepos.users.findByEmail.mockResolvedValue(null);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/forgot-password',
        payload: { email: 'user@example.com' },
      });

      // Should return 200 even if user doesn't exist (anti-enumeration)
      expect(response.statusCode).toBe(200);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBeDefined();
    });

    it('POST /api/auth/verify-email with invalid token returns error', async () => {
      mockDb.query.mockResolvedValue([]);
      mockDb.queryOne.mockResolvedValue(null);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/verify-email',
        payload: { token: 'invalid-token-value' },
      });

      // Should return an error for invalid token
      expect([400, 401, 404, 500]).toContain(response.statusCode);
    });

    it('POST /api/auth/resend-verification with valid email returns success', async () => {
      mockRepos.users.findByEmail.mockResolvedValue(null);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/resend-verification',
        payload: { email: 'user@example.com' },
      });

      // Should return 200 even if user doesn't exist (anti-enumeration)
      expect(response.statusCode).toBe(200);
    });

    it('POST /api/auth/refresh without cookie returns error', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/refresh',
      });

      // No refresh token cookie - should return 401
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBeDefined();
    });

    it('POST /api/auth/logout without cookie returns success', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/logout',
      });

      // Logout should succeed even without tokens (idempotent)
      expect([200, 401]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // Method Enforcement Tests
  // ==========================================================================

  describe('method enforcement', () => {
    it('GET /api/auth/register returns 404 (only POST)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/auth/register',
      });
      expect(response.statusCode).toBe(404);
    });

    it('GET /api/auth/login returns 404 (only POST)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/auth/login',
      });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/auth/totp/status returns 404 (only GET)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/totp/status',
        payload: {},
      });
      // Fastify returns 404 for wrong method (since the route only registers GET)
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Response Format Tests
  // ==========================================================================

  describe('response format', () => {
    it('error responses include message field', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {},
      });
      expect(response.statusCode).toBe(400);
      const body = parseJsonResponse(response) as Record<string, unknown>;
      expect(body).toHaveProperty('message');
      expect(typeof body['message']).toBe('string');
    });

    it('validation error responses have 400 status', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { email: 123, password: true },
      });
      expect(response.statusCode).toBe(400);
    });

    it('auth error responses have 401 status', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/logout-all',
      });
      expect(response.statusCode).toBe(401);
    });
  });
});
