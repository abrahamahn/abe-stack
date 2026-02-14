// main/shared/src/utils/http/mime.ts
/**
 * MIME type utilities.
 */

import { EXT_TO_MIME } from '../../domain/media/media.constants';

/**
 * Non-media MIME types used by static assets that are not part of shared media constants.
 */
export const EXTRA_EXT_TO_MIME: Record<string, string> = {
  svg: 'image/svg+xml',
  ico: 'image/x-icon',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
  xml: 'application/xml',
  zip: 'application/zip',
  gz: 'application/gzip',
  json: 'application/json',
  txt: 'text/plain',
};

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
