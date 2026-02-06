// backend/db/src/repositories/system/jobs.test.ts
/**
 * Tests for Jobs Repository
 *
 * Validates background job operations including job creation, ID lookups,
 * idempotency key queries, status filtering, pending job retrieval,
 * job updates, deletion, and type-based filtering.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createJobRepository } from './jobs';

import type { RawDb } from '../../client';

// ============================================================================
// Mock Database
// ============================================================================

const createMockDb = (): RawDb => ({
  query: vi.fn(),
  raw: vi.fn() as RawDb['raw'],
  transaction: vi.fn() as RawDb['transaction'],
  healthCheck: vi.fn(),
  close: vi.fn(),
  getClient: vi.fn() as RawDb['getClient'],
  queryOne: vi.fn(),
  execute: vi.fn(),
});

// ============================================================================
// Test Data
// ============================================================================

const mockJob = {
  id: 'job-123',
  type: 'email.send',
  payload: { to: 'test@example.com', subject: 'Test' },
  status: 'pending',
  priority: 10,
  scheduled_at: new Date('2024-01-01T12:00:00Z'),
  idempotency_key: 'idem-123',
  max_retries: 3,
  retry_count: 0,
  retry_backoff: 1000,
  error_message: null,
  created_at: new Date('2024-01-01T10:00:00Z'),
  updated_at: new Date('2024-01-01T10:00:00Z'),
  completed_at: null,
};

// ============================================================================
// Tests
// ============================================================================

describe('createJobRepository', () => {
  let mockDb: RawDb;

  beforeEach(() => {
    mockDb = createMockDb();
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should insert and return new job', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.create({
        type: 'email.send',
        payload: { to: 'test@example.com', subject: 'Test' },
        status: 'pending',
        priority: 10,
        scheduledAt: new Date('2024-01-01T12:00:00Z'),
        idempotencyKey: 'idem-123',
      });

      expect(result.type).toBe('email.send');
      expect(result.status).toBe('pending');
      expect(result.priority).toBe(10);
      expect(result.idempotencyKey).toBe('idem-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('INSERT INTO'),
        }),
      );
    });

    it('should throw error if insert fails', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createJobRepository(mockDb);

      await expect(
        repo.create({
          type: 'email.send',
          payload: { to: 'test@example.com' },
          status: 'pending',
        }),
      ).rejects.toThrow('Failed to create job');
    });

    it('should handle optional fields', async () => {
      const jobWithDefaults = {
        ...mockJob,
        priority: 0,
        max_retries: 3,
        retry_count: 0,
        retry_backoff: 1000,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(jobWithDefaults);

      const repo = createJobRepository(mockDb);
      const result = await repo.create({
        type: 'email.send',
        payload: { to: 'test@example.com' },
        status: 'pending',
      });

      expect(result.priority).toBe(0);
      expect(result.maxRetries).toBe(3);
      expect(result.retryCount).toBe(0);
    });

    it('should handle high priority jobs', async () => {
      const highPriorityJob = {
        ...mockJob,
        priority: 100,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(highPriorityJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.create({
        type: 'critical.task',
        payload: { urgent: true },
        status: 'pending',
        priority: 100,
      });

      expect(result.priority).toBe(100);
    });

    it('should handle complex payloads', async () => {
      const complexPayload = {
        recipients: ['user1@example.com', 'user2@example.com'],
        template: 'welcome',
        data: { name: 'John', age: 30 },
        attachments: [{ name: 'doc.pdf', size: 1024 }],
      };
      const jobWithComplexPayload = {
        ...mockJob,
        payload: complexPayload,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(jobWithComplexPayload);

      const repo = createJobRepository(mockDb);
      const result = await repo.create({
        type: 'email.send',
        payload: complexPayload,
        status: 'pending',
      });

      expect(result.payload).toEqual(complexPayload);
    });
  });

  describe('findById', () => {
    it('should return job when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('job-123');
      expect(result?.type).toBe('email.send');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('id'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-nonexistent');

      expect(result).toBeNull();
    });

    it('should include all job fields', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.type).toBe('email.send');
      expect(result?.status).toBe('pending');
      expect(result?.priority).toBe(10);
      expect(result?.retryCount).toBe(0);
      expect(result?.maxRetries).toBe(3);
    });
  });

  describe('findByIdempotencyKey', () => {
    it('should return job when found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(mockJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByIdempotencyKey('idem-123');

      expect(result).toBeDefined();
      expect(result?.idempotencyKey).toBe('idem-123');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('idempotency_key'),
        }),
      );
    });

    it('should return null when not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByIdempotencyKey('idem-nonexistent');

      expect(result).toBeNull();
    });

    it('should handle jobs without idempotency key', async () => {
      const jobWithoutKey = {
        ...mockJob,
        idempotency_key: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(jobWithoutKey);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.idempotencyKey).toBeNull();
    });
  });

  describe('findByStatus', () => {
    it('should return array of jobs with status', async () => {
      const jobs = [
        mockJob,
        { ...mockJob, id: 'job-456', priority: 20 },
        { ...mockJob, id: 'job-789', priority: 5 },
      ];
      vi.mocked(mockDb.query).mockResolvedValue(jobs);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByStatus('pending');

      expect(result).toHaveLength(3);
      expect(result.every((j) => j.status === 'pending')).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('status'),
        }),
      );
    });

    it('should return empty array when no jobs with status', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByStatus('completed');

      expect(result).toEqual([]);
    });

    it('should order by priority descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockJob]);

      const repo = createJobRepository(mockDb);
      await repo.findByStatus('pending');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/priority.*DESC/),
        }),
      );
    });

    it('should respect custom limit', async () => {
      const jobs = Array.from({ length: 50 }, (_, i) => ({
        ...mockJob,
        id: `job-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(jobs);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByStatus('pending', 50);

      expect(result).toHaveLength(50);
    });

    it('should handle different status values', async () => {
      const statuses = ['pending', 'processing', 'completed', 'failed'];

      for (const status of statuses) {
        vi.mocked(mockDb.query).mockResolvedValue([{ ...mockJob, status }]);

        const repo = createJobRepository(mockDb);
        const result = await repo.findByStatus(status);

        expect(result[0].status).toBe(status);
      }
    });
  });

  describe('findPending', () => {
    it('should return array of pending jobs ready for processing', async () => {
      const jobs = [mockJob, { ...mockJob, id: 'job-456', priority: 20 }];
      vi.mocked(mockDb.query).mockResolvedValue(jobs);

      const repo = createJobRepository(mockDb);
      const result = await repo.findPending();

      expect(result).toHaveLength(2);
      expect(result.every((j) => j.status === 'pending')).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/scheduled_at.*<=.*NOW/s),
        }),
      );
    });

    it('should return empty array when no pending jobs', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createJobRepository(mockDb);
      const result = await repo.findPending();

      expect(result).toEqual([]);
    });

    it('should order by priority descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockJob]);

      const repo = createJobRepository(mockDb);
      await repo.findPending();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/priority.*DESC/),
        }),
      );
    });

    it('should respect custom limit', async () => {
      const jobs = Array.from({ length: 5 }, (_, i) => ({
        ...mockJob,
        id: `job-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(jobs);

      const repo = createJobRepository(mockDb);
      const result = await repo.findPending(5);

      expect(result).toHaveLength(5);
    });

    it('should use default limit of 10', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockJob]);

      const repo = createJobRepository(mockDb);
      await repo.findPending();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('LIMIT'),
        }),
      );
    });

    it('should filter by status and scheduled_at', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockJob]);

      const repo = createJobRepository(mockDb);
      await repo.findPending();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/status.*scheduled_at/s),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update job and return updated job', async () => {
      const updatedJob = {
        ...mockJob,
        status: 'processing',
        updated_at: new Date('2024-01-01T12:30:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.update('job-123', { status: 'processing' });

      expect(result?.status).toBe('processing');
      expect(mockDb.queryOne).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('UPDATE'),
        }),
      );
    });

    it('should return null when job not found', async () => {
      vi.mocked(mockDb.queryOne).mockResolvedValue(null);

      const repo = createJobRepository(mockDb);
      const result = await repo.update('job-nonexistent', { status: 'failed' });

      expect(result).toBeNull();
    });

    it('should update multiple fields', async () => {
      const updatedJob = {
        ...mockJob,
        status: 'failed',
        retry_count: 1,
        error_message: 'Network timeout',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(updatedJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.update('job-123', {
        status: 'failed',
        retryCount: 1,
        errorMessage: 'Network timeout',
      });

      expect(result?.status).toBe('failed');
      expect(result?.retryCount).toBe(1);
      expect(result?.errorMessage).toBe('Network timeout');
    });

    it('should handle completion timestamp', async () => {
      const completedJob = {
        ...mockJob,
        status: 'completed',
        completed_at: new Date('2024-01-01T13:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(completedJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.update('job-123', {
        status: 'completed',
        completedAt: new Date('2024-01-01T13:00:00Z'),
      });

      expect(result?.status).toBe('completed');
      expect(result?.completedAt).toEqual(new Date('2024-01-01T13:00:00Z'));
    });

    it('should handle retry count increment', async () => {
      const retriedJob = {
        ...mockJob,
        retry_count: 2,
        error_message: 'Temporary error',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(retriedJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.update('job-123', {
        retryCount: 2,
        errorMessage: 'Temporary error',
      });

      expect(result?.retryCount).toBe(2);
    });
  });

  describe('delete', () => {
    it('should delete job and return true', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createJobRepository(mockDb);
      const result = await repo.delete('job-123');

      expect(result).toBe(true);
      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('DELETE FROM'),
        }),
      );
    });

    it('should return false when job not found', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(0);

      const repo = createJobRepository(mockDb);
      const result = await repo.delete('job-nonexistent');

      expect(result).toBe(false);
    });

    it('should perform hard delete', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createJobRepository(mockDb);
      await repo.delete('job-123');

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/DELETE FROM.*jobs/s),
        }),
      );
    });

    it('should only delete exact ID match', async () => {
      vi.mocked(mockDb.execute).mockResolvedValue(1);

      const repo = createJobRepository(mockDb);
      const jobId = 'job-specific-123';
      await repo.delete(jobId);

      expect(mockDb.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          values: expect.arrayContaining([jobId]),
        }),
      );
    });
  });

  describe('findByType', () => {
    it('should return array of jobs with type', async () => {
      const jobs = [mockJob, { ...mockJob, id: 'job-456', status: 'completed' }];
      vi.mocked(mockDb.query).mockResolvedValue(jobs);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByType('email.send');

      expect(result).toHaveLength(2);
      expect(result.every((j) => j.type === 'email.send')).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('type'),
        }),
      );
    });

    it('should return empty array when no jobs with type', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([]);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByType('webhook.send');

      expect(result).toEqual([]);
    });

    it('should order by created_at descending', async () => {
      vi.mocked(mockDb.query).mockResolvedValue([mockJob]);

      const repo = createJobRepository(mockDb);
      await repo.findByType('email.send');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringMatching(/created_at.*DESC/),
        }),
      );
    });

    it('should respect custom limit', async () => {
      const jobs = Array.from({ length: 25 }, (_, i) => ({
        ...mockJob,
        id: `job-${i}`,
      }));
      vi.mocked(mockDb.query).mockResolvedValue(jobs);

      const repo = createJobRepository(mockDb);
      const result = await repo.findByType('email.send', 25);

      expect(result).toHaveLength(25);
    });

    it('should handle different job types', async () => {
      const types = ['email.send', 'webhook.send', 'report.generate', 'backup.create'];

      for (const type of types) {
        vi.mocked(mockDb.query).mockResolvedValue([{ ...mockJob, type }]);

        const repo = createJobRepository(mockDb);
        const result = await repo.findByType(type);

        expect(result[0].type).toBe(type);
      }
    });
  });

  describe('edge cases', () => {
    it('should handle jobs with max retries reached', async () => {
      const maxRetriesJob = {
        ...mockJob,
        retry_count: 3,
        max_retries: 3,
        status: 'failed',
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(maxRetriesJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.retryCount).toBe(3);
      expect(result?.maxRetries).toBe(3);
    });

    it('should handle jobs scheduled in future', async () => {
      const futureJob = {
        ...mockJob,
        scheduled_at: new Date('2025-01-01T00:00:00Z'),
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(futureJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.scheduledAt).toEqual(new Date('2025-01-01T00:00:00Z'));
    });

    it('should handle very large payloads', async () => {
      const largePayload = {
        data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
      };
      const jobWithLargePayload = {
        ...mockJob,
        payload: largePayload,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(jobWithLargePayload);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.payload).toEqual(largePayload);
    });

    it('should handle exponential backoff values', async () => {
      const backoffJob = {
        ...mockJob,
        retry_backoff: 8000,
        retry_count: 3,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(backoffJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.retryBackoff).toBe(8000);
    });

    it('should handle null error messages', async () => {
      const successJob = {
        ...mockJob,
        status: 'completed',
        error_message: null,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(successJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.errorMessage).toBeNull();
    });

    it('should handle very long error messages', async () => {
      const longError = 'Error: ' + 'A'.repeat(1000);
      const failedJob = {
        ...mockJob,
        status: 'failed',
        error_message: longError,
      };
      vi.mocked(mockDb.queryOne).mockResolvedValue(failedJob);

      const repo = createJobRepository(mockDb);
      const result = await repo.findById('job-123');

      expect(result?.errorMessage).toBe(longError);
    });
  });
});
