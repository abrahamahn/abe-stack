// src/server/engine/src/storage/http/signatures.ts
/**
 * HTTP File Signature Utilities
 *
 * Options-based HMAC signature generation and verification
 * for the HTTP file server. Delegates to the core signing module.
 */

import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Options for signature generation.
 *
 * @param data - The data to sign (string or record of primitives)
 * @param secretKey - HMAC secret key
 */
export interface CreateSignatureOptions {
  data: string | Record<string, string | number | boolean>;
  secretKey: Buffer | string;
}

/**
 * Options for signature verification.
 *
 * @param data - The data that was signed
 * @param signature - The signature to verify against
 * @param secretKey - HMAC secret key
 */
export interface VerifySignatureOptions {
  data: string | Record<string, string | number | boolean>;
  signature: string;
  secretKey: Buffer | string;
}

/**
 * Serialize data to a deterministic payload string for HMAC signing.
 * Objects are sorted by key to ensure consistent serialization.
 *
 * @param data - String or record to serialize
 * @returns Deterministic string representation
 * @complexity O(k log k) where k is the number of object keys
 */
function serializePayload(data: string | Record<string, string | number | boolean>): string {
  if (typeof data === 'string') {
    return data;
  }
  const sortedEntries = Object.entries(data).sort((a, b) => a[0].localeCompare(b[0]));
  return JSON.stringify(sortedEntries);
}

/**
 * Create an HMAC-SHA512 signature for the given data.
 *
 * @param options - Signature generation options
 * @returns Base64URL-encoded HMAC signature
 * @complexity O(k log k) for record data, O(1) for string data
 */
export function createSignature(options: CreateSignatureOptions): string {
  const payload = serializePayload(options.data);
  return createHmac('sha512', options.secretKey).update(payload).digest('base64url');
}

/**
 * Verify an HMAC-SHA512 signature using constant-time comparison.
 *
 * @param options - Signature verification options
 * @returns True if the signature is valid
 * @complexity O(k log k) for record data, O(1) for string data
 */
export function verifySignature(options: VerifySignatureOptions): boolean {
  const expected = createSignature({ data: options.data, secretKey: options.secretKey });

  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(options.signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}
