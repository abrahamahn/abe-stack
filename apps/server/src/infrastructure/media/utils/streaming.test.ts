// apps/server/src/infrastructure/media/utils/__tests__/streaming.test.ts
import { createReadStream, createWriteStream, promises as fs } from 'fs';

import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { StreamingMediaProcessor, type StreamingOptions } from '../streaming';

// Mock fs promises
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    promises: {
      mkdir: vi.fn().mockResolvedValue(undefined),
      stat: vi.fn().mockResolvedValue({ size: 1024 * 1024 }), // 1MB default
    },
    createReadStream: vi.fn(),
    createWriteStream: vi.fn(),
  };
});

// Mock stream/promises
vi.mock('stream/promises', () => ({
  pipeline: vi.fn().mockResolvedValue(undefined),
}));

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    }),
  })),
}));

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => {
  const mockCommand = {
    videoCodec: vi.fn().mockReturnThis(),
    toFormat: vi.fn().mockReturnThis(),
    size: vi.fn().mockReturnThis(),
    videoBitrate: vi.fn().mockReturnThis(),
    setStartTime: vi.fn().mockReturnThis(),
    setDuration: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function (
      this: typeof mockCommand,
      event: string,
      callback: (err?: Error) => void,
    ) {
      if (event === 'end') {
        setTimeout(() => { callback(); }, 0);
      }
      return this;
    }),
    save: vi.fn().mockReturnThis(),
  };

  return {
    default: vi.fn(() => mockCommand),
    setFfmpegPath: vi.fn(),
  };
});

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/bin/ffmpeg',
}));

describe('StreamingMediaProcessor', () => {
  let processor: StreamingMediaProcessor;

  beforeEach(() => {
    processor = new StreamingMediaProcessor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default options when none provided', () => {
      const proc = new StreamingMediaProcessor();
      expect(proc).toBeDefined();
    });

    it('should accept custom options', () => {
      const options: StreamingOptions = {
        chunkSize: 128 * 1024,
        maxMemoryUsage: 100 * 1024 * 1024,
        tempDir: '/custom/temp',
      };
      const proc = new StreamingMediaProcessor(options);
      expect(proc).toBeDefined();
    });
  });

  describe('processLargeImage', () => {
    it('should process image without resize', async () => {
      const result = await processor.processLargeImage('/tmp/input.jpg', '/tmp/output.jpg', {});

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.jpg');
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should process image with resize', async () => {
      const result = await processor.processLargeImage('/tmp/input.jpg', '/tmp/output.jpg', {
        resize: { width: 800, height: 600 },
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.jpg');
    });

    it('should process image with JPEG format', async () => {
      const result = await processor.processLargeImage('/tmp/input.png', '/tmp/output.jpg', {
        format: 'jpeg',
        quality: 90,
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.jpg');
    });

    it('should process image with PNG format', async () => {
      const result = await processor.processLargeImage('/tmp/input.jpg', '/tmp/output.png', {
        format: 'png',
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.png');
    });

    it('should process image with WebP format', async () => {
      const result = await processor.processLargeImage('/tmp/input.jpg', '/tmp/output.webp', {
        format: 'webp',
        quality: 85,
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.webp');
    });

    it('should handle processing errors', async () => {
      const sharp = await import('sharp');
      const mockSharp = vi.mocked(sharp.default);
      mockSharp.mockImplementationOnce(() => {
        throw new Error('Sharp processing failed');
      });

      const result = await processor.processLargeImage('/tmp/input.jpg', '/tmp/output.jpg', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sharp processing failed');
    });

    it('should handle non-Error exceptions', async () => {
      const sharp = await import('sharp');
      const mockSharp = vi.mocked(sharp.default);
      mockSharp.mockImplementationOnce(() => {
        // Create a non-Error object to test handling of non-standard exceptions
        // At runtime this is not instanceof Error, testing the fallback error path
        const nonErrorException = Object.create(null) as Error;
        throw nonErrorException;
      });

      const result = await processor.processLargeImage('/tmp/input.jpg', '/tmp/output.jpg', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Streaming image processing failed');
    });
  });

  describe('processLargeVideo', () => {
    it('should process video with MP4 format', async () => {
      const result = await processor.processLargeVideo('/tmp/input.avi', '/tmp/output.mp4', {
        format: 'mp4',
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.mp4');
      expect(fs.mkdir).toHaveBeenCalled();
    });

    it('should process video with WebM format', async () => {
      const result = await processor.processLargeVideo('/tmp/input.mp4', '/tmp/output.webm', {
        format: 'webm',
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.webm');
    });

    it('should process video with resolution', async () => {
      const result = await processor.processLargeVideo('/tmp/input.mp4', '/tmp/output.mp4', {
        resolution: { width: 1280, height: 720 },
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.mp4');
    });

    it('should process video with bitrate', async () => {
      const result = await processor.processLargeVideo('/tmp/input.mp4', '/tmp/output.mp4', {
        bitrate: '2000k',
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.mp4');
    });

    it('should process video with time segment', async () => {
      const result = await processor.processLargeVideo('/tmp/input.mp4', '/tmp/output.mp4', {
        startTime: 10,
        duration: 30,
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.mp4');
    });

    it('should handle video processing errors', async () => {
      const ffmpeg = await import('fluent-ffmpeg');
      const mockFfmpeg = vi.mocked(ffmpeg.default);
      mockFfmpeg.mockReturnValueOnce({
        videoCodec: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        size: vi.fn().mockReturnThis(),
        videoBitrate: vi.fn().mockReturnThis(),
        setStartTime: vi.fn().mockReturnThis(),
        setDuration: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: ReturnType<typeof mockFfmpeg>,
          event: string,
          callback: (err?: Error) => void,
        ) {
          if (event === 'error') {
            setTimeout(() => { callback(new Error('FFmpeg failed')); }, 0);
          }
          return this;
        }),
        save: vi.fn().mockReturnThis(),
      } as ReturnType<typeof mockFfmpeg>);

      const result = await processor.processLargeVideo('/tmp/input.mp4', '/tmp/output.mp4', {
        format: 'mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg failed');
    });

    it('should handle video processing errors without message', async () => {
      const ffmpeg = await import('fluent-ffmpeg');
      const mockFfmpeg = vi.mocked(ffmpeg.default);
      mockFfmpeg.mockReturnValueOnce({
        videoCodec: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        size: vi.fn().mockReturnThis(),
        videoBitrate: vi.fn().mockReturnThis(),
        setStartTime: vi.fn().mockReturnThis(),
        setDuration: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation(function (
          this: ReturnType<typeof mockFfmpeg>,
          event: string,
          callback: (err?: Error) => void,
        ) {
          if (event === 'error') {
            setTimeout(() => { callback(); }, 0);
          }
          return this;
        }),
        save: vi.fn().mockReturnThis(),
      } as ReturnType<typeof mockFfmpeg>);

      const result = await processor.processLargeVideo('/tmp/input.mp4', '/tmp/output.mp4', {
        format: 'mp4',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Streaming video processing failed');
    });

    it('should handle exceptions during video processing', async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('Mkdir failed'));

      const result = await processor.processLargeVideo('/tmp/input.mp4', '/tmp/output.mp4', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Mkdir failed');
    });
  });

  describe('streamFileCopy', () => {
    let mockReadStream: {
      on: Mock;
      pipe: Mock;
    };
    let mockWriteStream: object;

    beforeEach(() => {
      mockReadStream = {
        on: vi.fn().mockReturnThis(),
        pipe: vi.fn().mockReturnThis(),
      };
      mockWriteStream = {};

      vi.mocked(createReadStream).mockReturnValue(
        mockReadStream as unknown as ReturnType<typeof createReadStream>,
      );
      vi.mocked(createWriteStream).mockReturnValue(
        mockWriteStream as unknown as ReturnType<typeof createWriteStream>,
      );
      vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as Awaited<ReturnType<typeof fs.stat>>);
    });

    it('should copy file successfully', async () => {
      const result = await processor.streamFileCopy('/tmp/source.bin', '/tmp/dest.bin');

      expect(result.success).toBe(true);
      expect(fs.mkdir).toHaveBeenCalled();
      expect(createReadStream).toHaveBeenCalledWith('/tmp/source.bin', expect.any(Object));
      expect(createWriteStream).toHaveBeenCalledWith('/tmp/dest.bin');
    });

    it('should report progress during copy', async () => {
      const onProgress = vi.fn();

      // Simulate data events
      mockReadStream.on.mockImplementation((event: string, callback: (chunk: Buffer) => void) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(Buffer.alloc(512));
            callback(Buffer.alloc(512));
          }, 0);
        }
        return mockReadStream;
      });

      const result = await processor.streamFileCopy('/tmp/source.bin', '/tmp/dest.bin', onProgress);

      expect(result.success).toBe(true);
    });

    it('should handle copy errors', async () => {
      const { pipeline } = await import('stream/promises');
      vi.mocked(pipeline).mockRejectedValueOnce(new Error('Copy failed'));

      const result = await processor.streamFileCopy('/tmp/source.bin', '/tmp/dest.bin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Copy failed');
      expect(result.bytesCopied).toBe(0);
    });

    it('should handle non-Error exceptions', async () => {
      const { pipeline } = await import('stream/promises');
      vi.mocked(pipeline).mockRejectedValueOnce('Unknown error');

      const result = await processor.streamFileCopy('/tmp/source.bin', '/tmp/dest.bin');

      expect(result.success).toBe(false);
      expect(result.error).toBe('File streaming failed');
    });
  });

  describe('shouldUseStreaming', () => {
    it('should return true for files larger than 10MB', () => {
      const largeFileSize = 15 * 1024 * 1024; // 15MB
      expect(processor.shouldUseStreaming(largeFileSize)).toBe(true);
    });

    it('should return false for files smaller than 10MB', () => {
      const smallFileSize = 5 * 1024 * 1024; // 5MB
      expect(processor.shouldUseStreaming(smallFileSize)).toBe(false);
    });

    it('should return false for exactly 10MB files', () => {
      const exactSize = 10 * 1024 * 1024; // 10MB
      expect(processor.shouldUseStreaming(exactSize)).toBe(false);
    });

    it('should return true for files just over 10MB', () => {
      const justOverSize = 10 * 1024 * 1024 + 1; // 10MB + 1 byte
      expect(processor.shouldUseStreaming(justOverSize)).toBe(true);
    });
  });

  describe('getFileSize', () => {
    it('should return file size', async () => {
      vi.mocked(fs.stat).mockResolvedValueOnce({
        size: 5 * 1024 * 1024,
      } as Awaited<ReturnType<typeof fs.stat>>);

      const size = await processor.getFileSize('/tmp/test.bin');

      expect(size).toBe(5 * 1024 * 1024);
      expect(fs.stat).toHaveBeenCalledWith('/tmp/test.bin');
    });
  });

  describe('cleanupTempFiles', () => {
    it('should ensure temp directory exists', async () => {
      await processor.cleanupTempFiles();

      expect(fs.mkdir).toHaveBeenCalledWith('/tmp/media-streaming', { recursive: true });
    });

    it('should use custom temp directory', async () => {
      const customProcessor = new StreamingMediaProcessor({ tempDir: '/custom/temp' });
      await customProcessor.cleanupTempFiles();

      expect(fs.mkdir).toHaveBeenCalledWith('/custom/temp', { recursive: true });
    });

    it('should ignore cleanup errors', async () => {
      vi.mocked(fs.mkdir).mockRejectedValueOnce(new Error('Permission denied'));

      // Should not throw
      await expect(processor.cleanupTempFiles()).resolves.toBeUndefined();
    });

    it('should accept pattern parameter (unused)', async () => {
      await processor.cleanupTempFiles('*.tmp');

      expect(fs.mkdir).toHaveBeenCalled();
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage stats', () => {
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 50 * 1024 * 1024, // 50MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const usage = processor.getMemoryUsage();

      expect(usage.used).toBe(50 * 1024 * 1024);
      expect(usage.total).toBe(100 * 1024 * 1024);
      expect(usage.percentage).toBe(50);

      mockMemoryUsage.mockRestore();
    });

    it('should calculate percentage correctly', () => {
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 75 * 1024 * 1024, // 75MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const usage = processor.getMemoryUsage();

      expect(usage.percentage).toBe(75);

      mockMemoryUsage.mockRestore();
    });
  });

  describe('isMemoryUsageSafe', () => {
    it('should return true when memory usage is under 80%', () => {
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 70 * 1024 * 1024, // 70MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      expect(processor.isMemoryUsageSafe()).toBe(true);

      mockMemoryUsage.mockRestore();
    });

    it('should return false when memory usage is at 80%', () => {
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 80 * 1024 * 1024, // 80MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      expect(processor.isMemoryUsageSafe()).toBe(false);

      mockMemoryUsage.mockRestore();
    });

    it('should return false when memory usage is over 80%', () => {
      const mockMemoryUsage = vi.spyOn(process, 'memoryUsage').mockReturnValue({
        heapUsed: 90 * 1024 * 1024, // 90MB
        heapTotal: 100 * 1024 * 1024, // 100MB
        rss: 150 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      expect(processor.isMemoryUsageSafe()).toBe(false);

      mockMemoryUsage.mockRestore();
    });
  });
});
