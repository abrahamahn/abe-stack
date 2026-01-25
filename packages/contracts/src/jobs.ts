// packages/contracts/src/jobs.ts
/**
 * Jobs Contract
 *
 * Job monitoring schemas and API contract definitions.
 * Used by admin UI to monitor background job queue.
 */

import { errorResponseSchema } from './common';
import { createSchema, type Contract, type Schema } from './types';

// ============================================================================
// Job Status
// ============================================================================

export const JOB_STATUSES = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DEAD_LETTER: 'dead_letter',
  CANCELLED: 'cancelled',
} as const;

export type JobStatus = (typeof JOB_STATUSES)[keyof typeof JOB_STATUSES];

export const jobStatusSchema: Schema<JobStatus> = createSchema((data: unknown) => {
  if (
    data !== 'pending' &&
    data !== 'processing' &&
    data !== 'completed' &&
    data !== 'failed' &&
    data !== 'dead_letter' &&
    data !== 'cancelled'
  ) {
    throw new Error(
      'Job status must be one of: pending, processing, completed, failed, dead_letter, cancelled',
    );
  }
  return data;
});

// ============================================================================
// Job Error
// ============================================================================

export interface JobError {
  name: string;
  message: string;
  stack?: string;
}

export const jobErrorSchema: Schema<JobError> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid job error');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.name !== 'string') {
    throw new Error('Error name must be a string');
  }
  if (typeof obj.message !== 'string') {
    throw new Error('Error message must be a string');
  }
  return {
    name: obj.name,
    message: obj.message,
    stack: typeof obj.stack === 'string' ? obj.stack : undefined,
  };
});

// ============================================================================
// Job Details
// ============================================================================

export interface JobDetails {
  id: string;
  name: string;
  args: unknown;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  scheduledAt: string;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
  error: JobError | null;
  deadLetterReason?: string | null;
}

export const jobDetailsSchema: Schema<JobDetails> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid job details');
  }
  const obj = data as Record<string, unknown>;

  if (typeof obj.id !== 'string') {
    throw new Error('Job id must be a string');
  }
  if (typeof obj.name !== 'string') {
    throw new Error('Job name must be a string');
  }
  const status = jobStatusSchema.parse(obj.status);
  if (typeof obj.attempts !== 'number' || !Number.isInteger(obj.attempts)) {
    throw new Error('Attempts must be an integer');
  }
  if (typeof obj.maxAttempts !== 'number' || !Number.isInteger(obj.maxAttempts)) {
    throw new Error('Max attempts must be an integer');
  }
  if (typeof obj.scheduledAt !== 'string') {
    throw new Error('Scheduled at must be a string');
  }
  if (typeof obj.createdAt !== 'string') {
    throw new Error('Created at must be a string');
  }

  return {
    id: obj.id,
    name: obj.name,
    args: obj.args,
    status,
    attempts: obj.attempts,
    maxAttempts: obj.maxAttempts,
    scheduledAt: obj.scheduledAt,
    createdAt: obj.createdAt,
    completedAt:
      obj.completedAt === null || typeof obj.completedAt === 'string' ? obj.completedAt : null,
    durationMs: typeof obj.durationMs === 'number' ? obj.durationMs : null,
    error: obj.error ? jobErrorSchema.parse(obj.error) : null,
    deadLetterReason:
      obj.deadLetterReason === null || typeof obj.deadLetterReason === 'string'
        ? obj.deadLetterReason
        : null,
  };
});

// ============================================================================
// Job List Query
// ============================================================================

export interface JobListQuery {
  status?: JobStatus;
  name?: string;
  page: number;
  limit: number;
  sortBy?: 'createdAt' | 'scheduledAt' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
}

export const jobListQuerySchema: Schema<JobListQuery> = createSchema((data: unknown) => {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;

  // Status is optional
  let status: JobStatus | undefined;
  if (obj.status !== undefined && obj.status !== '') {
    status = jobStatusSchema.parse(obj.status);
  }

  // Name filter is optional
  const name = typeof obj.name === 'string' && obj.name.length > 0 ? obj.name : undefined;

  // Page defaults to 1
  let page = 1;
  if (obj.page !== undefined) {
    page = typeof obj.page === 'string' ? parseInt(obj.page, 10) : Number(obj.page);
    if (!Number.isInteger(page) || page < 1) {
      throw new Error('Page must be an integer >= 1');
    }
  }

  // Limit defaults to 50
  let limit = 50;
  if (obj.limit !== undefined) {
    limit = typeof obj.limit === 'string' ? parseInt(obj.limit, 10) : Number(obj.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new Error('Limit must be an integer between 1 and 100');
    }
  }

  // Sort options
  let sortBy: 'createdAt' | 'scheduledAt' | 'completedAt' | undefined;
  if (obj.sortBy === 'createdAt' || obj.sortBy === 'scheduledAt' || obj.sortBy === 'completedAt') {
    sortBy = obj.sortBy;
  }

  let sortOrder: 'asc' | 'desc' | undefined;
  if (obj.sortOrder === 'asc' || obj.sortOrder === 'desc') {
    sortOrder = obj.sortOrder;
  }

  return { status, name, page, limit, sortBy, sortOrder };
});

// ============================================================================
// Job List Response
// ============================================================================

export interface JobListResponse {
  data: JobDetails[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
}

export const jobListResponseSchema: Schema<JobListResponse> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid job list response');
  }
  const obj = data as Record<string, unknown>;

  if (!Array.isArray(obj.data)) {
    throw new Error('Data must be an array');
  }
  const parsedData = obj.data.map((item) => jobDetailsSchema.parse(item));

  if (typeof obj.total !== 'number' || !Number.isInteger(obj.total) || obj.total < 0) {
    throw new Error('Total must be a non-negative integer');
  }
  if (typeof obj.page !== 'number' || !Number.isInteger(obj.page) || obj.page < 1) {
    throw new Error('Page must be an integer >= 1');
  }
  if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit) || obj.limit < 1) {
    throw new Error('Limit must be an integer >= 1');
  }
  if (typeof obj.hasNext !== 'boolean') {
    throw new Error('hasNext must be a boolean');
  }
  if (typeof obj.hasPrev !== 'boolean') {
    throw new Error('hasPrev must be a boolean');
  }
  if (
    typeof obj.totalPages !== 'number' ||
    !Number.isInteger(obj.totalPages) ||
    obj.totalPages < 0
  ) {
    throw new Error('totalPages must be a non-negative integer');
  }

  return {
    data: parsedData,
    total: obj.total,
    page: obj.page,
    limit: obj.limit,
    hasNext: obj.hasNext,
    hasPrev: obj.hasPrev,
    totalPages: obj.totalPages,
  };
});

// ============================================================================
// Queue Stats
// ============================================================================

export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  total: number;
  failureRate: number;
  recentCompleted: number;
  recentFailed: number;
}

export const queueStatsSchema: Schema<QueueStats> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid queue stats');
  }
  const obj = data as Record<string, unknown>;

  const validateNonNegativeInt = (value: unknown, name: string): number => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
      throw new Error(`${name} must be a non-negative integer`);
    }
    return value;
  };

  const validateNonNegativeNumber = (value: unknown, name: string): number => {
    if (typeof value !== 'number' || value < 0) {
      throw new Error(`${name} must be a non-negative number`);
    }
    return value;
  };

  return {
    pending: validateNonNegativeInt(obj.pending, 'pending'),
    processing: validateNonNegativeInt(obj.processing, 'processing'),
    completed: validateNonNegativeInt(obj.completed, 'completed'),
    failed: validateNonNegativeInt(obj.failed, 'failed'),
    deadLetter: validateNonNegativeInt(obj.deadLetter, 'deadLetter'),
    total: validateNonNegativeInt(obj.total, 'total'),
    failureRate: validateNonNegativeNumber(obj.failureRate, 'failureRate'),
    recentCompleted: validateNonNegativeInt(obj.recentCompleted, 'recentCompleted'),
    recentFailed: validateNonNegativeInt(obj.recentFailed, 'recentFailed'),
  };
});

// ============================================================================
// Job Action Request/Response
// ============================================================================

export interface JobIdRequest {
  jobId: string;
}

export const jobIdRequestSchema: Schema<JobIdRequest> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid job ID request');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.jobId !== 'string' || obj.jobId.length === 0) {
    throw new Error('Job ID must be a non-empty string');
  }
  return { jobId: obj.jobId };
});

export interface JobActionResponse {
  success: boolean;
  message: string;
}

export const jobActionResponseSchema: Schema<JobActionResponse> = createSchema((data: unknown) => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid job action response');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj.success !== 'boolean') {
    throw new Error('Success must be a boolean');
  }
  if (typeof obj.message !== 'string') {
    throw new Error('Message must be a string');
  }
  return { success: obj.success, message: obj.message };
});

// ============================================================================
// Jobs Contract
// ============================================================================

export const jobsContract = {
  listJobs: {
    method: 'GET' as const,
    path: '/api/admin/jobs',
    query: jobListQuerySchema,
    responses: {
      200: jobListResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'List jobs with filtering and pagination (admin only)',
  },
  getJobDetails: {
    method: 'GET' as const,
    path: '/api/admin/jobs/:jobId',
    responses: {
      200: jobDetailsSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Get detailed job information (admin only)',
  },
  getQueueStats: {
    method: 'GET' as const,
    path: '/api/admin/jobs/stats',
    responses: {
      200: queueStatsSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
    },
    summary: 'Get queue statistics (admin only)',
  },
  retryJob: {
    method: 'POST' as const,
    path: '/api/admin/jobs/:jobId/retry',
    responses: {
      200: jobActionResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Retry a failed job (admin only)',
  },
  cancelJob: {
    method: 'POST' as const,
    path: '/api/admin/jobs/:jobId/cancel',
    responses: {
      200: jobActionResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
    },
    summary: 'Cancel a pending or processing job (admin only)',
  },
} satisfies Contract;
