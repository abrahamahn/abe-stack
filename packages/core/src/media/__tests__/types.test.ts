// packages/core/src/media/__tests__/types.test.ts
import { describe, expect, it } from 'vitest';

import type {
  FileTypeResult,
  MediaMetadata,
  MediaProcessingOptions,
  ProcessingResult,
  SecurityScanResult,
  UploadConfig,
} from '../types';

describe('Media Types', () => {
  describe('FileTypeResult', () => {
    it('should have ext and mime properties', () => {
      const result: FileTypeResult = {
        ext: 'jpg',
        mime: 'image/jpeg',
      };

      expect(result.ext).toBe('jpg');
      expect(result.mime).toBe('image/jpeg');
    });
  });

  describe('MediaMetadata', () => {
    it('should have fileSize as required field', () => {
      const metadata: MediaMetadata = {
        fileSize: 1024,
      };

      expect(metadata.fileSize).toBe(1024);
    });

    it('should accept all optional fields', () => {
      const metadata: MediaMetadata = {
        fileSize: 5242880,
        mimeType: 'video/mp4',
        extension: 'mp4',
        checksum: 'abc123def456',
        width: 1920,
        height: 1080,
        duration: 120.5,
        bitrate: 5000000,
        codec: 'h264',
      };

      expect(metadata.mimeType).toBe('video/mp4');
      expect(metadata.width).toBe(1920);
      expect(metadata.duration).toBe(120.5);
    });
  });

  describe('SecurityScanResult', () => {
    it('should represent safe file', () => {
      const result: SecurityScanResult = {
        safe: true,
        threats: [],
        warnings: [],
        metadata: {
          fileSize: 1024,
        },
      };

      expect(result.safe).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    it('should represent unsafe file with threats', () => {
      const result: SecurityScanResult = {
        safe: false,
        threats: ['Malware detected', 'XSS content found'],
        warnings: ['High entropy'],
        metadata: {
          fileSize: 2048,
          mimeType: 'text/html',
        },
      };

      expect(result.safe).toBe(false);
      expect(result.threats).toHaveLength(2);
      expect(result.warnings).toHaveLength(1);
    });

    it('should include optional metadata fields', () => {
      const result: SecurityScanResult = {
        safe: true,
        threats: [],
        warnings: [],
        metadata: {
          fileSize: 5000,
          mimeType: 'image/jpeg',
          hasExif: true,
          dimensions: { width: 800, height: 600 },
        },
      };

      expect(result.metadata.hasExif).toBe(true);
      expect(result.metadata.dimensions?.width).toBe(800);
    });
  });

  describe('ProcessingResult', () => {
    it('should represent successful processing', () => {
      const result: ProcessingResult = {
        success: true,
        outputPath: '/output/processed.mp4',
        metadata: {
          fileSize: 1000000,
          width: 1280,
          height: 720,
        },
      };

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/processed.mp4');
    });

    it('should represent failed processing', () => {
      const result: ProcessingResult = {
        success: false,
        error: 'Processing failed: codec not supported',
      };

      expect(result.success).toBe(false);
      expect(result.error).toContain('codec not supported');
    });
  });

  describe('MediaProcessingOptions', () => {
    it('should have all required fields', () => {
      const options: MediaProcessingOptions = {
        maxFileSize: 100 * 1024 * 1024,
        allowedTypes: ['image/jpeg', 'image/png', 'video/mp4'],
        extractMetadata: true,
      };

      expect(options.maxFileSize).toBe(104857600);
      expect(options.allowedTypes).toContain('image/jpeg');
      expect(options.extractMetadata).toBe(true);
    });
  });

  describe('UploadConfig', () => {
    it('should have all required fields', () => {
      const config: UploadConfig = {
        maxFileSize: 50 * 1024 * 1024,
        allowedTypes: ['image/*', 'video/*'],
        chunkSize: 1024 * 1024,
        timeout: 30000,
      };

      expect(config.maxFileSize).toBe(52428800);
      expect(config.allowedTypes).toContain('image/*');
      expect(config.chunkSize).toBe(1048576);
      expect(config.timeout).toBe(30000);
    });
  });
});
