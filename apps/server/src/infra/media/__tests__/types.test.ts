// apps/server/src/infra/media/__tests__/types.test.ts
import { describe, expect, it } from 'vitest';

import type {
  ImageProcessingOptions,
  AudioProcessingOptions,
  VideoProcessingOptions,
  MediaMetadata,
  ProcessingResult,
} from '../types';

describe('Media Processing Types', () => {
  describe('ImageProcessingOptions', () => {
    it('should allow valid resize options', () => {
      const options: ImageProcessingOptions = {
        resize: {
          width: 800,
          height: 600,
          fit: 'cover',
          withoutEnlargement: true,
        },
        format: {
          format: 'jpeg',
          quality: 85,
          progressive: true,
        },
        thumbnail: {
          size: 300,
          fit: 'cover',
        },
      };

      expect(options).toBeDefined();
      expect(options.resize?.width).toBe(800);
      expect(options.format?.format).toBe('jpeg');
      expect(options.thumbnail?.size).toBe(300);
    });

    it('should allow partial options', () => {
      const resizeOnly: ImageProcessingOptions = {
        resize: { width: 1024 },
      };

      const formatOnly: ImageProcessingOptions = {
        format: { format: 'webp' },
      };

      const thumbnailOnly: ImageProcessingOptions = {
        thumbnail: { size: 200 },
      };

      expect(resizeOnly.resize?.width).toBe(1024);
      expect(formatOnly.format?.format).toBe('webp');
      expect(thumbnailOnly.thumbnail?.size).toBe(200);
    });
  });

  describe('AudioProcessingOptions', () => {
    it('should allow comprehensive audio options', () => {
      const options: AudioProcessingOptions = {
        format: 'mp3',
        bitrate: '256k',
        channels: 2,
        sampleRate: 44100,
        waveform: {
          width: 800,
          height: 200,
          color: '#ff0000',
        },
      };

      expect(options.format).toBe('mp3');
      expect(options.bitrate).toBe('256k');
      expect(options.channels).toBe(2);
      expect(options.sampleRate).toBe(44100);
      expect(options.waveform?.width).toBe(800);
    });
  });

  describe('VideoProcessingOptions', () => {
    it('should allow comprehensive video options', () => {
      const options: VideoProcessingOptions = {
        format: 'mp4',
        resolution: { width: 1920, height: 1080 },
        bitrate: '5000k',
        thumbnail: {
          time: 5,
          size: 300,
        },
      };

      expect(options.format).toBe('mp4');
      expect(options.resolution?.width).toBe(1920);
      expect(options.bitrate).toBe('5000k');
      expect(options.thumbnail?.time).toBe(5);
    });
  });

  describe('MediaMetadata', () => {
    it('should allow all metadata fields', () => {
      const metadata: MediaMetadata = {
        duration: 180.5,
        width: 1920,
        height: 1080,
        bitrate: 2500000,
        codec: 'h264',
        format: 'mp4',
        channels: 2,
        sampleRate: 44100,
      };

      expect(metadata.duration).toBe(180.5);
      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.bitrate).toBe(2500000);
      expect(metadata.codec).toBe('h264');
      expect(metadata.format).toBe('mp4');
      expect(metadata.channels).toBe(2);
      expect(metadata.sampleRate).toBe(44100);
    });

    it('should allow partial metadata', () => {
      const partialMetadata: MediaMetadata = {
        duration: 120,
      };

      expect(partialMetadata.duration).toBe(120);
      expect(partialMetadata.width).toBeUndefined();
    });
  });

  describe('ProcessingResult', () => {
    it('should represent successful processing', () => {
      const result: ProcessingResult = {
        success: true,
        outputPath: '/tmp/output.jpg',
        thumbnailPath: '/tmp/output_thumb.jpg',
        waveformPath: '/tmp/output_waveform.png',
        metadata: {
          width: 800,
          height: 600,
          format: 'jpeg',
        },
      };

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/tmp/output.jpg');
      expect(result.thumbnailPath).toBe('/tmp/output_thumb.jpg');
      expect(result.waveformPath).toBe('/tmp/output_waveform.png');
      expect(result.metadata?.width).toBe(800);
    });

    it('should represent failed processing', () => {
      const result: ProcessingResult = {
        success: false,
        error: 'Processing failed: invalid input',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed: invalid input');
      expect(result.outputPath).toBeUndefined();
    });
  });
});
