// main/server/system/src/storage/signing.ts
/**
 * URL Signing Utilities
 *
 * HMAC-based signed URL generation and verification for storage operations.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Data structure for signed URL generation.
 */
export interface SignedUrlData {
  method: 'get' | 'put';
  fileId: string;
  filename: string;
  expirationMs: number;
}

/**
 * Create an HMAC signature for the given data.
 */
export function createSignature(data: SignedUrlData, secret: string): string {
  const sortedEntries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
  const str = JSON.stringify(sortedEntries);
  return createHmac('sha512', secret).update(str).digest('base64url');
}

/**
 * Verify an HMAC signature using constant-time comparison.
 */
export function verifySignature(data: SignedUrlData, signature: string, secret: string): boolean {
  const expected = createSignature(data, secret);

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * Create a signed URL for file operations.
 */
export function createSignedUrl(data: SignedUrlData, secret: string): string {
  const normalizedFilename = normalizeFilename(data.filename);

  const dataWithNormalizedFilename: SignedUrlData = {
    ...data,
    filename: normalizedFilename,
  };
  const signature = createSignature(dataWithNormalizedFilename, secret);

  const params = new URLSearchParams({
    signature,
    expiration: data.expirationMs.toString(),
    method: data.method,
  });

  return `/uploads/${encodeURIComponent(data.fileId)}/${encodeURIComponent(normalizedFilename)}?${params.toString()}`;
}

/**
 * Parse and verify a signed URL.
 */
export function parseSignedUrl(url: string, secret: string): SignedUrlData | null {
  try {
    const urlObj = new URL(url, 'http://localhost');
    const pathname = urlObj.pathname;

    const match = pathname.match(/^\/uploads\/([^/]+)\/([^/]+)$/);
    if (match == null) {
      return null;
    }

    const [, encodedFileId, encodedFilename] = match;
    if (
      encodedFileId == null ||
      encodedFileId === '' ||
      encodedFilename == null ||
      encodedFilename === ''
    ) {
      return null;
    }

    const fileId = decodeURIComponent(encodedFileId);
    const filename = decodeURIComponent(encodedFilename);

    const signature = urlObj.searchParams.get('signature');
    const expirationStr = urlObj.searchParams.get('expiration');
    const method = urlObj.searchParams.get('method') as 'get' | 'put' | null;

    if (
      signature == null ||
      signature === '' ||
      expirationStr == null ||
      expirationStr === '' ||
      method == null
    ) {
      return null;
    }

    if (!['get', 'put'].includes(method)) {
      return null;
    }

    const expirationMs = parseInt(expirationStr, 10);
    if (isNaN(expirationMs)) {
      return null;
    }

    if (Date.now() > expirationMs) {
      return null;
    }

    const data: SignedUrlData = { method, fileId, filename, expirationMs };

    if (!verifySignature(data, signature, secret)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

/**
 * Check if a signed URL is expired.
 */
export function isUrlExpired(expirationMs: number): boolean {
  return Date.now() > expirationMs;
}

/**
 * Normalize a filename for safe storage.
 *
 * Replaces consecutive non-allowed characters with a single underscore.
 * Allowed characters: alphanumeric, hyphen, underscore, dot.
 * Lowercases the file extension.
 *
 * @param filename - The raw filename to normalize
 * @returns The normalized filename safe for storage
 * @complexity O(n)
 */
export function normalizeFilename(filename: string): string {
  const sanitized = filename.replace(/[^a-zA-Z0-9\-_.]+/g, '_');

  const parts = sanitized.split('.');
  if (parts.length > 1) {
    const lastPart = parts[parts.length - 1];
    if (lastPart !== undefined) {
      parts[parts.length - 1] = lastPart.toLowerCase();
    }
  }

  return parts.join('.');
}

/**
 * Generate a default expiration timestamp.
 */
export function getDefaultExpiration(minutes = 15): number {
  return Date.now() + minutes * 60 * 1000;
}

/**
 * Normalize a storage key for safe file system access.
 */
export function normalizeStorageKey(key: string, stripParentRefs = false): string {
  let normalized = key.replace(/^\/+/, '');

  if (stripParentRefs) {
    normalized = normalized.replace(/\.\./g, '');
    normalized = normalized.replace(/\/+/g, '/');
    normalized = normalized.replace(/^\/+/, '');
  }

  return normalized;
}
