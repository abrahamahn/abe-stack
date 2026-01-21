// apps/server/src/infrastructure/data/storage/utils/signedUrls.ts
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Data structure for signed URL generation.
 */
export interface SignedUrlData {
  /** HTTP method: 'get' for downloads, 'put' for uploads */
  method: 'get' | 'put';
  /** Unique identifier for the file */
  fileId: string;
  /** Original filename (will be normalized) */
  filename: string;
  /** Expiration timestamp in milliseconds since epoch */
  expirationMs: number;
}

/**
 * Create an HMAC signature for the given data.
 * Uses SHA-512 and returns a base64url-encoded string.
 */
export function createSignature(data: SignedUrlData, secret: string): string {
  const sortedEntries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
  const str = JSON.stringify(sortedEntries);
  return createHmac('sha512', secret).update(str).digest('base64url');
}

/**
 * Verify an HMAC signature using constant-time comparison.
 * Returns true if the signature is valid.
 */
export function verifySignature(data: SignedUrlData, signature: string, secret: string): boolean {
  const expected = createSignature(data, secret);

  // Ensure both buffers are the same length for timingSafeEqual
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

/**
 * Create a signed URL for file operations.
 * The URL includes the signature and expiration for verification.
 *
 * @example
 * ```typescript
 * const url = createSignedUrl({
 *   method: 'put',
 *   fileId: crypto.randomUUID(),
 *   filename: 'document.pdf',
 *   expirationMs: Date.now() + 15 * 60 * 1000, // 15 minutes
 * }, secret);
 * // Returns: /uploads/{fileId}/{filename}?signature=...&expiration=...&method=put
 * ```
 */
export function createSignedUrl(data: SignedUrlData, secret: string): string {
  const normalizedFilename = normalizeFilename(data.filename);

  // Create signature with normalized filename so verification works correctly
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
 * Returns the parsed data if valid, or null if invalid or expired.
 */
export function parseSignedUrl(url: string, secret: string): SignedUrlData | null {
  try {
    // Parse URL - handle both full URLs and paths
    const urlObj = new URL(url, 'http://localhost');
    const pathname = urlObj.pathname;

    // Extract path components: /uploads/{fileId}/{filename}
    const match = pathname.match(/^\/uploads\/([^/]+)\/([^/]+)$/);
    if (!match) {
      return null;
    }

    const [, encodedFileId, encodedFilename] = match;
    if (!encodedFileId || !encodedFilename) {
      return null;
    }

    const fileId = decodeURIComponent(encodedFileId);
    const filename = decodeURIComponent(encodedFilename);

    // Extract query parameters
    const signature = urlObj.searchParams.get('signature');
    const expirationStr = urlObj.searchParams.get('expiration');
    const method = urlObj.searchParams.get('method') as 'get' | 'put' | null;

    if (!signature || !expirationStr || !method) {
      return null;
    }

    // Validate method is one of the expected values
    if (!['get', 'put'].includes(method)) {
      return null;
    }

    const expirationMs = parseInt(expirationStr, 10);
    if (isNaN(expirationMs)) {
      return null;
    }

    // Check expiration
    if (Date.now() > expirationMs) {
      return null;
    }

    // Reconstruct data for verification
    const data: SignedUrlData = {
      method,
      fileId,
      filename,
      expirationMs,
    };

    // Verify signature
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
 * Returns true if expired.
 */
export function isUrlExpired(expirationMs: number): boolean {
  return Date.now() > expirationMs;
}

/**
 * Normalize a filename for safe storage.
 * - Replaces non-alphanumeric characters (except hyphen, underscore, dot) with underscore
 * - Lowercases the file extension
 * - Preserves the basic structure of the filename
 *
 * @example
 * ```typescript
 * normalizeFilename('My File (1).PDF') // 'My_File__1_.pdf'
 * normalizeFilename('résumé.doc') // 'r_sum_.doc'
 * normalizeFilename('file.name.TXT') // 'file.name.txt'
 * ```
 */
export function normalizeFilename(filename: string): string {
  // Replace characters that aren't alphanumeric, hyphen, underscore, or dot
  const sanitized = filename.replace(/[^a-zA-Z0-9\-_.]/g, '_');

  // Lowercase the extension
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
 * @param minutes Number of minutes until expiration (default: 15)
 */
export function getDefaultExpiration(minutes = 15): number {
  return Date.now() + minutes * 60 * 1000;
}

/**
 * Normalize a storage key for safe file system access.
 * - Removes leading slashes
 * - Optionally strips parent directory references (..)
 * - Normalizes path separators
 *
 * @param key The storage key to normalize
 * @param stripParentRefs If true, removes ".." sequences to prevent path traversal
 */
export function normalizeStorageKey(key: string, stripParentRefs = false): string {
  // Remove leading slashes
  let normalized = key.replace(/^\/+/, '');

  if (stripParentRefs) {
    // Remove parent directory references
    normalized = normalized.replace(/\.\./g, '');
    // Remove any resulting double slashes
    normalized = normalized.replace(/\/+/g, '/');
    // Remove leading slashes again (in case .. removal created them)
    normalized = normalized.replace(/^\/+/, '');
  }

  return normalized;
}
