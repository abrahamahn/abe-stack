// main/shared/src/types/schema.ts
/**
 * Schema Primitives & Factory Helpers
 *
 * Pure runtime utilities for creating validation schemas.
 * L0 layer — no imports from core/ or higher layers.
 *
 * @module Types/Schema
 */

// ============================================================================
// Core Schema Types
// ============================================================================

/**
 * Result type for safeParse operations.
 */
export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * Schema interface for validation.
 * Supports parse/safeParse for runtime validation.
 */
export interface Schema<T> {
  parse: (data: unknown) => T;
  safeParse: (data: unknown) => SafeParseResult<T>;
  _type: T; // Phantom type for inference
}

/**
 * Infer the type from a schema (similar to z.infer).
 */
export type InferSchema<S> = S extends Schema<infer T> ? T : never;

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

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const URL_REGEX = /^https?:\/\/.+/;
const IP_V4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IP_V6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;

// ============================================================================
// Primitive Parsers
// ============================================================================

/** Options for parseString */
export interface ParseStringOptions {
  /** Trim whitespace before validation */
  readonly trim?: boolean;
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
 */
export function parseString(data: unknown, label: string, opts?: ParseStringOptions): string {
  if (typeof data !== 'string') {
    throw new Error(`${label} must be a string`);
  }
  const value = opts?.trim === true ? data.trim() : data;
  if (opts?.min !== undefined && value.length < opts.min) {
    throw new Error(`${label} must be at least ${String(opts.min)} characters`);
  }
  if (opts?.max !== undefined && value.length > opts.max) {
    throw new Error(`${label} must be at most ${String(opts.max)} characters`);
  }
  if (opts?.length !== undefined && value.length !== opts.length) {
    throw new Error(`${label} must be exactly ${String(opts.length)} characters`);
  }
  if (opts?.uuid === true && !UUID_REGEX.test(value)) {
    throw new Error(`${label} must be a valid UUID`);
  }
  if (opts?.url === true && !URL_REGEX.test(value)) {
    throw new Error(`${label} must be a valid URL`);
  }
  if (opts?.ip === true && !IP_V4_REGEX.test(value) && !IP_V6_REGEX.test(value)) {
    throw new Error(`${label} must be a valid IP address`);
  }
  if (opts?.regex !== undefined && !opts.regex.test(value)) {
    throw new Error(opts.regexMessage ?? `${label} has invalid format`);
  }
  return value;
}

/** Options for parseNumber */
export interface ParseNumberOptions {
  /** Require integer (no decimals) */
  readonly int?: boolean;
  /** Minimum value (inclusive) */
  readonly min?: number;
  /** Maximum value (inclusive) */
  readonly max?: number;
}

/**
 * Parse and validate a number value from unknown data.
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
 */
export function parseBoolean(data: unknown, label: string): boolean {
  if (typeof data !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return data;
}

/**
 * Parse and validate an object value from unknown data.
 */
export function parseObject(data: unknown, label: string): Record<string, unknown> {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${label} must be an object`);
  }
  return data as Record<string, unknown>;
}

/**
 * Coerce unknown data to a number (accepts string or number inputs).
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
 */
export function parseOptional<T>(data: unknown, parse: (v: unknown) => T): T | undefined {
  if (data === undefined) {
    return undefined;
  }
  return parse(data);
}

/**
 * Make a value nullable: parse if present, return null if null.
 */
export function parseNullable<T>(data: unknown, parse: (v: unknown) => T): T | null {
  if (data === null) {
    return null;
  }
  return parse(data);
}

/**
 * Make a value nullable and optional: parse if present and not null.
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

export function createBrandedStringSchema<T extends string & { __brand: string }>(
  brand: string,
  opts?: ParseStringOptions,
): Schema<T> {
  return createSchema<T>((data: unknown) => {
    const validated = parseString(data, brand, { min: 1, ...opts });
    return validated as T;
  });
}

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

export function createLiteralSchema<T extends string | number | boolean>(expected: T): Schema<T> {
  return createSchema<T>((data: unknown) => {
    if (data !== expected) {
      throw new Error(`Expected literal ${String(expected)}, got ${String(data)}`);
    }
    return data as T;
  });
}

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

export function parseRecord(data: unknown, label: string): Record<string, unknown> {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${label} must be an object`);
  }
  return data as Record<string, unknown>;
}

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

export function withDefault(data: unknown, defaultValue: unknown): unknown {
  return data === undefined ? defaultValue : data;
}
