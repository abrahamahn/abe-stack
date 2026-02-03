// premium/media/src/processors/image.test.ts
/**
 * Tests for ImageProcessor
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { ImageProcessor } from './image';

const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  jpeg: vi.fn().mockReturnThis(),
  png: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  avif: vi.fn().mockReturnThis(),
  toFile: vi.fn().mockResolvedValue({ width: 800, height: 600, format: 'jpeg' }),
  metadata: vi.fn().mockResolvedValue({ width: 1920, height: 1080, format: 'jpeg' }),
};

vi.mock('sharp', () => ({
  default: vi.fn().mockReturnValue(mockSharpInstance),
}));

describe('ImageProcessor', () => {
  let processor: ImageProcessor;

  beforeEach(() => {
    vi.clearAllMocks();
    processor = new ImageProcessor();
  });

  describe('process', () => {
    it('should process an image successfully', async () => {
      const result = await processor.process('/input/image.jpg', '/output/image.jpg');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output/image.jpg');
      expect(result.metadata).toBeDefined();
    });

    it('should apply resize options', async () => {
      await processor.process('/input/image.jpg', '/output/image.jpg', {
        resize: { width: 800, height: 600, fit: 'cover' },
      });

      expect(mockSharpInstance.resize).toHaveBeenCalledWith({
        width: 800,
        height: 600,
        fit: 'cover',
      });
    });

    it('should apply jpeg format with quality', async () => {
      await processor.process('/input/image.png', '/output/image.jpg', {
        format: { format: 'jpeg', quality: 90, progressive: true },
      });

      expect(mockSharpInstance.jpeg).toHaveBeenCalledWith({
        quality: 90,
        progressive: true,
      });
    });

    it('should apply png format', async () => {
      await processor.process('/input/image.jpg', '/output/image.png', {
        format: { format: 'png' },
      });

      expect(mockSharpInstance.png).toHaveBeenCalledWith({
        compressionLevel: 6,
      });
    });

    it('should apply webp format', async () => {
      await processor.process('/input/image.jpg', '/output/image.webp', {
        format: { format: 'webp', quality: 85 },
      });

      expect(mockSharpInstance.webp).toHaveBeenCalledWith({
        quality: 85,
      });
    });

    it('should apply avif format', async () => {
      await processor.process('/input/image.jpg', '/output/image.avif', {
        format: { format: 'avif', quality: 80 },
      });

      expect(mockSharpInstance.avif).toHaveBeenCalledWith({
        quality: 80,
      });
    });

    it('should generate thumbnail when specified', async () => {
      const result = await processor.process('/input/image.jpg', '/output/image.jpg', {
        thumbnail: { size: 150, fit: 'cover' },
      });

      expect(result.success).toBe(true);
      expect(result.thumbnailPath).toBe('/output/image_thumb.jpg');
    });

    it('should return error result on processing failure', async () => {
      mockSharpInstance.toFile.mockRejectedValueOnce(new Error('Sharp error'));

      const result = await processor.process('/input/image.jpg', '/output/image.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Sharp error');
    });
  });

  describe('getMetadata', () => {
    it('should extract image metadata', async () => {
      const metadata = await processor.getMetadata('/input/image.jpg');

      expect(metadata.width).toBe(1920);
      expect(metadata.height).toBe(1080);
      expect(metadata.format).toBe('jpeg');
    });

    it('should return empty metadata on error', async () => {
      mockSharpInstance.metadata.mockRejectedValueOnce(new Error('Metadata error'));

      const metadata = await processor.getMetadata('/input/image.jpg');

      expect(metadata).toEqual({});
    });
  });

  describe('generateVariants', () => {
    it('should generate three image variants', async () => {
      const result = await processor.generateVariants('/input/image.jpg', '/output/image');

      expect(result.original.success).toBe(true);
      expect(result.optimized.success).toBe(true);
      expect(result.thumbnail.success).toBe(true);
    });
  });
});
