// main/shared/src/domain/media/media.validation.ts
/**
 * Media Validation Utilities
 *
 * Pure validation helpers for media filenames and IDs.
 * No I/O dependencies.
 *
 * @module Domain/Media/Validation
 */

import {
  MAX_CHUNK_SIZE,
  MAX_FILENAME_LENGTH,
  MAX_UPLOAD_FILE_SIZE,
  MAX_UPLOAD_TIMEOUT_MS,
} from '../../primitives/constants';
import { generateUUID } from '../crypto/crypto';


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
  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const ext = sanitized.split('.').pop();
    const name = sanitized.slice(
      0,
      MAX_FILENAME_LENGTH - (ext !== undefined && ext.length > 0 ? ext.length + 1 : 0),
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
 * Generate a cryptographically secure file ID.
 *
 * Uses `crypto.randomUUID()` for unpredictable, collision-resistant IDs
 * suitable for use in URLs and storage keys. Returns a 32-character
 * hex-encoded UUID (dashes stripped).
 *
 * @returns 32-character lowercase hex string
 * @complexity O(1)
 */
export function generateFileId(): string {
  return generateUUID().replace(/-/g, '');
}

/**
 * Validate upload configuration against allowed limits.
 * Pure validation — no I/O.
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
    config.maxFileSize > MAX_UPLOAD_FILE_SIZE
  ) {
    errors.push('maxFileSize cannot exceed 1GB');
  }

  if (config.chunkSize !== undefined && config.chunkSize !== 0 && config.chunkSize <= 0) {
    errors.push('chunkSize must be positive');
  }

  if (
    config.chunkSize !== undefined &&
    config.chunkSize !== 0 &&
    config.chunkSize > MAX_CHUNK_SIZE
  ) {
    errors.push('chunkSize cannot exceed 10MB');
  }

  if (config.timeout !== undefined && config.timeout !== 0 && config.timeout <= 0) {
    errors.push('timeout must be positive');
  }

  if (
    config.timeout !== undefined &&
    config.timeout !== 0 &&
    config.timeout > MAX_UPLOAD_TIMEOUT_MS
  ) {
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
