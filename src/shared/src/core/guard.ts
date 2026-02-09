// src/shared/src/core/guard.ts
/**
 * Guard Utilities
 *
 * Helper functions for type guarding and assertion.
 * Currently serves as a placeholder for future implementation of domain guards.
 */

/**
 * Assert that a condition is true, otherwise throw an error.
 * Supports custom error factories for domain-specific errors.
 *
 * @param condition - The condition to check
 * @param message - The error message to throw if the condition is false
 * @param makeError - Optional factory to create a custom error instance
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
 * Asserts that a value is never.
 * Useful for exhaustive switch checks.
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
 * Use this when you don't care about prototypes.
 */
export function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
