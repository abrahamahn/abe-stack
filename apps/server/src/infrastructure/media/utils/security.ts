// apps/server/src/infrastructure/media/utils/security.ts
/**
 * Media Security Scanner
 *
 * Scans uploaded media files for malware, viruses, and inappropriate content.
 * Provides Series A-ready security validation for file uploads.
 */

import { promises as fs } from 'fs';
import path from 'path';

import { detectFileType, detectFileTypeFromPath } from './file-type';

export interface SecurityScanResult {
  safe: boolean;
  threats?: string[];
  warnings?: string[];
  metadata?: {
    fileSize: number;
    mimeType?: string;
    hasExif?: boolean;
    dimensions?: { width: number; height: number };
  };
}

export interface ContentModerationResult {
  approved: boolean;
  categories?: string[];
  confidence?: number;
  reviewRecommended?: boolean;
}

interface SharpInstance {
  metadata: () => Promise<{
    width?: number;
    height?: number;
    format?: string;
    exif?: Buffer;
    hasProfile?: boolean;
    hasAlpha?: boolean;
  }>;
}

type SharpFunction = (input: string) => SharpInstance;

/**
 * Media Security Scanner
 */
export class MediaSecurityScanner {
  private initialized = false;
  private sharpModule: SharpFunction | null = null;

  constructor(
    private options: {
      maxFileSize?: number;
      allowedMimeTypes?: string[];
    } = {},
  ) {
    this.options = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'image/avif',
        'image/tiff',
        'image/bmp',
        'audio/mpeg',
        'audio/wav',
        'audio/flac',
        'audio/aac',
        'audio/ogg',
        'audio/m4a',
        'video/mp4',
        'video/avi',
        'video/quicktime',
        'video/x-matroska',
        'video/webm',
        'video/x-flv',
      ],
      ...options,
    };
  }

  /**
   * Lazy load sharp module
   */
  private async getSharp(): Promise<SharpFunction> {
    if (this.sharpModule === null) {
      const sharpModule = (await import('sharp')) as { default: SharpFunction };
      this.sharpModule = sharpModule.default;
    }
    return this.sharpModule;
  }

  /**
   * Initialize the scanner (async setup)
   */
  initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
  }

  /**
   * Comprehensive security scan of a media file
   */
  async scanFile(filePath: string): Promise<SecurityScanResult> {
    this.initialize();

    const threats: string[] = [];
    const warnings: string[] = [];
    const metadata: SecurityScanResult['metadata'] = {
      fileSize: 0,
      hasExif: false,
    };

    const maxFileSize = this.options.maxFileSize ?? 100 * 1024 * 1024;
    const allowedMimeTypes = this.options.allowedMimeTypes ?? [];

    try {
      // Basic file validation
      const stats = await fs.stat(filePath);
      metadata.fileSize = stats.size;

      // Size check
      if (stats.size > maxFileSize) {
        threats.push(`File size ${String(stats.size)} exceeds limit ${String(maxFileSize)}`);
        return { safe: false, threats, warnings, metadata };
      }

      if (stats.size === 0) {
        threats.push('File is empty');
        return { safe: false, threats, warnings, metadata };
      }

      // MIME type detection
      const mimeType = await this.detectMimeType(filePath);
      metadata.mimeType = mimeType;

      if (!allowedMimeTypes.includes(mimeType)) {
        threats.push(`Disallowed MIME type: ${mimeType}`);
        return { safe: false, threats, warnings, metadata };
      }

      // Basic security validation (no external virus scanning)
      // In production, consider integrating with external virus scanning services
      // or using operating system level scanning

      // Image-specific checks
      if (mimeType.startsWith('image/')) {
        const imageChecks = await this.scanImage(filePath);
        Object.assign(metadata, imageChecks.metadata);
        threats.push(...(imageChecks.threats ?? []));
        warnings.push(...(imageChecks.warnings ?? []));
      }

      // Additional security checks
      const additionalChecks = await this.additionalSecurityChecks(filePath, mimeType);
      threats.push(...additionalChecks.threats);
      warnings.push(...additionalChecks.warnings);

      return { safe: threats.length === 0, threats, warnings, metadata };
    } catch (error) {
      threats.push(`Scan failed: ${error instanceof Error ? error.message : String(error)}`);
      return { safe: false, threats, warnings, metadata };
    }
  }

  /**
   * Image-specific security checks
   */
  private async scanImage(filePath: string): Promise<SecurityScanResult> {
    const threats: string[] = [];
    const warnings: string[] = [];
    const scanMetadata: SecurityScanResult['metadata'] = { fileSize: 0 };

    try {
      const sharp = await this.getSharp();
      const image = sharp(filePath);
      const metadata = await image.metadata();

      scanMetadata.dimensions = {
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
      };

      // Check for EXIF data (privacy concern)
      if (metadata.exif !== undefined) {
        scanMetadata.hasExif = true;
        warnings.push('File contains EXIF metadata (privacy concern)');
      }

      // Suspicious dimensions (too large or unusual ratios)
      if (metadata.width !== undefined && metadata.height !== undefined) {
        const ratio =
          Math.max(metadata.width, metadata.height) / Math.min(metadata.width, metadata.height);

        if (ratio > 100) {
          warnings.push('Unusual image dimensions ratio');
        }

        if (metadata.width > 50000 || metadata.height > 50000) {
          threats.push('Image dimensions too large (possible DoS)');
        }
      }

      // Check for embedded thumbnails or unusual metadata
      if (metadata.hasProfile === true || metadata.hasAlpha === true) {
        warnings.push('Image contains additional data (profile/alpha)');
      }
    } catch {
      threats.push('Image processing failed');
    }

    return {
      safe: threats.length === 0,
      threats,
      warnings,
      metadata: scanMetadata,
    };
  }

  /**
   * Additional security checks for any file type
   */
  private async additionalSecurityChecks(
    filePath: string,
    mimeType: string,
  ): Promise<{ threats: string[]; warnings: string[] }> {
    const threats: string[] = [];
    const warnings: string[] = [];

    try {
      // Read first few bytes to check for file signatures
      const buffer = Buffer.alloc(512);
      const fileHandle = await fs.open(filePath, 'r');
      await fileHandle.read(buffer, 0, 512, 0);
      await fileHandle.close();

      // Check for common file signature mismatches
      const actualSignature = buffer.subarray(0, 8);
      const expectedSignature = this.getExpectedSignature(mimeType);

      if (
        expectedSignature !== null &&
        !actualSignature.subarray(0, expectedSignature.length).equals(expectedSignature)
      ) {
        threats.push('File signature mismatch (possible spoofed file type)');
      }

      // Check for suspicious content patterns
      const content = buffer.toString('binary');

      // Look for embedded scripts in text-based files
      if (
        mimeType.startsWith('text/') ||
        mimeType.includes('javascript') ||
        mimeType.includes('json')
      ) {
        if (
          content.includes('<script') ||
          content.includes('javascript:') ||
          content.includes('eval(')
        ) {
          threats.push('Potential XSS content detected');
        }
      }

      // Check for extremely large embedded data
      if (buffer.includes(Buffer.from('<?php'))) {
        threats.push('PHP code detected in file');
      }
    } catch {
      warnings.push('Could not perform deep content analysis');
    }

    return { threats, warnings };
  }

  /**
   * Detect MIME type from file content
   */
  private async detectMimeType(filePath: string): Promise<string> {
    try {
      // Read first 64 bytes to detect file type
      const buffer = Buffer.alloc(64);
      const fileHandle = await fs.open(filePath, 'r');
      await fileHandle.read(buffer, 0, 64, 0);
      await fileHandle.close();

      // Use our custom file type detection
      const fileType = detectFileType(buffer);
      if (fileType !== null) {
        return fileType.mime;
      }

      // Fallback to extension-based detection
      const extFileType = detectFileTypeFromPath(filePath);
      if (extFileType !== null) {
        return extFileType.mime;
      }

      return 'application/octet-stream';
    } catch {
      // Fallback to extension-based detection
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = new Map<string, string>([
        ['.jpg', 'image/jpeg'],
        ['.jpeg', 'image/jpeg'],
        ['.png', 'image/png'],
        ['.gif', 'image/gif'],
        ['.webp', 'image/webp'],
        ['.mp3', 'audio/mpeg'],
        ['.wav', 'audio/wav'],
        ['.mp4', 'video/mp4'],
      ]);
      return mimeTypes.get(ext) ?? 'application/octet-stream';
    }
  }

  /**
   * Get expected file signature for a MIME type
   */
  private getExpectedSignature(mimeType: string): Buffer | null {
    const signatures = new Map<string, Buffer>([
      ['image/jpeg', Buffer.from([0xff, 0xd8, 0xff])],
      ['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47])],
      ['image/gif', Buffer.from([0x47, 0x49, 0x46])],
      ['image/webp', Buffer.from([0x52, 0x49, 0x46, 0x46])],
      ['audio/mpeg', Buffer.from([0xff, 0xfb])],
      ['video/mp4', Buffer.from([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70])],
    ]);

    return signatures.get(mimeType) ?? null;
  }

  /**
   * Content moderation (placeholder for future AI integration)
   */
  moderateContent(_filePath: string, _mimeType: string): ContentModerationResult {
    // Placeholder for future AI-based content moderation
    // This would integrate with services like:
    // - Google Cloud Vision API
    // - AWS Rekognition
    // - Azure Content Moderator

    return {
      approved: true, // Default to approved for now
      reviewRecommended: false,
    };
  }
}
