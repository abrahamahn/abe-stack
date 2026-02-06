// premium/media/src/queue/jobs.test.ts
/**
 * Tests for MediaProcessingQueue and createMediaProcessingQueue
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MediaProcessingQueue, createMediaProcessingQueue } from './jobs';

import type { MediaProcessingOrchestrator } from '../processor';
import type { Logger } from '@abe-stack/shared';

// Mock the processor module with proper class constructors
vi.mock('../processor', () => {
  return {
    ImageProcessor: class MockImageProcessor {
      process = vi.fn().mockResolvedValue({ success: true });
    },
    AudioProcessor: class MockAudioProcessor {
      process = vi.fn().mockResolvedValue({ success: true });
    },
    VideoProcessor: class MockVideoProcessor {
      process = vi.fn().mockResolvedValue({ success: true });
    },
    MediaProcessingOrchestrator: class MockMediaProcessingOrchestrator {
      processFile = vi.fn().mockResolvedValue({
        success: true,
        outputPath: '/output/processed.mp4',
      });
      getStats = vi.fn().mockReturnValue({
        activeJobs: 0,
        queuedJobs: 0,
        limits: {
          maxDuration: 300000,
          maxFileSize: 104857600,
          maxConcurrentJobs: 3,
          allowedFormats: ['jpg', 'mp4'],
        },
      });
    },
  };
});

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

function createMockOrchestrator(): MediaProcessingOrchestrator {
  return {
    processFile: vi.fn().mockResolvedValue({
      success: true,
      outputPath: '/output/processed.mp4',
      metadata: { width: 1920, height: 1080 },
    }),
    getStats: vi.fn().mockReturnValue({
      activeJobs: 0,
      queuedJobs: 0,
      limits: {
        maxDuration: 300000,
        maxFileSize: 104857600,
        maxConcurrentJobs: 3,
        allowedFormats: ['jpg', 'mp4'],
      },
    }),
    cleanup: vi.fn(),
  } as unknown as MediaProcessingOrchestrator;
}

describe('MediaProcessingQueue', () => {
  let queue: MediaProcessingQueue;
  let logger: Logger;
  let orchestrator: ReturnType<typeof createMockOrchestrator>;

  beforeEach(() => {
    logger = createMockLogger();
    orchestrator = createMockOrchestrator();
    queue = new MediaProcessingQueue(orchestrator, logger);
  });

  describe('addJob', () => {
    it('should add a job using fileId as job ID', async () => {
      const jobId = await queue.addJob({
        fileId: 'file-123',
        filePath: '/tmp/video.mp4',
        filename: 'video.mp4',
        userId: 'user-1',
      });

      expect(jobId).toBe('file-123');
    });

    it('should accept priority and delay options', async () => {
      const jobId = await queue.addJob(
        {
          fileId: 'file-456',
          filePath: '/tmp/image.jpg',
          filename: 'image.jpg',
          userId: 'user-2',
        },
        { priority: 10, delay: 5000 },
      );

      expect(jobId).toBe('file-456');
    });
  });

  describe('getOrchestratorStats', () => {
    it('should return orchestrator stats', () => {
      const stats = queue.getOrchestratorStats();

      expect(stats).toEqual({
        activeJobs: 0,
        queuedJobs: 0,
        limits: expect.objectContaining({
          maxConcurrentJobs: 3,
        }),
      });
    });
  });

  describe('getStats', () => {
    it('should return combined queue and orchestrator stats', () => {
      const stats = queue.getStats();

      expect(stats.total).toBe(0);
      expect(stats.orchestratorStats).toBeDefined();
      expect(stats.orchestratorStats.activeJobs).toBe(0);
    });
  });
});

describe('createMediaProcessingQueue', () => {
  it('should create a queue with default limits', () => {
    const logger = createMockLogger();
    const queue = createMediaProcessingQueue(logger);

    expect(queue).toBeInstanceOf(MediaProcessingQueue);
  });

  it('should accept custom limits', () => {
    const logger = createMockLogger();

    const queue = createMediaProcessingQueue(logger, {
      maxFileSize: 50 * 1024 * 1024,
      maxConcurrentJobs: 5,
    });

    expect(queue).toBeInstanceOf(MediaProcessingQueue);
  });
});
