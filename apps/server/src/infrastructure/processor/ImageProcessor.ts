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
    let image: sharp.Sharp | null = null;

    try {
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await this.fileUtils.ensureDirectory(targetDir);

      // Get original metadata
      const metadata = await sharp(sourcePath).metadata();

      // Initialize Sharp instance
      image = sharp(sourcePath);

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
    } finally {
      // Explicitly release resources
      this.releaseImageResources(image);
    }
  }

  /**
   * Release resources associated with a Sharp instance
   * This helps prevent file locking issues
   * @param image Sharp instance to release
   */
  private releaseImageResources(image: sharp.Sharp | null): void {
    if (image) {
      try {
        // Close any open input file handles
        // Use unknown for internal properties not exposed in Sharp types
        (image as unknown as { options: { input: null } }).options.input = null;

        // This helps release internal buffers
        if (typeof image.destroy === "function") {
          image.destroy();
        }
      } catch (error) {
        // Just log at debug level, don't throw
        this.logger.debug("Error releasing image resources", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
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
    let image: sharp.Sharp | null = null;

    try {
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      await this.fileUtils.ensureDirectory(targetDir);

      // Get original metadata to calculate aspect ratio
      const metadata = await sharp(sourcePath).metadata();
      if (!metadata.width || !metadata.height) {
        throw new Error("Could not determine image dimensions");
      }

      // Initialize Sharp instance
      image = sharp(sourcePath);

      // Apply rotation based on EXIF data
      image = image.rotate();

      // Create thumbnail (resize with aspect ratio)
      image = image.resize({
        width: size,
        height: size,
        fit: "inside",
        withoutEnlargement: true,
      });

      // Convert to WebP for better compression regardless of source format
      image = image.webp({ quality: 75 });

      // Save the thumbnail
      await image.toFile(targetPath);

      return targetPath;
    } catch (error) {
      this.logger.error(`Error generating thumbnail: ${sourcePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    } finally {
      // Explicitly release resources
      this.releaseImageResources(image);
    }
  }

  /**
   * Extract EXIF data from an image
   * @param filePath File path
   */
  async extractExifData(filePath: string): Promise<Buffer | null> {
    let image: sharp.Sharp | null = null;

    try {
      // Check if file exists
      if (!(await this.fileUtils.fileExists(filePath))) {
        throw new Error(`Input file is missing: ${filePath}`);
      }

      // Initialize Sharp instance
      image = sharp(filePath);

      // Extract the EXIF data
      const metadata = await image.metadata();

      // Return the EXIF buffer if it exists
      return metadata.exif || null;
    } catch (error) {
      this.logger.error(`Error extracting EXIF data: ${filePath}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    } finally {
      // Explicitly release resources
      this.releaseImageResources(image);
    }
  }

  /**
   * Destroy and release all resources
   * Call this when you're done using the ImageProcessor
   */
  public destroy(): void {
    try {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
    } catch (error) {
      this.logger.debug("Error during garbage collection", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
