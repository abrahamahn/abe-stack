// packages/shared/src/utils/storage.ts
/**
 * Storage Path Utilities
 *
 * Path normalization and filename generation for storage systems.
 */

import { generateSecureId } from './crypto';

// ============================================================================
// Constants
// ============================================================================

/**
 * Allowed image MIME types for avatar uploads.
 */
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Maximum image file size in bytes (5MB).
 */
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Normalize a file path for storage.
 *
 * @param path - Raw file path
 * @returns Normalized path
 */
export function normalizeStoragePath(path: string): string {
  if (path === '') return '';

  // Convert Windows backslashes to forward slashes first
  const segments = path.replace(/\\/g, '/').split('/');
  const normalizedSegments: string[] = [];

  for (const segment of segments) {
    if (segment === '.' || segment === '') continue;
    if (segment === '..') {
      normalizedSegments.pop();
      continue;
    }
    normalizedSegments.push(segment);
  }

  return normalizedSegments.join('/');
}

/**
 * Join multiple path segments into a normalized path.
 *
 * @param segments - Path segments to join
 * @returns Joined and normalized path
 */
export function joinStoragePath(...segments: string[]): string {
  return normalizeStoragePath(segments.join('/'));
}

/**
 * Generate a unique filename by appending a timestamp or random string.
 *
 * @param filename - Original filename
 * @param appendTimestamp - Whether to append timestamp (default: true)
 * @returns Unique filename
 */
export function generateUniqueFilename(filename: string, appendTimestamp: boolean = true): string {
  if (filename === '') return '';

  const extMatch = filename.match(/\.[^.]*$/);
  const extension = extMatch !== null ? extMatch[0] : '';
  const nameWithoutExt = extMatch !== null ? filename.slice(0, -extension.length) : filename;

  const uniquePart = appendTimestamp ? Date.now().toString() : generateSecureId(8);

  return `${nameWithoutExt}_${uniquePart}${extension}`;
}

/**
 * Validate a file type based on extension or MIME type.
 *
 * @param fileNameOrType - Filename or MIME type to validate
 * @param allowedTypes - Array of allowed extensions or MIME types
 * @returns True if valid, false otherwise
 */
export function validateFileType(fileNameOrType: string, allowedTypes: string[]): boolean {
  if (fileNameOrType === '' || allowedTypes.length === 0) {
    return false;
  }

  const lowerFileNameOrType = fileNameOrType.toLowerCase();

  // Check if it's a MIME type (contains slash)
  if (lowerFileNameOrType.includes('/')) {
    return allowedTypes.some(
      (type) =>
        type.toLowerCase() === lowerFileNameOrType ||
        (type.includes('*') &&
          new RegExp(`^${type.replace(/\*/g, '.*')}$`).test(lowerFileNameOrType)),
    );
  }

  // Otherwise treat as filename and check extension
  const extMatch = lowerFileNameOrType.match(/\.[^.]*$/);
  const extension = extMatch !== null ? extMatch[0].substring(1) : ''; // Remove the dot

  return allowedTypes.some((type) => {
    const lowerType = type.toLowerCase();
    // Check if type is an extension (starts with dot) or just the extension name
    if (lowerType.startsWith('.')) {
      return lowerType.substring(1) === extension;
    } else {
      return lowerType === extension;
    }
  });
}
