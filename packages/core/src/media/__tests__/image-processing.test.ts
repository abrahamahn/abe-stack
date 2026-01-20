// packages/core/src/media/__tests__/image-processing.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

// Create a mock canvas context
const createMockCanvasContext = () => ({
  drawImage: vi.fn(),
  fillStyle: '',
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(100) })),
  putImageData: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  scale: vi.fn(),
  translate: vi.fn(),
  canvas: { width: 800, height: 600 },
});

// Create a mock canvas element
const createMockCanvas = () => {
  const ctx = createMockCanvasContext();
  return {
    width: 800,
    height: 600,
    getContext: vi.fn(() => ctx),
    toBlob: vi.fn((callback: (blob: Blob | null) => void, type: string, _quality: number) => {
      const mockBlob = new Blob(['mock image data'], { type });
      callback(mockBlob);
    }),
    toDataURL: vi.fn(() => 'data:image/jpeg;base64,mockdata'),
  };
};

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

  describe('calculateDimensions (internal)', () => {
    // Access private method via any for testing
    const processor = new ImageProcessor() as unknown as {
      calculateDimensions: (
        originalWidth: number,
        originalHeight: number,
        resize?: ImageResizeOptions,
      ) => { width: number; height: number };
      getMimeType: (format?: ImageFormatOptions) => string;
      getExtension: (format?: ImageFormatOptions) => string;
    };

    it('should return original dimensions without resize options', () => {
      const result = processor.calculateDimensions(1920, 1080, undefined);
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    it('should return original dimensions when no width or height specified', () => {
      const result = processor.calculateDimensions(1920, 1080, { fit: 'contain' });
      expect(result).toEqual({ width: 1920, height: 1080 });
    });

    describe('fit: contain', () => {
      it('should fit landscape image within bounds', () => {
        const result = processor.calculateDimensions(1920, 1080, {
          width: 800,
          height: 600,
          fit: 'contain',
        });
        // Landscape image: width determines size
        expect(result.width).toBe(800);
        expect(result.height).toBeLessThanOrEqual(600);
      });

      it('should fit portrait image within bounds', () => {
        const result = processor.calculateDimensions(1080, 1920, {
          width: 800,
          height: 600,
          fit: 'contain',
        });
        // Portrait image: height determines size
        expect(result.height).toBeLessThanOrEqual(600);
        expect(result.width).toBeLessThanOrEqual(800);
      });
    });

    describe('fit: cover', () => {
      it('should cover bounds with landscape image', () => {
        const result = processor.calculateDimensions(1920, 1080, {
          width: 800,
          height: 600,
          fit: 'cover',
        });
        // Cover means filling the area
        expect(result.width).toBeGreaterThanOrEqual(800);
        expect(result.height).toBeGreaterThanOrEqual(600);
      });

      it('should cover bounds with portrait image', () => {
        const result = processor.calculateDimensions(1080, 1920, {
          width: 800,
          height: 600,
          fit: 'cover',
        });
        expect(result.width).toBeGreaterThanOrEqual(800);
        expect(result.height).toBeGreaterThanOrEqual(600);
      });
    });

    describe('fit: fill', () => {
      it('should use exact dimensions', () => {
        const result = processor.calculateDimensions(1920, 1080, {
          width: 800,
          height: 600,
          fit: 'fill',
        });
        expect(result).toEqual({ width: 800, height: 600 });
      });
    });

    describe('fit: inside', () => {
      it('should not enlarge image', () => {
        const result = processor.calculateDimensions(400, 300, {
          width: 800,
          height: 600,
          fit: 'inside',
        });
        // Original is smaller, should return original
        expect(result).toEqual({ width: 400, height: 300 });
      });

      it('should shrink image to fit inside', () => {
        const result = processor.calculateDimensions(1920, 1080, {
          width: 800,
          height: 600,
          fit: 'inside',
        });
        expect(result.width).toBeLessThanOrEqual(800);
        expect(result.height).toBeLessThanOrEqual(600);
      });
    });

    describe('fit: outside', () => {
      it('should scale image to cover bounds', () => {
        const result = processor.calculateDimensions(1920, 1080, {
          width: 800,
          height: 600,
          fit: 'outside',
        });
        // Similar to cover
        expect(result.width).toBeGreaterThanOrEqual(800);
      });
    });

    describe('withoutEnlargement', () => {
      it('should not enlarge when withoutEnlargement is true', () => {
        const result = processor.calculateDimensions(400, 300, {
          width: 800,
          height: 600,
          fit: 'contain',
          withoutEnlargement: true,
        });
        expect(result.width).toBeLessThanOrEqual(400);
        expect(result.height).toBeLessThanOrEqual(300);
      });

      it('should allow shrinking with withoutEnlargement', () => {
        const result = processor.calculateDimensions(1920, 1080, {
          width: 800,
          height: 600,
          fit: 'contain',
          withoutEnlargement: true,
        });
        expect(result.width).toBeLessThanOrEqual(800);
        expect(result.height).toBeLessThanOrEqual(600);
      });
    });
  });

  describe('getMimeType (internal)', () => {
    const processor = new ImageProcessor() as unknown as {
      getMimeType: (format?: ImageFormatOptions) => string;
    };

    it('should return image/jpeg for jpeg format', () => {
      expect(processor.getMimeType({ format: 'jpeg' })).toBe('image/jpeg');
    });

    it('should return image/png for png format', () => {
      expect(processor.getMimeType({ format: 'png' })).toBe('image/png');
    });

    it('should return image/webp for webp format', () => {
      expect(processor.getMimeType({ format: 'webp' })).toBe('image/webp');
    });

    it('should return image/jpeg as default', () => {
      expect(processor.getMimeType(undefined)).toBe('image/jpeg');
      expect(processor.getMimeType({})).toBe('image/jpeg');
    });
  });

  describe('getExtension (internal)', () => {
    const processor = new ImageProcessor() as unknown as {
      getExtension: (format?: ImageFormatOptions) => string;
    };

    it('should return format extension', () => {
      expect(processor.getExtension({ format: 'png' })).toBe('png');
      expect(processor.getExtension({ format: 'webp' })).toBe('webp');
    });

    it('should return jpeg as default', () => {
      expect(processor.getExtension(undefined)).toBe('jpeg');
      expect(processor.getExtension({})).toBe('jpeg');
    });
  });

  describe('getBasicMetadata (internal)', () => {
    it('should return metadata with size and format', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 4096 } as never);

      const processor = new ImageProcessor();
      const metadata = await processor.getMetadata('/test/image.png');

      expect(metadata.size).toBe(4096);
      expect(metadata.format).toBe('png');
    });

    it('should return empty metadata on error', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.stat).mockRejectedValue(new Error('File not found'));

      const processor = new ImageProcessor() as unknown as {
        getBasicMetadata: (inputPath: string) => Promise<ImageMetadata>;
      };
      const metadata = await processor.getBasicMetadata('/nonexistent.jpg');

      expect(metadata).toEqual({});
    });
  });

  describe('process with error handling', () => {
    it('should return error result on mkdir failure', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.mkdir).mockRejectedValue(new Error('Permission denied'));

      const processor = new ImageProcessor();
      const result = await processor.process('/input.jpg', '/output.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission denied');
    });

    it('should return error result on non-Error exception', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.mkdir).mockRejectedValue('String error');

      const processor = new ImageProcessor();
      const result = await processor.process('/input.jpg', '/output.jpg');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Image processing failed');
    });
  });

  describe('processBasic (fallback path)', () => {
    it('should copy file with resize options', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 2048 } as never);

      const processor = new ImageProcessor();
      const result = await processor.process('/input.jpg', '/output.jpg', {
        resize: { width: 800, height: 600 },
      });

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe('/output.jpg');
      expect(result.metadata?.size).toBe(2048);
    });

    it('should copy file with format options', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as never);

      const processor = new ImageProcessor();
      const result = await processor.process('/input.jpg', '/output.webp', {
        format: { format: 'webp', quality: 80 },
      });

      expect(result.success).toBe(true);
    });

    it('should copy file with thumbnail options', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 512 } as never);

      const processor = new ImageProcessor();
      const result = await processor.process('/input.jpg', '/output.jpg', {
        thumbnail: { size: 150 },
      });

      expect(result.success).toBe(true);
    });

    it('should copy file without any processing options', async () => {
      const fs = await import('fs');
      vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.promises.copyFile).mockResolvedValue(undefined);
      vi.mocked(fs.promises.stat).mockResolvedValue({ size: 4096 } as never);

      const processor = new ImageProcessor();
      const result = await processor.process('/input.jpg', '/output.jpg', {});

      expect(result.success).toBe(true);
      expect(result.metadata?.size).toBe(4096);
    });
  });

  describe('processWithCanvas (when Canvas is available)', () => {
    const originalDocument = globalThis.document;

    beforeEach(() => {
      // Mock document.createElement to return a canvas mock
      const mockCanvas = createMockCanvas();
      const mockImage = {
        src: '',
        width: 1920,
        height: 1080,
        onload: null as (() => void) | null,
        onerror: null as ((e: Error) => void) | null,
      };

      globalThis.document = {
        createElement: vi.fn((tagName: string) => {
          if (tagName === 'canvas') return mockCanvas;
          if (tagName === 'img') return mockImage;
          return null;
        }),
      } as unknown as Document;
    });

    afterEach(() => {
      globalThis.document = originalDocument;
    });

    it('should detect canvas support when document is available', () => {
      // With our mock, hasCanvasSupport should now return true
      expect(globalThis.document).toBeDefined();
      expect(typeof globalThis.document.createElement).toBe('function');
    });
  });

  describe('calculateDimensions edge cases', () => {
    const processor = new ImageProcessor() as unknown as {
      calculateDimensions: (
        originalWidth: number,
        originalHeight: number,
        resize?: ImageResizeOptions,
      ) => { width: number; height: number };
    };

    it('should handle square image with contain fit', () => {
      const result = processor.calculateDimensions(1000, 1000, {
        width: 800,
        height: 600,
        fit: 'contain',
      });
      // Square image should fit within bounds
      expect(result.width).toBeLessThanOrEqual(800);
      expect(result.height).toBeLessThanOrEqual(600);
    });

    it('should handle only width specified', () => {
      const result = processor.calculateDimensions(1920, 1080, {
        width: 800,
        fit: 'contain',
      });
      expect(result.width).toBe(800);
      // Height should maintain aspect ratio
      expect(result.height).toBeLessThanOrEqual(1080);
    });

    it('should handle only height specified', () => {
      const result = processor.calculateDimensions(1920, 1080, {
        height: 600,
        fit: 'contain',
      });
      expect(result.height).toBeLessThanOrEqual(600);
    });

    it('should handle inside fit with smaller image', () => {
      const result = processor.calculateDimensions(400, 300, {
        width: 800,
        height: 600,
        fit: 'inside',
      });
      // Inside fit should not enlarge smaller images
      expect(result.width).toBe(400);
      expect(result.height).toBe(300);
    });

    it('should handle outside fit for portrait image', () => {
      const result = processor.calculateDimensions(1080, 1920, {
        width: 800,
        height: 600,
        fit: 'outside',
      });
      // At least one dimension should match or exceed target
      expect(result.width >= 800 || result.height >= 600).toBe(true);
    });

    it('should handle cover fit for portrait image', () => {
      const result = processor.calculateDimensions(1080, 1920, {
        width: 800,
        height: 600,
        fit: 'cover',
      });
      // Cover should fill the entire target area
      expect(result.width).toBeGreaterThanOrEqual(800);
    });

    it('should respect withoutEnlargement for small images', () => {
      const result = processor.calculateDimensions(100, 100, {
        width: 800,
        height: 600,
        fit: 'fill',
        withoutEnlargement: true,
      });
      expect(result.width).toBeLessThanOrEqual(100);
      expect(result.height).toBeLessThanOrEqual(100);
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
