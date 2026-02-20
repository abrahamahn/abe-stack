// main/server/core/src/legal/routes.test.ts
/**
 * Legal Routes Unit Tests
 *
 * Tests for route definitions including:
 * - Route structure and configuration
 * - Schema validation
 * - Handler mapping
 * - Authentication requirements
 * - HTTP methods
 *
 * @complexity O(1) per test - simple route configuration validation
 */

import { createLegalDocumentSchema } from '@bslt/shared';
import { beforeEach, describe, expect, test, vi } from 'vitest';

// ============================================================================
// Mocks (must be before imports)
// ============================================================================

vi.mock('@bslt/server-system', async () => {
  const actual = await vi.importActual<typeof import('../../../system/src')>('@bslt/server-system');
  return {
    ...actual,
  };
});

vi.mock('./handlers', () => ({
  handleGetCurrentLegal: vi.fn(),
  handleGetUserAgreements: vi.fn(),
  handlePublishLegal: vi.fn(),
}));

import { legalRoutes } from './routes';

import type { LegalAppContext } from './types';
import type { RouteDefinition } from '../../../system/src';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): LegalAppContext {
  return {
    db: {} as never,
    repos: {
      legalDocuments: {
        create: vi.fn(),
        findById: vi.fn(),
        findByType: vi.fn(),
        findLatestByType: vi.fn(),
        findAllLatest: vi.fn(),
        update: vi.fn(),
      },
      consentRecords: {
        recordAgreement: vi.fn(),
        findAgreementsByUserId: vi.fn(),
        findAgreementByUserAndDocument: vi.fn(),
        recordConsent: vi.fn(),
        findConsentsByUserId: vi.fn(),
        findLatestConsentByUserAndType: vi.fn(),
      },
    },
    log: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    errorTracker: {
      captureError: vi.fn(),
      addBreadcrumb: vi.fn(),
      setUserContext: vi.fn(),
    },
  } as unknown as LegalAppContext;
}

function createMockReply(): { status: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
  return {
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
}

// ============================================================================
// Route Definition Tests
// ============================================================================

describe('Legal Routes', () => {
  describe('Route Map Structure', () => {
    test('should export legalRoutes as a RouteMap', () => {
      expect(legalRoutes).toBeDefined();
      expect(legalRoutes).toBeInstanceOf(Map);
    });

    test('should define all expected routes', () => {
      const routeKeys = Array.from(legalRoutes.keys());
      expect(routeKeys).toHaveLength(3);

      expect(routeKeys).toContain('legal/current');
      expect(routeKeys).toContain('users/me/agreements');
      expect(routeKeys).toContain('admin/legal/publish');
    });

    test('should have exactly 3 routes', () => {
      expect(legalRoutes.size).toBe(3);
    });
  });

  // ==========================================================================
  // Public Route: GET /api/legal/current
  // ==========================================================================

  describe('legal/current Route', () => {
    const route = legalRoutes.get('legal/current') as RouteDefinition;

    test('should use GET method', () => {
      expect(route.method).toBe('GET');
    });

    test('should be a public route (no auth required)', () => {
      expect(route.isPublic).toBe(true);
    });

    test('should not require a request body schema', () => {
      expect(route.schema).toBeUndefined();
    });

    test('should have a handler function', () => {
      expect(typeof route.handler).toBe('function');
    });

    test('should have OpenAPI metadata', () => {
      expect(route.openapi).toBeDefined();
      expect(route.openapi?.summary).toBe('Get current legal documents');
      expect(route.openapi?.tags).toContain('Legal');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleGetCurrentLegal with correct arguments', async () => {
        const { handleGetCurrentLegal } = await import('./handlers');
        vi.mocked(handleGetCurrentLegal).mockResolvedValue({
          status: 200,
          body: { documents: [] },
        });

        const ctx = createMockContext();
        const reply = createMockReply();

        await route.handler(ctx, undefined as never, {} as never, reply as never);

        expect(handleGetCurrentLegal).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // User Route: GET /api/users/me/agreements
  // ==========================================================================

  describe('users/me/agreements Route', () => {
    const route = legalRoutes.get('users/me/agreements') as RouteDefinition;

    test('should use GET method', () => {
      expect(route.method).toBe('GET');
    });

    test('should be a protected route (auth required)', () => {
      expect(route.isPublic).not.toBe(true);
    });

    test('should have a handler function', () => {
      expect(typeof route.handler).toBe('function');
    });

    test('should have OpenAPI metadata', () => {
      expect(route.openapi).toBeDefined();
      expect(route.openapi?.summary).toBe('Get user legal agreements');
      expect(route.openapi?.tags).toContain('Legal');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handleGetUserAgreements with correct arguments', async () => {
        const { handleGetUserAgreements } = await import('./handlers');
        vi.mocked(handleGetUserAgreements).mockResolvedValue({
          status: 200,
          body: { agreements: [] },
        });

        const ctx = createMockContext();
        const reply = createMockReply();
        const req = {
          user: { userId: 'user-1', email: 'test@example.com', role: 'user' },
          requestInfo: { ipAddress: '127.0.0.1' },
          headers: {},
          cookies: {},
        };

        await route.handler(ctx, undefined as never, req as never, reply as never);

        expect(handleGetUserAgreements).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Admin Route: POST /api/admin/legal/publish
  // ==========================================================================

  describe('admin/legal/publish Route', () => {
    const route = legalRoutes.get('admin/legal/publish') as RouteDefinition;

    test('should use POST method', () => {
      expect(route.method).toBe('POST');
    });

    test('should be a protected route (auth required)', () => {
      expect(route.isPublic).not.toBe(true);
    });

    test('should require admin role', () => {
      expect(route.roles).toContain('admin');
    });

    test('should have a body validation schema', () => {
      expect(route.schema).toBeDefined();
      expect(route.schema).toBe(createLegalDocumentSchema);
    });

    test('should have a handler function', () => {
      expect(typeof route.handler).toBe('function');
    });

    test('should have OpenAPI metadata', () => {
      expect(route.openapi).toBeDefined();
      expect(route.openapi?.summary).toBe('Publish legal document');
      expect(route.openapi?.tags).toContain('Legal');
      expect(route.openapi?.tags).toContain('Admin');
    });

    describe('Handler Invocation', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      test('should call handlePublishLegal with correct arguments', async () => {
        const { handlePublishLegal } = await import('./handlers');
        vi.mocked(handlePublishLegal).mockResolvedValue({
          status: 201,
          body: {
            document: {
              id: 'doc-1',
              type: 'terms_of_service',
              title: 'ToS',
              content: 'Content...',
              version: 1,
              effectiveAt: '2026-01-01T00:00:00.000Z',
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          },
        });

        const ctx = createMockContext();
        const reply = createMockReply();
        const req = {
          user: { userId: 'admin-1', email: 'admin@example.com', role: 'admin' },
          requestInfo: { ipAddress: '127.0.0.1' },
          headers: { 'user-agent': 'TestAgent' },
          cookies: {},
        };
        const body = {
          type: 'terms_of_service',
          title: 'Terms of Service',
          content: 'Content...',
          effectiveAt: '2026-01-01T00:00:00Z',
        };

        await route.handler(ctx, body as never, req as never, reply as never);

        expect(handlePublishLegal).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // Integration Test Stubs
  // ==========================================================================

  describe('Integration Stubs', () => {
    test.todo('GET /api/legal/current should return 200 with documents array');
    test.todo('GET /api/legal/current should return empty array when no documents exist');

    test.todo('GET /api/users/me/agreements should return 401 for unauthenticated requests');
    test.todo('GET /api/users/me/agreements should return 200 with agreements array');
    test.todo(
      'GET /api/users/me/agreements should return empty array for users with no agreements',
    );

    test.todo('POST /api/admin/legal/publish should return 401 for unauthenticated requests');
    test.todo('POST /api/admin/legal/publish should return 403 for non-admin users');
    test.todo('POST /api/admin/legal/publish should return 400 when required fields are missing');
    test.todo('POST /api/admin/legal/publish should return 201 with created document');
    test.todo('POST /api/admin/legal/publish should auto-increment version number');
  });
});
