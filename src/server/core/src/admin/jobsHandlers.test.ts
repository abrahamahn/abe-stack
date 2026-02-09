// src/server/core/src/admin/jobsHandlers.test.ts
/**
 * Unit tests for jobs handlers
 *
 * Tests HTTP handler layer for job monitoring endpoints.
 * Verifies authentication, error handling, and service integration.
 */

import { beforeEach, describe, expect, test, vi } from 'vitest';

import { ERROR_MESSAGES } from '../auth';

import {
  handleCancelJob,
  handleGetJobDetails,
  handleGetQueueStats,
  handleListJobs,
  handleRetryJob,
} from './jobsHandlers';

import type { AdminAppContext } from './types';
import type { FastifyReply, FastifyRequest } from 'fastify';

// ============================================================================
// Mocks
// ============================================================================

// Mock paths must match EXACTLY what the source file imports
vi.mock('./jobsService', () => ({
  listJobs: vi.fn(),
  getJobDetails: vi.fn(),
  getQueueStats: vi.fn(),
  retryJob: vi.fn(),
  cancelJob: vi.fn(),
  JobNotFoundError: class JobNotFoundError extends Error {
    constructor(jobId: string) {
      super(`Job not found: ${jobId}`);
      this.name = 'JobNotFoundError';
    }
  },
  QueueStoreNotAvailableError: class QueueStoreNotAvailableError extends Error {
    constructor(method: string) {
      super(`Queue store does not support method: ${method}`);
      this.name = 'QueueStoreNotAvailableError';
    }
  },
}));

vi.mock('@abe-stack/shared', async () => {
  const actual = await vi.importActual('@abe-stack/shared');
  return {
    ...actual,
    jobListQuerySchema: {
      safeParse: vi.fn(),
    },
  };
});

vi.mock('@abe-stack/db', async () => {
  const actual = await vi.importActual<typeof import('@abe-stack/db')>('@abe-stack/db');
  return {
    ...actual,
    PostgresQueueStore: vi.fn(),
  };
});

// ============================================================================
// Test Helpers
// ============================================================================

function createMockContext(): AdminAppContext {
  return {
    config: {} as AdminAppContext['config'],
    db: {} as AdminAppContext['db'],
    repos: {} as AdminAppContext['repos'],
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    email: { send: vi.fn(), healthCheck: vi.fn() },
    storage: {
      upload: vi.fn(),
      download: vi.fn(),
      delete: vi.fn(),
      getSignedUrl: vi.fn(),
    },
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
    pubsub: {},
    cache: {},
    queue: {},
    write: {},
    search: {},
  } as AdminAppContext;
}

function createMockRequest(
  overrides: Record<string, unknown> = {},
  params: Record<string, string> = {},
  query: Record<string, unknown> = {},
): FastifyRequest {
  return {
    user: { userId: 'admin-123', email: 'admin@example.com', role: 'admin' },
    params,
    query,
    headers: {},
    body: {},
    ...overrides,
  } as unknown as FastifyRequest;
}

function createMockReply(): FastifyReply {
  return {} as FastifyReply;
}

// ============================================================================
// Tests
// ============================================================================

describe('Jobs Handlers', () => {
  let mockCtx: AdminAppContext;

  beforeEach(() => {
    mockCtx = createMockContext();
    vi.clearAllMocks();
  });

  // ==========================================================================
  // handleListJobs
  // ==========================================================================

  describe('handleListJobs', () => {
    describe('when authenticated', () => {
      test('should return 200 with job list on success', async () => {
        const { listJobs } = await import('./jobsService');
        const { jobListQuerySchema } = await import('@abe-stack/shared');

        const mockJobList = {
          data: [
            {
              id: 'job-1',
              name: 'test-job',
              status: 'completed' as const,
              args: { test: 'data' },
              attempts: 1,
              maxAttempts: 3,
              scheduledAt: '2024-01-01T00:00:00.000Z',
              createdAt: '2024-01-01T00:00:00.000Z',
              completedAt: '2024-01-01T00:05:00.000Z',
              durationMs: 5000,
              error: null,
            },
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        };

        vi.mocked(jobListQuerySchema.safeParse).mockReturnValue({
          success: true,
          data: {
            page: 1,
            limit: 20,
          },
        });

        vi.mocked(listJobs).mockResolvedValue(mockJobList);

        const req = createMockRequest({}, {}, { page: '1', limit: '20' });
        const result = await handleListJobs(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockJobList);
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', page: 1, status: undefined },
          'Admin listed jobs',
        );
      });

      test('should pass all query parameters to listJobs service', async () => {
        const { listJobs } = await import('./jobsService');
        const { jobListQuerySchema } = await import('@abe-stack/shared');

        const queryParams = {
          status: 'pending' as const,
          name: 'email-send',
          page: 2,
          limit: 50,
          sortBy: 'createdAt' as const,
          sortOrder: 'desc' as const,
        };

        vi.mocked(jobListQuerySchema.safeParse).mockReturnValue({
          success: true,
          data: queryParams,
        });

        vi.mocked(listJobs).mockResolvedValue({
          data: [],
          total: 0,
          page: 2,
          limit: 50,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        });

        const req = createMockRequest({}, {}, queryParams);
        await handleListJobs(mockCtx, undefined, req, createMockReply());

        expect(listJobs).toHaveBeenCalledWith(expect.anything(), queryParams);
      });

      test('should return 200 when query has invalid page (uses defaults)', async () => {
        const { listJobs } = await import('./jobsService');
        const { jobListQuerySchema } = await import('@abe-stack/shared');

        // When invalid, the schema coerces to defaults
        vi.mocked(jobListQuerySchema.safeParse).mockReturnValue({
          success: true,
          data: { page: 1, limit: 20 },
        });

        vi.mocked(listJobs).mockResolvedValue({
          data: [],
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });

        const req = createMockRequest({}, {}, { page: 'invalid' });
        const result = await handleListJobs(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
      });

      test('should handle QueueStoreNotAvailableError with 500 status', async () => {
        const { listJobs, QueueStoreNotAvailableError } = await import('./jobsService');
        const { jobListQuerySchema } = await import('@abe-stack/shared');

        vi.mocked(jobListQuerySchema.safeParse).mockReturnValue({
          success: true,
          data: { page: 1, limit: 20 },
        });

        vi.mocked(listJobs).mockRejectedValue(new QueueStoreNotAvailableError('listJobs'));

        const req = createMockRequest();
        const result = await handleListJobs(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Queue store does not support method: listJobs' });
      });

      test('should return 500 for unexpected errors', async () => {
        const { listJobs } = await import('./jobsService');
        const { jobListQuerySchema } = await import('@abe-stack/shared');

        vi.mocked(jobListQuerySchema.safeParse).mockReturnValue({
          success: true,
          data: { page: 1, limit: 20 },
        });

        vi.mocked(listJobs).mockRejectedValue(new Error('Database connection failed'));

        const req = createMockRequest();
        const result = await handleListJobs(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = createMockRequest({ user: undefined });
        const result = await handleListJobs(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });
  });

  // ==========================================================================
  // handleGetJobDetails
  // ==========================================================================

  describe('handleGetJobDetails', () => {
    describe('when authenticated', () => {
      test('should return 200 with job details on success', async () => {
        const { getJobDetails } = await import('./jobsService');

        const mockJobDetails = {
          id: 'job-123',
          name: 'test-job',
          status: 'completed' as const,
          args: { test: 'data' },
          attempts: 1,
          maxAttempts: 3,
          scheduledAt: '2024-01-01T00:00:00.000Z',
          createdAt: '2024-01-01T00:00:00.000Z',
          completedAt: '2024-01-01T00:00:10.000Z',
          durationMs: 5000,
          error: null,
        };

        vi.mocked(getJobDetails).mockResolvedValue(mockJobDetails);

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleGetJobDetails(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockJobDetails);
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', jobId: 'job-123' },
          'Admin viewed job details',
        );
      });

      test('should return 404 when job not found', async () => {
        const { getJobDetails, JobNotFoundError } = await import('./jobsService');

        vi.mocked(getJobDetails).mockRejectedValue(new JobNotFoundError('job-404'));

        const req = createMockRequest({}, { jobId: 'job-404' });
        const result = await handleGetJobDetails(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(404);
        expect(result.body).toEqual({ message: 'Job not found: job-404' });
      });

      test('should handle QueueStoreNotAvailableError with 500 status', async () => {
        const { getJobDetails, QueueStoreNotAvailableError } = await import('./jobsService');

        vi.mocked(getJobDetails).mockRejectedValue(
          new QueueStoreNotAvailableError('getJobDetails'),
        );

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleGetJobDetails(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({
          message: 'Queue store does not support method: getJobDetails',
        });
      });

      test('should return 500 for unexpected errors', async () => {
        const { getJobDetails } = await import('./jobsService');

        vi.mocked(getJobDetails).mockRejectedValue(new Error('Database error'));

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleGetJobDetails(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = createMockRequest({ user: undefined }, { jobId: 'job-123' });
        const result = await handleGetJobDetails(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });
  });

  // ==========================================================================
  // handleGetQueueStats
  // ==========================================================================

  describe('handleGetQueueStats', () => {
    describe('when authenticated', () => {
      test('should return 200 with queue statistics on success', async () => {
        const { getQueueStats } = await import('./jobsService');

        const mockStats = {
          pending: 5,
          processing: 2,
          completed: 100,
          failed: 3,
          deadLetter: 1,
          total: 111,
          failureRate: 2.7,
          recentCompleted: 10,
          recentFailed: 1,
        };

        vi.mocked(getQueueStats).mockResolvedValue(mockStats);

        const req = createMockRequest();
        const result = await handleGetQueueStats(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockStats);
        expect(getQueueStats).toHaveBeenCalledWith(expect.anything());
      });

      test('should handle QueueStoreNotAvailableError with 500 status', async () => {
        const { getQueueStats, QueueStoreNotAvailableError } = await import('./jobsService');

        vi.mocked(getQueueStats).mockRejectedValue(
          new QueueStoreNotAvailableError('getQueueStats'),
        );

        const req = createMockRequest();
        const result = await handleGetQueueStats(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({
          message: 'Queue store does not support method: getQueueStats',
        });
      });

      test('should return 500 for unexpected errors', async () => {
        const { getQueueStats } = await import('./jobsService');

        vi.mocked(getQueueStats).mockRejectedValue(new Error('Stats calculation failed'));

        const req = createMockRequest();
        const result = await handleGetQueueStats(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = createMockRequest({ user: undefined });
        const result = await handleGetQueueStats(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });
  });

  // ==========================================================================
  // handleRetryJob
  // ==========================================================================

  describe('handleRetryJob', () => {
    describe('when authenticated', () => {
      test('should return 200 with success response when retry succeeds', async () => {
        const { retryJob } = await import('./jobsService');

        const mockResponse = {
          success: true,
          message: 'Job has been queued for retry',
        };

        vi.mocked(retryJob).mockResolvedValue(mockResponse);

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleRetryJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockResponse);
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', jobId: 'job-123', success: true },
          'Admin retried job',
        );
      });

      test('should return 200 with failure response when retry fails due to status', async () => {
        const { retryJob } = await import('./jobsService');

        const mockResponse = {
          success: false,
          message: 'Job cannot be retried. Current status: completed',
        };

        vi.mocked(retryJob).mockResolvedValue(mockResponse);

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleRetryJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockResponse);
      });

      test('should return 404 when job not found', async () => {
        const { retryJob, JobNotFoundError } = await import('./jobsService');

        vi.mocked(retryJob).mockRejectedValue(new JobNotFoundError('job-404'));

        const req = createMockRequest({}, { jobId: 'job-404' });
        const result = await handleRetryJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(404);
        expect(result.body).toEqual({ message: 'Job not found: job-404' });
      });

      test('should handle QueueStoreNotAvailableError with 500 status', async () => {
        const { retryJob, QueueStoreNotAvailableError } = await import('./jobsService');

        vi.mocked(retryJob).mockRejectedValue(new QueueStoreNotAvailableError('retryJob'));

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleRetryJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Queue store does not support method: retryJob' });
      });

      test('should return 500 for unexpected errors', async () => {
        const { retryJob } = await import('./jobsService');

        vi.mocked(retryJob).mockRejectedValue(new Error('Queue operation failed'));

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleRetryJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = createMockRequest({ user: undefined }, { jobId: 'job-123' });
        const result = await handleRetryJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });
  });

  // ==========================================================================
  // handleCancelJob
  // ==========================================================================

  describe('handleCancelJob', () => {
    describe('when authenticated', () => {
      test('should return 200 with success response when cancel succeeds', async () => {
        const { cancelJob } = await import('./jobsService');

        const mockResponse = {
          success: true,
          message: 'Job has been cancelled',
        };

        vi.mocked(cancelJob).mockResolvedValue(mockResponse);

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleCancelJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockResponse);
        expect(mockCtx.log.info).toHaveBeenCalledWith(
          { adminId: 'admin-123', jobId: 'job-123', success: true },
          'Admin cancelled job',
        );
      });

      test('should return 200 with failure response when cancel fails due to status', async () => {
        const { cancelJob } = await import('./jobsService');

        const mockResponse = {
          success: false,
          message: 'Job cannot be cancelled. Current status: completed',
        };

        vi.mocked(cancelJob).mockResolvedValue(mockResponse);

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleCancelJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(200);
        expect(result.body).toEqual(mockResponse);
      });

      test('should return 404 when job not found', async () => {
        const { cancelJob, JobNotFoundError } = await import('./jobsService');

        vi.mocked(cancelJob).mockRejectedValue(new JobNotFoundError('job-404'));

        const req = createMockRequest({}, { jobId: 'job-404' });
        const result = await handleCancelJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(404);
        expect(result.body).toEqual({ message: 'Job not found: job-404' });
      });

      test('should handle QueueStoreNotAvailableError with 500 status', async () => {
        const { cancelJob, QueueStoreNotAvailableError } = await import('./jobsService');

        vi.mocked(cancelJob).mockRejectedValue(new QueueStoreNotAvailableError('cancelJob'));

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleCancelJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: 'Queue store does not support method: cancelJob' });
      });

      test('should return 500 for unexpected errors', async () => {
        const { cancelJob } = await import('./jobsService');

        vi.mocked(cancelJob).mockRejectedValue(new Error('Queue operation failed'));

        const req = createMockRequest({}, { jobId: 'job-123' });
        const result = await handleCancelJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(500);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
        expect(mockCtx.log.error).toHaveBeenCalled();
      });
    });

    describe('when not authenticated', () => {
      test('should return 401 when user is undefined', async () => {
        const req = createMockRequest({ user: undefined }, { jobId: 'job-123' });
        const result = await handleCancelJob(mockCtx, undefined, req, createMockReply());

        expect(result.status).toBe(401);
        expect(result.body).toEqual({ message: ERROR_MESSAGES.UNAUTHORIZED });
      });
    });
  });

  // ==========================================================================
  // Edge Cases & Integration
  // ==========================================================================

  describe('edge cases', () => {
    test('should handle null user object gracefully', async () => {
      const { jobListQuerySchema } = await import('@abe-stack/shared');

      vi.mocked(jobListQuerySchema.safeParse).mockReturnValue({
        success: true,
        data: { page: 1, limit: 20 },
      });

      const req = createMockRequest({ user: null as never });
      const result = await handleListJobs(mockCtx, undefined, req, createMockReply());

      // With null user, code proceeds past undefined check but fails when accessing user.userId
      // This returns 500 internal error as the code doesn't explicitly check for null
      expect(result.status).toBe(500);
      expect(result.body).toEqual({ message: ERROR_MESSAGES.INTERNAL_ERROR });
    });

    test('should extract jobId from request params correctly', async () => {
      const { getJobDetails } = await import('./jobsService');

      vi.mocked(getJobDetails).mockResolvedValue({
        id: 'custom-job-id-789',
        name: 'test',
        status: 'pending',
        args: {},
        attempts: 0,
        maxAttempts: 3,
        scheduledAt: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        completedAt: null,
        durationMs: null,
        error: null,
      });

      const req = createMockRequest({}, { jobId: 'custom-job-id-789' });
      await handleGetJobDetails(mockCtx, undefined, req, createMockReply());

      expect(getJobDetails).toHaveBeenCalledWith(expect.anything(), 'custom-job-id-789');
    });

    test('should log admin actions with user context', async () => {
      const { retryJob } = await import('./jobsService');

      vi.mocked(retryJob).mockResolvedValue({ success: true, message: 'Retried' });

      const req = createMockRequest(
        { user: { userId: 'admin-999', email: 'admin@test.com', role: 'admin' } },
        { jobId: 'job-log-test' },
      );

      await handleRetryJob(mockCtx, undefined, req, createMockReply());

      expect(mockCtx.log.info).toHaveBeenCalledWith(
        expect.objectContaining({ adminId: 'admin-999', jobId: 'job-log-test' }),
        'Admin retried job',
      );
    });
  });
});
