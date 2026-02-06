// premium/media/src/processors/audio.test.ts
/**
 * Tests for AudioProcessor
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AudioProcessor } from './audio';

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/bin/ffmpeg',
}));

const mockFfmpegCommand = {
  toFormat: vi.fn().mockReturnThis(),
  audioBitrate: vi.fn().mockReturnThis(),
  audioChannels: vi.fn().mockReturnThis(),
  audioFrequency: vi.fn().mockReturnThis(),
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

const mockMetadata = {
  format: {
    duration: 180.5,
    bitrate: 320000,
    codec: 'mp3',
    container: 'MPEG',
    numberOfChannels: 2,
    sampleRate: 44100,
  },
};

vi.mock('music-metadata', () => ({
  parseFile: vi.fn().mockResolvedValue(mockMetadata),
}));

describe('AudioProcessor', () => {
  let processor: AudioProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new AudioProcessor();
  });

  describe('process', () => {
    it('should process an audio file successfully', async () => {
      const result = await processor.process('/input/audio.wav', '/output/audio.mp3');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/audio.mp3');
      expect(result.metadata).toBeDefined();
    });

    it('should apply format option', async () => {
      await processor.process('/input/audio.wav', '/output/audio.mp3', {
        format: 'mp3',
      });

      expect(mockFfmpegCommand.toFormat).toHaveBeenCalledWith('mp3');
    });

    it('should apply bitrate option', async () => {
      await processor.process('/input/audio.wav', '/output/audio.mp3', {
        bitrate: '192k',
      });

      expect(mockFfmpegCommand.audioBitrate).toHaveBeenCalledWith('192k');
    });

    it('should apply channels option', async () => {
      await processor.process('/input/audio.wav', '/output/audio.mp3', {
        channels: 1,
      });

      expect(mockFfmpegCommand.audioChannels).toHaveBeenCalledWith(1);
    });

    it('should apply sampleRate option', async () => {
      await processor.process('/input/audio.wav', '/output/audio.mp3', {
        sampleRate: 22050,
      });

      expect(mockFfmpegCommand.audioFrequency).toHaveBeenCalledWith(22050);
    });

    it('should set waveform path when waveform option is provided', async () => {
      const result = await processor.process('/input/audio.wav', '/output/audio.mp3', {
        waveform: { width: 800, height: 200 },
      });

      expect(result.success).toBe(true);
      expect(result.waveformPath).toBe('/output/audio_waveform.png');
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

      const result = await processor.process('/input/audio.wav', '/output/audio.mp3');

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
    it('should extract audio metadata', async () => {
      const metadata = await processor.getMetadata('/input/audio.mp3');

      expect(metadata.duration).toBe(180.5);
      expect(metadata.bitrate).toBe(320000);
      expect(metadata.codec).toBe('mp3');
      expect(metadata.format).toBe('MPEG');
      expect(metadata.channels).toBe(2);
      expect(metadata.sampleRate).toBe(44100);
    });

    it('should return empty metadata on error', async () => {
      const musicMetadata = await import('music-metadata');
      vi.mocked(musicMetadata.parseFile).mockRejectedValueOnce(new Error('Parse failed'));

      const metadata = await processor.getMetadata('/input/audio.mp3');

      expect(metadata).toEqual({});
    });
  });

  describe('getDuration', () => {
    it('should return duration from music-metadata', async () => {
      const duration = await processor.getDuration('/input/audio.mp3');

      expect(duration).toBe(180.5);
    });

    it('should return null on error', async () => {
      const musicMetadata = await import('music-metadata');
      vi.mocked(musicMetadata.parseFile).mockRejectedValueOnce(new Error('Parse failed'));

      const duration = await processor.getDuration('/input/audio.mp3');

      expect(duration).toBeNull();
    });
  });

  describe('generateVariants', () => {
    it('should generate three audio variants', async () => {
      const result = await processor.generateVariants('/input/audio.wav', '/output/audio');

      expect(result.original.success).toBe(true);
      expect(result.compressed.success).toBe(true);
      expect(result.optimized.success).toBe(true);
    });
  });

  describe('extractSegment', () => {
    it('should extract an audio segment', async () => {
      const result = await processor.extractSegment(
        '/input/audio.mp3',
        '/output/segment.mp3',
        10,
        30,
      );

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/segment.mp3');
      expect(mockFfmpegCommand.setStartTime).toHaveBeenCalledWith(10);
      expect(mockFfmpegCommand.setDuration).toHaveBeenCalledWith(30);
    });
  });
});
