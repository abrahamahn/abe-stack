// packages/shared/src/contracts/schema.ts
/**
 * Schema Factory Helpers
 *
 * Runtime utilities for creating validation schemas.
 * Primitive parsers replace Zod's z.string(), z.number(), etc.
 *
 * @module Contracts/Schema
 */

import type { SafeParseResult, Schema } from './types.js';

// ============================================================================
// Core Factory
// ============================================================================

/**
 * Create a schema from a validation function.
 * This is the building block for all manual validation schemas.
 *
 * @param validate - A function that validates and transforms unknown data into type T
 * @returns A Schema object with parse and safeParse methods
 * @complexity O(1) for the wrapper; inner validate may vary
 */
export function createSchema<T>(validate: (data: unknown) => T): Schema<T> {
  return {
    parse: validate,
    safeParse: (data: unknown): SafeParseResult<T> => {
      try {
        const result = validate(data);
        return { success: true, data: result };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    _type: undefined as unknown as T,
  };
}

// ============================================================================
// Regex Constants
// ============================================================================

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const URL_REGEX = /^https?:\/\/.+/;
const IP_V4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IP_V6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

// ============================================================================
// Primitive Parsers
// ============================================================================

/** Options for parseString */
interface ParseStringOptions {
  /** Minimum length (inclusive) */
  readonly min?: number;
  /** Maximum length (inclusive) */
  readonly max?: number;
  /** Exact length */
  readonly length?: number;
  /** Regex pattern to match */
  readonly regex?: RegExp;
  /** Custom regex error message */
  readonly regexMessage?: string;
  /** Require valid URL format */
  readonly url?: boolean;
  /** Require valid UUID format */
  readonly uuid?: boolean;
  /** Require valid IP address format */
  readonly ip?: boolean;
}

/**
 * Parse and validate a string value from unknown data.
 *
 * @param data - The unknown value to parse
 * @param label - Human-readable field name for error messages
 * @param opts - Optional validation constraints
 * @returns The validated string
 * @throws Error if validation fails
 * @complexity O(n) where n is string length for regex checks
 */
export function parseString(data: unknown, label: string, opts?: ParseStringOptions): string {
  if (typeof data !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  if (opts?.min !== undefined && data.length < opts.min) {
    throw new Error(`${label} must be at least ${String(opts.min)} characters`);
  }
  if (opts?.max !== undefined && data.length > opts.max) {
    throw new Error(`${label} must be at most ${String(opts.max)} characters`);
  }
  if (opts?.length !== undefined && data.length !== opts.length) {
    throw new Error(`${label} must be exactly ${String(opts.length)} characters`);
  }
  if (opts?.uuid === true && !UUID_REGEX.test(data)) {
    throw new Error(`${label} must be a valid UUID`);
  }
  if (opts?.url === true && !URL_REGEX.test(data)) {
    throw new Error(`${label} must be a valid URL`);
  }
  if (opts?.ip === true && !IP_V4_REGEX.test(data) && !IP_V6_REGEX.test(data)) {
    throw new Error(`${label} must be a valid IP address`);
  }
  if (opts?.regex !== undefined && !opts.regex.test(data)) {
    throw new Error(opts.regexMessage ?? `${label} has invalid format`);
  }
  return data;
}

/** Options for parseNumber */
interface ParseNumberOptions {
  /** Require integer (no decimals) */
  readonly int?: boolean;
  /** Minimum value (inclusive) */
  readonly min?: number;
  /** Maximum value (inclusive) */
  readonly max?: number;
}

/**
 * Parse and validate a number value from unknown data.
 *
 * @param data - The unknown value to parse
 * @param label - Human-readable field name for error messages
 * @param opts - Optional validation constraints
 * @returns The validated number
 * @throws Error if validation fails
 * @complexity O(1)
 */
export function parseNumber(data: unknown, label: string, opts?: ParseNumberOptions): number {
  if (typeof data !== 'number' || Number.isNaN(data)) {
    throw new Error(`${label} must be a number`);
  }
  if (opts?.int === true && !Number.isInteger(data)) {
    throw new Error(`${label} must be an integer`);
  }
  if (opts?.min !== undefined && data < opts.min) {
    throw new Error(`${label} must be at least ${String(opts.min)}`);
  }
  if (opts?.max !== undefined && data > opts.max) {
    throw new Error(`${label} must be at most ${String(opts.max)}`);
  }
  return data;
}

/**
 * Parse and validate a boolean value from unknown data.
 *
 * @param data - The unknown value to parse
 * @param label - Human-readable field name for error messages
 * @returns The validated boolean
 * @throws Error if data is not a boolean
 * @complexity O(1)
 */
export function parseBoolean(data: unknown, label: string): boolean {
  if (typeof data !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return data;
}

/**
 * Parse and validate an object value from unknown data.
 * Returns the value cast as Record<string, unknown>.
 *
 * @param data - The unknown value to parse
 * @param label - Human-readable field name for error messages
 * @returns The validated object as Record<string, unknown>
 * @throws Error if data is not a non-null object
 * @complexity O(1)
 */
export function parseObject(data: unknown, label: string): Record<string, unknown> {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${label} must be an object`);
  }
  return data as Record<string, unknown>;
}

/**
 * Coerce unknown data to a number (accepts string or number inputs).
 * Replaces z.coerce.number().
 *
 * @param data - The unknown value to coerce
 * @param label - Human-readable field name for error messages
 * @param opts - Optional validation constraints
 * @returns The coerced and validated number
 * @throws Error if coercion fails or validation fails
 * @complexity O(1)
 */
export function coerceNumber(data: unknown, label: string, opts?: ParseNumberOptions): number {
  const num = typeof data === 'number' ? data : Number(data);
  if (Number.isNaN(num)) {
    throw new Error(`${label} must be a valid number`);
  }
  if (opts?.int === true && !Number.isInteger(num)) {
    throw new Error(`${label} must be an integer`);
  }
  if (opts?.min !== undefined && num < opts.min) {
    throw new Error(`${label} must be at least ${String(opts.min)}`);
  }
  if (opts?.max !== undefined && num > opts.max) {
    throw new Error(`${label} must be at most ${String(opts.max)}`);
  }
  return num;
}

/**
 * Coerce unknown data to a Date (accepts string, number, or Date inputs).
 * Replaces z.coerce.date().
 *
 * @param data - The unknown value to coerce
 * @param label - Human-readable field name for error messages
 * @returns The coerced Date
 * @throws Error if coercion produces an invalid date
 * @complexity O(1)
 */
export function coerceDate(data: unknown, label: string): Date {
  if (data instanceof Date) {
    if (Number.isNaN(data.getTime())) {
      throw new Error(`${label} is an invalid date`);
    }
    return data;
  }
  if (typeof data === 'string' || typeof data === 'number') {
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) {
      throw new Error(`${label} is an invalid date`);
    }
    return d;
  }
  throw new Error(`${label} must be a valid date`);
}

// ============================================================================
// Combinator Helpers
// ============================================================================

/**
 * Make a value optional: parse if present, return undefined if absent.
 * Replaces z.optional().
 *
 * @param data - The unknown value (may be undefined)
 * @param parse - Parser function to apply if value is present
 * @returns Parsed value or undefined
 * @complexity Depends on inner parser
 */
export function parseOptional<T>(data: unknown, parse: (v: unknown) => T): T | undefined {
  if (data === undefined) {
    return undefined;
  }
  return parse(data);
}

/**
 * Make a value nullable: parse if present, return null if null.
 * Replaces z.nullable().
 *
 * @param data - The unknown value (may be null)
 * @param parse - Parser function to apply if value is not null
 * @returns Parsed value or null
 * @complexity Depends on inner parser
 */
export function parseNullable<T>(data: unknown, parse: (v: unknown) => T): T | null {
  if (data === null) {
    return null;
  }
  return parse(data);
}

/**
 * Make a value nullable and optional: parse if present and not null.
 * Replaces z.nullable().optional().
 *
 * @param data - The unknown value
 * @param parse - Parser function to apply if value is present and not null
 * @returns Parsed value, null, or undefined
 * @complexity Depends on inner parser
 */
export function parseNullableOptional<T>(
  data: unknown,
  parse: (v: unknown) => T,
): T | null | undefined {
  if (data === undefined) {
    return undefined;
  }
  if (data === null) {
    return null;
  }
  return parse(data);
}

// ============================================================================
// Composite Schema Factories
// ============================================================================

/**
 * Create a schema that validates a value against a fixed set of allowed values.
 * Replaces z.enum() and z.nativeEnum().
 *
 * @param values - Readonly array of allowed values
 * @param label - Human-readable description for error messages
 * @returns Schema that validates the value is one of the allowed values
 * @complexity O(n) where n is the number of values
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
 * Create a branded UUID schema for nominal typing.
 * Replaces z.string().uuid().brand<T>().
 *
 * @param brand - Human-readable brand name for error messages
 * @returns Schema that validates UUID format and returns branded string
 * @complexity O(1)
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
 * Create a branded string schema for nominal typing (non-UUID).
 * Replaces z.string().min(1).brand<T>().
 *
 * @param brand - Human-readable brand name for error messages
 * @param opts - Optional string validation constraints
 * @returns Schema that validates string and returns branded string
 * @complexity O(1)
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
 * Replaces z.array().
 *
 * @param itemParse - Parser function for each array element
 * @param opts - Optional constraints (min/max length)
 * @returns Schema that validates and transforms arrays
 * @complexity O(n) where n is array length
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
 * Create a schema that validates a literal value.
 * Replaces z.literal().
 *
 * @param expected - The expected literal value
 * @returns Schema that validates the value equals expected
 * @complexity O(1)
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
 * Create a schema that validates a value against multiple schemas (union).
 * Replaces z.union(). Returns the first successful parse.
 *
 * @param schemas - Array of schemas to try in order
 * @returns Schema that validates against the first matching schema
 * @complexity O(n) where n is number of schemas (worst case)
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

/**
 * Parse a Record<string, unknown> from unknown data.
 * Replaces z.record(z.unknown()).
 *
 * @param data - The unknown value to parse
 * @param label - Human-readable field name for error messages
 * @returns The validated record
 * @throws Error if data is not a non-null, non-array object
 * @complexity O(1) for the check; does not validate individual keys
 */
export function parseRecord(data: unknown, label: string): Record<string, unknown> {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${label} must be an object`);
  }
  return data as Record<string, unknown>;
}

/**
 * Parse a Record<string, V> with a value parser.
 * Replaces z.record(z.boolean()), z.record(valueSchema), etc.
 *
 * @param data - The unknown value to parse
 * @param label - Human-readable field name for error messages
 * @param valueParse - Parser function for each value
 * @returns The validated record with parsed values
 * @complexity O(n) where n is number of keys
 */
export function parseTypedRecord<V>(
  data: unknown,
  label: string,
  valueParse: (v: unknown, key: string) => V,
): Record<string, V> {
  const obj = parseRecord(data, label);
  const result: Record<string, V> = {};
  for (const key of Object.keys(obj)) {
    result[key] = valueParse(obj[key], key);
  }
  return result;
}

/**
 * Apply a default value when data is undefined.
 * Replaces z.default().
 *
 * @param data - The unknown value
 * @param defaultValue - Default to use when data is undefined
 * @returns The data or default value
 * @complexity O(1)
 */
export function withDefault(data: unknown, defaultValue: unknown): unknown {
  return data === undefined ? defaultValue : data;
}
