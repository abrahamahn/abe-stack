// main/shared/src/utils/comparison.ts
/**
 * Comparison Utilities
 *
 * Deep and shallow equality comparison functions for objects and arrays.
 */

/**
 * Deep equality check for objects and arrays.
 *
 * Recursively compares all properties and array elements.
 * Handles null/undefined correctly (null !== undefined).
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (a == null || b == null) return a === b;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const objA = a as Record<string, unknown>;
    const objB = b as Record<string, unknown>;
    const keysA = Object.keys(objA);
    const keysB = Object.keys(objB);

    if (keysA.length !== keysB.length) return false;

    for (const key of keysA) {
      if (!(key in objB)) return false;
      if (!deepEqual(objA[key], objB[key])) return false;
    }

    return true;
  }

  return false;
}
