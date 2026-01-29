// apps/server/src/infrastructure/data/files/helpers.ts
/**
 * File upload helpers and utilities
 */

export interface FileSignatureData extends Record<string, string | number> {
  method: 'get' | 'put';
  id: string;
  filename: string;
  expirationMs: number;
}

/**
 * Normalize filename by replacing non-alphanumeric characters with underscores
 * and lowercasing the file extension.
 */
export function normalizeFilename(filename: string): string {
  // Replace non-alphanumeric stuff with _.
  filename = filename.replace(/[^a-zA-Z0-9\s\-_.]+/g, '_');

  // Lowercase extension because that gets annoying.
  const parts = filename.split('.');
  if (parts.length === 1) {
    return filename;
  }
  const ext = parts.pop() ?? '';
  filename = [...parts, ext.toLowerCase()].join('.');

  return filename;
}
