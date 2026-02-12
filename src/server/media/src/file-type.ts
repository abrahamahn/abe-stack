// src/server/media/src/file-type.ts
/**
 * File Type Detection
 *
 * Pure detection logic re-exported from @abe-stack/shared.
 * Server-specific file I/O wrapper provided here.
 */

import { promises as fs } from 'fs';

import { detectFileType, detectFileTypeFromPath } from '@abe-stack/shared';

import type { FileTypeResult } from '@abe-stack/shared';

// Re-export pure functions from shared
export { detectFileType, detectFileTypeFromPath, isAllowedFileType } from '@abe-stack/shared';

/**
 * Read file header and detect type.
 *
 * Opens the file, reads the first 64 bytes for magic-byte detection,
 * then falls back to extension-based detection.
 *
 * @param filePath - Absolute path to the file
 * @returns Detected file type, or null if unknown or unreadable
 * @throws Never — errors are caught and return null
 * @complexity O(m) where m is the number of known magic signatures
 */
export async function detectFileTypeFromFile(filePath: string): Promise<FileTypeResult | null> {
  try {
    const fd = await fs.open(filePath, 'r');
    const buffer = Buffer.alloc(64);
    try {
      await fd.read(buffer, 0, 64, 0);
    } finally {
      await fd.close();
    }

    // Try magic byte detection first
    const result = detectFileType(buffer);
    if (result !== null) return result;

    // Fall back to extension-based detection
    return detectFileTypeFromPath(filePath);
  } catch {
    return null;
  }
}
