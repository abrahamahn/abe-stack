// src/apps/server/src/__tests__/integration/activities-apikeys.integration.test.ts
/**
 * Activities & API Keys Integration Tests
 *
 * Tests route registration, auth guards, and method enforcement
 * for activities and api-keys modules via fastify.inject().
 */

import { createAuthGuard } from '@abe-stack/core';
import { activityRoutes } from '@abe-stack/core/activities';
import { apiKeyRoutes } from '@abe-stack/core/api-keys';
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
    legalDocuments: {
      findLatestByType: vi.fn().mockResolvedValue(null),
      findById: vi.fn().mockResolvedValue(null),
    },
    userAgreements: {
      findByUserAndDocument: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'ua-1', agreedAt: new Date() }),
    },
    memberships: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByUserAndTenant: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'mb-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    tenants: {
      findById: vi.fn().mockResolvedValue(null),
      findBySlug: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'tenant-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    invitations: {
      findById: vi.fn().mockResolvedValue(null),
      findByTenantId: vi.fn().mockResolvedValue([]),
      findByToken: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'inv-1' }),
      update: vi.fn().mockResolvedValue(null),
      delete: vi.fn().mockResolvedValue(true),
    },
    activities: {
      create: vi.fn().mockResolvedValue({ id: 'act-1' }),
      findByTenantId: vi.fn().mockResolvedValue({ data: [], total: 0 }),
      findById: vi.fn().mockResolvedValue(null),
      findRecent: vi.fn().mockResolvedValue([]),
      findByActorId: vi.fn().mockResolvedValue([]),
      findByResource: vi.fn().mockResolvedValue([]),
    },
    apiKeys: {
      findByUserId: vi.fn().mockResolvedValue([]),
      findById: vi.fn().mockResolvedValue(null),
      findByKeyHash: vi.fn().mockResolvedValue(null),
      findByTenantId: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'ak-1' }),
      update: vi.fn().mockResolvedValue(null),
      revoke: vi.fn().mockResolvedValue(null),
      updateLastUsed: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(true),
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

// ============================================================================
// Test Suite
// ============================================================================

describe('Activities & API Keys Integration Tests', () => {
  let testServer: TestServer;
  let mockDb: ReturnType<typeof createMockDbClient>;
  let mockRepos: ReturnType<typeof createMockRepos>;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeAll(async () => {
    testServer = await createTestServer({
      enableCsrf: false,
      enableCors: false,
      enableSecurityHeaders: false,
    });

    mockDb = createMockDbClient();
    mockRepos = createMockRepos();
    mockLogger = createMockLogger();

    const ctx = {
      db: mockDb,
      repos: mockRepos,
      log: mockLogger,
      email: testServer.email,
      emailTemplates: {},
      config: testServer.config,
    };

    registerRouteMap(testServer.server, ctx as never, activityRoutes, {
      prefix: '/api',
      jwtSecret: testServer.config.auth.jwt.secret,
      authGuardFactory: createAuthGuard as AuthGuardFactory,
    });

    registerRouteMap(testServer.server, ctx as never, apiKeyRoutes, {
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
  // Activities Routes
  // ==========================================================================

  // --------------------------------------------------------------------------
  // GET /api/activities — User's own activity feed
  // --------------------------------------------------------------------------

  describe('GET /api/activities', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/activities',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/activities',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/activities',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // --------------------------------------------------------------------------
  // GET /api/tenants/:tenantId/activities — Tenant activity feed
  // --------------------------------------------------------------------------

  describe('GET /api/tenants/:tenantId/activities', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/tenant-123/activities',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/tenants/tenant-123/activities',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/tenants/tenant-123/activities',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // ==========================================================================
  // API Keys Routes
  // ==========================================================================

  // --------------------------------------------------------------------------
  // GET /api/users/me/api-keys — List keys
  // --------------------------------------------------------------------------

  describe('GET /api/users/me/api-keys', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/api-keys',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/api-keys',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/users/me/api-keys/create — Create key
  // --------------------------------------------------------------------------

  describe('POST /api/users/me/api-keys/create', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        payload: { name: 'test-key' },
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/create',
        payload: { name: 'test-key' },
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/api-keys/create',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // --------------------------------------------------------------------------
  // POST /api/users/me/api-keys/:id/revoke — Revoke key
  // --------------------------------------------------------------------------

  describe('POST /api/users/me/api-keys/:id/revoke', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/key-123/revoke',
        payload: {},
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/key-123/revoke',
        payload: {},
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for GET method', async () => {
      const response = await testServer.inject({
        method: 'GET',
        url: '/api/users/me/api-keys/key-123/revoke',
      });
      expect(response.statusCode).toBe(404);
    });
  });

  // --------------------------------------------------------------------------
  // DELETE /api/users/me/api-keys/:id — Delete key
  // --------------------------------------------------------------------------

  describe('DELETE /api/users/me/api-keys/:id', () => {
    it('responds (not 404)', async () => {
      const response = await testServer.inject({
        method: 'DELETE',
        url: '/api/users/me/api-keys/key-123',
      });
      expect(response.statusCode).not.toBe(404);
    });

    it('returns 401 without token', async () => {
      const response = await testServer.inject({
        method: 'DELETE',
        url: '/api/users/me/api-keys/key-123',
      });
      expect(response.statusCode).toBe(401);
      const body = parseJsonResponse(response) as { message: string };
      expect(body.message).toBe('Unauthorized');
    });

    it('returns 404 for POST method', async () => {
      const response = await testServer.inject({
        method: 'POST',
        url: '/api/users/me/api-keys/key-123',
        payload: {},
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
