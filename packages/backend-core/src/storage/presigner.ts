// infra/src/storage/http/signatures.ts
/**
 * File URL signature helpers for secure presigned URLs
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

export type { FileSignatureData } from './helpers';

type Data = { [key: string]: string | number };

/**
 * Create HMAC signature for file operations
 */
export function createSignature(args: { data: string | Data; secretKey: Buffer }): string {
  const { data, secretKey } = args;
  const str = typeof data === 'string' ? data : serialize(data);
  const hmac = createHmac('sha512', secretKey);
  hmac.update(str);
  return hmac.digest('base64');
}

/**
 * Verify HMAC signature for file operations using constant-time comparison
 */
export function verifySignature(args: {
  data: string | Data;
  signature: string;
  secretKey: Buffer;
}): boolean {
  const { data, signature, secretKey } = args;
  const validSignature = createSignature({ data, secretKey });

  const validBuffer = Buffer.from(validSignature, 'utf8');
  const signatureBuffer = Buffer.from(signature, 'utf8');

  if (validBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(validBuffer, signatureBuffer);
}

/**
 * Serialize data object to string for signing
 */
function serialize(data: Data): string {
  return JSON.stringify(
    Object.keys(data)
      .sort()
      .map((key) => [key, data[key]]),
  );
}
