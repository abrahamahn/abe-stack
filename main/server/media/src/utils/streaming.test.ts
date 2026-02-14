// main/server/media/src/utils/streaming.test.ts
/**
 * Tests for StreamingMediaProcessor
 *
 * Mocks the internal ffmpeg-wrapper (not fluent-ffmpeg) and sharp.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { StreamingMediaProcessor } from './streaming';

// Mock sharp (still an external dep)
const mockSharpPipeline = {
  resize: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  toFile: vi.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg' }),
};

vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue(mockSharpPipeline),
}));

// Mock internal ffmpeg-wrapper
vi.mock('../ffmpeg-wrapper', () => ({
  runFFmpeg: vi.fn().mockResolvedValue({ success: true, output: '' }),
}));

// Mock fs
vi.mock('fs', async () => {
  const actualFs = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actualFs,
    createReadStream: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      pipe: vi.fn().mockReturnThis(),
    }),
    createWriteStream: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
    }),
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({ size: 1024 * 1024, isFile: () => true, mtimeMs: 0 }),
      readdir: vi.fn().mockResolvedValue([]),
      unlink: vi.fn().mockResolvedValue(undefined),
    },
  };
});

// Mock stream/promises
vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

describe('StreamingMediaProcessor', () => {
  let processor: StreamingMediaProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new StreamingMediaProcessor({
      chunkSize: 64 * 1024,
      maxMemoryUsage: 50 * 1024 * 1024,
      tempDir: '/tmp/test-streaming',
    });
  });

  describe('processLargeImage', () => {
    it('should process a large image successfully', async () => {
      const result = await processor.processLargeImage('/input/large.jpg', '/output/large.jpg', {});

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/large.jpg');
    });

    it('should apply resize operations', async () => {
      await processor.processLargeImage('/input/large.jpg', '/output/large.jpg', {
        resize: { width: 800, height: 600 },
      });

      expect(mockSharpPipeline.resize).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        fit: 'inside',
        withoutEnlargement: true,
      });
    });

    it('should apply jpeg format with quality', async () => {
      await processor.processLargeImage('/input/large.png', '/output/large.jpg', {
        format: 'jpeg',
        quality: 90,
      });

      expect(mockSharpPipeline.jpeg).toHaveBeenCalledWith({
        quality: 90,
        progressive: true,
      });
    });

    it('should apply png format', async () => {
      await processor.processLargeImage('/input/large.jpg', '/output/large.png', {
        format: 'png',
      });

      expect(mockSharpPipeline.png).toHaveBeenCalledWith({
        compressionLevel: 6,
      });
    });

    it('should apply webp format', async () => {
      await processor.processLargeImage('/input/large.jpg', '/output/large.webp', {
        format: 'webp',
        quality: 85,
      });

      expect(mockSharpPipeline.webp).toHaveBeenCalledWith({
        quality: 85,
      });
    });

    it('should return error on failure', async () => {
      mockSharpPipeline.toFile.mockRejectedValueOnce(new Error('Sharp failed'));

      const result = await processor.processLargeImage('/input/large.jpg', '/output/large.jpg', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sharp failed');
    });
  });

  describe('processLargeVideo', () => {
    it('should process a large video successfully', async () => {
      const result = await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {});

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/large.mp4');
    });

    it('should apply mp4 format via runFFmpeg', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');

      await processor.processLargeVideo('/input/large.avi', '/output/large.mp4', {
        format: 'mp4',
      });

      expect(runFFmpeg).toHaveBeenCalledWith(
        expect.objectContaining({
          input: '/input/large.avi',
          output: '/output/large.mp4',
          videoCodec: 'libx264',
          format: 'mp4',
        }),
      );
    });

    it('should apply webm format via runFFmpeg', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');

      await processor.processLargeVideo('/input/large.mp4', '/output/large.webm', {
        format: 'webm',
      });

      expect(runFFmpeg).toHaveBeenCalledWith(
        expect.objectContaining({
          videoCodec: 'libvpx-vp9',
          format: 'webm',
        }),
      );
    });

    it('should apply resolution', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');

      await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {
        resolution: { width: 1280, height: 720 },
      });

      expect(runFFmpeg).toHaveBeenCalledWith(
        expect.objectContaining({
          resolution: { width: 1280, height: 720 },
        }),
      );
    });

    it('should apply bitrate', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');

      await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {
        bitrate: '5000k',
      });

      expect(runFFmpeg).toHaveBeenCalledWith(
        expect.objectContaining({
          videoBitrate: '5000k',
        }),
      );
    });

    it('should apply time segment', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');

      await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {
        startTime: 10,
        duration: 30,
      });

      expect(runFFmpeg).toHaveBeenCalledWith(
        expect.objectContaining({
          startTime: 10,
          duration: 30,
        }),
      );
    });

    it('should return error on failure', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');
      vi.mocked(runFFmpeg).mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'FFmpeg error',
      });

      const result = await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {
        format: 'mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg error');
    });
  });

  describe('shouldUseStreaming', () => {
    it('should return true for files larger than 10MB', () => {
      expect(processor.shouldUseStreaming(11 * 1024 * 1024)).toBe(true);
    });

    it('should return false for small files', () => {
      expect(processor.shouldUseStreaming(5 * 1024 * 1024)).toBe(false);
    });

    it('should return false for exactly 10MB', () => {
      expect(processor.shouldUseStreaming(10 * 1024 * 1024)).toBe(false);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage stats', () => {
      const usage = processor.getMemoryUsage();

      expect(usage.used).toBeGreaterThan(0);
      expect(usage.total).toBeGreaterThan(0);
      expect(usage.percentage).toBeGreaterThan(0);
      expect(usage.percentage).toBeLessThanOrEqual(100);
    });
  });

  describe('isMemoryUsageSafe', () => {
    it('should return a boolean', () => {
      const safe = processor.isMemoryUsageSafe();

      expect(typeof safe).toBe('boolean');
    });
  });

  describe('cleanupTempFiles', () => {
    it('should not throw on cleanup', async () => {
      await expect(processor.cleanupTempFiles()).resolves.not.toThrow();
    });

    it('should delete old temp files', async () => {
      const fsModule = await import('fs');
      const oldMtimeMs = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago

      vi.mocked(fsModule.promises.readdir).mockResolvedValueOnce([
        'old-file.tmp',
      ] as unknown as Awaited<ReturnType<typeof fsModule.promises.readdir>>);
      vi.mocked(fsModule.promises.stat).mockResolvedValueOnce({
        size: 1024,
        isFile: () => true,
        mtimeMs: oldMtimeMs,
      } as Awaited<ReturnType<typeof fsModule.promises.stat>>);

      await processor.cleanupTempFiles();

      expect(fsModule.promises.unlink).toHaveBeenCalledWith('/tmp/test-streaming/old-file.tmp');
    });

    it('should not delete recent temp files', async () => {
      const fsModule = await import('fs');
      const recentMtimeMs = Date.now() - 1000; // 1 second ago

      vi.mocked(fsModule.promises.readdir).mockResolvedValueOnce([
        'recent-file.tmp',
      ] as unknown as Awaited<ReturnType<typeof fsModule.promises.readdir>>);
      vi.mocked(fsModule.promises.stat).mockResolvedValueOnce({
        size: 1024,
        isFile: () => true,
        mtimeMs: recentMtimeMs,
      } as Awaited<ReturnType<typeof fsModule.promises.stat>>);

      await processor.cleanupTempFiles();

      expect(fsModule.promises.unlink).not.toHaveBeenCalled();
    });
  });
});
