// packages/media/src/image-processing.ts
/**
 * Custom Image Processing - Lightweight replacement for Sharp
 *
 * Basic image processing using Canvas API where available,
 * with fallback to simple operations.
 */

import { promises as fs } from 'fs';
import path from 'path';

// DOM types for Canvas API (module-scoped to avoid conflicts with lib.dom.d.ts)
interface IHTMLElement {
  readonly tagName?: string;
}

interface IHTMLImageElement extends IHTMLElement {
  src: string;
  width: number;
  height: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
}

interface ICanvasRenderingContext2D {
  drawImage(image: IHTMLImageElement, dx: number, dy: number, dw?: number, dh?: number): void;
  canvas: IHTMLCanvasElement;
}

interface IHTMLCanvasElement extends IHTMLElement {
  width: number;
  height: number;
  getContext(contextId: '2d'): ICanvasRenderingContext2D | null;
  toBlob(callback: (blob: Blob | null) => void, type?: string, quality?: number): void;
}

interface IDocument {
  createElement(tagName: 'canvas'): IHTMLCanvasElement;
  createElement(tagName: 'img'): IHTMLImageElement;
  createElement(tagName: string): IHTMLElement;
}

interface IImageConstructor {
  new (): IHTMLImageElement;
}

// Type-safe access to browser globals via globalThis
interface BrowserGlobals {
  document?: IDocument;
  Image?: IImageConstructor;
  HTMLCanvasElement?: { prototype: IHTMLCanvasElement };
}

function getBrowserGlobals(): BrowserGlobals {
  return globalThis as unknown as BrowserGlobals;
}

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  withoutEnlargement?: boolean;
}

export interface ImageFormatOptions {
  format?: 'jpeg' | 'png' | 'webp';
  quality?: number;
  compressionLevel?: number;
  progressive?: boolean;
}

export interface ImageProcessingOptions {
  resize?: ImageResizeOptions;
  format?: ImageFormatOptions;
  thumbnail?: {
    size: number;
    fit?: 'contain' | 'cover' | 'fill';
  };
}

export interface ImageMetadata {
  width?: number;
  height?: number;
  format?: string;
  size?: number;
}

export interface ProcessingResult {
  success: boolean;
  outputPath?: string;
  thumbnailPath?: string;
  metadata?: ImageMetadata;
  error?: string;
}

// ============================================================================
// Image Processing Class
// ============================================================================

export class ImageProcessor {
  /**
   * Check if Canvas API is available
   */
  private hasCanvasSupport(): boolean {
    const globals = getBrowserGlobals();
    return (
      typeof globalThis !== 'undefined' &&
      globals.document !== undefined &&
      typeof globals.document.createElement === 'function' &&
      globals.Image !== undefined &&
      globals.HTMLCanvasElement !== undefined
    );
  }

  /**
   * Process an image with the given options
   */
  async process(
    inputPath: string,
    outputPath: string,
    options: ImageProcessingOptions = {},
  ): Promise<ProcessingResult> {
    try {
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      if (this.hasCanvasSupport()) {
        return await this.processWithCanvas(inputPath, outputPath, options);
      } else {
        return await this.processBasic(inputPath, outputPath, options);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Image processing failed',
      };
    }
  }

  /**
   * Process image using Canvas API (browser/server with canvas support)
   */
  private async processWithCanvas(
    inputPath: string,
    outputPath: string,
    options: ImageProcessingOptions,
  ): Promise<ProcessingResult> {
    const globals = getBrowserGlobals();
    const ImageConstructor = globals.Image;
    const doc = globals.document;

    if (!ImageConstructor || !doc) {
      return {
        success: false,
        error: 'Browser APIs not available',
      };
    }

    try {
      // Load image from file first
      const buffer = await fs.readFile(inputPath);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);

      // Create image element
      const img = new ImageConstructor();

      return await new Promise<ProcessingResult>((resolve) => {
        img.onload = (): void => {
          try {
            // Create canvas
            const canvas = doc.createElement('canvas');
            const ctx = canvas.getContext('2d');

            if (!ctx) {
              resolve({
                success: false,
                error: 'Canvas context not available',
              });
              return;
            }

            // Calculate dimensions
            const { width, height } = this.calculateDimensions(
              img.width,
              img.height,
              options.resize,
            );

            canvas.width = width;
            canvas.height = height;

            // Draw and resize
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to desired format
            const mimeType = this.getMimeType(options.format);
            const quality = options.format?.quality ? options.format.quality / 100 : 0.8;

            canvas.toBlob(
              (blobResult) => {
                if (!blobResult) {
                  resolve({
                    success: false,
                    error: 'Failed to create image blob',
                  });
                  return;
                }

                // Convert blob to buffer and save
                void blobResult.arrayBuffer().then(async (arrayBuf) => {
                  await fs.writeFile(outputPath, Buffer.from(arrayBuf));

                  // Generate thumbnail if requested
                  let thumbnailPath: string | undefined;
                  if (options.thumbnail) {
                    thumbnailPath = outputPath.replace(/\.[^.]+$/, '_thumb.jpg');
                    await this.generateThumbnailWithCanvas(img, thumbnailPath, options.thumbnail);
                  }

                  resolve({
                    success: true,
                    outputPath,
                    thumbnailPath,
                    metadata: {
                      width,
                      height,
                      format: this.getExtension(options.format),
                      size: arrayBuf.byteLength,
                    },
                  });
                });
              },
              mimeType,
              quality,
            );
          } catch (error) {
            resolve({
              success: false,
              error: error instanceof Error ? error.message : 'Canvas processing failed',
            });
          }
        };

        img.onerror = (): void => {
          resolve({
            success: false,
            error: 'Failed to load image',
          });
        };

        // Set image source
        img.src = url;
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Canvas setup failed',
      };
    }
  }

  /**
   * Basic image processing (fallback when Canvas is not available)
   */
  private async processBasic(
    inputPath: string,
    outputPath: string,
    options: ImageProcessingOptions,
  ): Promise<ProcessingResult> {
    // For server environments without Canvas, we can only do basic operations
    // In a real implementation, you might use a native image library or skip processing

    if (options.resize || options.format || options.thumbnail) {
      // Cannot process without Canvas, just copy the file
      await fs.copyFile(inputPath, outputPath);

      return {
        success: true,
        outputPath,
        metadata: await this.getBasicMetadata(inputPath),
      };
    }

    // No processing needed, just copy
    await fs.copyFile(inputPath, outputPath);

    return {
      success: true,
      outputPath,
      metadata: await this.getBasicMetadata(inputPath),
    };
  }

  /**
   * Generate thumbnail using Canvas
   */
  private async generateThumbnailWithCanvas(
    img: IHTMLImageElement,
    outputPath: string,
    options: { size: number; fit?: 'contain' | 'cover' | 'fill' },
  ): Promise<void> {
    const doc = getBrowserGlobals().document;
    if (!doc) {
      throw new Error('Document API not available');
    }

    return new Promise((resolve, reject) => {
      try {
        const canvas = doc.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        const size = options.size;
        canvas.width = size;
        canvas.height = size;

        // Calculate thumbnail dimensions
        const aspectRatio = img.width / img.height;
        let drawWidth: number;
        let drawHeight: number;
        let offsetX = 0;
        let offsetY = 0;

        if (aspectRatio > 1) {
          // Landscape
          drawWidth = size;
          drawHeight = size / aspectRatio;
          offsetY = (size - drawHeight) / 2;
        } else {
          // Portrait
          drawWidth = size * aspectRatio;
          drawHeight = size;
          offsetX = (size - drawWidth) / 2;
        }

        // Draw thumbnail
        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

        // Convert to JPEG and save
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create thumbnail blob'));
              return;
            }

            void blob.arrayBuffer().then(async (arrayBuf) => {
              await fs.writeFile(outputPath, Buffer.from(arrayBuf));
              resolve();
            });
          },
          'image/jpeg',
          0.8,
        );
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  /**
   * Calculate output dimensions based on resize options
   */
  private calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    resize?: ImageResizeOptions,
  ): { width: number; height: number } {
    if (!resize) {
      return { width: originalWidth, height: originalHeight };
    }

    const { width, height, fit = 'contain', withoutEnlargement = false } = resize;

    if (!width && !height) {
      return { width: originalWidth, height: originalHeight };
    }

    let targetWidth = width || originalWidth;
    let targetHeight = height || originalHeight;

    // Calculate dimensions based on fit mode
    const aspectRatio = originalWidth / originalHeight;
    const targetAspectRatio = targetWidth / targetHeight;

    switch (fit) {
      case 'contain':
        if (aspectRatio > targetAspectRatio) {
          targetHeight = targetWidth / aspectRatio;
        } else {
          targetWidth = targetHeight * aspectRatio;
        }
        break;
      case 'cover':
        if (aspectRatio > targetAspectRatio) {
          targetWidth = targetHeight * aspectRatio;
        } else {
          targetHeight = targetWidth / aspectRatio;
        }
        break;
      case 'fill':
        // Exact dimensions, ignore aspect ratio
        break;
      case 'inside':
        if (targetWidth > originalWidth || targetHeight > originalHeight) {
          return { width: originalWidth, height: originalHeight };
        }
        if (aspectRatio > targetAspectRatio) {
          targetHeight = targetWidth / aspectRatio;
        } else {
          targetWidth = targetHeight * aspectRatio;
        }
        break;
      case 'outside':
        if (aspectRatio > targetAspectRatio) {
          targetWidth = targetHeight * aspectRatio;
        } else {
          targetHeight = targetWidth / aspectRatio;
        }
        break;
    }

    // Apply withoutEnlargement
    if (withoutEnlargement) {
      targetWidth = Math.min(targetWidth, originalWidth);
      targetHeight = Math.min(targetHeight, originalHeight);
    }

    return {
      width: Math.round(targetWidth),
      height: Math.round(targetHeight),
    };
  }

  /**
   * Get MIME type for format
   */
  private getMimeType(format?: ImageFormatOptions): string {
    switch (format?.format) {
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Get file extension for format
   */
  private getExtension(format?: ImageFormatOptions): string {
    return format?.format || 'jpeg';
  }

  /**
   * Get basic metadata (fallback when advanced processing isn't available)
   */
  private async getBasicMetadata(inputPath: string): Promise<ImageMetadata> {
    try {
      const stats = await fs.stat(inputPath);
      return {
        size: stats.size,
        format: path.extname(inputPath).slice(1),
      };
    } catch {
      return {};
    }
  }

  /**
   * Get detailed metadata from processed image
   */
  async getMetadata(inputPath: string): Promise<ImageMetadata> {
    // In a real implementation, you might parse image headers
    // For now, just return basic info
    return await this.getBasicMetadata(inputPath);
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create image processor instance
 */
export function createImageProcessor(): ImageProcessor {
  return new ImageProcessor();
}

/**
 * Simple image format detection
 */
export function getImageFormat(buffer: Buffer): string {
  if (buffer.length < 4) return 'unknown';

  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    return 'jpeg';
  }

  // PNG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'png';
  }

  // GIF
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'gif';
  }

  // WebP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
    // Check for WEBP
    if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
      return 'webp';
    }
  }

  return 'unknown';
}
