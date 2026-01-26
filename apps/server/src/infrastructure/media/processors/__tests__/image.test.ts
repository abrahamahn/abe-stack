/* eslint-disable @typescript-eslint/unbound-method */
// apps/server/src/infrastructure/media/processors/__tests__/image.test.ts
import sharp from 'sharp';
import { describe, expect, it, vi, beforeEach, afterEach, type Mock } from 'vitest';

import { ImageProcessor, type ImageProcessingOptions } from '../image';

// Mock sharp
vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    png: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    avif: vi.fn().mockReturnThis(),
    metadata: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    }),
    toFile: vi.fn().mockResolvedValue({
      width: 1920,
      height: 1080,
      format: 'jpeg',
    }),
  })),
}));

describe('ImageProcessor', () => {
  let processor: ImageProcessor;
  let mockSharp: Mock;

  beforeEach(() => {
    processor = new ImageProcessor();
    mockSharp = vi.mocked(sharp);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('process', () => {
    it('should process image with resize options', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/output.jpg';
      const options: ImageProcessingOptions = {
        resize: {
          width: 800,
          height: 600,
          fit: 'cover',
          withoutEnlargement: true,
        },
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
      expect(mockSharp).toHaveBeenCalledWith(inputPath);
    });

    it('should process image with JPEG format options', async () => {
      const inputPath = '/tmp/input.png';
      const outputPath = '/tmp/output.jpg';
      const options: ImageProcessingOptions = {
        format: {
          format: 'jpeg',
          quality: 85,
          progressive: true,
        },
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should process image with WebP format options', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/output.webp';
      const options: ImageProcessingOptions = {
        format: {
          format: 'webp',
          quality: 90,
        },
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(outputPath);
    });

    it('should generate thumbnail when specified', async () => {
      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/output.jpg';
      const options: ImageProcessingOptions = {
        thumbnail: {
          size: 300,
          fit: 'cover',
        },
      };

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(true);
      expect(result.thumbnailPath).toBe('/tmp/output_thumb.jpg');
    });

    it('should handle processing errors', async () => {
      mockSharp.mockImplementationOnce(() => {
        throw new Error('Processing failed');
      });

      const inputPath = '/tmp/input.jpg';
      const outputPath = '/tmp/output.jpg';
      const options: ImageProcessingOptions = {};

      const result = await processor.process(inputPath, outputPath, options);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Processing failed');
    });
  });

  describe('getMetadata', () => {
    it('should extract metadata from image', async () => {
      const inputPath = '/tmp/test.jpg';

      const metadata = await processor.getMetadata(inputPath);

      expect(metadata).toEqual({
        width: 1920,
        height: 1080,
        format: 'jpeg',
      });
    });

    it('should handle metadata extraction errors', async () => {
      mockSharp.mockImplementationOnce(() => {
        throw new Error('Metadata extraction failed');
      });

      const inputPath = '/tmp/test.jpg';

      const metadata = await processor.getMetadata(inputPath);

      expect(metadata).toEqual({});
    });
  });

  describe('generateVariants', () => {
    it('should generate multiple image variants', async () => {
      const inputPath = '/tmp/input.jpg';
      const baseOutputPath = '/tmp/output';

      const result = await processor.generateVariants(inputPath, baseOutputPath);

      expect(result.original.success).toBe(true);
      expect(result.optimized.success).toBe(true);
      expect(result.thumbnail.success).toBe(true);

      expect(result.original.outputPath).toContain('_original.jpg');
      expect(result.optimized.outputPath).toContain('_optimized.jpg');
      expect(result.thumbnail.outputPath).toContain('_thumb.jpg');
    });

    it('should handle variant generation errors', async () => {
      mockSharp.mockImplementationOnce(() => {
        throw new Error('Variant generation failed');
      });

      const inputPath = '/tmp/input.jpg';
      const baseOutputPath = '/tmp/output';

      const result = await processor.generateVariants(inputPath, baseOutputPath);

      expect(result.original.success).toBe(false);
      expect(result.original.error).toBe('Variant generation failed');
    });
  });
});
