// main/shared/src/domain/jobs/jobs.contracts.ts
/**
 * Jobs Contracts
 *
 * API Contract definitions for background job monitoring and management.
 * Used by admin UI to monitor background job queue.
 * @module Domain/Jobs
 */

import { errorResponseSchema, successResponseSchema } from '../engine/http';
import {
  jobActionResponseSchema,
  jobDetailsSchema,
  jobListQuerySchema,
  jobListResponseSchema,
  queueStatsSchema,
} from '../engine/jobs';

import type { Contract } from '../primitives/api';

// ============================================================================
// Contract Definition
// ============================================================================

export const jobsContract = {
  /**
   * List jobs with filtering and pagination.
   * Access typically restricted to admins.
   */
  listJobs: {
    method: 'GET' as const,
    path: '/api/admin/jobs',
    query: jobListQuerySchema,
    responses: {
      200: successResponseSchema(jobListResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List jobs with filtering and pagination (admin only)',
  },

  /**
   * Get detailed job information.
   */
  getJobDetails: {
    method: 'GET' as const,
    path: '/api/admin/jobs/:jobId',
    responses: {
      200: successResponseSchema(jobDetailsSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get detailed job information (admin only)',
  },

  /**
   * Get queue statistics.
   */
  getQueueStats: {
    method: 'GET' as const,
    path: '/api/admin/jobs/stats',
    responses: {
      200: successResponseSchema(queueStatsSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get queue statistics (admin only)',
  },

  /**
   * Retry a failed job.
   */
  retryJob: {
    method: 'POST' as const,
    path: '/api/admin/jobs/:jobId/retry',
    responses: {
      200: successResponseSchema(jobActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Retry a failed job (admin only)',
  },

  /**
   * Cancel a pending or processing job.
   */
  cancelJob: {
    method: 'POST' as const,
    path: '/api/admin/jobs/:jobId/cancel',
    responses: {
      200: successResponseSchema(jobActionResponseSchema),
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Cancel a pending or processing job (admin only)',
  },
} satisfies Contract;
