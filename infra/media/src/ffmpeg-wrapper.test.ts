// infra/media/src/ffmpeg-wrapper.test.ts
import { describe, expect, it, vi } from 'vitest';

import type { FFmpegOptions, FFmpegResult, MediaMetadataResult } from './ffmpeg-wrapper';

// Mock child_process and fs
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

vi.mock('fs', () => ({
  promises: {
    mkdir: vi.fn(),
  },
}));

describe('FFmpeg Wrapper Types', () => {
  describe('FFmpegOptions interface', () => {
    it('should accept basic options', () => {
      const options: FFmpegOptions = {
        input: '/input.mp4',
        output: '/output.mp4',
      };

      expect(options.input).toBe('/input.mp4');
      expect(options.output).toBe('/output.mp4');
    });

    it('should accept codec options', () => {
      const options: FFmpegOptions = {
        input: '/input.mp4',
        output: '/output.mp4',
        videoCodec: 'libx264',
        audioCodec: 'aac',
        videoBitrate: '2M',
        audioBitrate: '128k',
      };

      expect(options.videoCodec).toBe('libx264');
      expect(options.audioCodec).toBe('aac');
    });

    it('should accept resolution option', () => {
      const options: FFmpegOptions = {
        input: '/input.mp4',
        resolution: { width: 1920, height: 1080 },
      };

      expect(options.resolution?.width).toBe(1920);
      expect(options.resolution?.height).toBe(1080);
    });

    it('should accept timing options', () => {
      const options: FFmpegOptions = {
        input: '/input.mp4',
        startTime: 10,
        duration: 30,
      };

      expect(options.startTime).toBe(10);
      expect(options.duration).toBe(30);
    });

    it('should accept thumbnail options', () => {
      const options: FFmpegOptions = {
        input: '/input.mp4',
        thumbnail: {
          time: 5,
          size: 300,
          output: '/thumb.jpg',
        },
      };

      expect(options.thumbnail?.time).toBe(5);
      expect(options.thumbnail?.size).toBe(300);
    });

    it('should accept waveform options', () => {
      const options: FFmpegOptions = {
        input: '/input.mp3',
        waveform: {
          output: '/waveform.png',
          width: 800,
          height: 200,
        },
      };

      expect(options.waveform?.width).toBe(800);
      expect(options.waveform?.height).toBe(200);
    });
  });

  describe('FFmpegResult interface', () => {
    it('should represent success result', () => {
      const result: FFmpegResult = {
        success: true,
        output: 'Processed successfully',
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should represent failure result', () => {
      const result: FFmpegResult = {
        success: false,
        output: '',
        error: 'FFmpeg not found',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg not found');
    });

    it('should include duration', () => {
      const result: FFmpegResult = {
        success: true,
        output: '',
        duration: 120.5,
      };

      expect(result.duration).toBe(120.5);
    });
  });

  describe('MediaMetadataResult interface', () => {
    it('should have all optional fields', () => {
      const result: MediaMetadataResult = {};

      expect(result.duration).toBeUndefined();
      expect(result.hasVideo).toBeUndefined();
      expect(result.hasAudio).toBeUndefined();
      expect(result.width).toBeUndefined();
      expect(result.height).toBeUndefined();
    });

    it('should accept full metadata', () => {
      const result: MediaMetadataResult = {
        duration: 180.5,
        hasVideo: true,
        hasAudio: true,
        width: 1920,
        height: 1080,
      };

      expect(result.duration).toBe(180.5);
      expect(result.hasVideo).toBe(true);
      expect(result.hasAudio).toBe(true);
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
    });

    it('should work for audio-only files', () => {
      const result: MediaMetadataResult = {
        duration: 240,
        hasVideo: false,
        hasAudio: true,
      };

      expect(result.hasVideo).toBe(false);
      expect(result.hasAudio).toBe(true);
      expect(result.width).toBeUndefined();
    });
  });
});
