// main/server/core/src/admin/jobsService.test.ts

import { beforeEach, describe, expect, test, vi } from 'vitest';

import {
    cancelJob,
    getJobDetails,
    getQueueStats,
    JobNotFoundError,
    listJobs,
    redactSensitiveFields,
    retryJob,
} from './jobsService';

import type { JobDetails, JobListResult, PostgresQueueStore, QueueStats } from '../../../db/src';

// ============================================================================
// Mock Store Factory
// ============================================================================

function createMockStore(): {
  store: PostgresQueueStore;
  mocks: {
    listJobs: ReturnType<typeof vi.fn>;
    getJobDetails: ReturnType<typeof vi.fn>;
    getQueueStats: ReturnType<typeof vi.fn>;
    retryJob: ReturnType<typeof vi.fn>;
    cancelJob: ReturnType<typeof vi.fn>;
  };
} {
  const mocks = {
    listJobs: vi.fn(),
    getJobDetails: vi.fn(),
    getQueueStats: vi.fn(),
    retryJob: vi.fn(),
    cancelJob: vi.fn(),
  };

  const store = {
    listJobs: mocks.listJobs,
    getJobDetails: mocks.getJobDetails,
    getQueueStats: mocks.getQueueStats,
    retryJob: mocks.retryJob,
    cancelJob: mocks.cancelJob,
  } as unknown as PostgresQueueStore;

  return { store, mocks };
}

// ============================================================================
// Test Data
// ============================================================================

const sampleJob: JobDetails = {
  id: 'job-123',
  name: 'send-email',
  args: { to: 'user@example.com', subject: 'Hello' },
  status: 'completed',
  attempts: 1,
  maxAttempts: 3,
  scheduledAt: '2026-01-23T10:00:00Z',
  createdAt: '2026-01-23T09:00:00Z',
  completedAt: '2026-01-23T10:01:00Z',
  durationMs: 500,
  error: null,
  deadLetterReason: null,
};

const sampleListResult: JobListResult = {
  data: [sampleJob],
  total: 1,
  page: 1,
  limit: 50,
  hasNext: false,
  hasPrev: false,
  totalPages: 1,
};

const sampleStats: QueueStats = {
  pending: 10,
  processing: 2,
  completed: 100,
  failed: 5,
  deadLetter: 1,
  total: 118,
  failureRate: 4.76,
  recentCompleted: 20,
  recentFailed: 2,
};

// ============================================================================
// Tests: redactSensitiveFields
// ============================================================================

describe('redactSensitiveFields', () => {
  test('should redact password fields', () => {
    const data = { username: 'john', password: 'secret123' };
    const result = redactSensitiveFields(data);
    expect(result).toEqual({ username: 'john', password: '[REDACTED]' });
  });

  test('should redact token fields', () => {
    const data = { userId: '123', accessToken: 'abc123', refreshToken: 'xyz789' };
    const result = redactSensitiveFields(data);
    expect(result).toEqual({
      userId: '123',
      accessToken: '[REDACTED]',
      refreshToken: '[REDACTED]',
    });
  });

  test('should redact secret and key fields', () => {
    const data = { config: { apiKey: 'key123', secretKey: 'secret456' } };
    const result = redactSensitiveFields(data);
    expect(result).toEqual({
      config: { apiKey: '[REDACTED]', secretKey: '[REDACTED]' },
    });
  });

  test('should redact nested objects', () => {
    const data = {
      user: {
        email: 'test@example.com',
        auth: {
          password: 'pass123',
          apiToken: 'token456',
        },
      },
    };
    const result = redactSensitiveFields(data);
    // Note: 'auth' itself is a sensitive key, so it gets redacted entirely
    expect(result).toEqual({
      user: {
        email: 'test@example.com',
        auth: '[REDACTED]',
      },
    });
  });

  test('should recursively redact deeply nested non-sensitive keys containing sensitive values', () => {
    const data = {
      config: {
        database: {
          connectionString: 'postgres://...',
          password: 'dbpass123',
        },
      },
    };
    const result = redactSensitiveFields(data);
    expect(result).toEqual({
      config: {
        database: {
          connectionString: 'postgres://...',
          password: '[REDACTED]',
        },
      },
    });
  });

  test('should redact arrays with sensitive data', () => {
    const data = [
      { type: 'auth', token: 'abc' },
      { type: 'data', value: 'normal' },
    ];
    const result = redactSensitiveFields(data);
    expect(result).toEqual([
      { type: 'auth', token: '[REDACTED]' },
      { type: 'data', value: 'normal' },
    ]);
  });

  test('should handle null and undefined', () => {
    expect(redactSensitiveFields(null)).toBeNull();
    expect(redactSensitiveFields(undefined)).toBeUndefined();
  });

  test('should preserve primitives', () => {
    expect(redactSensitiveFields('string')).toBe('string');
    expect(redactSensitiveFields(123)).toBe(123);
    expect(redactSensitiveFields(true)).toBe(true);
  });

  test('should be case-insensitive for field matching', () => {
    const data = { PASSWORD: 'secret', ApiKey: 'key', SECRET_KEY: 'value' };
    const result = redactSensitiveFields(data);
    expect(result).toEqual({
      PASSWORD: '[REDACTED]',
      ApiKey: '[REDACTED]',
      SECRET_KEY: '[REDACTED]',
    });
  });
});

// ============================================================================
// Tests: listJobs
// ============================================================================

describe('listJobs', () => {
  let store: PostgresQueueStore;
  let mocks: ReturnType<typeof createMockStore>['mocks'];

  beforeEach(() => {
    const created = createMockStore();
    store = created.store;
    mocks = created.mocks;
    vi.clearAllMocks();
  });

  test('should return paginated jobs with redacted payloads', async () => {
    const jobWithSensitiveData: JobDetails = {
      ...sampleJob,
      args: { to: 'user@example.com', apiKey: 'secret-key-123' },
    };
    mocks.listJobs.mockResolvedValue({
      ...sampleListResult,
      data: [jobWithSensitiveData],
    });

    const result = await listJobs(store, { page: 1, limit: 50 });

    expect(result.data[0]?.args).toEqual({
      to: 'user@example.com',
      apiKey: '[REDACTED]',
    });
    expect(mocks.listJobs).toHaveBeenCalledWith({ page: 1, limit: 50 });
  });

  test('should pass filter options to store', async () => {
    mocks.listJobs.mockResolvedValue(sampleListResult);

    await listJobs(store, {
      page: 2,
      limit: 25,
      status: 'failed',
      name: 'send-email',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    expect(mocks.listJobs).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      status: 'failed',
      name: 'send-email',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
  });

  test('should throw TypeError if listJobs method not available', async () => {
    // When store doesn't have the listJobs method, JavaScript throws TypeError
    const storeWithoutListJobs = {} as PostgresQueueStore;

    await expect(listJobs(storeWithoutListJobs, { page: 1, limit: 50 })).rejects.toThrow(TypeError);
  });
});

// ============================================================================
// Tests: getJobDetails
// ============================================================================

describe('getJobDetails', () => {
  let store: PostgresQueueStore;
  let mocks: ReturnType<typeof createMockStore>['mocks'];

  beforeEach(() => {
    const created = createMockStore();
    store = created.store;
    mocks = created.mocks;
    vi.clearAllMocks();
  });

  test('should return job details with redacted payload', async () => {
    const jobWithSensitiveData: JobDetails = {
      ...sampleJob,
      args: { email: 'user@example.com', password: 'secret123' },
    };
    mocks.getJobDetails.mockResolvedValue(jobWithSensitiveData);

    const result = await getJobDetails(store, 'job-123');

    expect(result.args).toEqual({
      email: 'user@example.com',
      password: '[REDACTED]',
    });
    expect(mocks.getJobDetails).toHaveBeenCalledWith('job-123');
  });

  test('should throw JobNotFoundError when job does not exist', async () => {
    mocks.getJobDetails.mockResolvedValue(null);

    await expect(getJobDetails(store, 'nonexistent-job')).rejects.toThrow(JobNotFoundError);
  });

  test('should throw TypeError if getJobDetails method not available', async () => {
    // When store doesn't have the getJobDetails method, JavaScript throws TypeError
    const storeWithoutGetJobDetails = {} as PostgresQueueStore;

    await expect(getJobDetails(storeWithoutGetJobDetails, 'job-123')).rejects.toThrow(TypeError);
  });
});

// ============================================================================
// Tests: getQueueStats
// ============================================================================

describe('getQueueStats', () => {
  let store: PostgresQueueStore;
  let mocks: ReturnType<typeof createMockStore>['mocks'];

  beforeEach(() => {
    const created = createMockStore();
    store = created.store;
    mocks = created.mocks;
    vi.clearAllMocks();
  });

  test('should return queue statistics', async () => {
    mocks.getQueueStats.mockResolvedValue(sampleStats);

    const result = await getQueueStats(store);

    expect(result).toEqual(sampleStats);
    expect(mocks.getQueueStats).toHaveBeenCalled();
  });

  test('should throw TypeError if getQueueStats method not available', async () => {
    // When store doesn't have the getQueueStats method, JavaScript throws TypeError
    const storeWithoutGetQueueStats = {} as PostgresQueueStore;

    await expect(getQueueStats(storeWithoutGetQueueStats)).rejects.toThrow(TypeError);
  });
});

// ============================================================================
// Tests: retryJob
// ============================================================================

describe('retryJob', () => {
  let store: PostgresQueueStore;
  let mocks: ReturnType<typeof createMockStore>['mocks'];

  beforeEach(() => {
    const created = createMockStore();
    store = created.store;
    mocks = created.mocks;
    vi.clearAllMocks();
  });

  test('should return success when job is retried', async () => {
    mocks.retryJob.mockResolvedValue(true);

    const result = await retryJob(store, 'job-123');

    expect(result).toEqual({
      success: true,
      message: 'Job has been queued for retry',
    });
    expect(mocks.retryJob).toHaveBeenCalledWith('job-123');
  });

  test('should return failure message when job cannot be retried', async () => {
    mocks.retryJob.mockResolvedValue(false);
    mocks.getJobDetails.mockResolvedValue({ ...sampleJob, status: 'completed' });

    const result = await retryJob(store, 'job-123');

    expect(result).toEqual({
      success: false,
      message: 'Job cannot be retried. Current status: completed',
    });
  });

  test('should throw JobNotFoundError when job does not exist', async () => {
    mocks.retryJob.mockResolvedValue(false);
    mocks.getJobDetails.mockResolvedValue(null);

    await expect(retryJob(store, 'nonexistent-job')).rejects.toThrow(JobNotFoundError);
  });

  test('should throw TypeError if retryJob method not available', async () => {
    // When store doesn't have the retryJob method, JavaScript throws TypeError
    const storeWithoutRetryJob = {} as PostgresQueueStore;

    await expect(retryJob(storeWithoutRetryJob, 'job-123')).rejects.toThrow(TypeError);
  });
});

// ============================================================================
// Tests: cancelJob
// ============================================================================

describe('cancelJob', () => {
  let store: PostgresQueueStore;
  let mocks: ReturnType<typeof createMockStore>['mocks'];

  beforeEach(() => {
    const created = createMockStore();
    store = created.store;
    mocks = created.mocks;
    vi.clearAllMocks();
  });

  test('should return success when job is cancelled', async () => {
    mocks.cancelJob.mockResolvedValue(true);

    const result = await cancelJob(store, 'job-123');

    expect(result).toEqual({
      success: true,
      message: 'Job has been cancelled',
    });
    expect(mocks.cancelJob).toHaveBeenCalledWith('job-123');
  });

  test('should return failure message when job cannot be cancelled', async () => {
    mocks.cancelJob.mockResolvedValue(false);
    mocks.getJobDetails.mockResolvedValue({ ...sampleJob, status: 'completed' });

    const result = await cancelJob(store, 'job-123');

    expect(result).toEqual({
      success: false,
      message: 'Job cannot be cancelled. Current status: completed',
    });
  });

  test('should throw JobNotFoundError when job does not exist', async () => {
    mocks.cancelJob.mockResolvedValue(false);
    mocks.getJobDetails.mockResolvedValue(null);

    await expect(cancelJob(store, 'nonexistent-job')).rejects.toThrow(JobNotFoundError);
  });

  test('should throw TypeError if cancelJob method not available', async () => {
    // When store doesn't have the cancelJob method, JavaScript throws TypeError
    const storeWithoutCancelJob = {} as PostgresQueueStore;

    await expect(cancelJob(storeWithoutCancelJob, 'job-123')).rejects.toThrow(TypeError);
  });
});
