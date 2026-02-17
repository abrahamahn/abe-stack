// main/shared/src/primitives/schema/parsers.ts

/**
 * @file Schema Parsers
 * @description Primitive validation functions for common types (string, number, date, etc.).
 * @module Primitives/Schema/Parsers
 */

import { IP_V4_REGEX, IP_V6_REGEX, URL_REGEX, UUID_REGEX } from '../constants';

// ============================================================================
// Primitive Parsers
// ============================================================================

/** Options for validating strings. */
export interface ParseStringOptions {
  /** If true, trims whitespace before validation. */
  readonly trim?: boolean;
  /** Minimum length (inclusive). */
  readonly min?: number;
  /** Maximum length (inclusive). */
  readonly max?: number;
  /** Exact length required. */
  readonly length?: number;
  /** Regex pattern to enforce. */
  readonly regex?: RegExp;
  /** Custom error message for regex failure. */
  readonly regexMessage?: string;
  /** Require valid URL format. */
  readonly url?: boolean;
  /** Require valid UUID format. */
  readonly uuid?: boolean;
  /** Require valid IPv4 or IPv6 address. */
  readonly ip?: boolean;
}

/**
 * Parse and validate a string value.
 *
 * @param data - Unknown input data.
 * @param label - Field name for error messages.
 * @param opts - Validation options.
 * @returns The validated string.
 * @throws {Error} If validation fails.
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

/** Options for validating numbers. */
export interface ParseNumberOptions {
  /** Require an integer value. */
  readonly int?: boolean;
  /** Minimum value (inclusive). */
  readonly min?: number;
  /** Maximum value (inclusive). */
  readonly max?: number;
}

/**
 * Parse and validate a number value.
 *
 * @param data - Unknown input data.
 * @param label - Field name for error messages.
 * @param opts - Validation options.
 * @returns The validated number.
 * @throws {Error} If validation fails.
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
 * Parse and validate a boolean value.
 *
 * @param data - Unknown input data.
 * @param label - Field name for error messages.
 * @returns The boolean value.
 */
export function parseBoolean(data: unknown, label: string): boolean {
  if (typeof data !== 'boolean') {
    throw new Error(`${label} must be a boolean`);
  }
  return data;
}

/**
 * Parse and validate an object.
 *
 * @param data - Unknown input data.
 * @param label - Field name for error messages.
 * @returns The object (Record<string, unknown>).
 */
export function parseObject(data: unknown, label: string): Record<string, unknown> {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${label} must be an object`);
  }
  return data as Record<string, unknown>;
}

/**
 * Coerce unknown data to a number.
 * Accepts numbers or strings that can be parsed as numbers.
 *
 * @param data - Unknown input data.
 * @param label - Field name for error messages.
 * @param opts - Validation options.
 * @returns The coerced number.
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
 * Coerce unknown data to a Date.
 * Accepts Date objects, numbers (timestamps), or ISO strings.
 *
 * @param data - Unknown input data.
 * @param label - Field name for error messages.
 * @returns The valid Date object.
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
 * Parse a value if present, otherwise return undefined.
 *
 * @param data - Unknown input data.
 * @param parse - Parser function for the value.
 * @returns The value or undefined.
 */
export function parseOptional<T>(data: unknown, parse: (v: unknown) => T): T | undefined {
  if (data === undefined) {
    return undefined;
  }
  return parse(data);
}

/**
 * Parse a value if non-null, otherwise return null.
 *
 * @param data - Unknown input data.
 * @param parse - Parser function for the value.
 * @returns The value or null.
 */
export function parseNullable<T>(data: unknown, parse: (v: unknown) => T): T | null {
  if (data === null) {
    return null;
  }
  return parse(data);
}

/**
 * Parse a value if present and non-null.
 *
 * @param data - Unknown input data.
 * @param parse - Parser function for the value.
 * @returns The value, null, or undefined.
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
// Record helpers
// ============================================================================

/**
 * Validates that input is a Record (non-null object, not array).
 *
 * @param data - Unknown input.
 * @param label - Error label.
 */
export function parseRecord(data: unknown, label: string): Record<string, unknown> {
  if (data === null || data === undefined || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${label} must be an object`);
  }
  return data as Record<string, unknown>;
}

/**
 * Validates a record and its values using a specific parser.
 *
 * @param data - Unknown input.
 * @param label - Error label.
 * @param valueParse - Parser for values.
 * @returns A record with validated values.
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
 * Returns a default value if data is undefined.
 *
 * @param data - Input data.
 * @param defaultValue - Fallback value.
 */
export function withDefault(data: unknown, defaultValue: unknown): unknown {
  return data === undefined ? defaultValue : data;
}
