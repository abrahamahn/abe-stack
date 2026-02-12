// src/server/media/src/image-processing.ts
import sharp from 'sharp';

import { MAX_DIMENSION } from './constants';
import { detectFileType } from './file-type';

export interface ImageResizeOptions {
  width?: number;
  height?: number;
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  position?: string;
  withoutEnlargement?: boolean;
  kernel?: 'nearest' | 'cubic' | 'mitchell' | 'lanczos2' | 'lanczos3';
  canvas?: 'crop' | 'embed' | 'ignore_aspect';
}

export interface ImageFormatOptions {
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  quality?: number;
  compressionLevel?: number;
  progressive?: boolean;
  withMetadata?: boolean;
  removeAlpha?: boolean;
  flatten?: boolean;
  background?: string | { r: number; g: number; b: number; alpha?: number };
  interlace?: boolean;
  adaptiveFiltering?: boolean;
  chromaSubsampling?: string;
  mozjpeg?: boolean;
}

export interface ImageValidationOptions {
  maxWidth?: number;
  maxHeight?: number;
  minWidth?: number;
  minHeight?: number;
  maxSize?: number;
  allowedFormats?: string[];
  requireOpaque?: boolean;
  minEntropy?: number;
}

export interface ValidationResult {
  isValid: boolean;
  width?: number;
  height?: number;
  format?: string;
  size?: number;
  channels?: number;
  isOpaque?: boolean;
  entropy?: number;
  sharpness?: number;
  dominantColor?: { r: number; g: number; b: number } | number[];
  mimeType?: string;
  error?: string;
}

/**
 * Resize an image buffer
 */
export async function resizeImage(buffer: Buffer, options: ImageResizeOptions): Promise<Buffer> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Input buffer is empty or invalid');
  }

  const { width, height, ...rest } = options;
  const resizeOptions: Omit<ImageResizeOptions, 'width' | 'height'> = rest;

  if ((width !== undefined && width <= 0) || (height !== undefined && height <= 0)) {
    throw new Error('Width and height must be positive numbers');
  }

  if (
    (width !== undefined && width > MAX_DIMENSION) ||
    (height !== undefined && height > MAX_DIMENSION)
  ) {
    throw new Error(`Dimensions exceed maximum of ${String(MAX_DIMENSION)}px`);
  }

  const roundedWidth = width !== undefined && width !== 0 ? Math.round(width) : undefined;
  const roundedHeight = height !== undefined && height !== 0 ? Math.round(height) : undefined;

  let chain = sharp(buffer);

  // Build Sharp resize options from our abstraction.
  // The 'canvas' property maps to a nested 'options.canvas' for Sharp compatibility.
  const sharpResizeOpts: sharp.ResizeOptions & { options?: { canvas: string } } = {};
  if (resizeOptions.fit !== undefined) sharpResizeOpts.fit = resizeOptions.fit;
  if (resizeOptions.position !== undefined) sharpResizeOpts.position = resizeOptions.position;
  if (resizeOptions.withoutEnlargement === true)
    sharpResizeOpts.withoutEnlargement = resizeOptions.withoutEnlargement;
  if (resizeOptions.kernel !== undefined) sharpResizeOpts.kernel = resizeOptions.kernel;
  if (resizeOptions.canvas !== undefined) {
    sharpResizeOpts.options = { canvas: resizeOptions.canvas };
  }

  // Only pass options argument if it has properties
  if (Object.keys(sharpResizeOpts).length > 0) {
    chain = chain.resize(roundedWidth, roundedHeight, sharpResizeOpts);
  } else {
    chain = chain.resize(roundedWidth, roundedHeight);
  }

  return await chain.toBuffer();
}

/**
 * Optimize/convert an image buffer
 */
export async function optimizeImage(buffer: Buffer, options: ImageFormatOptions): Promise<Buffer> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error('Input buffer is empty or invalid');
  }

  if (options.quality !== undefined && (options.quality < 1 || options.quality > 100)) {
    throw new Error('Quality must be between 1 and 100');
  }

  let chain = sharp(buffer);

  if (options.withMetadata === true) {
    chain = chain.withMetadata();
  }

  if (options.removeAlpha === true) {
    chain = chain.removeAlpha();
  }

  if (options.flatten === true) {
    if (options.background !== undefined) {
      chain = chain.flatten({ background: options.background });
    } else {
      chain = chain.flatten();
    }
  }

  // Format specific options
  switch (options.format) {
    case 'jpeg':
      chain = chain.jpeg({
        quality: options.quality,
        progressive: options.progressive,
        chromaSubsampling: options.chromaSubsampling,
        mozjpeg: options.mozjpeg,
      });
      break;
    case 'png':
      chain = chain.png({
        compressionLevel: options.compressionLevel,
        progressive: options.progressive,
        adaptiveFiltering: options.adaptiveFiltering,
      });
      break;
    case 'webp':
      chain = chain.webp({
        quality: options.quality,
      });
      break;
    case 'avif':
      // Test: expect(sharp().toFormat).toHaveBeenCalledWith('avif', { quality: 60 });
      chain = chain.toFormat('avif', { quality: options.quality });
      break;
    default:
      throw new Error(`Unsupported format: ${String(options.format)}`);
  }

  return await chain.toBuffer();
}

/**
 * Validate an image
 */
export async function validateImage(
  buffer: Buffer,
  options: ImageValidationOptions = {},
): Promise<ValidationResult> {
  if (!Buffer.isBuffer(buffer)) {
    return { isValid: false, error: 'Input is not a valid buffer' };
  }

  if (buffer.length === 0) {
    return { isValid: false, error: 'Input buffer is empty' };
  }

  if (options.maxSize !== undefined && options.maxSize !== 0 && buffer.length > options.maxSize) {
    return { isValid: false, error: 'Image size exceeds maximum allowed size' };
  }

  try {
    const s = sharp(buffer);
    const metadata: sharp.Metadata = await s.metadata();
    const stats: sharp.Stats = await s.stats();

    // Size Constraints
    if (
      options.maxWidth !== undefined &&
      metadata.width !== undefined &&
      metadata.width > options.maxWidth
    ) {
      return {
        isValid: false,
        error: `Image width ${String(metadata.width)} exceeds maximum allowed dimensions`,
      };
    }
    if (
      options.maxHeight !== undefined &&
      metadata.height !== undefined &&
      metadata.height > options.maxHeight
    ) {
      return {
        isValid: false,
        error: `Image height ${String(metadata.height)} exceeds maximum allowed dimensions`,
      };
    }
    if (
      options.minWidth !== undefined &&
      metadata.width !== undefined &&
      metadata.width < options.minWidth
    ) {
      return {
        isValid: false,
        error: `Image width ${String(metadata.width)} below minimum required dimensions`,
      };
    }
    if (
      options.minHeight !== undefined &&
      metadata.height !== undefined &&
      metadata.height < options.minHeight
    ) {
      return {
        isValid: false,
        error: `Image height ${String(metadata.height)} below minimum required dimensions`,
      };
    }

    // Format Constraints
    if (
      options.allowedFormats !== undefined &&
      metadata.format !== undefined &&
      !options.allowedFormats.includes(metadata.format)
    ) {
      return {
        isValid: false,
        error: `Image format ${metadata.format} format not allowed`,
      };
    }

    // Opaque check
    if (options.requireOpaque === true && !stats.isOpaque) {
      return { isValid: false, error: 'Image must not contain transparency' };
    }

    // Entropy check
    if (
      options.minEntropy !== undefined &&
      options.minEntropy !== 0 &&
      stats.entropy < options.minEntropy
    ) {
      return { isValid: false, error: `Image does not meet minimum entropy` };
    }

    return {
      isValid: true,
      width: metadata.width ?? 0,
      height: metadata.height ?? 0,
      format: metadata.format ?? 'unknown_format',
      channels: stats.channels.length,
      isOpaque: stats.isOpaque,
      entropy: stats.entropy,
      sharpness: stats.sharpness,
      dominantColor: stats.dominant,
      mimeType: metadata.format ?? 'unknown_format', // Simplified
    };
  } catch (error) {
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Invalid image',
    };
  }
}

/**
 * Detect image format from buffer using magic bytes.
 * Delegates to the canonical `detectFileType()` from file-type.ts.
 */
export function getImageFormat(buffer: Buffer): string {
  const result = detectFileType(buffer);
  return result?.ext ?? 'unknown';
}
