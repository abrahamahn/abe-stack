// main/shared/src/engine/security/prototype.ts
/**
 * Prototype Pollution Helpers
 *
 * Shared recursive sanitization/checking utilities for removing
 * dangerous prototype-pollution keys from untrusted objects.
 */

const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

export function sanitizePrototype(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizePrototype);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!DANGEROUS_KEYS.includes(key)) {
      result[key] = sanitizePrototype(value);
    }
  }
  return result;
}

export function hasDangerousKeys(obj: unknown): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false;
  }

  if (Array.isArray(obj)) {
    return obj.some(hasDangerousKeys);
  }

  for (const key of Object.keys(obj)) {
    if (DANGEROUS_KEYS.includes(key)) {
      return true;
    }
    if (hasDangerousKeys((obj as Record<string, unknown>)[key])) {
      return true;
    }
  }

  return false;
}
