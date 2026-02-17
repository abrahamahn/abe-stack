// main/shared/src/engine/media/mime.ts
/**
 * @file MIME Utilities
 * @description MIME type lookup and mapping.
 * @module Engine/Media/Mime
 */

import { EXT_TO_MIME, EXTRA_EXT_TO_MIME } from '../../primitives/constants/media';

/**
 * Get MIME type for a file extension.
 *
 * @param filePath - The file path or filename to determine MIME type for
 * @returns The MIME type string, defaulting to 'application/octet-stream'
 */
export function getMimeType(filePath: string): string {
  const parts = filePath.split('.');
  const ext = parts.length > 1 ? (parts.pop()?.toLowerCase() ?? '') : '';

  if (ext === '') return 'application/octet-stream';

  return EXTRA_EXT_TO_MIME[ext] ?? EXT_TO_MIME[ext] ?? 'application/octet-stream';
}
