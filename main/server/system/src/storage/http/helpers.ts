// main/server/system/src/storage/http/helpers.ts
/**
 * File upload helpers and utilities
 *
 * Re-exports normalizeFilename from the canonical signing module
 * and defines the FileSignatureData interface for HTTP file operations.
 */

import { normalizeFilename } from '../signing';

export { normalizeFilename };

/**
 * Data structure for HTTP file signature operations.
 *
 * @param method - HTTP method ('get' or 'put')
 * @param id - File identifier
 * @param filename - File name
 * @param expirationMs - Expiration timestamp in milliseconds
 */
export interface FileSignatureData extends Record<string, string | number> {
  method: 'get' | 'put';
  id: string;
  filename: string;
  expirationMs: number;
}
