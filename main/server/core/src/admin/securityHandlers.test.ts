// main/server/core/src/admin/securityHandlers.test.ts
/**
 * Security Handlers Unit Tests
 *
 * Comprehensive test suite for security audit HTTP handlers.
 * Tests authentication, authorization, error handling, and service integration.
 *
 * @complexity O(1) per test - all operations are mocked
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ERROR_MESSAGES } from '../auth';

import {
  handleExportSecurityEvents,
  handleGetSecurityEvent,
  handleGetSecurityMetrics,
  handleListSecurityEvents,
} from './securityHandlers';

import type {
  SecurityEvent,
  SecurityEventsExportRequest,
  SecurityEventsFilter,
  SecurityEventsListRequest,
  SecurityMetrics,
} from '@bslt/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AdminAppContext } from './types';

// ============================================================================
// Mocks
// ============================================================================

vi.mock('@bslt/db', async () => {
  const actual = await vi.importActual<typeof import('../../../db/src')>('@bslt/db');
  return {
    ...actual,
  };
});

vi.mock('./securityService', () => ({
  listSecurityEvents: vi.fn(),
  getSecurityEvent: vi.fn(),
  getSecurityMetrics: vi.fn(),
  exportSecurityEvents: vi.fn(),
  SecurityEventNotFoundError: class SecurityEventNotFoundError extends Error {
    constructor(id: string) {
      super(`Security event not found: ${id}`);
      this.name = 'SecurityEventNotFoundError';
    }
  },
}));

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock security event for testing
 */
function createMockSecurityEvent(overrides: Partial<SecurityEvent> = {}): SecurityEvent {
  return {
    id: 'event-123',
    userId: 'user-456',
    email: 'user@example.com',
    eventType: 'suspicious_login',
    severity: 'high',
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    metadata: { reason: 'unusual location' },
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create a mock security metrics object for testing
 */
function createMockSecurityMetrics(overrides: Partial<SecurityMetrics> = {}): SecurityMetrics {
  return {
    totalEvents: 100,
    criticalEvents: 5,
    highEvents: 15,
    mediumEvents: 30,
    lowEvents: 50,
    tokenReuseCount: 3,
    accountLockedCount: 2,
    suspiciousLoginCount: 10,
    eventsByType: {
      suspicious_login: 10,
      token_reuse_detected: 3,
      account_locked: 2,
    },
    period: 'day',
    periodStart: '2024-01-01T00:00:00.000Z',
    periodEnd: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * Create a mock AdminAppContext for testing
 */
function createMockContext(): AdminAppContext {
  return {
    config: {} as AdminAppContext['config'],
    db: {} as AdminAppContext['db'],
    repos: {
      users: {} as AdminAppContext['repos']['users'],
    } as AdminAppContext['repos'],
    email: { send: vi.fn(), healthCheck: vi.fn() },
    storage: {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
    pubsub: {},
    cache: {},
    billing: {
      provider: 'stripe',
      createCustomer: vi.fn(),
      createCheckoutSession: vi.fn(),
      cancelSubscription: vi.fn(),
      resumeSubscription: vi.fn(),
      updateSubscription: vi.fn(),
      getSubscription: vi.fn(),
      createSetupIntent: vi.fn(),
      listPaymentMethods: vi.fn(),
      attachPaymentMethod: vi.fn(),
      detachPaymentMethod: vi.fn(),
      setDefaultPaymentMethod: vi.fn(),
      listInvoices: vi.fn(),
      createProduct: vi.fn(),
      updateProduct: vi.fn(),
      archivePrice: vi.fn(),
      verifyWebhookSignature: vi.fn(),
      parseWebhookEvent: vi.fn(),
      createCustomerPortalSession: vi.fn(),
    } as unknown,
    notifications: {
      isConfigured: vi.fn().mockReturnValue(false),
    },
    queue: {},
    write: {},
    search: {},
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  } as AdminAppContext;
}

/**
 * Create a mock FastifyRequest for testing
 */
function createMockRequest(
  overrides: Partial<
    FastifyRequest & { user?: { userId: string; email: string; role: string } }
  > = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): FastifyRequest & { user?: { userId: string; email: string; role: string } } {
  return {
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    params,
    query,
    headers: {},
    ...overrides,
  } as FastifyRequest & { user?: { userId: string; email: string; role: string } };
}

/**
 * Create a mock FastifyReply for testing
 */
function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('Security Handlers', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // handleListSecurityEvents
  // ==========================================================================

  describe('handleListSecurityEvents', () => {
    describe('when authenticated', () => {
      test('should return 200 with security events list', async () => {
        const { listSecurityEvents } = await import('./securityService');
        const mockEvents = [
          createMockSecurityEvent(),
          createMockSecurityEvent({ id: 'event-456', eventType: 'account_locked' }),
        ];

        vi.mocked(listSecurityEvents).mockResolvedValue({
          data: mockEvents,
          total: 2,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        });

        const req = createMockRequest();
        const body: SecurityEventsListRequest = { page: 1, limit: 20, sortOrder: 'desc' };
        const result = await handleListSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(200);
        expect('body' in result && 'data' in result.body).toBe(true);
        if ('body' in result && 'data' in result.body) {
          expect(result.body.data).toHaveLength(2);
          expect(result.body.total).toBe(2);
        }
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', eventCount: 2 },
          'Admin listed security events',
        );
      });

      test('should pass pagination options to service', async () => {
        const { listSecurityEvents } = await import('./securityService');
        vi.mocked(listSecurityEvents).mockResolvedValue({
          data: [],
          total: 0,
          page: 2,
          limit: 50,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        });

        const req = createMockRequest();
        const body: SecurityEventsListRequest = {
          page: 2,
          limit: 50,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        };

        await handleListSecurityEvents(mockCtx, body, req, createMockReply());

        expect(listSecurityEvents).toHaveBeenCalledWith(
          mockCtx.db,
          {
            page: 2,
            limit: 50,
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
          undefined,
        );
      });

      test('should pass filters to service', async () => {
        const { listSecurityEvents } = await import('./securityService');
        vi.mocked(listSecurityEvents).mockResolvedValue({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });

        const req = createMockRequest();
        const filter: SecurityEventsFilter = {
          eventType: 'suspicious_login',
          severity: 'high',
          userId: 'user-123',
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        };
        const body: SecurityEventsListRequest = {
          page: 1,
          limit: 20,
          sortOrder: 'desc',
          filter,
        };

        await handleListSecurityEvents(mockCtx, body, req, createMockReply());

        expect(listSecurityEvents).toHaveBeenCalledWith(
          mockCtx.db,
          { page: 1, limit: 20, sortOrder: 'desc' },
          filter,
        );
      });

      test('should handle empty results', async () => {
        const { listSecurityEvents } = await import('./securityService');
        vi.mocked(listSecurityEvents).mockResolvedValue({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });

        const req = createMockRequest();
        const body: SecurityEventsListRequest = { page: 1, limit: 20, sortOrder: 'desc' };
        const result = await handleListSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(200);
        expect('body' in result && 'data' in result.body).toBe(true);
        if ('body' in result && 'data' in result.body) {
          expect(result.body.data).toHaveLength(0);
        }
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = {
          params: {},
          query: {},
          headers: {},
        } as FastifyRequest & { user?: { userId: string; email: string; role: string } };
        const body: SecurityEventsListRequest = { page: 1, limit: 20, sortOrder: 'desc' };
        const result = await handleListSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });

    describe('error handling', () => {
      test('should return 500 on service error', async () => {
        const { listSecurityEvents } = await import('./securityService');
        vi.mocked(listSecurityEvents).mockRejectedValue(new Error('Database error'));

        const req = createMockRequest();
        const body: SecurityEventsListRequest = { page: 1, limit: 20, sortOrder: 'desc' };
        const result = await handleListSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // handleGetSecurityEvent
  // ==========================================================================

  describe('handleGetSecurityEvent', () => {
    describe('when authenticated', () => {
      test('should return 200 with security event details', async () => {
        const { getSecurityEvent } = await import('./securityService');
        const mockEvent = createMockSecurityEvent();
        vi.mocked(getSecurityEvent).mockResolvedValue(mockEvent);

        const req = createMockRequest({}, { id: 'event-123' });
        const result = await handleGetSecurityEvent(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockEvent);
        expect(getSecurityEvent).toHaveBeenCalledWith(mockCtx.db, 'event-123');
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', eventId: 'event-123' },
          'Admin viewed security event',
        );
      });

      test('should extract id from request params', async () => {
        const { getSecurityEvent } = await import('./securityService');
        vi.mocked(getSecurityEvent).mockResolvedValue(createMockSecurityEvent());

        const req = createMockRequest({}, { id: 'event-789' });
        await handleGetSecurityEvent(mockCtx, undefined, req, createMockReply());

        expect(getSecurityEvent).toHaveBeenCalledWith(mockCtx.db, 'event-789');
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = {
          user: undefined,
          params: { id: 'event-123' },
          query: {},
          headers: {},
        } as unknown as FastifyRequest;
        const result = await handleGetSecurityEvent(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });

    describe('error handling', () => {
      test('should return 404 when event not found', async () => {
        const { getSecurityEvent, SecurityEventNotFoundError } = await import('./securityService');
        vi.mocked(getSecurityEvent).mockRejectedValue(new SecurityEventNotFoundError('event-999'));

        const req = createMockRequest({}, { id: 'event-999' });
        const result = await handleGetSecurityEvent(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(404);
        expect(result.body).toEqual({ message: 'Security event not found' });
      });

      test('should return 500 on service error', async () => {
        const { getSecurityEvent } = await import('./securityService');
        vi.mocked(getSecurityEvent).mockRejectedValue(new Error('Database error'));

        const req = createMockRequest({}, { id: 'event-123' });
        const result = await handleGetSecurityEvent(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // handleGetSecurityMetrics
  // ==========================================================================

  describe('handleGetSecurityMetrics', () => {
    describe('when authenticated', () => {
      test('should return 200 with security metrics', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        const mockMetrics = createMockSecurityMetrics();
        vi.mocked(getSecurityMetrics).mockResolvedValue(mockMetrics);

        const req = createMockRequest();
        const result = await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockMetrics);
        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'day');
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', period: 'day' },
          'Admin viewed security metrics',
        );
      });

      test('should use day as default period', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockResolvedValue(createMockSecurityMetrics());

        const req = createMockRequest({}, {}, {});
        await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'day');
      });

      test('should accept hour period from query', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockResolvedValue(
          createMockSecurityMetrics({ period: 'hour' }),
        );

        const req = createMockRequest({}, {}, { period: 'hour' });
        await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'hour');
      });

      test('should accept week period from query', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockResolvedValue(
          createMockSecurityMetrics({ period: 'week' }),
        );

        const req = createMockRequest({}, {}, { period: 'week' });
        await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'week');
      });

      test('should accept month period from query', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockResolvedValue(
          createMockSecurityMetrics({ period: 'month' }),
        );

        const req = createMockRequest({}, {}, { period: 'month' });
        await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'month');
      });

      test('should ignore invalid period values', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockResolvedValue(createMockSecurityMetrics());

        const req = createMockRequest({}, {}, { period: 'invalid' });
        await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'day');
      });

      test('should ignore empty period string', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockResolvedValue(createMockSecurityMetrics());

        const req = createMockRequest({}, {}, { period: '' });
        await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'day');
      });

      test('should ignore non-string period values', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockResolvedValue(createMockSecurityMetrics());

        const req = createMockRequest({}, {}, { period: 123 });
        await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(getSecurityMetrics).toHaveBeenCalledWith(mockCtx.db, 'day');
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = {
          params: {},
          query: {},
          headers: {},
        } as FastifyRequest & { user?: { userId: string; email: string; role: string } };
        const result = await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });

    describe('error handling', () => {
      test('should return 500 on service error', async () => {
        const { getSecurityMetrics } = await import('./securityService');
        vi.mocked(getSecurityMetrics).mockRejectedValue(new Error('Database error'));

        const req = createMockRequest();
        const result = await handleGetSecurityMetrics(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });
  });

  // ==========================================================================
  // handleExportSecurityEvents
  // ==========================================================================

  describe('handleExportSecurityEvents', () => {
    describe('when authenticated', () => {
      test('should return 200 with JSON export', async () => {
        const { exportSecurityEvents } = await import('./securityService');
        const mockExport = {
          data: JSON.stringify([createMockSecurityEvent()]),
          filename: 'security-events-2024-01-01.json',
          contentType: 'application/json',
        };
        vi.mocked(exportSecurityEvents).mockResolvedValue(mockExport);

        const req = createMockRequest();
        const body: SecurityEventsExportRequest = { format: 'json' };
        const result = await handleExportSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockExport);
        expect(exportSecurityEvents).toHaveBeenCalledWith(mockCtx.db, 'json', undefined);
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', format: 'json', filter: undefined },
          'Admin exported security events',
        );
      });

      test('should return 200 with CSV export', async () => {
        const { exportSecurityEvents } = await import('./securityService');
        const mockExport = {
          data: 'id,userId,email,eventType,severity\nevent-123,user-456,user@example.com,suspicious_login,high',
          filename: 'security-events-2024-01-01.csv',
          contentType: 'text/csv',
        };
        vi.mocked(exportSecurityEvents).mockResolvedValue(mockExport);

        const req = createMockRequest();
        const body: SecurityEventsExportRequest = { format: 'csv' };
        const result = await handleExportSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockExport);
        expect(exportSecurityEvents).toHaveBeenCalledWith(mockCtx.db, 'csv', undefined);
      });

      test('should pass filters to export service', async () => {
        const { exportSecurityEvents } = await import('./securityService');
        vi.mocked(exportSecurityEvents).mockResolvedValue({
          data: '[]',
          filename: 'security-events-2024-01-01.json',
          contentType: 'application/json',
        });

        const req = createMockRequest();
        const filter: SecurityEventsFilter = {
          eventType: 'account_locked',
          severity: 'critical',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        };
        const body: SecurityEventsExportRequest = { format: 'json', filter };
        await handleExportSecurityEvents(mockCtx, body, req, createMockReply());

        expect(exportSecurityEvents).toHaveBeenCalledWith(mockCtx.db, 'json', filter);
      });

      test('should handle export with all filter options', async () => {
        const { exportSecurityEvents } = await import('./securityService');
        vi.mocked(exportSecurityEvents).mockResolvedValue({
          data: '[]',
          filename: 'security-events-2024-01-01.json',
          contentType: 'application/json',
        });

        const req = createMockRequest();
        const filter: SecurityEventsFilter = {
          eventType: 'suspicious_login',
          severity: 'high',
          userId: 'user-123',
          email: 'test@example.com',
          ipAddress: '192.168.1.1',
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        };
        const body: SecurityEventsExportRequest = { format: 'csv', filter };
        await handleExportSecurityEvents(mockCtx, body, req, createMockReply());

        expect(exportSecurityEvents).toHaveBeenCalledWith(mockCtx.db, 'csv', filter);
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', format: 'csv', filter },
          'Admin exported security events',
        );
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = {
          params: {},
          query: {},
          headers: {},
        } as FastifyRequest & { user?: { userId: string; email: string; role: string } };
        const body: SecurityEventsExportRequest = { format: 'json' };
        const result = await handleExportSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });

    describe('error handling', () => {
      test('should return 500 on service error', async () => {
        const { exportSecurityEvents } = await import('./securityService');
        vi.mocked(exportSecurityEvents).mockRejectedValue(new Error('Database error'));

        const req = createMockRequest();
        const body: SecurityEventsExportRequest = { format: 'json' };
        const result = await handleExportSecurityEvents(mockCtx, body, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });
  });
});
