import path from 'path';

import sharp from 'sharp';

import { MediaType, ProcessingStatus, ImageSize, ImageMetadata } from '../../types/media.types';

import { BaseMediaProcessor, BaseProcessingResult } from './BaseMediaProcessor';

/**
 * Image processing result interface
 */
export interface ImageProcessingResult extends BaseProcessingResult {
  dimensions: ImageSize;
  metadata: ImageMetadata;
}

/**
 * Image processing options
 */
export interface ImageProcessingOptions {
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  generateThumbnails?: boolean;
  maxWidth?: number;
  maxHeight?: number;
  preserveAspectRatio?: boolean;
}

/**
 * Default image sizes for different variants
 */
const DEFAULT_IMAGE_SIZES = {
  original: { width: 2048, height: 2048 },
  large: { width: 1024, height: 1024 },
  medium: { width: 512, height: 512 },
  small: { width: 256, height: 256 },
  thumbnail: { width: 128, height: 128 }
};

/**
 * Image processor class for handling image processing operations
 */
export class ImageProcessor extends BaseMediaProcessor {
  private readonly imageSizes: Record<string, ImageSize>;
  
  constructor(uploadDir: string, imageSizes?: Record<string, ImageSize>) {
    super(path.join(uploadDir, 'images'), 'ImageProcessor');
    this.imageSizes = imageSizes || DEFAULT_IMAGE_SIZES;
  }
  
  /**
   * Process an image file
   */
  public async process(filePath: string, options?: ImageProcessingOptions): Promise<ImageProcessingResult> {
    const mediaId = this.generateFileId();
    const opts = this.getProcessingOptions(options);
    
    try {
      // Get image metadata
      const metadata = await this.getImageMetadata(filePath);
      
      // Create output directory
      const outputDir = path.join(this.uploadDir, mediaId);
      await this.ensureDirectoryExists(outputDir);
      
      // Process image variants
      const paths: Record<string, string> = {};
      const sizesToProcess = opts.generateThumbnails 
        ? Object.keys(this.imageSizes) 
        : ['original'];
      
      for (const size of sizesToProcess) {
        const sizeConfig = this.imageSizes[size];
        const outputPath = await this.processImageVariant(
          filePath,
          outputDir,
          size,
          sizeConfig,
          opts
        );
        paths[size] = outputPath;
      }
      
      return {
        mediaId,
        paths,
        dimensions: {
          width: metadata.width,
          height: metadata.height
        },
        metadata,
        status: ProcessingStatus.COMPLETED
      };
    } catch (error) {
      this.logger.error(`Failed to process image: ${filePath}`, { error });
      return {
        mediaId,
        paths: {},
        dimensions: { width: 0, height: 0 },
        metadata: {
          width: 0,
          height: 0,
          format: '',
          fileSize: 0,
          mimeType: ''
        },
        status: ProcessingStatus.FAILED
      };
    }
  }
  
  /**
   * Get the media type
   */
  public getMediaType(): MediaType {
    return MediaType.IMAGE;
  }
  
  /**
   * Get image metadata
   */
  private async getImageMetadata(filePath: string): Promise<ImageMetadata> {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const fileSize = await this.getFileSize(filePath);
    
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || '',
      fileSize,
      mimeType: `image/${metadata.format}`,
      hasAlpha: metadata.hasAlpha as boolean | undefined,
      colorSpace: metadata.space as string | undefined
    };
  }
  
  /**
   * Process an image variant
   */
  private async processImageVariant(
    inputPath: string,
    outputDir: string,
    sizeName: string,
    sizeConfig: ImageSize,
    options: ImageProcessingOptions
  ): Promise<string> {
    const { format = 'jpeg', quality = 80 } = options;
    const outputFilename = `${sizeName}.${format}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    let processor = sharp(inputPath);
    
    // Resize if needed
    if (sizeName !== 'original') {
      processor = processor.resize({
        width: sizeConfig.width,
        height: sizeConfig.height,
        fit: options.preserveAspectRatio ? 'inside' : 'cover',
        withoutEnlargement: true
      });
    } else if (options.maxWidth || options.maxHeight) {
      // For original, only resize if it exceeds max dimensions
      processor = processor.resize({
        width: options.maxWidth,
        height: options.maxHeight,
        fit: 'inside',
        withoutEnlargement: true
      });
    }
    
    // Set output format
    switch (format) {
      case 'jpeg':
        processor = processor.jpeg({ quality });
        break;
      case 'png':
        processor = processor.png({ quality });
        break;
      case 'webp':
        processor = processor.webp({ quality });
        break;
    }
    
    // Save the processed image
    await processor.toFile(outputPath);
    
    return outputPath;
  }
  
  /**
   * Get processing options with defaults
   */
  private getProcessingOptions(options?: ImageProcessingOptions): Required<ImageProcessingOptions> {
    return {
      quality: options?.quality ?? 80,
      format: options?.format ?? 'jpeg',
      generateThumbnails: options?.generateThumbnails ?? true,
      maxWidth: options?.maxWidth ?? 2048,
      maxHeight: options?.maxHeight ?? 2048,
      preserveAspectRatio: options?.preserveAspectRatio ?? true
    };
  }
} 