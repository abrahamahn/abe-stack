/**
 * Guard Utilities
 *
 * Helper functions for type guarding and assertion.
 * Pure functions with zero dependencies — L1 layer.
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

/**
 * Check whether a string is safe to use as an object key.
 * Rejects `__proto__`, `constructor`, and `prototype` to prevent prototype pollution.
 */
export function isSafeObjectKey(key: string): boolean {
  return key !== '__proto__' && key !== 'constructor' && key !== 'prototype';
}

/**
 * Type guard to check if a request context has an authenticated user.
 *
 * Validates that `req.user` is a non-null object with a non-empty `userId` string.
 * Narrows the type so callers can access `req.user.userId`, `req.user.email`, etc.
 */
export function isAuthenticatedRequest<T extends { readonly user?: unknown }>(
  req: T,
): req is T & {
  readonly user: { readonly userId: string; readonly email: string; readonly role: string };
} {
  if (req.user === undefined || typeof req.user !== 'object') {
    return false;
  }
  const user = req.user as unknown as Record<string, unknown>;
  return 'userId' in user && typeof user['userId'] === 'string' && user['userId'] !== '';
}
