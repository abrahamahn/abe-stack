// main/shared/src/primitives/schema/composite.ts

import { UUID_REGEX } from '../constants';

import { createSchema } from './factory';
import { parseString, type ParseStringOptions } from './parsers';

import type { Schema } from './types';

// ============================================================================
// Composite Schema Factories
// ============================================================================

/**
 * Create a schema that validates a string against a set of allowed values (Enum).
 *
 * @param values - Allowed string values.
 * @param label - Label for error messages.
 */
export function createEnumSchema<T extends string>(values: readonly T[], label: string): Schema<T> {
  return createSchema<T>((data: unknown) => {
    if (typeof data !== 'string') {
      throw new Error(`${label} must be a string`);
    }
    if (!values.includes(data as T)) {
      throw new Error(`Invalid ${label}: "${data}". Expected one of: ${values.join(', ')}`);
    }
    return data as T;
  });
}

/**
 * Create a valid UUID schema with a branded type.
 *
 * @param brand - Label for the branded type and error messages.
 */
export function createBrandedUuidSchema<T extends string & { __brand: string }>(
  brand: string,
): Schema<T> {
  return createSchema<T>((data: unknown) => {
    if (typeof data !== 'string') {
      throw new Error(`${brand} must be a string`);
    }
    if (!UUID_REGEX.test(data)) {
      throw new Error(`${brand} must be a valid UUID`);
    }
    return data as T;
  });
}

/**
 * Create a branded string schema with options (min/max length, etc).
 *
 * @param brand - Label for the branded type.
 * @param opts - Validation options.
 */
export function createBrandedStringSchema<T extends string & { __brand: string }>(
  brand: string,
  opts?: ParseStringOptions,
): Schema<T> {
  return createSchema<T>((data: unknown) => {
    const validated = parseString(data, brand, { min: 1, ...opts });
    return validated as T;
  });
}

/**
 * Create a schema that validates an array of items.
 *
 * @param itemParse - Validation function for individual items.
 * @param opts - Array length constraints (min/max).
 */
export function createArraySchema<T>(
  itemParse: (data: unknown) => T,
  opts?: { readonly min?: number; readonly max?: number },
): Schema<T[]> {
  return createSchema<T[]>((data: unknown) => {
    if (!Array.isArray(data)) {
      throw new Error('Expected an array');
    }
    if (opts?.min !== undefined && data.length < opts.min) {
      throw new Error(`Array must have at least ${String(opts.min)} items`);
    }
    if (opts?.max !== undefined && data.length > opts.max) {
      throw new Error(`Array must have at most ${String(opts.max)} items`);
    }
    return data.map((item: unknown) => itemParse(item));
  });
}

/**
 * Create a schema that validates an exact literal value (string, number, boolean).
 *
 * @param expected - The exact value required.
 */
export function createLiteralSchema<T extends string | number | boolean>(expected: T): Schema<T> {
  return createSchema<T>((data: unknown) => {
    if (data !== expected) {
      throw new Error(`Expected literal ${String(expected)}, got ${String(data)}`);
    }
    return data as T;
  });
}

/**
 * Create a union schema that tries multiple schemas in order.
 * Returns the result of the first successful schema.
 *
 * @param schemas - List of schemas to try.
 */
export function createUnionSchema<T>(schemas: ReadonlyArray<Schema<T>>): Schema<T> {
  return createSchema<T>((data: unknown) => {
    const errors: string[] = [];
    for (const schema of schemas) {
      const result = schema.safeParse(data);
      if (result.success) {
        return result.data;
      }
      errors.push(result.error.message);
    }
    throw new Error(`Value does not match any schema: ${errors.join('; ')}`);
  });
}
