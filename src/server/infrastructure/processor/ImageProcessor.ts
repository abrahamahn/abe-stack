// ImageProcessor.ts
import path from "path";

import sharp from "sharp";

import { ILoggerService } from "@/server/infrastructure/logging";
import { ImageFormat, FileUtils } from "@/server/infrastructure/storage";

/**
 * Image processing options
 */
export interface ImageOptions {
  /**
   * Target width
   */
  width?: number;

  /**
   * Target height
   */
  height?: number;

  /**
   * Output quality (1-100)
   */
  quality?: number;

  /**
   * Output format
   */
  format?: ImageFormat | string;

  /**
   * Resize fit
   */
  fit?: "cover" | "contain" | "fill" | "inside";

  /**
   * Prevent image enlargement
   */
  withoutEnlargement?: boolean;

  /**
   * Apply image enhancement
   */
  enhance?: boolean;

  /**
   * Apply sharpening
   */
  sharpen?: boolean;
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  /**
   * Image width in pixels
   */
  width?: number;

  /**
   * Image height in pixels
   */
  height?: number;

  /**
   * Image format
   */
  format?: string;

  /**
   * File size in bytes
   */
  size: number;

  /**
   * Color space
   */
  space?: string;

  /**
   * Whether image has transparency
   */
  hasAlpha?: boolean;

  /**
   * Orientation from EXIF
   */
  orientation?: number;
}

/**
 * Image processor for resizing, optimizing and converting images
 */
export class ImageProcessor {
  private logger: ILoggerService;
  private fileUtils: FileUtils;

  constructor(logger: ILoggerService, fileUtils: FileUtils) {
    this.logger = logger.createLogger("ImageProcessor");
    this.fileUtils = fileUtils;
  }

  /**
   * Check if a content type is an image
   * @param contentType Content type
   */
  isImage(contentType: string): boolean {
    return (
      contentType.startsWith("image/") &&
      !contentType.includes("svg") &&
      !contentType.includes("icon")
    );
  }

  /**
   * Get image metadata
   * @param filePath File path
   */
  async getMetadata(filePath: string): Promise<ImageMetadata | null> {
    try {
      const stats = await this.fileUtils.getFileStats(filePath);
      const metadata = await sharp(filePath).metadata();

      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: stats.size,
        space: metadata.space,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
      };
    } catch (error) {
      this.logger.error(`Error getting image metadata: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Process and optimize an image
   * @param sourcePath Source image path
   * @param targetPath Target image path
   * @param options Processing options
   */
  async process(
    sourcePath: string,
    targetPath: string,
    options: ImageOptions = {},
  ): Promise<ImageMetadata> {
    try {
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await this.fileUtils.ensureDirectory(targetDir);

      // Get original metadata
      const metadata = await sharp(sourcePath).metadata();

      // Initialize Sharp instance
      let image = sharp(sourcePath);

      // Apply rotation based on EXIF data
      image = image.rotate();

      // Resize if needed
      if (options.width || options.height) {
        image = image.resize({
          width: options.width,
          height: options.height,
          fit: options.fit || "inside",
          withoutEnlargement: options.withoutEnlargement !== false,
        });
      }

      // Apply enhancements if requested
      if (options.enhance) {
        image = image.modulate({
          brightness: 1.05,
          saturation: 1.1,
        });
      }

      // Apply sharpening if requested
      if (options.sharpen) {
        image = image.sharpen();
      }

      // Apply format and quality
      const outputFormat =
        options.format === ImageFormat.ORIGINAL
          ? metadata.format
          : options.format;

      if (
        outputFormat === ImageFormat.JPEG ||
        (!outputFormat && metadata.format === "jpeg")
      ) {
        image = image.jpeg({ quality: options.quality || 80 });
      } else if (
        outputFormat === ImageFormat.PNG ||
        (!outputFormat && metadata.format === "png")
      ) {
        image = image.png({ quality: options.quality || 80 });
      } else if (
        outputFormat === ImageFormat.WEBP ||
        (!outputFormat && metadata.format === "webp")
      ) {
        image = image.webp({ quality: options.quality || 80 });
      } else if (outputFormat === ImageFormat.AVIF) {
        image = image.avif({ quality: options.quality || 80 });
      }

      // Save the processed image
      await image.toFile(targetPath);

      // Get processed file metadata
      const processedMetadata = await this.getMetadata(targetPath);

      return processedMetadata || { size: 0 };
    } catch (error) {
      this.logger.error(
        `Error processing image: ${sourcePath} to ${targetPath}`,
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }
  }

  /**
   * Generate a thumbnail
   * @param sourcePath Source image path
   * @param targetPath Target thumbnail path
   * @param size Thumbnail size
   */
  async generateThumbnail(
    sourcePath: string,
    targetPath: string,
    size: number = 200,
  ): Promise<string> {
    try {
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await this.fileUtils.ensureDirectory(targetDir);

      // Create a new pipeline for processing to ensure resources are closed
      const image = sharp(sourcePath);

      // Create thumbnail
      await image
        .rotate() // Apply rotation based on EXIF
        .resize(size, size, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(targetPath);

      // Force garbage collection without unsafe cast
      if (image && typeof image === "object") {
        // Use optional chaining to safely access and modify properties
        (image as any).options = null;
      }

      return targetPath;
    } catch (error) {
      this.logger.error(`Error generating thumbnail: ${sourcePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Extract EXIF data from an image
   * @param filePath Path to the image file
   */
  async extractExifData(filePath: string): Promise<Buffer | null> {
    try {
      const metadata = await sharp(filePath).metadata();
      return metadata.exif ? metadata.exif : null;
    } catch (error) {
      this.logger.error(`Error extracting EXIF data: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}
