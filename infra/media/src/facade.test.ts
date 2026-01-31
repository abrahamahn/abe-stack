// infra/media/src/facade.test.ts
/**
 * Tests for ServerMediaQueue and createServerMediaQueue
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ServerMediaQueue, createServerMediaQueue } from './facade';

import type { Logger } from '@abe-stack/core';

// Mock processor module with proper class constructors
vi.mock('./processor', () => {
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

describe('ServerMediaQueue', () => {
  let queue: ServerMediaQueue;
  let logger: Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    logger = createMockLogger();
    queue = new ServerMediaQueue(logger);
  });

  describe('addJob', () => {
    it('should add a media processing job', async () => {
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
        { priority: 5, delay: 2000 },
      );

      expect(jobId).toBe('file-456');
    });
  });

  describe('getOrchestratorStats', () => {
    it('should return orchestrator stats', () => {
      const stats = queue.getOrchestratorStats();

      expect(stats).toBeDefined();
    });
  });
});

describe('createServerMediaQueue', () => {
  it('should create a ServerMediaQueue', () => {
    const logger = createMockLogger();

    const queue = createServerMediaQueue(logger);

    expect(queue).toBeInstanceOf(ServerMediaQueue);
  });
});
