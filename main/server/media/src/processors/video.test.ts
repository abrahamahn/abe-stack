// main/server/media/src/processors/video.test.ts
/**
 * Tests for VideoProcessor
 *
 * Mocks the internal ffmpeg-wrapper module instead of the
 * removed fluent-ffmpeg/ffmpeg-static external deps.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { VideoProcessor } from './video';

// Mock internal ffmpeg-wrapper
vi.mock('../ffmpeg-wrapper', () => ({
  runFFmpeg: vi.fn().mockResolvedValue({ success: true, output: '' }),
  convertVideo: vi.fn().mockResolvedValue({ success: true, output: '' }),
  extractAudio: vi.fn().mockResolvedValue({ success: true, output: '' }),
  createHLSStream: vi.fn().mockResolvedValue({ success: true, output: '' }),
  getMediaMetadata: vi.fn().mockResolvedValue({
    duration: 120.5,
    hasVideo: true,
    hasAudio: true,
    width: 1920,
    height: 1080,
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
      const { convertVideo } = await import('../ffmpeg-wrapper');

      const result = await processor.process('/input/video.avi', '/output/video.mp4', {
        format: 'mp4',
      });

      expect(result.success).toBe(true);
      expect(convertVideo).toHaveBeenCalledWith('/input/video.avi', '/output/video.mp4', {
        format: 'mp4',
        videoCodec: 'libx264',
        videoBitrate: undefined,
        resolution: undefined,
      });
    });

    it('should process with webm format', async () => {
      const { convertVideo } = await import('../ffmpeg-wrapper');

      const result = await processor.process('/input/video.mp4', '/output/video.webm', {
        format: 'webm',
      });

      expect(result.success).toBe(true);
      expect(convertVideo).toHaveBeenCalledWith('/input/video.mp4', '/output/video.webm', {
        format: 'webm',
        videoCodec: 'libvpx-vp9',
        videoBitrate: undefined,
        resolution: undefined,
      });
    });

    it('should apply resolution and bitrate options', async () => {
      const { convertVideo } = await import('../ffmpeg-wrapper');

      await processor.process('/input/video.mp4', '/output/video.mp4', {
        format: 'mp4',
        resolution: { width: 1280, height: 720 },
        bitrate: '3000k',
      });

      expect(convertVideo).toHaveBeenCalledWith('/input/video.mp4', '/output/video.mp4', {
        format: 'mp4',
        videoCodec: 'libx264',
        videoBitrate: '3000k',
        resolution: { width: 1280, height: 720 },
      });
    });

    it('should set thumbnail path when thumbnail option is provided', async () => {
      const result = await processor.process('/input/video.mp4', '/output/video.mp4', {
        thumbnail: { time: 5, size: 300 },
      });

      expect(result.success).toBe(true);
      expect(result.thumbnailPath).toBe('/output/video_thumb.jpg');
    });

    it('should return error result on processing failure', async () => {
      const { convertVideo } = await import('../ffmpeg-wrapper');
      vi.mocked(convertVideo).mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'FFmpeg error',
      });

      const result = await processor.process('/input/video.mp4', '/output/video.mp4');

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg error');
    });
  });

  describe('getMetadata', () => {
    it('should extract video metadata via getMediaMetadata', async () => {
      const metadata = await processor.getMetadata('/input/video.mp4');

      expect(metadata.duration).toBe(120.5);
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
    });

    it('should return empty metadata on error', async () => {
      const { getMediaMetadata } = await import('../ffmpeg-wrapper');
      vi.mocked(getMediaMetadata).mockRejectedValueOnce(new Error('Probe failed'));

      const metadata = await processor.getMetadata('/input/video.mp4');

      expect(metadata).toEqual({});
    });
  });

  describe('getDuration', () => {
    it('should return duration from getMediaMetadata', async () => {
      const duration = await processor.getDuration('/input/video.mp4');

      expect(duration).toBe(120.5);
    });

    it('should return null on error', async () => {
      const { getMediaMetadata } = await import('../ffmpeg-wrapper');
      vi.mocked(getMediaMetadata).mockRejectedValueOnce(new Error('Probe failed'));

      const duration = await processor.getDuration('/input/video.mp4');

      expect(duration).toBeNull();
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

  describe('extractAudioTrack', () => {
    it('should extract audio as mp3 by default', async () => {
      const { extractAudio } = await import('../ffmpeg-wrapper');

      const result = await processor.extractAudioTrack('/input/video.mp4', '/output/audio.mp3');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/audio.mp3');
      expect(extractAudio).toHaveBeenCalledWith('/input/video.mp4', '/output/audio.mp3', 'mp3');
    });

    it('should extract audio as aac', async () => {
      const { extractAudio } = await import('../ffmpeg-wrapper');

      await processor.extractAudioTrack('/input/video.mp4', '/output/audio.aac', 'aac');

      expect(extractAudio).toHaveBeenCalledWith('/input/video.mp4', '/output/audio.aac', 'aac');
    });

    it('should extract audio as wav', async () => {
      const { extractAudio } = await import('../ffmpeg-wrapper');

      await processor.extractAudioTrack('/input/video.mp4', '/output/audio.wav', 'wav');

      expect(extractAudio).toHaveBeenCalledWith('/input/video.mp4', '/output/audio.wav', 'wav');
    });

    it('should return error on extraction failure', async () => {
      const { extractAudio } = await import('../ffmpeg-wrapper');
      vi.mocked(extractAudio).mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'Extract failed',
      });

      const result = await processor.extractAudioTrack('/input/video.mp4', '/output/audio.mp3');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Extract failed');
    });
  });

  describe('createHLS', () => {
    it('should create HLS stream', async () => {
      const { createHLSStream } = await import('../ffmpeg-wrapper');

      const result = await processor.createHLS('/input/video.mp4', '/output', 'stream');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/stream.m3u8');
      expect(createHLSStream).toHaveBeenCalledWith('/input/video.mp4', '/output', 'stream');
    });

    it('should return error on HLS creation failure', async () => {
      const { createHLSStream } = await import('../ffmpeg-wrapper');
      vi.mocked(createHLSStream).mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'HLS failed',
      });

      const result = await processor.createHLS('/input/video.mp4', '/output', 'stream');

      expect(result.success).toBe(false);
      expect(result.error).toBe('HLS failed');
    });
  });
});
