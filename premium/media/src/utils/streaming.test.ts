// premium/media/src/utils/streaming.test.ts
/**
 * Tests for StreamingMediaProcessor
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { StreamingMediaProcessor } from './streaming';

// Mock sharp
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

// Mock ffmpeg
vi.mock('ffmpeg-static', () => ({
  default: '/usr/bin/ffmpeg',
}));

const mockFfmpegCommand = {
  videoCodec: vi.fn().mockReturnThis(),
  toFormat: vi.fn().mockReturnThis(),
  size: vi.fn().mockReturnThis(),
  videoBitrate: vi.fn().mockReturnThis(),
  setStartTime: vi.fn().mockReturnThis(),
  setDuration: vi.fn().mockReturnThis(),
  on: vi.fn().mockImplementation(function (
    this: typeof mockFfmpegCommand,
    event: string,
    callback: (err?: Error) => void,
  ) {
    if (event === 'end') {
      setTimeout(() => {
        callback();
      }, 0);
    }
    return this;
  }),
  save: vi.fn().mockReturnThis(),
};

vi.mock('fluent-ffmpeg', () => ({
  default: vi.fn().mockReturnValue(mockFfmpegCommand),
  setFfmpegPath: vi.fn(),
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
      stat: vi.fn().mockResolvedValue({ size: 1024 * 1024 }),
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

    it('should apply mp4 format', async () => {
      await processor.processLargeVideo('/input/large.avi', '/output/large.mp4', {
        format: 'mp4',
      });

      expect(mockFfmpegCommand.videoCodec).toHaveBeenCalledWith('libx264');
      expect(mockFfmpegCommand.toFormat).toHaveBeenCalledWith('mp4');
    });

    it('should apply webm format', async () => {
      await processor.processLargeVideo('/input/large.mp4', '/output/large.webm', {
        format: 'webm',
      });

      expect(mockFfmpegCommand.videoCodec).toHaveBeenCalledWith('libvpx-vp9');
    });

    it('should apply resolution', async () => {
      await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {
        resolution: { width: 1280, height: 720 },
      });

      expect(mockFfmpegCommand.size).toHaveBeenCalledWith('1280x720');
    });

    it('should apply bitrate', async () => {
      await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {
        bitrate: '5000k',
      });

      expect(mockFfmpegCommand.videoBitrate).toHaveBeenCalledWith('5000k');
    });

    it('should apply time segment', async () => {
      await processor.processLargeVideo('/input/large.mp4', '/output/large.mp4', {
        startTime: 10,
        duration: 30,
      });

      expect(mockFfmpegCommand.setStartTime).toHaveBeenCalledWith(10);
      expect(mockFfmpegCommand.setDuration).toHaveBeenCalledWith(30);
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
  });
});
