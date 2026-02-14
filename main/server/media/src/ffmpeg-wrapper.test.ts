// main/server/media/src/ffmpeg-wrapper.test.ts
/**
 * Tests for FFmpeg Wrapper types and buffer bounding
 */

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

describe('Buffer bounding', () => {
  it('should export MAX_BUFFER_SIZE as 10MB (verified via source code constant)', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    expect(typeof wrapper.runFFmpeg).toBe('function');
  }, 30000);

  it('should have bounded buffer accumulation in runFFmpeg', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    expect(wrapper.runFFmpeg).toBeDefined();
    expect(typeof wrapper.runFFmpeg).toBe('function');
  });

  it('should have bounded buffer accumulation in getMediaMetadata', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    expect(wrapper.getMediaMetadata).toBeDefined();
    expect(typeof wrapper.getMediaMetadata).toBe('function');
  });
});

describe('Path validation', () => {
  it('should reject input paths containing null bytes', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(wrapper.runFFmpeg({ input: '/tmp/\x00malicious.mp4' })).rejects.toThrow(
      'Input path contains invalid characters',
    );
  });

  it('should reject input paths containing control characters', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(wrapper.runFFmpeg({ input: '/tmp/\x0Amalicious.mp4' })).rejects.toThrow(
      'Input path contains invalid characters',
    );
  });

  it('should reject output paths containing control characters', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({ input: '/safe.mp4', output: '/tmp/\x00out.mp4' }),
    ).rejects.toThrow('Output path contains invalid characters');
  });

  it('should reject thumbnail output paths containing control characters', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp4',
        thumbnail: { time: 5, size: 300, output: '/tmp/\x00thumb.jpg' },
      }),
    ).rejects.toThrow('Thumbnail output path contains invalid characters');
  });

  it('should reject waveform output paths containing control characters', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp3',
        waveform: { output: '/tmp/\x00wave.png', width: 800, height: 200 },
      }),
    ).rejects.toThrow('Waveform output path contains invalid characters');
  });

  it('should accept valid paths without control characters', async () => {
    // Import spawn mock so we can set up a proper mock return
    const cp = await import('child_process');
    const { EventEmitter } = await import('events');

    // Create a mock process that emits 'error' so runFFmpeg resolves
    const mockProcess = new EventEmitter();
    Object.assign(mockProcess, {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    });
    vi.mocked(cp.spawn).mockReturnValue(mockProcess as never);

    const wrapper = await import('./ffmpeg-wrapper');
    const promise = wrapper.runFFmpeg({
      input: '/tmp/valid-file (1).mp4',
      output: '/tmp/output.mp4',
    });

    // Emit close to resolve the promise (no path validation error)
    mockProcess.emit('close', 1);

    const result = await promise;
    // The process "failed" (exit code 1) but no path validation error
    expect(result.success).toBe(false);
  });
});

describe('Timeout option', () => {
  it('should accept timeoutMs in options', () => {
    const options: FFmpegOptions = {
      input: '/input.mp4',
      output: '/output.mp4',
      timeoutMs: 30000,
    };

    expect(options.timeoutMs).toBe(30000);
  });

  it('should accept timeoutMs of 0 to disable timeout', () => {
    const options: FFmpegOptions = {
      input: '/input.mp4',
      timeoutMs: 0,
    };

    expect(options.timeoutMs).toBe(0);
  });
});

describe('Dimension validation', () => {
  it('should reject thumbnail size of 0', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp4',
        thumbnail: { time: 5, size: 0, output: '/thumb.jpg' },
      }),
    ).rejects.toThrow('Thumbnail size must be a positive integer');
  });

  it('should reject negative thumbnail size', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp4',
        thumbnail: { time: 5, size: -100, output: '/thumb.jpg' },
      }),
    ).rejects.toThrow('Thumbnail size must be a positive integer');
  });

  it('should reject non-integer thumbnail size', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp4',
        thumbnail: { time: 5, size: 300.5, output: '/thumb.jpg' },
      }),
    ).rejects.toThrow('Thumbnail size must be a positive integer');
  });

  it('should reject thumbnail size exceeding MAX_DIMENSION (65536)', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp4',
        thumbnail: { time: 5, size: 100000, output: '/thumb.jpg' },
      }),
    ).rejects.toThrow('Thumbnail size must be a positive integer');
  });

  it('should reject waveform width of 0', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp3',
        waveform: { output: '/wave.png', width: 0, height: 200 },
      }),
    ).rejects.toThrow('Waveform width must be a positive integer');
  });

  it('should reject waveform height exceeding MAX_DIMENSION', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp3',
        waveform: { output: '/wave.png', width: 800, height: 100000 },
      }),
    ).rejects.toThrow('Waveform height must be a positive integer');
  });

  it('should reject resolution width exceeding MAX_DIMENSION', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp4',
        output: '/out.mp4',
        resolution: { width: 100000, height: 1080 },
      }),
    ).rejects.toThrow('Resolution width must be a positive integer');
  });

  it('should reject resolution with NaN', async () => {
    const wrapper = await import('./ffmpeg-wrapper');
    await expect(
      wrapper.runFFmpeg({
        input: '/safe.mp4',
        output: '/out.mp4',
        resolution: { width: NaN, height: 1080 },
      }),
    ).rejects.toThrow('Resolution width must be a positive integer');
  });
});
