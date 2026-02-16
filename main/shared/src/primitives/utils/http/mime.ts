// main/shared/src/utils/http/mime.ts
/**
 * MIME type utilities.
 */

import { EXT_TO_MIME, EXTRA_EXT_TO_MIME } from '../../constants';

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
