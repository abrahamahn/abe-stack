// apps/server/src/infrastructure/media/processors/video.test.ts
import ffmpeg from 'fluent-ffmpeg';
import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';

import { VideoProcessor, type VideoProcessingOptions } from './video';

interface FfprobeCallback {
  (err: Error | null, data: FfprobeData | null): void;
}

interface FfprobeData {
  format: {
    duration?: number;
    bit_rate?: string;
  };
  streams: Array<{
    codec_type: string;
    codec_name?: string;
    width?: number;
    height?: number;
    channels?: number;
    sample_rate?: string;
  }>;
}

const mockFfprobe = vi.hoisted(() => vi.fn());

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => {
  const defaultExport = vi.fn(() => ({
    videoCodec: vi.fn().mockReturnThis(),
    toFormat: vi.fn().mockReturnThis(),
    size: vi.fn().mockReturnThis(),
    videoBitrate: vi.fn().mockReturnThis(),
    noVideo: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    addOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    complexFilter: vi.fn().mockReturnThis(),
    screenshots: vi.fn().mockReturnThis(),
    setStartTime: vi.fn().mockReturnThis(),
    setDuration: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    save: vi.fn().mockReturnThis(),
    run: vi.fn().mockReturnThis(),
  })) as unknown as typeof ffmpeg & { ffprobe: typeof mockFfprobe };
  defaultExport.ffprobe = mockFfprobe;

  return {
    default: defaultExport,
    ffprobe: mockFfprobe,
    setFfmpegPath: vi.fn(),
  };
});

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/bin/ffmpeg',
}));

describe('VideoProcessor', () => {
  let processor: VideoProcessor;
  let mockFfmpeg: Mock;

  beforeEach(() => {
    processor = new VideoProcessor();
    mockFfmpeg = vi.mocked(ffmpeg);

    // Setup default mocks
    mockFfmpeg.mockReturnValue({
      videoCodec: vi.fn().mockReturnThis(),
      toFormat: vi.fn().mockReturnThis(),
      size: vi.fn().mockReturnThis(),
      videoBitrate: vi.fn().mockReturnThis(),
      noVideo: vi.fn().mockReturnThis(),
      audioCodec: vi.fn().mockReturnThis(),
      addOptions: vi.fn().mockReturnThis(),
      output: vi.fn().mockReturnThis(),
      complexFilter: vi.fn().mockReturnThis(),
      screenshots: vi.fn().mockReturnThis(),
      setStartTime: vi.fn().mockReturnThis(),
      setDuration: vi.fn().mockReturnThis(),
      on: vi.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'end') {
          setTimeout(callback, 0); // Simulate async success
        }
        return mockFfmpeg.mock.results[0]?.value;
      }),
      save: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnThis(),
    });

    mockFfprobe.mockImplementation((_inputPath: string, callback: FfprobeCallback) => {
      callback(null, {
        format: {
          duration: 120.5,
          bit_rate: '2500000',
        },
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
          },
          {
            codec_type: 'audio',
            codec_name: 'aac',
            channels: 2,
            sample_rate: '44100',
          },
        ],
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('process', () => {
    it('should process video with MP4 format', async () => {
      const inputPath = '/tmp/input.avi';
      const outputPath = '/tmp/output.mp4';
      const options: VideoProcessingOptions = {
        format: 'mp4',
        resolution: { width: 1280, height: 720 },
        bitrate: '2000k',
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.metadata?.width).toBe(1920);
      expect(result.metadata?.height).toBe(1080);
    });

    it('should process video with WebM format', async () => {
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/output.webm';
      const options: VideoProcessingOptions = {
        format: 'webm',
        bitrate: '1500k',
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should generate thumbnail when specified', async () => {
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/output.mp4';
      const options: VideoProcessingOptions = {
        format: 'mp4',
        thumbnail: {
          time: 5,
          size: 300,
        },
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.thumbnailPath).toBe('/tmp/output_thumb.jpg');
    });

    it('should handle processing errors', async () => {
      mockFfmpeg.mockReturnValue({
        videoCodec: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, callback: (err: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => { callback(new Error('FFmpeg failed')); }, 0);
          }
          return mockFfmpeg.mock.results[0]?.value;
        }),
        save: vi.fn().mockReturnThis(),
      });

      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/output.mp4';
      const options: VideoProcessingOptions = { format: 'mp4' };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg failed');
    });
  });

  describe('getMetadata', () => {
    it('should extract comprehensive metadata from video', async () => {
      const inputPath = '/tmp/test.mp4';

      const metadata = await processor.getMetadata(inputPath);

      expect(metadata).toEqual({
        duration: 120.5,
        width: 1920,
        height: 1080,
        bitrate: 2500000,
        codec: 'h264',
        format: undefined,
        channels: 2,
        sampleRate: 44100,
      });
    });

    it('should handle metadata extraction errors', async () => {
      mockFfprobe.mockImplementation((_inputPath: string, callback: FfprobeCallback) => {
        callback(new Error('Metadata extraction failed'), null);
      });

      const inputPath = '/tmp/test.mp4';

      const metadata = await processor.getMetadata(inputPath);

      expect(metadata).toEqual({});
    });
  });

  describe('generateVariants', () => {
    it('should generate multiple video variants', async () => {
      const inputPath = '/tmp/input.avi';
      const baseOutputPath = '/tmp/output';

      const result = await processor.generateVariants(inputPath, baseOutputPath);

      expect(result.original.success).toBe(true);
      expect(result.compressed.success).toBe(true);
      expect(result.optimized.success).toBe(true);

      expect(result.original.outputPath).toContain('_original.mp4');
      expect(result.compressed.outputPath).toContain('_compressed.mp4');
      expect(result.optimized.outputPath).toContain('_optimized.mp4');
      expect(result.compressed.thumbnailPath).toContain('_thumb.jpg');
      expect(result.optimized.thumbnailPath).toContain('_thumb.jpg');
    });
  });

  describe('extractAudio', () => {
    it('should extract audio from video', async () => {
      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/audio.mp3';

      const result = await processor.extractAudio(inputPath, outputPath, 'mp3');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should handle audio extraction errors', async () => {
      mockFfmpeg.mockReturnValue({
        noVideo: vi.fn().mockReturnThis(),
        audioCodec: vi.fn().mockReturnThis(),
        toFormat: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, callback: (err: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => { callback(new Error('Audio extraction failed')); }, 0);
          }
          return mockFfmpeg.mock.results[0]?.value;
        }),
        save: vi.fn().mockReturnThis(),
      });

      const inputPath = '/tmp/input.mp4';
      const outputPath = '/tmp/audio.mp3';

      const result = await processor.extractAudio(inputPath, outputPath);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Audio extraction failed');
    });
  });

  describe('createHLSStream', () => {
    it('should create HLS streaming segments', async () => {
      const inputPath = '/tmp/input.mp4';
      const outputDir = '/tmp/hls/';
      const baseName = 'stream';

      const result = await processor.createHLSStream(inputPath, outputDir, baseName);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/hls/stream.m3u8');
    });

    it('should handle HLS creation errors', async () => {
      mockFfmpeg.mockReturnValue({
        addOptions: vi.fn().mockReturnThis(),
        output: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, callback: (err: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => { callback(new Error('HLS creation failed')); }, 0);
          }
          return mockFfmpeg.mock.results[0]?.value;
        }),
        run: vi.fn().mockReturnThis(),
      });

      const inputPath = '/tmp/input.mp4';
      const outputDir = '/tmp/hls/';
      const baseName = 'stream';

      const result = await processor.createHLSStream(inputPath, outputDir, baseName);

      expect(result.success).toBe(false);
      expect(result.error).toBe('HLS creation failed');
    });
  });

  describe('getDuration', () => {
    it('should get video duration', async () => {
      const inputPath = '/tmp/test.mp4';

      const duration = await processor.getDuration(inputPath);

      expect(duration).toBe(120.5);
    });

    it('should return null on duration extraction error', async () => {
      mockFfprobe.mockImplementation((_inputPath: string, callback: FfprobeCallback) => {
        callback(new Error('Duration extraction failed'), null);
      });

      const inputPath = '/tmp/test.mp4';

      const duration = await processor.getDuration(inputPath);

      expect(duration).toBe(null);
    });
  });
});
