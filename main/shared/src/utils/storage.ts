// main/shared/src/utils/storage.ts
/**
 * Storage Path Utilities
 *
 * Path normalization and filename generation for storage systems.
 */

import { generateSecureId } from './crypto/crypto';

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
 * Maximum logo file size in bytes (2MB).
 */
export const MAX_LOGO_SIZE = 2 * 1024 * 1024;

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
 * Match a MIME type against a wildcard pattern iteratively (no regex).
 * Supports `*` as a segment wildcard, e.g. `image/*` matches `image/png`.
 *
 * @param mime - The MIME type to check (lowercase)
 * @param pattern - The wildcard pattern (lowercase, e.g. `image/*`)
 * @returns true if the MIME type matches the pattern
 * @complexity O(n) where n = max(mime.length, pattern.length)
 */
function matchMimeWildcard(mime: string, pattern: string): boolean {
  let mi = 0;
  let pi = 0;

  while (mi < mime.length && pi < pattern.length) {
    if (pattern[pi] === '*') {
      // '*' matches the rest of the current segment (up to '/' or end)
      pi++;
      // Consume remaining mime chars until '/' or end
      while (mi < mime.length && mime[mi] !== '/') {
        mi++;
      }
    } else if (pattern[pi] === mime[mi]) {
      pi++;
      mi++;
    } else {
      return false;
    }
  }

  // Both must be fully consumed (allow trailing '*' in pattern)
  while (pi < pattern.length && pattern[pi] === '*') {
    pi++;
  }

  return mi === mime.length && pi === pattern.length;
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
    return allowedTypes.some((type) => {
      const lowerType = type.toLowerCase();
      if (!lowerType.includes('*')) {
        return lowerType === lowerFileNameOrType;
      }
      // Wildcard MIME matching (e.g., "image/*") — iterative, no regex
      return matchMimeWildcard(lowerFileNameOrType, lowerType);
    });
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
