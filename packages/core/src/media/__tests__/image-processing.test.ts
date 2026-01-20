// packages/core/src/media/__tests__/image-processing.test.ts
import { describe, expect, it, vi } from 'vitest';

import {
  createImageProcessor,
  getImageFormat,
  ImageProcessor,
  type ImageFormatOptions,
  type ImageMetadata,
  type ImageProcessingOptions,
  type ImageResizeOptions,
  type ProcessingResult,
} from '../image-processing';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    copyFile: vi.fn(),
    stat: vi.fn(),
  },
}));

describe('Image Processing', () => {
  describe('ImageProcessor', () => {
    it('should create instance', () => {
      const processor = new ImageProcessor();
      expect(processor).toBeInstanceOf(ImageProcessor);
    });

    it('should process image and return result', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);

      const processor = new ImageProcessor();
      const result = await processor.process('/input.jpg', '/output.jpg');

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output.jpg');
    });

    it('should get metadata', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 2048 } as never);

      const processor = new ImageProcessor();
      const metadata = await processor.getMetadata('/test.jpg');

      expect(metadata.size).toBe(2048);
    });
  });

  describe('createImageProcessor', () => {
    it('should create new ImageProcessor instance', () => {
      const processor = createImageProcessor();
      expect(processor).toBeInstanceOf(ImageProcessor);
    });
  });

  describe('getImageFormat', () => {
    it('should detect JPEG format', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      expect(getImageFormat(buffer)).toBe('jpeg');
    });

    it('should detect PNG format', () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(getImageFormat(buffer)).toBe('png');
    });

    it('should detect GIF format', () => {
      const buffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
      expect(getImageFormat(buffer)).toBe('gif');
    });

    it('should detect WebP format', () => {
      const buffer = Buffer.alloc(12);
      buffer.write('RIFF', 0);
      buffer.write('WEBP', 8);
      expect(getImageFormat(buffer)).toBe('webp');
    });

    it('should return unknown for unrecognized format', () => {
      const buffer = Buffer.from([0x00, 0x00, 0x00, 0x00]);
      expect(getImageFormat(buffer)).toBe('unknown');
    });

    it('should return unknown for small buffer', () => {
      const buffer = Buffer.from([0xff, 0xd8]);
      expect(getImageFormat(buffer)).toBe('unknown');
    });
  });

  describe('Type interfaces', () => {
    describe('ImageResizeOptions', () => {
      it('should accept width and height', () => {
        const options: ImageResizeOptions = {
          width: 800,
          height: 600,
        };
        expect(options.width).toBe(800);
        expect(options.height).toBe(600);
      });

      it('should accept fit modes', () => {
        const options: ImageResizeOptions[] = [
          { fit: 'contain' },
          { fit: 'cover' },
          { fit: 'fill' },
          { fit: 'inside' },
          { fit: 'outside' },
        ];
        expect(options).toHaveLength(5);
      });

      it('should accept withoutEnlargement', () => {
        const options: ImageResizeOptions = {
          width: 800,
          withoutEnlargement: true,
        };
        expect(options.withoutEnlargement).toBe(true);
      });
    });

    describe('ImageFormatOptions', () => {
      it('should accept format types', () => {
        const jpeg: ImageFormatOptions = { format: 'jpeg', quality: 80 };
        const png: ImageFormatOptions = { format: 'png', compressionLevel: 9 };
        const webp: ImageFormatOptions = { format: 'webp', quality: 90 };

        expect(jpeg.format).toBe('jpeg');
        expect(png.format).toBe('png');
        expect(webp.format).toBe('webp');
      });

      it('should accept progressive option', () => {
        const options: ImageFormatOptions = {
          format: 'jpeg',
          progressive: true,
        };
        expect(options.progressive).toBe(true);
      });
    });

    describe('ImageProcessingOptions', () => {
      it('should accept all options', () => {
        const options: ImageProcessingOptions = {
          resize: { width: 800, height: 600, fit: 'cover' },
          format: { format: 'webp', quality: 85 },
          thumbnail: { size: 150, fit: 'cover' },
        };

        expect(options.resize?.width).toBe(800);
        expect(options.format?.format).toBe('webp');
        expect(options.thumbnail?.size).toBe(150);
      });
    });

    describe('ImageMetadata', () => {
      it('should have all optional fields', () => {
        const metadata: ImageMetadata = {};
        expect(metadata.width).toBeUndefined();
        expect(metadata.height).toBeUndefined();
        expect(metadata.format).toBeUndefined();
        expect(metadata.size).toBeUndefined();
      });

      it('should accept full metadata', () => {
        const metadata: ImageMetadata = {
          width: 1920,
          height: 1080,
          format: 'jpeg',
          size: 524288,
        };
        expect(metadata.width).toBe(1920);
        expect(metadata.size).toBe(524288);
      });
    });

    describe('ProcessingResult', () => {
      it('should represent success', () => {
        const result: ProcessingResult = {
          success: true,
          outputPath: '/output.jpg',
          thumbnailPath: '/output_thumb.jpg',
          metadata: { width: 800, height: 600 },
        };
        expect(result.success).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it('should represent failure', () => {
        const result: ProcessingResult = {
          success: false,
          error: 'Processing failed',
        };
        expect(result.success).toBe(false);
        expect(result.error).toBe('Processing failed');
      });
    });
  });
});
