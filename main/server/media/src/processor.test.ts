// main/server/media/src/processor.test.ts
/**
 * Tests for MediaProcessingOrchestrator
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { MediaProcessingOrchestrator } from './processor';

import type { AudioProcessor } from './processors/audio';
import type { ImageProcessor } from './processors/image';
import type { VideoProcessor } from './processors/video';
import type { ProcessingResult } from './types';

function createMockImageProcessor(): ImageProcessor {
  return {
    process: vi.fn().mockResolvedValue({
      success: true,
      outputPath: '/output/image.jpg',
      metadata: { width: 800, height: 600 },
    } as ProcessingResult),
    getMetadata: vi.fn(),
    generateVariants: vi.fn(),
  } as unknown as ImageProcessor;
}

function createMockAudioProcessor(): AudioProcessor {
  return {
    process: vi.fn().mockResolvedValue({
      success: true,
      outputPath: '/output/audio.mp3',
      metadata: { duration: 180 },
    } as ProcessingResult),
    getMetadata: vi.fn(),
    generateVariants: vi.fn(),
    extractSegment: vi.fn(),
    getDuration: vi.fn(),
  } as unknown as AudioProcessor;
}

function createMockVideoProcessor(): VideoProcessor {
  return {
    process: vi.fn().mockResolvedValue({
      success: true,
      outputPath: '/output/video.mp4',
      metadata: { width: 1920, height: 1080, duration: 120 },
    } as ProcessingResult),
    getMetadata: vi.fn(),
    generateVariants: vi.fn(),
    extractAudio: vi.fn(),
    createHLSStream: vi.fn(),
    getDuration: vi.fn(),
  } as unknown as VideoProcessor;
}

// Mock the security module
vi.mock('./security', () => {
  return {
    BasicSecurityScanner: class MockBasicSecurityScanner {
      scanFile(_filePath: string) {
        return Promise.resolve({
          safe: true,
          threats: [],
          warnings: [],
          metadata: { fileSize: 1024 },
        });
      }
    },
  };
});

// Mock fs/promises
vi.mock('fs/promises', () => ({
  stat: vi.fn().mockResolvedValue({ size: 1024 * 1024 }),
}));

describe('MediaProcessingOrchestrator', () => {
  let orchestrator: MediaProcessingOrchestrator;
  let imageProcessor: ReturnType<typeof createMockImageProcessor>;
  let audioProcessor: ReturnType<typeof createMockAudioProcessor>;
  let videoProcessor: ReturnType<typeof createMockVideoProcessor>;

  beforeEach(() => {
    vi.clearAllMocks();
    imageProcessor = createMockImageProcessor();
    audioProcessor = createMockAudioProcessor();
    videoProcessor = createMockVideoProcessor();

    orchestrator = new MediaProcessingOrchestrator(imageProcessor, audioProcessor, videoProcessor, {
      maxDuration: 5000,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxConcurrentJobs: 3,
      allowedFormats: ['jpg', 'jpeg', 'png', 'mp3', 'wav', 'mp4', 'mov'],
    });
  });

  describe('processFile', () => {
    it('should process an image file', async () => {
      const result = await orchestrator.processFile({
        fileId: 'file-1',
        filePath: '/tmp/photo.jpg',
        filename: 'photo.jpg',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(imageProcessor.process).toHaveBeenCalled();
    });

    it('should process an audio file', async () => {
      const result = await orchestrator.processFile({
        fileId: 'file-2',
        filePath: '/tmp/song.mp3',
        filename: 'song.mp3',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(audioProcessor.process).toHaveBeenCalled();
    });

    it('should process a video file', async () => {
      const result = await orchestrator.processFile({
        fileId: 'file-3',
        filePath: '/tmp/clip.mp4',
        filename: 'clip.mp4',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      });

      expect(result.success).toBe(true);
      expect(videoProcessor.process).toHaveBeenCalled();
    });

    it('should reject files exceeding size limit', async () => {
      const fsPromises = await import('fs/promises');
      vi.mocked(fsPromises.stat).mockResolvedValueOnce({
        size: 20 * 1024 * 1024,
      } as import('fs').Stats);

      const result = await orchestrator.processFile({
        fileId: 'file-4',
        filePath: '/tmp/big.mp4',
        filename: 'big.mp4',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('exceeds limit');
    });

    it('should reject unsupported formats', async () => {
      const result = await orchestrator.processFile({
        fileId: 'file-5',
        filePath: '/tmp/file.xyz',
        filename: 'file.xyz',
        priority: 'normal',
        retryCount: 0,
        startTime: Date.now(),
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });
  });

  describe('getStats', () => {
    it('should return processing stats', () => {
      const stats = orchestrator.getStats();

      expect(stats.activeJobs).toBe(0);
      expect(stats.queuedJobs).toBe(0);
      expect(stats.limits.maxFileSize).toBe(10 * 1024 * 1024);
      expect(stats.limits.maxConcurrentJobs).toBe(3);
    });
  });

  describe('cleanup', () => {
    it('should clear all active jobs and queue', () => {
      orchestrator.cleanup();

      const stats = orchestrator.getStats();
      expect(stats.activeJobs).toBe(0);
      expect(stats.queuedJobs).toBe(0);
    });
  });
});
