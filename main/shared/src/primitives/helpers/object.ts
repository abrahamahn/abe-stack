// main/shared/src/primitives/helpers/object.ts

/**
 * @file Object Utilities
 * @description Helpers for object comparison, safety (prototype pollution), and type guards.
 * @module Primitives/Helpers/Object
 */

/** Keys that are dangerous to set on objects (prototype pollution). */
const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Recursively sanitizes an object by removing dangerous keys.
 * Creates a shallow copy if modification is needed, but deep traversal.
 *
 * @param obj - The object to sanitize
 * @returns A sanitized copy with no dangerous keys
 */
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

/**
 * Checks if an object or any of its nested properties contains dangerous keys.
 *
 * @param obj - The object to check
 * @returns true if dangerous keys are found
 */
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

/**
 * Deep equality check for objects and arrays.
 * Recursively compares all properties and array elements.
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

/**
 * Assert that a condition is true, otherwise throw an error.
 *
 * @param condition - The condition to check
 * @param message - The error message to throw if the condition is false
 * @param makeError - Optional factory to create a custom error instance
 * @throws Error if condition is false
 */
export function assert(
  condition: boolean,
  message: string,
  makeError?: (message: string) => Error,
): asserts condition {
  if (!condition) {
    throw makeError !== undefined ? makeError(message) : new Error(message);
  }
}

/**
 * Assert that a value is defined (not null or undefined).
 *
 * @param value - The value to check
 * @param message - The error message to throw if the value is null or undefined
 * @param makeError - Optional factory to create a custom error instance
 * @throws Error if value is null or undefined
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is not defined',
  makeError?: (message: string) => Error,
): asserts value is T {
  if (value === null || value === undefined) {
    throw makeError !== undefined ? makeError(message) : new Error(message);
  }
}

/**
 * Asserts that a value is never. Useful for exhaustive switch checks.
 *
 * @param value - The value that should never exist
 * @throws Error always
 */
export function assertNever(value: never): never {
  throw new Error(`Unreachable code reached for value: ${JSON.stringify(value)}`);
}

/**
 * Type guard to check if a value is a string.
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Type guard to check if a value is a finite number.
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Type guard to check if a value is a plain JavaScript object.
 * Rejects Arrays, Dates, Maps, etc.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

/**
 * Type guard to check if a value is any non-null object (excluding arrays).
 */
export function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check whether a string is safe to use as an object key.
 * Rejects `__proto__`, `constructor`, and `prototype` to prevent prototype pollution.
 */
export function isSafeObjectKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * Get a nested field value using dot notation.
 */
export function getFieldValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current !== 'object') {
      return undefined;
    }
    if (!Object.hasOwn(current, part)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}
