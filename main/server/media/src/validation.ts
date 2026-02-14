// main/server/media/src/validation.ts
/**
 * Media Validation Utilities
 *
 * Server-specific file validation (I/O). Pure validation helpers
 * (sanitizeFilename, generateFileId, validateUploadConfig) re-exported
 * from @abe-stack/shared.
 */

import { promises as fs } from 'fs';

import { detectFileTypeFromFile, isAllowedFileType } from './file-type';

import type { FileTypeResult, MediaProcessingOptions } from './types';

// Re-export pure functions from shared
export { generateFileId, sanitizeFilename, validateUploadConfig } from '@abe-stack/shared';

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
