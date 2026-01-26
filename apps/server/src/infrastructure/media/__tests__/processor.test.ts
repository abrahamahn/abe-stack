/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/media/__tests__/processor.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    MediaProcessingOrchestrator,
    type ProcessingJob,
    type ProcessingLimits,
} from '../processor';

import type { AudioProcessor } from '../processors/audio';
import type { ImageProcessor } from '../processors/image';
import type { VideoProcessor } from '../processors/video';
import type { ProcessingResult } from '../types';

// Create a hoisted mock for fs.stat
const mockFsStat = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    size: 1024 * 1024, // 1MB default
  }),
);

// Mock fs/promises - dynamic imports need proper module structure
vi.mock('fs/promises', () => {
  return {
    stat: mockFsStat,
    default: {
      stat: mockFsStat,
    },
  };
});

// Mock security scanner with class syntax
vi.mock('../utils/security', () => ({
  MediaSecurityScanner: class MockMediaSecurityScanner {
    scanFile = vi.fn().mockResolvedValue({
      safe: true,
      threats: [],
      warnings: [],
    });
  },
}));

describe('MediaProcessingOrchestrator', () => {
  let orchestrator: MediaProcessingOrchestrator;
  let mockImageProcessor: {
    process: ReturnType<typeof vi.fn>;
  };
  let mockAudioProcessor: {
    process: ReturnType<typeof vi.fn>;
  };
  let mockVideoProcessor: {
    process: ReturnType<typeof vi.fn>;
  };
  let mockStat: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockImageProcessor = {
      process: vi.fn().mockResolvedValue({
        success: true,
        outputPath: '/tmp/output.jpg',
        metadata: { width: 800, height: 600 },
      }),
    };

    mockAudioProcessor = {
      process: vi.fn().mockResolvedValue({
        success: true,
        outputPath: '/tmp/output.mp3',
        metadata: { duration: 180 },
      }),
    };

    mockVideoProcessor = {
      process: vi.fn().mockResolvedValue({
        success: true,
        outputPath: '/tmp/output.mp4',
        metadata: { duration: 120, width: 1920, height: 1080 },
      }),
    };

    mockStat = mockFsStat;
    mockStat.mockResolvedValue({
      size: 1024 * 1024,
    }); // 1MB

    orchestrator = new MediaProcessingOrchestrator(
      mockImageProcessor as unknown as ImageProcessor,
      mockAudioProcessor as unknown as AudioProcessor,
      mockVideoProcessor as unknown as VideoProcessor,
    );
  });

  afterEach(() => {
    orchestrator.cleanup();
  });

  describe('constructor', () => {
    it('should initialize with default limits', () => {
      const stats = orchestrator.getStats();

      expect(stats.limits).toEqual({
        maxDuration: 5 * 60 * 1000, // 5 minutes
        maxFileSize: 100 * 1024 * 1024, // 100MB
        maxConcurrentJobs: 5,
        allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp3', 'wav', 'mp4', 'mov'],
      });
    });

    it('should allow custom limits', () => {
      const customLimits: Partial<ProcessingLimits> = {
        maxFileSize: 50 * 1024 * 1024, // 50MB
        maxConcurrentJobs: 3,
      };

      const customOrchestrator = new MediaProcessingOrchestrator(
        mockImageProcessor as unknown as ImageProcessor,
        mockAudioProcessor as unknown as AudioProcessor,
        mockVideoProcessor as unknown as VideoProcessor,
        customLimits,
      );

      const stats = customOrchestrator.getStats();
      expect(stats.limits.maxFileSize).toBe(50 * 1024 * 1024);
      expect(stats.limits.maxConcurrentJobs).toBe(3);

      customOrchestrator.cleanup();
    });
  });

  describe('processFile', () => {
    it('should process an image file successfully', async () => {
      const job: ProcessingJob = {
        fileId: 'test-1',
        filePath: '/tmp/uploads/test.jpg',
        filename: 'test.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await orchestrator.processFile(job);

      expect(result.success).toBe(true);
      expect(mockImageProcessor.process).toHaveBeenCalled();
    });

    it('should process an audio file successfully', async () => {
      const job: ProcessingJob = {
        fileId: 'test-2',
        filePath: '/tmp/uploads/test.mp3',
        filename: 'test.mp3',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await orchestrator.processFile(job);

      expect(result.success).toBe(true);
      expect(mockAudioProcessor.process).toHaveBeenCalled();
    });

    it('should process a video file successfully', async () => {
      const job: ProcessingJob = {
        fileId: 'test-3',
        filePath: '/tmp/uploads/test.mp4',
        filename: 'test.mp4',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await orchestrator.processFile(job);

      expect(result.success).toBe(true);
      expect(mockVideoProcessor.process).toHaveBeenCalled();
    });

    it('should reject files exceeding max size', async () => {
      mockStat.mockResolvedValue({
        size: 200 * 1024 * 1024,
      }); // 200MB

      const job: ProcessingJob = {
        fileId: 'test-4',
        filePath: '/tmp/uploads/large.jpg',
        filename: 'large.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await orchestrator.processFile(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds limit');
    });

    it('should reject unsupported file formats', async () => {
      const job: ProcessingJob = {
        fileId: 'test-5',
        filePath: '/tmp/uploads/test.exe',
        filename: 'test.exe',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await orchestrator.processFile(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('should handle processing timeout', async () => {
      // Create orchestrator with very short timeout
      const shortTimeoutOrchestrator = new MediaProcessingOrchestrator(
        mockImageProcessor as unknown as ImageProcessor,
        mockAudioProcessor as unknown as AudioProcessor,
        mockVideoProcessor as unknown as VideoProcessor,
        { maxDuration: 1 }, // 1ms timeout
      );

      // Make the processor take longer than the timeout
      const slowPromise = (): Promise<ProcessingResult> =>
        new Promise((resolve) =>
          setTimeout(() => { resolve({ success: true, outputPath: '/tmp/test.jpg' }); }, 100),
        );
      mockImageProcessor.process = vi.fn().mockImplementation(slowPromise);

      const job: ProcessingJob = {
        fileId: 'test-6',
        filePath: '/tmp/uploads/test.jpg',
        filename: 'test.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await shortTimeoutOrchestrator.processFile(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');

      shortTimeoutOrchestrator.cleanup();
    });

    it('should reject when max concurrent jobs reached', async () => {
      // Create orchestrator with just 1 concurrent job allowed
      const limitedOrchestrator = new MediaProcessingOrchestrator(
        mockImageProcessor as unknown as ImageProcessor,
        mockAudioProcessor as unknown as AudioProcessor,
        mockVideoProcessor as unknown as VideoProcessor,
        { maxConcurrentJobs: 1 },
      );

      // Make the first job take a while
      let resolveFirst: (value: ProcessingResult) => void = () => {};
      const pendingPromise = (): Promise<ProcessingResult> =>
        new Promise<ProcessingResult>((resolve) => {
          resolveFirst = resolve;
        });
      mockImageProcessor.process = vi.fn().mockImplementation(pendingPromise);

      const job1: ProcessingJob = {
        fileId: 'test-7a',
        filePath: '/tmp/uploads/test1.jpg',
        filename: 'test1.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const job2: ProcessingJob = {
        fileId: 'test-7b',
        filePath: '/tmp/uploads/test2.jpg',
        filename: 'test2.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      // Start first job (won't complete yet)
      const firstJobPromise = limitedOrchestrator.processFile(job1);

      // Small delay to ensure first job is registered
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Try to start second job
      const result2 = await limitedOrchestrator.processFile(job2);

      expect(result2.success).toBe(false);
      expect(result2.error).toContain('Too many concurrent');

      // Complete the first job
      resolveFirst({ success: true, outputPath: '/tmp/test1.jpg' });
      await firstJobPromise;

      limitedOrchestrator.cleanup();
    });

    it('should handle various image formats', async () => {
      // Test only formats supported by default limits: jpg, jpeg, png, gif, webp
      const imageFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

      for (const format of imageFormats) {
        const job: ProcessingJob = {
          fileId: `test-image-${format}`,
          filePath: `/tmp/uploads/test.${format}`,
          filename: `test.${format}`,
          priority: 'normal',
          retryCount: 0,
          startTime: Date.now(),
        };

        const result = await orchestrator.processFile(job);
        expect(result.success).toBe(true);
      }
    });

    it('should handle various audio formats', async () => {
      // Test only formats supported by default limits: mp3, wav
      const audioFormats = ['mp3', 'wav'];

      for (const format of audioFormats) {
        const job: ProcessingJob = {
          fileId: `test-audio-${format}`,
          filePath: `/tmp/uploads/test.${format}`,
          filename: `test.${format}`,
          priority: 'normal',
          retryCount: 0,
          startTime: Date.now(),
        };

        const result = await orchestrator.processFile(job);
        expect(result.success).toBe(true);
      }
    });

    it('should handle various video formats', async () => {
      // Test only formats supported by default limits: mp4, mov
      const videoFormats = ['mp4', 'mov'];

      for (const format of videoFormats) {
        const job: ProcessingJob = {
          fileId: `test-video-${format}`,
          filePath: `/tmp/uploads/test.${format}`,
          filename: `test.${format}`,
          priority: 'normal',
          retryCount: 0,
          startTime: Date.now(),
        };

        const result = await orchestrator.processFile(job);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('getStats', () => {
    it('should return current queue statistics', () => {
      const stats = orchestrator.getStats();

      expect(stats).toEqual({
        activeJobs: 0,
        queuedJobs: 0,
        limits: expect.any(Object),
      });
    });
  });

  describe('cleanup', () => {
    it('should clear all active jobs and queue', async () => {
      // Process a job first
      const job: ProcessingJob = {
        fileId: 'test-cleanup',
        filePath: '/tmp/uploads/test.jpg',
        filename: 'test.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      await orchestrator.processFile(job);
      orchestrator.cleanup();

      const stats = orchestrator.getStats();
      expect(stats.activeJobs).toBe(0);
      expect(stats.queuedJobs).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle processor errors gracefully', async () => {
      mockImageProcessor.process.mockRejectedValueOnce(new Error('Processing failed'));

      const job: ProcessingJob = {
        fileId: 'test-error',
        filePath: '/tmp/uploads/test.jpg',
        filename: 'test.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await orchestrator.processFile(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockImageProcessor.process.mockRejectedValueOnce('String error');

      const job: ProcessingJob = {
        fileId: 'test-string-error',
        filePath: '/tmp/uploads/test.jpg',
        filename: 'test.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      };

      const result = await orchestrator.processFile(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('failed');
    });
  });
});
