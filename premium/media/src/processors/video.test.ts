// premium/media/src/processors/video.test.ts
/**
 * Tests for VideoProcessor
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { VideoProcessor } from './video';

// Mock fluent-ffmpeg and ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/bin/ffmpeg',
}));

const mockFfmpegCommand = {
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
  run: vi.fn().mockReturnThis(),
};

const mockFfprobeData = {
  format: {
    duration: 120.5,
    bit_rate: '5000000',
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
};

vi.mock('fluent-ffmpeg', () => ({
  default: vi.fn().mockReturnValue(mockFfmpegCommand),
  setFfmpegPath: vi.fn(),
  ffprobe: vi.fn((_input: string, callback: (err: Error | null, data: unknown) => void) => {
    callback(null, mockFfprobeData);
  }),
}));

describe('VideoProcessor', () => {
  let processor: VideoProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new VideoProcessor();
  });

  describe('process', () => {
    it('should process a video file successfully', async () => {
      const result = await processor.process('/input/video.mp4', '/output/video.mp4');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/video.mp4');
      expect(result.metadata).toBeDefined();
    });

    it('should process with mp4 format', async () => {
      const result = await processor.process('/input/video.avi', '/output/video.mp4', {
        format: 'mp4',
      });

      expect(result.success).toBe(true);
      expect(mockFfmpegCommand.videoCodec).toHaveBeenCalledWith('libx264');
      expect(mockFfmpegCommand.toFormat).toHaveBeenCalledWith('mp4');
    });

    it('should process with webm format', async () => {
      const result = await processor.process('/input/video.mp4', '/output/video.webm', {
        format: 'webm',
      });

      expect(result.success).toBe(true);
      expect(mockFfmpegCommand.videoCodec).toHaveBeenCalledWith('libvpx-vp9');
      expect(mockFfmpegCommand.toFormat).toHaveBeenCalledWith('webm');
    });

    it('should apply resolution option', async () => {
      await processor.process('/input/video.mp4', '/output/video.mp4', {
        resolution: { width: 1280, height: 720 },
      });

      expect(mockFfmpegCommand.size).toHaveBeenCalledWith('1280x720');
    });

    it('should apply bitrate option', async () => {
      await processor.process('/input/video.mp4', '/output/video.mp4', {
        bitrate: '3000k',
      });

      expect(mockFfmpegCommand.videoBitrate).toHaveBeenCalledWith('3000k');
    });

    it('should set thumbnail path when thumbnail option is provided', async () => {
      const result = await processor.process('/input/video.mp4', '/output/video.mp4', {
        thumbnail: { time: 5, size: 300 },
      });

      expect(result.success).toBe(true);
      expect(result.thumbnailPath).toBe('/output/video_thumb.jpg');
    });

    it('should return error result on processing failure', async () => {
      // The code chains: command.on('end', resolve).on('error', reject).save(path)
      // We need the error callback to fire instead of end
      const callbacks: Record<string, (err?: Error) => void> = {};
      mockFfmpegCommand.on.mockImplementation(function (
        this: typeof mockFfmpegCommand,
        event: string,
        callback: (err?: Error) => void,
      ) {
        callbacks[event] = callback;
        return this;
      });
      mockFfmpegCommand.save.mockImplementation(function (this: typeof mockFfmpegCommand) {
        setTimeout(() => callbacks['error']?.(new Error('FFmpeg error')), 0);
        return this;
      });

      const result = await processor.process('/input/video.mp4', '/output/video.mp4');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();

      // Restore default mocks
      mockFfmpegCommand.on.mockImplementation(function (
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
      });
      mockFfmpegCommand.save.mockReturnThis();
    });
  });

  describe('getMetadata', () => {
    it('should extract video metadata', async () => {
      const metadata = await processor.getMetadata('/input/video.mp4');

      expect(metadata.duration).toBe(120.5);
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.bitrate).toBe(5000000);
      expect(metadata.codec).toBe('h264');
      expect(metadata.channels).toBe(2);
      expect(metadata.sampleRate).toBe(44100);
    });

    it('should return empty metadata on ffprobe error', async () => {
      const fluentFfmpeg = await import('fluent-ffmpeg');
      vi.mocked(fluentFfmpeg.ffprobe).mockImplementationOnce(
        (_input: string, callback: (err: Error | null, data: unknown) => void) => {
          callback(new Error('Probe failed'), {});
        },
      );

      const metadata = await processor.getMetadata('/input/video.mp4');

      expect(metadata).toEqual({});
    });
  });

  describe('getDuration', () => {
    it('should return duration from ffprobe', async () => {
      const duration = await processor.getDuration('/input/video.mp4');

      expect(duration).toBe(120.5);
    });
  });

  describe('generateVariants', () => {
    it('should generate three variants', async () => {
      const result = await processor.generateVariants('/input/video.mp4', '/output/video');

      expect(result.original.success).toBe(true);
      expect(result.compressed.success).toBe(true);
      expect(result.optimized.success).toBe(true);
    });
  });

  describe('extractAudio', () => {
    it('should extract audio as mp3 by default', async () => {
      const result = await processor.extractAudio('/input/video.mp4', '/output/audio.mp3');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/audio.mp3');
      expect(mockFfmpegCommand.noVideo).toHaveBeenCalled();
      expect(mockFfmpegCommand.audioCodec).toHaveBeenCalledWith('libmp3lame');
    });

    it('should extract audio as aac', async () => {
      await processor.extractAudio('/input/video.mp4', '/output/audio.aac', 'aac');

      expect(mockFfmpegCommand.audioCodec).toHaveBeenCalledWith('aac');
    });

    it('should extract audio as wav', async () => {
      await processor.extractAudio('/input/video.mp4', '/output/audio.wav', 'wav');

      expect(mockFfmpegCommand.audioCodec).toHaveBeenCalledWith('pcm_s16le');
    });
  });

  describe('createHLSStream', () => {
    it('should create HLS stream', async () => {
      const result = await processor.createHLSStream('/input/video.mp4', '/output', 'stream');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/stream.m3u8');
    });
  });
});
