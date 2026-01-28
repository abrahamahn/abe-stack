// packages/contracts/src/jobs.test.ts
/**
 * Jobs Contract Schema Tests
 *
 * Comprehensive validation tests for job monitoring schemas including
 * job status, details, filtering, pagination, and queue statistics.
 */

import { describe, expect, it } from 'vitest';

import {
  JOB_STATUSES,
  jobActionResponseSchema,
  jobDetailsSchema,
  jobErrorSchema,
  jobIdRequestSchema,
  jobListQuerySchema,
  jobListResponseSchema,
  jobStatusSchema,
  queueStatsSchema,
} from './jobs';

describe('jobStatusSchema', () => {
  it('should validate all job statuses', () => {
    const statuses = [
      'pending',
      'processing',
      'completed',
      'failed',
      'dead_letter',
      'cancelled',
    ] as const;

    for (const status of statuses) {
      const result = jobStatusSchema.parse(status);
      expect(result).toBe(status);
    }
  });

  it('should reject invalid status', () => {
    expect(() => jobStatusSchema.parse('invalid')).toThrow(
      'Job status must be one of: pending, processing, completed, failed, dead_letter, cancelled',
    );
  });

  it('should reject non-string values', () => {
    expect(() => jobStatusSchema.parse(123)).toThrow();
    expect(() => jobStatusSchema.parse(null)).toThrow();
    expect(() => jobStatusSchema.parse(undefined)).toThrow();
  });

  it('should reject empty string', () => {
    expect(() => jobStatusSchema.parse('')).toThrow();
  });

  it('should be case-sensitive', () => {
    expect(() => jobStatusSchema.parse('PENDING')).toThrow();
    expect(() => jobStatusSchema.parse('Pending')).toThrow();
  });
});

describe('JOB_STATUSES constant', () => {
  it('should contain all expected statuses', () => {
    expect(JOB_STATUSES.PENDING).toBe('pending');
    expect(JOB_STATUSES.PROCESSING).toBe('processing');
    expect(JOB_STATUSES.COMPLETED).toBe('completed');
    expect(JOB_STATUSES.FAILED).toBe('failed');
    expect(JOB_STATUSES.DEADLETTER).toBe('dead_letter');
    expect(JOB_STATUSES.CANCELLED).toBe('cancelled');
  });
});

describe('jobErrorSchema', () => {
  it('should validate error with name and message', () => {
    const error = {
      name: 'ValidationError',
      message: 'Invalid input data',
    };
    const result = jobErrorSchema.parse(error);
    expect(result.name).toBe('ValidationError');
    expect(result.message).toBe('Invalid input data');
    expect(result.stack).toBeUndefined();
  });

  it('should validate error with stack trace', () => {
    const error = {
      name: 'Error',
      message: 'Something went wrong',
      stack: 'Error: Something went wrong\n  at fn (file.ts:10:5)',
    };
    const result = jobErrorSchema.parse(error);
    expect(result.stack).toBeDefined();
  });

  it('should reject missing name', () => {
    const error = { message: 'Error message' };
    expect(() => jobErrorSchema.parse(error)).toThrow('Error name must be a string');
  });

  it('should reject missing message', () => {
    const error = { name: 'Error' };
    expect(() => jobErrorSchema.parse(error)).toThrow('Error message must be a string');
  });

  it('should reject non-string name', () => {
    const error = { name: 123, message: 'Error' };
    expect(() => jobErrorSchema.parse(error)).toThrow('Error name must be a string');
  });

  it('should reject non-string message', () => {
    const error = { name: 'Error', message: 123 };
    expect(() => jobErrorSchema.parse(error)).toThrow('Error message must be a string');
  });

  it('should accept undefined stack', () => {
    const error = { name: 'Error', message: 'Message', stack: undefined };
    const result = jobErrorSchema.parse(error);
    expect(result.stack).toBeUndefined();
  });

  it('should reject non-string stack', () => {
    const error = { name: 'Error', message: 'Message', stack: 123 };
    const result = jobErrorSchema.parse(error);
    expect(result.stack).toBeUndefined(); // Non-string stack is filtered out
  });
});

describe('jobDetailsSchema', () => {
  const validJob = {
    id: 'job_123',
    name: 'sendEmail',
    args: { to: 'user@example.com', subject: 'Hello' },
    status: 'completed' as const,
    attempts: 1,
    maxAttempts: 3,
    scheduledAt: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-01-01T00:01:00Z',
    durationMs: 60000,
    error: null,
    deadLetterReason: null,
  };

  it('should validate completed job', () => {
    const result = jobDetailsSchema.parse(validJob);
    expect(result.status).toBe('completed');
    expect(result.completedAt).toBe('2024-01-01T00:01:00Z');
    expect(result.durationMs).toBe(60000);
  });

  it('should validate pending job without completion data', () => {
    const job = {
      ...validJob,
      status: 'pending' as const,
      attempts: 0,
      completedAt: null,
      durationMs: null,
    };
    const result = jobDetailsSchema.parse(job);
    expect(result.completedAt).toBeNull();
    expect(result.durationMs).toBeNull();
  });

  it('should validate failed job with error', () => {
    const job = {
      ...validJob,
      status: 'failed' as const,
      attempts: 3,
      error: {
        name: 'NetworkError',
        message: 'Connection timeout',
        stack: 'Error stack',
      },
      completedAt: '2024-01-01T00:05:00Z',
      durationMs: 5000,
    };
    const result = jobDetailsSchema.parse(job);
    expect(result.error).toBeDefined();
    expect(result.error?.name).toBe('NetworkError');
  });

  it('should validate dead letter job with reason', () => {
    const job = {
      ...validJob,
      status: 'dead_letter' as const,
      attempts: 3,
      deadLetterReason: 'Max retries exceeded',
    };
    const result = jobDetailsSchema.parse(job);
    expect(result.deadLetterReason).toBe('Max retries exceeded');
  });

  it('should reject invalid status', () => {
    const job = { ...validJob, status: 'invalid' };
    expect(() => jobDetailsSchema.parse(job)).toThrow();
  });

  it('should reject non-integer attempts', () => {
    const job = { ...validJob, attempts: 1.5 };
    expect(() => jobDetailsSchema.parse(job)).toThrow('Attempts must be a non-negative integer');
  });

  it('should reject negative attempts', () => {
    const job = { ...validJob, attempts: -1 };
    expect(() => jobDetailsSchema.parse(job)).toThrow('Attempts must be a non-negative integer');
  });

  it('should reject non-integer maxAttempts', () => {
    const job = { ...validJob, maxAttempts: 3.5 };
    expect(() => jobDetailsSchema.parse(job)).toThrow('Max attempts must be a non-negative integer');
  });

  it('should validate with various arg types', () => {
    const argsVariants = [
      { simple: 'string' },
      { number: 42 },
      { nested: { deep: { value: true } } },
      { array: [1, 2, 3] },
      null,
      'string',
      123,
    ];

    for (const args of argsVariants) {
      const job = { ...validJob, args };
      const result = jobDetailsSchema.parse(job);
      expect(result.args).toEqual(args);
    }
  });

  it('should reject missing required fields', () => {
    expect(() => jobDetailsSchema.parse({})).toThrow();
    expect(() => jobDetailsSchema.parse({ id: 'job_1' })).toThrow();
  });
});

describe('jobListQuerySchema', () => {
  it('should validate with default values', () => {
    const result = jobListQuerySchema.parse({});
    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.status).toBeUndefined();
    expect(result.name).toBeUndefined();
  });

  it('should validate with custom page and limit', () => {
    const query = { page: 2, limit: 25 };
    const result = jobListQuerySchema.parse(query);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(25);
  });

  it('should validate with status filter', () => {
    const query = { status: 'failed' as const };
    const result = jobListQuerySchema.parse(query);
    expect(result.status).toBe('failed');
  });

  it('should validate with name filter', () => {
    const query = { name: 'sendEmail' };
    const result = jobListQuerySchema.parse(query);
    expect(result.name).toBe('sendEmail');
  });

  it('should validate with sort options', () => {
    const query = {
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    };
    const result = jobListQuerySchema.parse(query);
    expect(result.sortBy).toBe('createdAt');
    expect(result.sortOrder).toBe('desc');
  });

  it('should validate all sort fields', () => {
    const sortFields = ['createdAt', 'scheduledAt', 'completedAt'] as const;
    for (const sortBy of sortFields) {
      const query = { sortBy };
      const result = jobListQuerySchema.parse(query);
      expect(result.sortBy).toBe(sortBy);
    }
  });

  it('should ignore invalid sortBy', () => {
    const query = { sortBy: 'invalidField' };
    const result = jobListQuerySchema.parse(query);
    expect(result.sortBy).toBeUndefined();
  });

  it('should parse string numbers for page and limit', () => {
    const query = { page: '3', limit: '100' };
    const result = jobListQuerySchema.parse(query);
    expect(result.page).toBe(3);
    expect(result.limit).toBe(100);
  });

  it('should reject page less than 1', () => {
    const query = { page: 0 };
    expect(() => jobListQuerySchema.parse(query)).toThrow('Page must be an integer >= 1');
  });

  it('should reject limit less than 1', () => {
    const query = { limit: 0 };
    expect(() => jobListQuerySchema.parse(query)).toThrow(
      'Limit must be an integer between 1 and 100',
    );
  });

  it('should reject limit greater than 100', () => {
    const query = { limit: 101 };
    expect(() => jobListQuerySchema.parse(query)).toThrow(
      'Limit must be an integer between 1 and 100',
    );
  });

  it('should reject non-integer page', () => {
    const query = { page: 2.5 };
    expect(() => jobListQuerySchema.parse(query)).toThrow('Page must be an integer >= 1');
  });

  it('should filter out empty status', () => {
    const query = { status: '' };
    const result = jobListQuerySchema.parse(query);
    expect(result.status).toBeUndefined();
  });

  it('should filter out empty name', () => {
    const query = { name: '' };
    const result = jobListQuerySchema.parse(query);
    expect(result.name).toBeUndefined();
  });
});

describe('jobListResponseSchema', () => {
  const createValidResponse = () => ({
    data: [
      {
        id: 'job_1',
        name: 'testJob',
        args: {},
        status: 'completed' as const,
        attempts: 1,
        maxAttempts: 3,
        scheduledAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:01:00Z',
        durationMs: 60000,
        error: null,
      },
    ],
    total: 100,
    page: 1,
    limit: 50,
    hasNext: true,
    hasPrev: false,
    totalPages: 2,
  });

  it('should validate complete response', () => {
    const response = createValidResponse();
    const result = jobListResponseSchema.parse(response);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(100);
    expect(result.hasNext).toBe(true);
  });

  it('should validate empty data', () => {
    const response = {
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      totalPages: 0,
    };
    const result = jobListResponseSchema.parse(response);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('should validate middle page', () => {
    const response = {
      ...createValidResponse(),
      page: 2,
      hasPrev: true,
      hasNext: true,
    };
    const result = jobListResponseSchema.parse(response);
    expect(result.hasPrev).toBe(true);
    expect(result.hasNext).toBe(true);
  });

  it('should validate last page', () => {
    const response = {
      ...createValidResponse(),
      page: 2,
      totalPages: 2,
      hasNext: false,
      hasPrev: true,
    };
    const result = jobListResponseSchema.parse(response);
    expect(result.hasNext).toBe(false);
  });

  it('should reject non-array data', () => {
    const response = { ...createValidResponse(), data: 'not-array' };
    expect(() => jobListResponseSchema.parse(response)).toThrow('Data must be an array');
  });

  it('should reject negative total', () => {
    const response = { ...createValidResponse(), total: -1 };
    expect(() => jobListResponseSchema.parse(response)).toThrow(
      'Total must be a non-negative integer',
    );
  });

  it('should reject page less than 1', () => {
    const response = { ...createValidResponse(), page: 0 };
    expect(() => jobListResponseSchema.parse(response)).toThrow('Page must be an integer >= 1');
  });

  it('should reject limit less than 1', () => {
    const response = { ...createValidResponse(), limit: 0 };
    expect(() => jobListResponseSchema.parse(response)).toThrow('Limit must be an integer >= 1');
  });

  it('should reject non-boolean hasNext', () => {
    const response = { ...createValidResponse(), hasNext: 'true' };
    expect(() => jobListResponseSchema.parse(response)).toThrow('hasNext must be a boolean');
  });

  it('should reject non-boolean hasPrev', () => {
    const response = { ...createValidResponse(), hasPrev: 1 };
    expect(() => jobListResponseSchema.parse(response)).toThrow('hasPrev must be a boolean');
  });

  it('should reject negative totalPages', () => {
    const response = { ...createValidResponse(), totalPages: -1 };
    expect(() => jobListResponseSchema.parse(response)).toThrow(
      'totalPages must be a non-negative integer',
    );
  });

  it('should reject non-integer total', () => {
    const response = { ...createValidResponse(), total: 100.5 };
    expect(() => jobListResponseSchema.parse(response)).toThrow(
      'Total must be a non-negative integer',
    );
  });
});

describe('queueStatsSchema', () => {
  const validStats = {
    pending: 10,
    processing: 5,
    completed: 100,
    failed: 3,
    deadLetter: 1,
    total: 119,
    failureRate: 0.025,
    recentCompleted: 50,
    recentFailed: 2,
  };

  it('should validate complete stats', () => {
    const result = queueStatsSchema.parse(validStats);
    expect(result.pending).toBe(10);
    expect(result.failureRate).toBe(0.025);
  });

  it('should validate zero values', () => {
    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      deadLetter: 0,
      total: 0,
      failureRate: 0,
      recentCompleted: 0,
      recentFailed: 0,
    };
    const result = queueStatsSchema.parse(stats);
    expect(result.total).toBe(0);
    expect(result.failureRate).toBe(0);
  });

  it('should validate high failure rate', () => {
    const stats = { ...validStats, failureRate: 0.95 };
    const result = queueStatsSchema.parse(stats);
    expect(result.failureRate).toBe(0.95);
  });

  it('should reject negative pending', () => {
    const stats = { ...validStats, pending: -1 };
    expect(() => queueStatsSchema.parse(stats)).toThrow('pending must be a non-negative integer');
  });

  it('should reject negative failureRate', () => {
    const stats = { ...validStats, failureRate: -0.1 };
    expect(() => queueStatsSchema.parse(stats)).toThrow(
      'failureRate must be a non-negative number',
    );
  });

  it('should reject non-integer completed', () => {
    const stats = { ...validStats, completed: 100.5 };
    expect(() => queueStatsSchema.parse(stats)).toThrow('completed must be a non-negative integer');
  });

  it('should reject non-number failureRate', () => {
    const stats = { ...validStats, failureRate: '0.025' };
    expect(() => queueStatsSchema.parse(stats)).toThrow(
      'failureRate must be a non-negative number',
    );
  });

  it('should reject missing required fields', () => {
    expect(() => queueStatsSchema.parse({})).toThrow();
    expect(() => queueStatsSchema.parse({ pending: 0 })).toThrow();
  });

  it('should validate all count fields', () => {
    const fields = [
      'pending',
      'processing',
      'completed',
      'failed',
      'deadLetter',
      'total',
      'recentCompleted',
      'recentFailed',
    ];
    for (const field of fields) {
      const stats = { ...validStats, [field]: -1 };
      expect(() => queueStatsSchema.parse(stats)).toThrow(
        `${field} must be a non-negative integer`,
      );
    }
  });
});

describe('jobIdRequestSchema', () => {
  it('should validate job ID', () => {
    const result = jobIdRequestSchema.parse({ jobId: 'job_123' });
    expect(result.jobId).toBe('job_123');
  });

  it('should reject empty job ID', () => {
    expect(() => jobIdRequestSchema.parse({ jobId: '' })).toThrow(
      'Job ID must be a non-empty string',
    );
  });

  it('should reject non-string job ID', () => {
    expect(() => jobIdRequestSchema.parse({ jobId: 123 })).toThrow(
      'Job ID must be a non-empty string',
    );
  });

  it('should reject missing job ID', () => {
    expect(() => jobIdRequestSchema.parse({})).toThrow('Job ID must be a non-empty string');
  });

  it('should reject null', () => {
    expect(() => jobIdRequestSchema.parse(null)).toThrow('Invalid job ID request');
  });
});

describe('jobActionResponseSchema', () => {
  it('should validate success response', () => {
    const response = { success: true, message: 'Job retried successfully' };
    const result = jobActionResponseSchema.parse(response);
    expect(result.success).toBe(true);
    expect(result.message).toBe('Job retried successfully');
  });

  it('should validate failure response', () => {
    const response = { success: false, message: 'Job not found' };
    const result = jobActionResponseSchema.parse(response);
    expect(result.success).toBe(false);
    expect(result.message).toBe('Job not found');
  });

  it('should reject non-boolean success', () => {
    const response = { success: 'true', message: 'Done' };
    expect(() => jobActionResponseSchema.parse(response)).toThrow('Success must be a boolean');
  });

  it('should reject non-string message', () => {
    const response = { success: true, message: 123 };
    expect(() => jobActionResponseSchema.parse(response)).toThrow('Message must be a string');
  });

  it('should reject missing success', () => {
    const response = { message: 'Done' };
    expect(() => jobActionResponseSchema.parse(response)).toThrow('Success must be a boolean');
  });

  it('should reject missing message', () => {
    const response = { success: true };
    expect(() => jobActionResponseSchema.parse(response)).toThrow('Message must be a string');
  });
});
