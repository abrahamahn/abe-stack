// main/apps/server/src/__tests__/integration/login-failure.integration.test.ts
/**
 * Login Failure Integration Tests
 *
 * Verifies anti-enumeration behavior: login failures always return
 * the same generic 401 message regardless of failure reason.
 */

import { authRoutes, createAuthGuard } from '@bslt/core/auth';
import { registerRouteMap } from '@bslt/server-system';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestServer, parseJsonResponse, type TestServer } from './test-utils';

import type { AuthGuardFactory } from '@bslt/server-system';

// ============================================================================
// Mock Factories
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
    legalDocuments: { findLatestByType: vi.fn().mockResolvedValue(null) },
    userAgreements: {
      findByUserAndDocument: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ua-1' }),
    },
  };
}

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
// Test Suite
// ============================================================================

describe('Login Failure Anti-Enumeration Tests', () => {
  let testServer: TestServer;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockDb: ReturnType<typeof createMockDbClient>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    mockRepos = createMockRepos();
    const mockLogger = createMockLogger();
    const mockEmail = createMockEmailTemplates();

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
  // Anti-Enumeration: Generic 401 Responses
  // ==========================================================================

  describe('anti-enumeration', () => {
    it('returns generic 401 for non-existent user', async () => {
      // User does not exist
      mockRepos.users.findByEmail.mockResolvedValue(null);
      mockRepos.users.findByUsername.mockResolvedValue(null);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'nonexistent@example.com',
          password: 'SomePassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Invalid email or password');
    });

    it('returns generic 401 for wrong password', async () => {
      // User exists but password is wrong
      mockDb.query.mockResolvedValue([]);
      mockDb.queryOne.mockResolvedValue(null);
      mockRepos.users.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'real@example.com',
        name: 'Real User',
        role: 'user',
        emailVerified: true,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$wronghash',
        failedLoginAttempts: 0,
        lockedUntil: null,
        totpEnabled: false,
        totpSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'real@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Invalid email or password');
    });

    it('both non-existent user and wrong password return identical message', async () => {
      // First: non-existent user
      mockRepos.users.findByEmail.mockResolvedValue(null);
      mockRepos.users.findByUsername.mockResolvedValue(null);

      const response1 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'nobody@example.com',
          password: 'SomePassword123!',
        },
      });

      // Reset mocks for second request
      vi.clearAllMocks();

      // Second: existing user, wrong password
      mockDb.query.mockResolvedValue([]);
      mockDb.queryOne.mockResolvedValue(null);
      mockRepos.users.findByEmail.mockResolvedValue({
        id: 'user-1',
        email: 'real@example.com',
        name: 'Real User',
        role: 'user',
        emailVerified: true,
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=1$wronghash',
        failedLoginAttempts: 0,
        lockedUntil: null,
        totpEnabled: false,
        totpSecret: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      });

      const response2 = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'real@example.com',
          password: 'WrongPassword123!',
        },
      });

      // Both should be 401 with identical message (anti-enumeration)
      const body1 = parseJsonResponse(response1) as { message: string };
      const body2 = parseJsonResponse(response2) as { message: string };
      expect(response1.statusCode).toBe(response2.statusCode);
      expect(body1.message).toBe(body2.message);
    });

    it('response never exposes specific failure reason to client', async () => {
      mockRepos.users.findByEmail.mockResolvedValue(null);

      const response = await testServer.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'test@example.com',
          password: 'Test123!',
        },
      });

      const body = parseJsonResponse(response) as Record<string, unknown>;
      // Should not contain any enumeration-revealing fields
      expect(body).not.toHaveProperty('reason');
      expect(body).not.toHaveProperty('failureReason');
      expect(body).not.toHaveProperty('userExists');
      expect(body).not.toHaveProperty('emailExists');
    });
  });
});
