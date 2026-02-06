// packages/shared/src/utils/crypto.ts
/**
 * Cryptographically Secure Random Utilities
 *
 * Secure ID and UUID generation using Web Crypto API.
 * Works natively in Node.js (20+), Browser, and Edge environments.
 */

/**
 * Minimal interface for crypto operations.
 * This avoids leaking DOM-only types into consumers without lib: ["DOM"].
 */
interface CryptoLike {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
  randomUUID?: () => string;
}

/**
 * Internal helper to get a crypto implementation.
 * Uses globalThis.crypto which is available in all modern environments.
 */
function getCrypto(): CryptoLike {
  const c = (globalThis as Record<string, unknown>)['crypto'] as CryptoLike | undefined;
  if (c !== undefined && typeof c.getRandomValues === 'function') {
    return c;
  }

  throw new Error(
    'Crypto API not available. This package requires Node.js 20+ or a modern browser.',
  );
}

/**
 * Generates a cryptographically secure random string.
 * Uses Web Crypto API for cross-platform compatibility.
 */
export function generateToken(length: number = 32): string {
  const crypto = getCrypto();
  const array = new Uint8Array(Math.ceil(length / 2));
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

/**
 * Generates a cryptographically secure UUID v4.
 */
export function generateUUID(): string {
  const crypto = getCrypto();

  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback for environments that don't support randomUUID but have getRandomValues
  const chars = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return chars.replace(/[xy]/g, (c) => {
    const r = Math.floor((crypto.getRandomValues(new Uint8Array(1))[0] ?? 0) % 16);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates a secure random alphanumeric ID.
 *
 * Uses rejection sampling to eliminate modular bias: byte values that
 * don't divide evenly into the alphabet size are discarded and re-sampled.
 *
 * @param length - Desired ID length (default: 16)
 * @returns Uniformly random alphanumeric string
 * @complexity O(length) expected, with negligible rejection probability
 */
export function generateSecureId(length: number = 16): string {
  const crypto = getCrypto();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charCount = chars.length; // 62
  // Largest multiple of charCount that fits in a byte (62 * 4 = 248)
  const maxUnbiased = Math.floor(256 / charCount) * charCount;

  const result: string[] = [];
  // Over-allocate to reduce re-sampling rounds; ~3% rejection rate for 62 chars
  const batchSize = Math.ceil(length * 1.05) + 8;

  while (result.length < length) {
    const batch = new Uint8Array(batchSize);
    crypto.getRandomValues(batch);

    for (let i = 0; i < batch.length && result.length < length; i++) {
      const val = batch[i] ?? 0;
      // Reject values >= maxUnbiased to eliminate modular bias
      if (val < maxUnbiased) {
        result.push(chars[val % charCount] ?? '');
      }
    }
  }

  return result.join('');
}

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * Always iterates over the full length of the longer string to avoid
 * leaking length information through timing side-channels.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 * @complexity O(max(a.length, b.length))
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  // XOR the lengths so unequal lengths always fail without early return
  let result = a.length ^ b.length;

  for (let i = 0; i < maxLen; i++) {
    // Use 0 as fallback for out-of-bounds to avoid short-circuiting
    const ca = i < a.length ? a.charCodeAt(i) : 0;
    const cb = i < b.length ? b.charCodeAt(i) : 0;
    result |= ca ^ cb;
  }

  return result === 0;
}
