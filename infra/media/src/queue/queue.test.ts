// infra/media/src/queue/queue.test.ts
/**
 * Tests for CustomJobQueue
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { CustomJobQueue } from './queue';

import type { Logger } from '@abe-stack/core';

function createMockLogger(): Logger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
  };
}

interface TestJobData {
  value: string;
}

class TestQueue extends CustomJobQueue<TestJobData> {
  public processedJobs: TestJobData[] = [];
  public shouldFail = false;

  protected override async processJobData(data: TestJobData): Promise<void> {
    if (this.shouldFail) {
      throw new Error('Simulated failure');
    }
    this.processedJobs.push(data);
  }
}

describe('CustomJobQueue', () => {
  let queue: TestQueue;
  let logger: Logger;

  beforeEach(() => {
    vi.useFakeTimers();
    logger = createMockLogger();
    queue = new TestQueue({
      concurrency: 2,
      retryDelayMs: 100,
      maxRetries: 2,
      logger,
    });
  });

  afterEach(async () => {
    await queue.stop();
    vi.useRealTimers();
  });

  describe('add', () => {
    it('should add a job and return its id', async () => {
      const jobId = await queue.add('job-1', { value: 'test' });

      expect(jobId).toBe('job-1');
      expect(logger.info).toHaveBeenCalledWith('Job added to queue', {
        jobId: 'job-1',
        priority: 0,
      });
    });

    it('should accept priority and delay options', async () => {
      const jobId = await queue.add('job-2', { value: 'test' }, { priority: 5, delay: 1000 });

      expect(jobId).toBe('job-2');
    });
  });

  describe('getStats', () => {
    it('should return initial stats with no jobs', () => {
      const stats = queue.getStats();

      expect(stats.total).toBe(0);
      expect(stats.waiting).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.delayed).toBe(0);
      expect(stats.completed).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('should track waiting jobs after add', async () => {
      await queue.add('job-1', { value: 'test-1' });
      await queue.add('job-2', { value: 'test-2' });

      const stats = queue.getStats();

      expect(stats.total).toBe(2);
      expect(stats.waiting).toBe(2);
    });

    it('should track delayed jobs', async () => {
      await queue.add('job-1', { value: 'test' }, { delay: 60000 });

      const stats = queue.getStats();

      expect(stats.delayed).toBe(1);
    });
  });

  describe('start and stop', () => {
    it('should start and stop without errors', async () => {
      await queue.start();

      expect(logger.info).toHaveBeenCalledWith(
        'Job queue started',
        expect.objectContaining({ concurrency: 2 }),
      );

      await queue.stop();

      expect(logger.info).toHaveBeenCalledWith('Job queue stopped');
    });

    it('should not start twice', async () => {
      await queue.start();
      await queue.start();

      // Only one start log
      const startCalls = vi
        .mocked(logger.info)
        .mock.calls.filter((call) => call[0] === 'Job queue started');
      expect(startCalls.length).toBe(1);
    });
  });

  describe('processJobData default implementation', () => {
    it('should reject by default in base class', async () => {
      const baseQueue = new CustomJobQueue<TestJobData>({
        logger,
      });

      await expect(
        (
          baseQueue as unknown as { processJobData: (data: TestJobData) => Promise<void> }
        ).processJobData({ value: 'test' }),
      ).rejects.toThrow('processJobData must be implemented by subclass');
    });
  });
});
