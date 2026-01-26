/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/media/queue/jobs.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { MediaProcessingQueue, createMediaProcessingQueue, type MediaJobData } from './jobs';

import type { MediaProcessingOrchestrator } from '../processor';
import type { Logger } from '@logger';

// Mock the processor module
vi.mock('../../processor', () => ({
  ImageProcessor: class MockImageProcessor {
    process = vi.fn().mockResolvedValue({ success: true });
    getMetadata = vi.fn().mockResolvedValue({});
    generateVariants = vi.fn().mockResolvedValue({
      original: { success: true },
      optimized: { success: true },
      thumbnail: { success: true },
    });
  },
  AudioProcessor: class MockAudioProcessor {
    process = vi.fn().mockResolvedValue({ success: true });
    getMetadata = vi.fn().mockResolvedValue({});
  },
  VideoProcessor: class MockVideoProcessor {
    process = vi.fn().mockResolvedValue({ success: true });
    getMetadata = vi.fn().mockResolvedValue({});
  },
  MediaProcessingOrchestrator: class MockOrchestrator {
    processFile = vi.fn().mockResolvedValue({ success: true });
    getStats = vi.fn().mockReturnValue({
      activeJobs: 0,
      queuedJobs: 0,
      limits: {
        maxDuration: 300000,
        maxFileSize: 104857600,
        maxConcurrentJobs: 3,
        allowedFormats: ['jpg', 'png'],
      },
    });
    cleanup = vi.fn();
  },
}));

describe('MediaProcessingQueue', () => {
  let mockOrchestrator: MediaProcessingOrchestrator;
  let mockLogger: Logger;
  let queue: MediaProcessingQueue;

  beforeEach(() => {
    mockOrchestrator = {
      processFile: vi.fn().mockResolvedValue({ success: true }),
      getStats: vi.fn().mockReturnValue({
        activeJobs: 0,
        queuedJobs: 0,
        limits: {
          maxDuration: 300000,
          maxFileSize: 104857600,
          maxConcurrentJobs: 3,
          allowedFormats: ['jpg', 'png'],
        },
      }),
    } as unknown as MediaProcessingOrchestrator;

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    queue = new MediaProcessingQueue(mockOrchestrator, mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create queue with default options', () => {
      expect(queue).toBeDefined();
    });
  });

  describe('addJob', () => {
    it('should add a media job to the queue', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-123',
        filePath: '/tmp/test.jpg',
        filename: 'test.jpg',
        userId: 'user-456',
      };

      const jobId = await queue.addJob(jobData);

      expect(jobId).toBe('file-123');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Job added to queue',
        expect.objectContaining({ jobId: 'file-123' }),
      );
    });

    it('should add job with priority option', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-high-priority',
        filePath: '/tmp/urgent.jpg',
        filename: 'urgent.jpg',
        userId: 'user-789',
      };

      const jobId = await queue.addJob(jobData, { priority: 10 });

      expect(jobId).toBe('file-high-priority');
    });

    it('should add job with delay option', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-delayed',
        filePath: '/tmp/delayed.jpg',
        filename: 'delayed.jpg',
        userId: 'user-001',
      };

      const jobId = await queue.addJob(jobData, { delay: 5000 });

      expect(jobId).toBe('file-delayed');
    });
  });

  describe('getStats', () => {
    it('should return combined queue and orchestrator stats', () => {
      const stats = queue.getStats();

      expect(stats).toEqual({
        total: 0,
        waiting: 0,
        active: 0,
        delayed: 0,
        completed: 0,
        failed: 0,
        orchestratorStats: {
          activeJobs: 0,
          queuedJobs: 0,
          limits: {
            maxDuration: 300000,
            maxFileSize: 104857600,
            maxConcurrentJobs: 3,
            allowedFormats: ['jpg', 'png'],
          },
        },
      });
    });

    it('should include job counts after adding jobs', async () => {
      await queue.addJob({
        fileId: 'job1',
        filePath: '/tmp/file1.jpg',
        filename: 'file1.jpg',
        userId: 'user1',
      });

      await queue.addJob({
        fileId: 'job2',
        filePath: '/tmp/file2.jpg',
        filename: 'file2.jpg',
        userId: 'user2',
      });

      const stats = queue.getStats();

      expect(stats.total).toBe(2);
      expect(stats.waiting).toBe(2);
    });
  });

  describe('getOrchestratorStats', () => {
    it('should return orchestrator stats', () => {
      const stats = queue.getOrchestratorStats();

      expect(stats).toEqual({
        activeJobs: 0,
        queuedJobs: 0,
        limits: {
          maxDuration: 300000,
          maxFileSize: 104857600,
          maxConcurrentJobs: 3,
          allowedFormats: ['jpg', 'png'],
        },
      });

      expect(mockOrchestrator.getStats).toHaveBeenCalled();
    });
  });

  describe('processJobData', () => {
    it('should process media job through orchestrator', async () => {
      const jobData: MediaJobData = {
        fileId: 'process-test',
        filePath: '/tmp/process.jpg',
        filename: 'process.jpg',
        userId: 'user-process',
      };

      // Access protected method via start/queue mechanism
      await queue.addJob(jobData);
      await queue.start();

      // Give it time to process
      await new Promise((resolve) => setTimeout(resolve, 200));

      await queue.stop();

      expect(mockOrchestrator.processFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: 'process-test',
          filePath: '/tmp/process.jpg',
          filename: 'process.jpg',
        }),
      );
    });

    it('should log success on completed processing', async () => {
      (mockOrchestrator.processFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: true,
      });

      const jobData: MediaJobData = {
        fileId: 'success-job',
        filePath: '/tmp/success.jpg',
        filename: 'success.jpg',
        userId: 'user-success',
      };

      await queue.addJob(jobData);
      await queue.start();
      await new Promise((resolve) => setTimeout(resolve, 200));
      await queue.stop();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Media processing completed',
        expect.objectContaining({
          fileId: 'success-job',
          success: true,
        }),
      );
    });

    it('should throw error when processing fails', async () => {
      (mockOrchestrator.processFile as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        success: false,
        error: 'Processing failed',
      });

      const jobData: MediaJobData = {
        fileId: 'fail-job',
        filePath: '/tmp/fail.jpg',
        filename: 'fail.jpg',
        userId: 'user-fail',
      };

      await queue.addJob(jobData);
      await queue.start();
      await new Promise((resolve) => setTimeout(resolve, 500));
      await queue.stop();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Media processing failed',
        expect.objectContaining({
          fileId: 'fail-job',
        }),
      );
    });
  });
});

describe('createMediaProcessingQueue', () => {
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create a MediaProcessingQueue with default limits', () => {
    const queue = createMediaProcessingQueue(mockLogger);

    expect(queue).toBeInstanceOf(MediaProcessingQueue);
  });

  it('should create a MediaProcessingQueue with custom limits', () => {
    const queue = createMediaProcessingQueue(mockLogger, {
      maxDuration: 10 * 60 * 1000,
      maxFileSize: 200 * 1024 * 1024,
      maxConcurrentJobs: 5,
      allowedFormats: ['jpg', 'png', 'gif'],
    });

    expect(queue).toBeInstanceOf(MediaProcessingQueue);
  });

  it('should create a MediaProcessingQueue with partial limits', () => {
    const queue = createMediaProcessingQueue(mockLogger, {
      maxFileSize: 50 * 1024 * 1024,
    });

    expect(queue).toBeInstanceOf(MediaProcessingQueue);
  });
});
