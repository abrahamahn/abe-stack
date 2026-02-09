// src/server/media/src/facade.test.ts
/**
 * Tests for ServerMediaQueue, createServerMediaQueue, and entitlement gating
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ServerMediaQueue, createServerMediaQueue } from './facade';

import type { MediaEntitlements } from './facade';
import type { Logger } from '@abe-stack/shared';

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

    it('should skip entitlement checks when entitlements not provided', async () => {
      const jobId = await queue.addJob({
        fileId: 'file-789',
        filePath: '/tmp/audio.mp3',
        filename: 'audio.mp3',
        userId: 'user-3',
      });

      expect(jobId).toBe('file-789');
    });
  });

  describe('entitlement gating', () => {
    it('should allow job when media:processing is enabled', async () => {
      const entitlements: MediaEntitlements = {
        features: {
          ['media:processing']: { enabled: true },
          ['media:max_file_size']: { enabled: true, limit: 100 },
        },
      };

      const jobId = await queue.addJob(
        {
          fileId: 'file-ok',
          filePath: '/tmp/video.mp4',
          filename: 'video.mp4',
          userId: 'user-1',
          fileSizeMb: 50,
        },
        { entitlements },
      );

      expect(jobId).toBe('file-ok');
    });

    it('should reject job when media:processing is disabled', async () => {
      const entitlements: MediaEntitlements = {
        features: {
          ['media:processing']: { enabled: false },
        },
      };

      await expect(
        queue.addJob(
          {
            fileId: 'file-denied',
            filePath: '/tmp/video.mp4',
            filename: 'video.mp4',
            userId: 'user-1',
          },
          { entitlements },
        ),
      ).rejects.toThrow('Media processing is not available on your plan');
    });

    it('should reject job when media:processing feature is missing', async () => {
      const entitlements: MediaEntitlements = {
        features: {},
      };

      await expect(
        queue.addJob(
          {
            fileId: 'file-missing',
            filePath: '/tmp/video.mp4',
            filename: 'video.mp4',
            userId: 'user-1',
          },
          { entitlements },
        ),
      ).rejects.toThrow('Media processing is not available on your plan');
    });

    it('should reject job when file size exceeds plan limit', async () => {
      const entitlements: MediaEntitlements = {
        features: {
          ['media:processing']: { enabled: true },
          ['media:max_file_size']: { enabled: true, limit: 10 },
        },
      };

      await expect(
        queue.addJob(
          {
            fileId: 'file-big',
            filePath: '/tmp/huge-video.mp4',
            filename: 'huge-video.mp4',
            userId: 'user-1',
            fileSizeMb: 50,
          },
          { entitlements },
        ),
      ).rejects.toThrow('File size 50MB exceeds plan limit of 10MB');
    });

    it('should allow job when file size is within plan limit', async () => {
      const entitlements: MediaEntitlements = {
        features: {
          ['media:processing']: { enabled: true },
          ['media:max_file_size']: { enabled: true, limit: 100 },
        },
      };

      const jobId = await queue.addJob(
        {
          fileId: 'file-ok-size',
          filePath: '/tmp/video.mp4',
          filename: 'video.mp4',
          userId: 'user-1',
          fileSizeMb: 50,
        },
        { entitlements },
      );

      expect(jobId).toBe('file-ok-size');
    });

    it('should skip file size check when fileSizeMb not provided', async () => {
      const entitlements: MediaEntitlements = {
        features: {
          ['media:processing']: { enabled: true },
          ['media:max_file_size']: { enabled: true, limit: 10 },
        },
      };

      const jobId = await queue.addJob(
        {
          fileId: 'file-no-size',
          filePath: '/tmp/video.mp4',
          filename: 'video.mp4',
          userId: 'user-1',
        },
        { entitlements },
      );

      expect(jobId).toBe('file-no-size');
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

  it('should accept custom limits', () => {
    const logger = createMockLogger();

    const queue = createServerMediaQueue(logger, {
      maxFileSize: 500 * 1024 * 1024,
      maxConcurrentJobs: 10,
    });

    expect(queue).toBeInstanceOf(ServerMediaQueue);
  });
});
