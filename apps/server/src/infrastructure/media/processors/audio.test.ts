// apps/server/src/infrastructure/media/processors/__tests__/audio.test.ts
import ffmpeg from 'fluent-ffmpeg';
import { parseFile } from 'music-metadata';
import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';

import { AudioProcessor, type AudioProcessingOptions } from '../audio';

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => ({
  default: vi.fn(() => ({
    toFormat: vi.fn().mockReturnThis(),
    audioBitrate: vi.fn().mockReturnThis(),
    audioChannels: vi.fn().mockReturnThis(),
    audioFrequency: vi.fn().mockReturnThis(),
    setStartTime: vi.fn().mockReturnThis(),
    setDuration: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    save: vi.fn().mockReturnThis(),
  })),
  setFfmpegPath: vi.fn(),
}));

// Mock music-metadata
vi.mock('music-metadata', () => ({
  parseFile: vi.fn(),
}));

// Mock ffmpeg-static
vi.mock('ffmpeg-static', () => ({
  default: '/usr/bin/ffmpeg',
}));

describe('AudioProcessor', () => {
  let processor: AudioProcessor;
  let mockFfmpeg: Mock;
  let mockParseFile: Mock;

  beforeEach(() => {
    processor = new AudioProcessor();
    mockFfmpeg = vi.mocked(ffmpeg);
    mockParseFile = vi.mocked(parseFile);

    // Setup default mocks
    mockFfmpeg.mockReturnValue({
      toFormat: vi.fn().mockReturnThis(),
      audioBitrate: vi.fn().mockReturnThis(),
      audioChannels: vi.fn().mockReturnThis(),
      audioFrequency: vi.fn().mockReturnThis(),
      setStartTime: vi.fn().mockReturnThis(),
      setDuration: vi.fn().mockReturnThis(),
      on: vi.fn().mockImplementation((event: string, callback: () => void) => {
        if (event === 'end') {
          setTimeout(callback, 0); // Simulate async success
        }
        return mockFfmpeg.mock.results[0]?.value;
      }),
      save: vi.fn().mockReturnThis(),
    });

    mockParseFile.mockResolvedValue({
      format: {
        duration: 180.5,
        bitrate: 320000,
        codec: 'mp3',
        container: 'MPEG',
        numberOfChannels: 2,
        sampleRate: 44100,
      },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('process', () => {
    it('should process audio with format conversion', async () => {
      const inputPath = '/tmp/input.wav';
      const outputPath = '/tmp/output.mp3';
      const options: AudioProcessingOptions = {
        format: 'mp3',
        bitrate: '256k',
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(result.metadata?.codec).toBe('mp3');
    });

    it('should process audio with channel and frequency settings', async () => {
      const inputPath = '/tmp/input.wav';
      const outputPath = '/tmp/output.mp3';
      const options: AudioProcessingOptions = {
        format: 'mp3',
        channels: 1, // Mono
        sampleRate: 22050,
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should generate waveform when specified', async () => {
      const inputPath = '/tmp/input.mp3';
      const outputPath = '/tmp/output.mp3';
      const options: AudioProcessingOptions = {
        waveform: {
          width: 800,
          height: 200,
          color: '#ff0000',
        },
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.waveformPath).toBe('/tmp/output_waveform.png');
    });

    it('should handle processing errors', async () => {
      mockFfmpeg.mockReturnValue({
        toFormat: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, callback: (err: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => { callback(new Error('FFmpeg failed')); }, 0);
          }
          return mockFfmpeg.mock.results[0]?.value;
        }),
        save: vi.fn().mockReturnThis(),
      });

      const inputPath = '/tmp/input.wav';
      const outputPath = '/tmp/output.mp3';
      const options: AudioProcessingOptions = { format: 'mp3' };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg failed');
    });
  });

  describe('getMetadata', () => {
    it('should extract comprehensive metadata from audio', async () => {
      const inputPath = '/tmp/test.mp3';

      const metadata = await processor.getMetadata(inputPath);

      expect(metadata).toEqual({
        duration: 180.5,
        bitrate: 320000,
        codec: 'mp3',
        format: 'MPEG',
        channels: 2,
        sampleRate: 44100,
      });
    });

    it('should handle metadata extraction errors', async () => {
      mockParseFile.mockRejectedValue(new Error('Metadata extraction failed'));

      const inputPath = '/tmp/test.mp3';

      const metadata = await processor.getMetadata(inputPath);

      expect(metadata).toEqual({});
    });
  });

  describe('generateVariants', () => {
    it('should generate multiple audio variants', async () => {
      const inputPath = '/tmp/input.wav';
      const baseOutputPath = '/tmp/output';

      const result = await processor.generateVariants(inputPath, baseOutputPath);

      expect(result.original.success).toBe(true);
      expect(result.compressed.success).toBe(true);
      expect(result.optimized.success).toBe(true);

      expect(result.original.outputPath).toContain('_original.mp3');
      expect(result.compressed.outputPath).toContain('_compressed.mp3');
      expect(result.optimized.outputPath).toContain('_optimized.mp3');
      expect(result.optimized.waveformPath).toContain('_waveform.png');
    });
  });

  describe('extractSegment', () => {
    it('should extract audio segment', async () => {
      const inputPath = '/tmp/input.mp3';
      const outputPath = '/tmp/segment.mp3';
      const startTime = 30;
      const duration = 15;

      const result = await processor.extractSegment(inputPath, outputPath, startTime, duration);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should handle segment extraction errors', async () => {
      mockFfmpeg.mockReturnValue({
        setStartTime: vi.fn().mockReturnThis(),
        setDuration: vi.fn().mockReturnThis(),
        on: vi.fn().mockImplementation((event: string, callback: (err: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => { callback(new Error('Segment extraction failed')); }, 0);
          }
          return mockFfmpeg.mock.results[0]?.value;
        }),
        save: vi.fn().mockReturnThis(),
      });

      const inputPath = '/tmp/input.mp3';
      const outputPath = '/tmp/segment.mp3';

      const result = await processor.extractSegment(inputPath, outputPath, 0, 10);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Segment extraction failed');
    });
  });

  describe('getDuration', () => {
    it('should get audio duration', async () => {
      const inputPath = '/tmp/test.mp3';

      const duration = await processor.getDuration(inputPath);

      expect(duration).toBe(180.5);
    });

    it('should return null on duration extraction error', async () => {
      mockParseFile.mockRejectedValue(new Error('Duration extraction failed'));

      const inputPath = '/tmp/test.mp3';

      const duration = await processor.getDuration(inputPath);

      expect(duration).toBe(null);
    });
  });
});
