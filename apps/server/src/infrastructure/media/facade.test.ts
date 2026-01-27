/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/media/__tests__/facade.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { ServerMediaQueue, createServerMediaQueue, type MediaJobData } from '../facade';

import type { Logger } from '@logger';

// Mock the processor module with class syntax
vi.mock('../processor', () => ({
  MediaProcessingOrchestrator: class MockMediaProcessingOrchestrator {
    processFile = vi.fn().mockResolvedValue({
      success: true,
      outputPath: '/tmp/output.jpg',
    });
    getStats = vi.fn().mockReturnValue({
      activeJobs: 0,
      queuedJobs: 0,
      limits: {
        maxDuration: 300000,
        maxFileSize: 104857600,
        maxConcurrentJobs: 3,
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'wav', 'mp4', 'mov'],
      },
    });
    cleanup = vi.fn();
  },
  ImageProcessor: class MockImageProcessor {
    readonly isMock = true;
    process = vi.fn();
  },
  AudioProcessor: class MockAudioProcessor {
    readonly isMock = true;
    process = vi.fn();
  },
  VideoProcessor: class MockVideoProcessor {
    readonly isMock = true;
    process = vi.fn();
  },
}));

// Mock the queue module with class syntax
vi.mock('../queue', () => ({
  CustomJobQueue: class MockCustomJobQueue {
    protected options: Record<string, unknown>;
    constructor(options: Record<string, unknown>) {
      this.options = options;
    }
    add = vi.fn().mockResolvedValue('job-id');
    start = vi.fn().mockResolvedValue(undefined);
    stop = vi.fn().mockResolvedValue(undefined);
    getStats = vi.fn().mockReturnValue({
      total: 0,
      waiting: 0,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0,
    });
  },
}));

describe('ServerMediaQueue', () => {
  let queue: ServerMediaQueue;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    queue = new ServerMediaQueue(mockLogger);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create a ServerMediaQueue with logger', () => {
      expect(queue).toBeInstanceOf(ServerMediaQueue);
    });

    it('should initialize with correct concurrency settings', () => {
      // The queue should have been created with these options
      const newQueue = new ServerMediaQueue(mockLogger);
      expect(newQueue).toBeDefined();
    });
  });

  describe('addJob', () => {
    it('should add a media processing job', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-123',
        filePath: '/tmp/uploads/test.jpg',
        filename: 'test.jpg',
        userId: 'user-456',
      };

      const jobId = await queue.addJob(jobData);

      expect(jobId).toBe('job-id');
    });

    it('should add a job with priority', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-priority',
        filePath: '/tmp/uploads/important.jpg',
        filename: 'important.jpg',
        userId: 'user-789',
      };

      const jobId = await queue.addJob(jobData, { priority: 10 });

      expect(jobId).toBe('job-id');
    });

    it('should add a job with delay', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-delayed',
        filePath: '/tmp/uploads/delayed.jpg',
        filename: 'delayed.jpg',
        userId: 'user-101',
      };

      const jobId = await queue.addJob(jobData, { delay: 5000 });

      expect(jobId).toBe('job-id');
    });
  });

  describe('getOrchestratorStats', () => {
    it('should return orchestrator statistics', () => {
      const stats = queue.getOrchestratorStats();

      expect(stats).toEqual({
        activeJobs: 0,
        queuedJobs: 0,
        limits: expect.objectContaining({
          maxDuration: 300000,
          maxFileSize: 104857600,
          maxConcurrentJobs: 3,
        }),
      });
    });
  });

  describe('processJobData', () => {
    it('should process media job data through orchestrator', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-process',
        filePath: '/tmp/uploads/process.jpg',
        filename: 'process.jpg',
        userId: 'user-process',
      };

      // Use type assertion to access protected method for testing
      const processMethod = (
        queue as unknown as { processJobData: (data: MediaJobData) => Promise<void> }
      ).processJobData;

      // Bind the method to the queue instance
      await processMethod.call(queue, jobData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Processing media job',
        expect.objectContaining({
          fileId: 'file-process',
          filename: 'process.jpg',
        }),
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Media processing completed',
        expect.objectContaining({
          fileId: 'file-process',
          success: true,
        }),
      );
    });

    it('should log processing time', async () => {
      const jobData: MediaJobData = {
        fileId: 'file-timing',
        filePath: '/tmp/uploads/timing.jpg',
        filename: 'timing.jpg',
        userId: 'user-timing',
      };

      // Use type assertion to access protected method for testing
      const processMethod = (
        queue as unknown as { processJobData: (data: MediaJobData) => Promise<void> }
      ).processJobData;
      await processMethod.call(queue, jobData);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Media processing completed',
        expect.objectContaining({
          processingTime: expect.any(Number),
        }),
      );
    });
  });
});

describe('createServerMediaQueue', () => {
  it('should create a ServerMediaQueue instance', () => {
    const mockLogger: Logger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as Logger;

    const queue = createServerMediaQueue(mockLogger);

    expect(queue).toBeInstanceOf(ServerMediaQueue);
  });
});
