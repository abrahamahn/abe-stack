// src/server/media/src/processors/image.ts
/**
 * Image Processing Module
 *
 * Handles image processing operations using Sharp library.
 * Provides resizing, format conversion, thumbnail generation,
 * metadata extraction, and variant generation.
 *
 * @module processors/image
 */

import {
  DEFAULT_IMAGE_QUALITY,
  DEFAULT_PNG_COMPRESSION,
  DEFAULT_THUMBNAIL_SIZE,
} from '../constants';

import type { ImageProcessingOptions, MediaMetadata, ProcessingResult } from '../types';

export type { ImageProcessingOptions };

/**
 * Sharp instance interface for type-safe image processing pipeline
 */
interface SharpInstance {
  resize: (options: {
    width?: number;
    height?: number;
    fit?: string;
    withoutEnlargement?: boolean;
  }) => SharpInstance;
  jpeg: (options: { quality?: number; progressive?: boolean }) => SharpInstance;
  png: (options: { compressionLevel?: number }) => SharpInstance;
  webp: (options: { quality?: number }) => SharpInstance;
  avif: (options: { quality?: number }) => SharpInstance;
  toFile: (path: string) => Promise<{ width: number; height: number; format: string }>;
  metadata: () => Promise<{ width?: number; height?: number; format?: string }>;
}

type SharpFunction = (input: string) => SharpInstance;

/**
 * Image processor using Sharp for resizing, format conversion,
 * thumbnail generation, and metadata extraction.
 *
 * Uses lazy module loading to avoid importing the heavy Sharp native
 * dependency until first use.
 *
 * @example
 * ```typescript
 * const processor = new ImageProcessor();
 * const result = await processor.process('input.png', 'output.webp', {
 *   format: { format: 'webp', quality: 85 },
 *   resize: { width: 800, height: 600 },
 * });
 * ```
 */
export class ImageProcessor {
  private sharpModule: SharpFunction | null = null;

  /**
   * Lazy load sharp module to defer native dependency loading
   *
   * @returns The sharp function
   * @complexity O(1) after first call (cached)
   */
  private async getSharp(): Promise<SharpFunction> {
    if (this.sharpModule === null) {
      const sharpModule = (await import('sharp')) as { default: SharpFunction };
      this.sharpModule = sharpModule.default;
    }
    return this.sharpModule;
  }

  /**
   * Process an image with the specified options
   *
   * @param inputPath - Path to the input image file
   * @param outputPath - Path for the processed output file
   * @param options - Image processing configuration (resize, format, thumbnail)
   * @returns Processing result with success status, output path, and metadata
   */
  async process(
    inputPath: string,
    outputPath: string,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessingResult> {
    try {
      const sharp = await this.getSharp();
      let pipeline = sharp(inputPath);

      // Apply resize if specified
      if (options.resize !== undefined) {
        const resizeOptions: {
          width?: number;
          height?: number;
          fit?: string;
          withoutEnlargement?: boolean;
        } = {};
        if (options.resize.width !== undefined) {
          resizeOptions.width = options.resize.width;
        }
        if (options.resize.height !== undefined) {
          resizeOptions.height = options.resize.height;
        }
        if (options.resize.fit !== undefined) {
          resizeOptions.fit = options.resize.fit;
        }
        if (options.resize.withoutEnlargement !== undefined) {
          resizeOptions.withoutEnlargement = options.resize.withoutEnlargement;
        }
        pipeline = pipeline.resize(resizeOptions);
      }

      // Apply format conversion if specified
      if (options.format !== undefined) {
        switch (options.format.format) {
          case 'jpeg':
            pipeline = pipeline.jpeg({
              quality: options.format.quality ?? DEFAULT_IMAGE_QUALITY,
              progressive: options.format.progressive ?? false,
            });
            break;
          case 'png':
            pipeline = pipeline.png({
              compressionLevel: DEFAULT_PNG_COMPRESSION,
            });
            break;
          case 'webp':
            pipeline = pipeline.webp({
              quality: options.format.quality ?? DEFAULT_IMAGE_QUALITY,
            });
            break;
          case 'avif':
            pipeline = pipeline.avif({
              quality: options.format.quality ?? DEFAULT_IMAGE_QUALITY,
            });
            break;
        }
      }

      // Write the main output
      await pipeline.toFile(outputPath);

      // Generate thumbnail if specified
      let thumbnailPath: string | undefined;
      if (options.thumbnail !== undefined) {
        thumbnailPath = outputPath.replace(/(\.[^.]+)$/, '_thumb$1');
        await sharp(inputPath)
          .resize({
            width: options.thumbnail.size,
            height: options.thumbnail.size,
            fit: options.thumbnail.fit ?? 'cover',
          })
          .toFile(thumbnailPath);
      }

      // Get metadata
      const metadata = await this.getMetadata(inputPath);

      const result: ProcessingResult = {
        success: true,
        outputPath,
        metadata,
      };
      if (thumbnailPath !== undefined) {
        result.thumbnailPath = thumbnailPath;
      }
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image processing failed',
      };
    }
  }

  /**
   * Extract metadata from an image file
   *
   * @param inputPath - Path to the image file
   * @returns Extracted media metadata (width, height, format)
   */
  async getMetadata(inputPath: string): Promise<MediaMetadata> {
    try {
      const sharp = await this.getSharp();
      const metadata = await sharp(inputPath).metadata();
      const result: MediaMetadata = {};
      if (metadata.width !== undefined) {
        result.width = metadata.width;
      }
      if (metadata.height !== undefined) {
        result.height = metadata.height;
      }
      if (metadata.format !== undefined) {
        result.format = metadata.format;
      }
      return result;
    } catch {
      return {};
    }
  }

  /**
   * Generate multiple variants of an image (original, optimized, thumbnail)
   *
   * @param inputPath - Path to the source image
   * @param baseOutputPath - Base path for output variants (suffixes appended)
   * @returns Object containing results for each variant
   */
  async generateVariants(
    inputPath: string,
    baseOutputPath: string,
  ): Promise<{
    original: ProcessingResult;
    optimized: ProcessingResult;
    thumbnail: ProcessingResult;
  }> {
    const original = await this.process(inputPath, `${baseOutputPath}_original.jpg`, {});

    const optimized = await this.process(inputPath, `${baseOutputPath}_optimized.jpg`, {
      format: { format: 'jpeg', quality: DEFAULT_IMAGE_QUALITY, progressive: true },
    });

    const thumbnail = await this.process(inputPath, `${baseOutputPath}_thumb.jpg`, {
      resize: { width: DEFAULT_THUMBNAIL_SIZE, height: DEFAULT_THUMBNAIL_SIZE, fit: 'cover' },
    });

    return { original, optimized, thumbnail };
  }
}
