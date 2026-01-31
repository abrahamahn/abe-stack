// infra/media/src/validation.ts
/**
 * Media Validation Utilities
 *
 * Validation helpers for media files and upload configurations.
 */

import { promises as fs } from 'fs';

import { detectFileTypeFromFile, isAllowedFileType } from './file-type';

import type { FileTypeResult, MediaProcessingOptions } from './types';

/**
 * Validate file against media processing options
 */
export async function validateMediaFile(
  filePath: string,
  options: MediaProcessingOptions,
): Promise<{ valid: boolean; error?: string; fileType?: FileTypeResult }> {
  try {
    // Check file size
    const stats = await fs.stat(filePath);
    if (stats.size > options.maxFileSize) {
      return {
        valid: false,
        error: `File size ${String(stats.size)} exceeds limit ${String(options.maxFileSize)}`,
      };
    }

    if (stats.size === 0) {
      return {
        valid: false,
        error: 'File is empty',
      };
    }

    // Detect file type
    const fileType = await detectFileTypeFromFile(filePath);
    if (fileType === null) {
      return {
        valid: false,
        error: 'Unable to determine file type',
      };
    }

    // Check if file type is allowed
    if (!isAllowedFileType(fileType, options.allowedTypes)) {
      return {
        valid: false,
        error: `File type not allowed: ${fileType.mime}`,
      };
    }

    return { valid: true, fileType };
  } catch (error) {
    return {
      valid: false,
      error: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Validate upload configuration
 */
export function validateUploadConfig(config: {
  maxFileSize?: number;
  allowedTypes?: string[];
  chunkSize?: number;
  timeout?: number;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.maxFileSize !== undefined && config.maxFileSize !== 0 && config.maxFileSize <= 0) {
    errors.push('maxFileSize must be positive');
  }

  if (
    config.maxFileSize !== undefined &&
    config.maxFileSize !== 0 &&
    config.maxFileSize > 1000 * 1024 * 1024
  ) {
    // 1GB
    errors.push('maxFileSize cannot exceed 1GB');
  }

  if (config.chunkSize !== undefined && config.chunkSize !== 0 && config.chunkSize <= 0) {
    errors.push('chunkSize must be positive');
  }

  if (
    config.chunkSize !== undefined &&
    config.chunkSize !== 0 &&
    config.chunkSize > 10 * 1024 * 1024
  ) {
    // 10MB
    errors.push('chunkSize cannot exceed 10MB');
  }

  if (config.timeout !== undefined && config.timeout !== 0 && config.timeout <= 0) {
    errors.push('timeout must be positive');
  }

  if (config.timeout !== undefined && config.timeout !== 0 && config.timeout > 3600000) {
    // 1 hour
    errors.push('timeout cannot exceed 1 hour');
  }

  if (config.allowedTypes?.length === 0) {
    errors.push('allowedTypes cannot be empty');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Characters that are not allowed in filenames (path separators, special chars)
const UNSAFE_FILENAME_CHARS = /[/\\:*?"<>|]/g;
// Non-printable control characters - built dynamically to avoid ESLint no-control-regex
// Matches ASCII control chars (0x00-0x1f) and extended control chars (0x7f-0x9f)
const CONTROL_CHARS = new RegExp(
  '[' +
    String.fromCharCode(0x00) +
    '-' +
    String.fromCharCode(0x1f) +
    String.fromCharCode(0x7f) +
    '-' +
    String.fromCharCode(0x9f) +
    ']',
  'g',
);

/**
 * Sanitize filename for safe storage
 */
export function sanitizeFilename(filename: string): string {
  // Remove path separators and control characters
  let sanitized = filename.replace(UNSAFE_FILENAME_CHARS, '_');

  // Replace non-printable characters
  sanitized = sanitized.replace(CONTROL_CHARS, '_');

  // Trim whitespace and dots
  sanitized = sanitized.trim().replace(/^\.+|\.+$/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.slice(
      0,
      255 - (ext !== undefined && ext.length > 0 ? ext.length + 1 : 0),
    );
    sanitized = ext !== undefined && ext.length > 0 ? `${name}.${ext}` : name;
  }

  // Ensure not empty
  if (sanitized.length === 0) {
    sanitized = 'file';
  }

  return sanitized;
}

/**
 * Generate secure file ID
 */
export function generateFileId(): string {
  // Simple ID generation without crypto dependency
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2);
  return `${timestamp}${random}`.slice(0, 32);
}
