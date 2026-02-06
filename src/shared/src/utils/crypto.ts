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
 */
export function generateSecureId(length: number = 16): string {
  const crypto = getCrypto();
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  return Array.from(array, (val) => chars[val % chars.length]).join('');
}

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns True if strings are equal, false otherwise
 */
export function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
