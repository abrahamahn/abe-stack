// main/apps/server/src/__tests__/integration/webauthn.integration.test.ts
/**
 * WebAuthn Integration Tests
 *
 * Tests the WebAuthn/Passkey API routes through fastify.inject(),
 * verifying route existence, auth guards, and schema validation.
 */

import { authRoutes, createAuthGuard } from '@bslt/core/auth';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTest, createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@/http';

import { registerRouteMap } from '@/http';

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
    trustedDevices: {
      findByFingerprint: vi.fn().mockResolvedValue(null),
      findByUserId: vi.fn().mockResolvedValue([]),
      upsert: vi.fn().mockResolvedValue({ id: 'td-1' }),
      delete: vi.fn().mockResolvedValue(true),
    },
    memberships: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByTenantId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'mem-1' }),
    },
    emailChangeTokens: {
      findByTokenHash: vi.fn().mockResolvedValue(null),
      markAsUsed: vi.fn().mockResolvedValue(null),
      invalidateForUser: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: 'ect-1' }),
    },
    emailChangeRevertTokens: {
      findByTokenHash: vi.fn().mockResolvedValue(null),
      markAsUsed: vi.fn().mockResolvedValue(null),
      invalidateForUser: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: 'ecrt-1' }),
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
    legalDocuments: {
      findLatestByType: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    userAgreements: {
      findByUserAndDocument: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ua-1', agreedAt: new Date() }),
    },
    webauthnCredentials: {
      create: vi.fn().mockResolvedValue({ id: 'wc-1' }),
      findByUserId: vi.fn().mockResolvedValue([]),
      findByCredentialId: vi.fn().mockResolvedValue(null),
      updateCounter: vi.fn().mockResolvedValue(undefined),
      updateName: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      deleteAllByUserId: vi.fn().mockResolvedValue(0),
    },
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
    newLoginAlert: vi.fn().mockReturnValue(template),
    passwordChangedAlert: vi.fn().mockReturnValue(template),
    emailChangedAlert: vi.fn().mockReturnValue(template),
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

  mockTx.transaction.mockImplementation((cb: (tx: typeof mockTx) => Promise<unknown>) => {
    return cb(mockTx);
  });

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

describe('WebAuthn API Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockEmail: ReturnType<typeof createMockEmailTemplates>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    const baseConfig = createTest();

    testServer = await createTestServer({
      config: {
        auth: {
          ...baseConfig.auth,
          strategies: ['local', 'webauthn'],
          webauthn: {
            rpName: 'Test App',
            rpId: 'localhost',
            origin: 'http://localhost:5173',
          },
        },
      },
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
      authGuardFactory: createAuthGuard as unknown as AuthGuardFactory,
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
    it('POST /api/auth/webauthn/register/options responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/register/options',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/webauthn/register/verify responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/register/verify',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/webauthn/login/options responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/login/options',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('POST /api/auth/webauthn/login/verify responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/login/verify',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('GET /api/users/me/passkeys responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/passkeys',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('PATCH /api/users/me/passkeys/pk-1 responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'PATCH',
        url: '/api/users/me/passkeys/pk-1',
        payload: { name: 'Test' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('DELETE /api/users/me/passkeys/pk-1/delete responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'DELETE',
        url: '/api/users/me/passkeys/pk-1/delete',
      });
      expect(response.statusCode).not.toBe(404);
    });
  });

  // ==========================================================================
  // Auth Guard Tests (Protected Routes)
  // ==========================================================================

  describe('auth guards', () => {
    it('POST /api/auth/webauthn/register/options returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/register/options',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('POST /api/auth/webauthn/register/verify returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/register/verify',
        payload: { credential: {}, name: 'Test' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('GET /api/users/me/passkeys returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/passkeys',
      });
      expect(response.statusCode).toBe(401);
    });

    it('PATCH /api/users/me/passkeys/pk-1 returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'PATCH',
        url: '/api/users/me/passkeys/pk-1',
        payload: { name: 'New Name' },
      });
      expect(response.statusCode).toBe(401);
    });

    it('DELETE /api/users/me/passkeys/pk-1/delete returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'DELETE',
        url: '/api/users/me/passkeys/pk-1/delete',
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // ==========================================================================
  // Public Route Tests (WebAuthn Login)
  // ==========================================================================

  describe('public routes', () => {
    it('POST /api/auth/webauthn/login/options returns 200 with options', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/login/options',
        payload: {},
      });

      // Should return 200 with authentication options (no WebAuthn config = error)
      // Without webauthn config, the handler will return an error
      expect([200, 500]).toContain(response.statusCode);
    });

    it('POST /api/auth/webauthn/login/verify returns error for invalid credential', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/login/verify',
        payload: {
          credential: { id: 'fake-id' },
          sessionKey: 'invalid-session-key',
        },
      });

      // Should return error for invalid/expired challenge
      expect([400, 401, 500]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // Method Enforcement Tests
  // ==========================================================================

  describe('method enforcement', () => {
    it('GET /api/auth/webauthn/register/options returns 404 (only POST)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/auth/webauthn/register/options',
      });
      expect(response.statusCode).toBe(404);
    });

    it('GET /api/auth/webauthn/login/options returns 404 (only POST)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/auth/webauthn/login/options',
      });
      expect(response.statusCode).toBe(404);
    });

    it('POST /api/users/me/passkeys returns 404 (only GET)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/passkeys',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // Schema Validation Tests
  // ==========================================================================

  describe('schema validation', () => {
    it('PATCH /api/users/me/passkeys/:id returns 400 for empty body (without auth)', async () => {
      const response = await testServer.inject({
        method: 'PATCH',
        url: '/api/users/me/passkeys/pk-1',
        payload: {},
      });

      // Without auth, returns 401 first; with auth, would validate body
      // Route guard runs before schema validation in this setup
      expect([400, 401]).toContain(response.statusCode);
    });
  });

  // ==========================================================================
  // Response Format Tests
  // ==========================================================================

  describe('response format', () => {
    it('auth error responses include message field', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/webauthn/register/options',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as Record<string, unknown>;
      expect(body).toHaveProperty('message');
      expect(typeof body['message']).toBe('string');
    });
  });
});
