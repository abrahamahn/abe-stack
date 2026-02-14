// main/server/media/src/processors/audio.test.ts
/**
 * Tests for AudioProcessor
 *
 * Mocks the internal ffmpeg-wrapper and audio-metadata modules
 * instead of the removed fluent-ffmpeg/music-metadata external deps.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { AudioProcessor } from './audio';

// Mock internal ffmpeg-wrapper
vi.mock('../ffmpeg-wrapper', () => ({
  runFFmpeg: vi.fn().mockResolvedValue({ success: true, output: '' }),
}));

// Mock internal audio-metadata
vi.mock('../audio-metadata', () => ({
  parseAudioMetadata: vi.fn().mockResolvedValue({
    duration: 180.5,
    bitrate: 320000,
    codec: 'mp3',
    format: 'MPEG',
    channels: 2,
    sampleRate: 44100,
  }),
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

    it('should pass format and bitrate to runFFmpeg', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');

      await processor.process('/input/audio.wav', '/output/audio.mp3', {
        format: 'mp3',
        bitrate: '192k',
      });

      expect(runFFmpeg).toHaveBeenCalledWith({
        input: '/input/audio.wav',
        output: '/output/audio.mp3',
        format: 'mp3',
        audioBitrate: '192k',
      });
    });

    it('should set waveform path when waveform option is provided', async () => {
      const result = await processor.process('/input/audio.wav', '/output/audio.mp3', {
        waveform: { width: 800, height: 200 },
      });

      expect(result.success).toBe(true);
      expect(result.waveformPath).toBe('/output/audio_waveform.png');
    });

    it('should return error result on processing failure', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');
      vi.mocked(runFFmpeg).mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'FFmpeg error',
      });

      const result = await processor.process('/input/audio.wav', '/output/audio.mp3');

      expect(result.success).toBe(false);
      expect(result.error).toBe('FFmpeg error');
    });
  });

  describe('getMetadata', () => {
    it('should extract audio metadata via parseAudioMetadata', async () => {
      const metadata = await processor.getMetadata('/input/audio.mp3');

      expect(metadata.duration).toBe(180.5);
      expect(metadata.bitrate).toBe(320000);
      expect(metadata.codec).toBe('mp3');
      expect(metadata.format).toBe('MPEG');
      expect(metadata.channels).toBe(2);
      expect(metadata.sampleRate).toBe(44100);
    });

    it('should return empty metadata on error', async () => {
      const { parseAudioMetadata } = await import('../audio-metadata');
      vi.mocked(parseAudioMetadata).mockRejectedValueOnce(new Error('Parse failed'));

      const metadata = await processor.getMetadata('/input/audio.mp3');

      expect(metadata).toEqual({});
    });
  });

  describe('getDuration', () => {
    it('should return duration from parseAudioMetadata', async () => {
      const duration = await processor.getDuration('/input/audio.mp3');

      expect(duration).toBe(180.5);
    });

    it('should return null on error', async () => {
      const { parseAudioMetadata } = await import('../audio-metadata');
      vi.mocked(parseAudioMetadata).mockRejectedValueOnce(new Error('Parse failed'));

      const duration = await processor.getDuration('/input/audio.mp3');

      expect(duration).toBeNull();
    });

    it('should return null when duration is undefined', async () => {
      const { parseAudioMetadata } = await import('../audio-metadata');
      vi.mocked(parseAudioMetadata).mockResolvedValueOnce({ codec: 'mp3' });

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
    it('should extract an audio segment via runFFmpeg', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');

      const result = await processor.extractSegment(
        '/input/audio.mp3',
        '/output/segment.mp3',
        10,
        30,
      );

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/segment.mp3');
      expect(runFFmpeg).toHaveBeenCalledWith({
        input: '/input/audio.mp3',
        output: '/output/segment.mp3',
        startTime: 10,
        duration: 30,
      });
    });

    it('should return error on segment extraction failure', async () => {
      const { runFFmpeg } = await import('../ffmpeg-wrapper');
      vi.mocked(runFFmpeg).mockResolvedValueOnce({
        success: false,
        output: '',
        error: 'Segment error',
      });

      const result = await processor.extractSegment(
        '/input/audio.mp3',
        '/output/segment.mp3',
        10,
        30,
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Segment error');
    });
  });
});
