// backend/db/src/utils.ts
/**
 * Database Utilities
 *
 * Helpers for working with database records and column mappings.
 * Re-exports case-conversion utilities with properly preserved generic overloads.
 *
 * @module
 */

// ============================================================================
// Column Mapping Type
// ============================================================================

/**
 * Maps camelCase property names to snake_case column names
 */
export type ColumnMapping = Record<string, string>;

// ============================================================================
// String Case Conversion
// ============================================================================

/**
 * Convert a camelCase or PascalCase string to snake_case
 * @param str - The string to convert
 * @returns snake_case version of the string
 * @example camelToSnake('camelCase') // => 'camel_case'
 * @example camelToSnake('XMLHttpRequest') // => 'xml_http_request'
 * @complexity O(n) where n is string length
 */
export function camelToSnake(str: string): string {
  if (str === str.toUpperCase()) {
    return str.toLowerCase();
  }
  return str
    .replace(/([a-z\d_])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)(?=[A-Z][a-z])/g, '$1_')
    .replace(/-/g, '_')
    .toLowerCase();
}

/**
 * Convert a snake_case or kebab-case string to camelCase
 * @param str - The string to convert
 * @returns camelCase version of the string
 * @example snakeToCamel('created_at') // => 'createdAt'
 * @example snakeToCamel('SCREAMING_SNAKE') // => 'screamingSnake'
 * @complexity O(n) where n is string length
 */
export function snakeToCamel(str: string): string {
  const input = str === str.toUpperCase() ? str.toLowerCase() : str;
  return input
    .replace(/[-_]+(.)?/g, (_, c: string | undefined) =>
      c !== undefined && c !== '' ? c.toUpperCase() : '',
    )
    .replace(/^(.)/, (c: string) => c.toLowerCase());
}

// ============================================================================
// Recursive Key Mapping
// ============================================================================

/**
 * Recursively map all string keys of an object using a converter function.
 * Handles arrays, nested objects, circular references, Date/RegExp pass-through.
 * @param obj - The value to transform
 * @param mapper - Key name converter function
 * @param seen - WeakMap for circular reference detection
 * @returns Transformed value with mapped keys
 * @complexity O(n) where n is total number of keys across all nested objects
 */
function mapKeys(
  obj: unknown,
  mapper: (key: string) => string,
  seen = new WeakMap<object, unknown>(),
): unknown {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))
  ) {
    return obj;
  }
  if (seen.has(obj)) {
    return seen.get(obj);
  }
  if (Array.isArray(obj)) {
    const result: unknown[] = [];
    seen.set(obj, result);
    obj.forEach((v) => result.push(mapKeys(v, mapper, seen)));
    return result;
  }
  const result: Record<string | symbol, unknown> = {};
  seen.set(obj, result);
  const o = obj as Record<string, unknown>;
  for (const key in o) {
    if (Object.prototype.hasOwnProperty.call(o, key)) {
      const newKey = mapper(key);
      result[newKey] = mapKeys(o[key], mapper, seen);
    }
  }
  const symKeys = Object.getOwnPropertySymbols(o);
  for (const sym of symKeys) {
    result[sym] = (o as Record<symbol, unknown>)[sym];
  }
  return result;
}

/**
 * Recursively convert all object keys to snake_case
 * @param obj - Object or value to convert
 * @returns Clone with snake_case keys
 * @complexity O(n) where n is total number of keys
 */
export function snakeifyKeys(obj: unknown): unknown {
  return mapKeys(obj, camelToSnake);
}

/**
 * Recursively convert all object keys to camelCase
 * @param obj - Object or value to convert
 * @returns Clone with camelCase keys
 * @complexity O(n) where n is total number of keys
 */
export function camelizeKeys(obj: unknown): unknown {
  return mapKeys(obj, snakeToCamel);
}

// ============================================================================
// Case Conversion (with preserved generic overloads)
// ============================================================================

/**
 * Convert a snake_case database row to a camelCase typed object.
 * Uses reverse column mapping to convert snake_case keys back to camelCase.
 *
 * @param row - Raw database row with snake_case keys
 * @param mapping - Column name mapping (camelCase → snake_case)
 * @param _typeHint - Optional type hint for inference (not used at runtime)
 * @returns Typed object with camelCase keys
 * @complexity O(n) where n is number of keys in the row
 */
export function toCamelCase<T>(
  row: Record<string, unknown>,
  mapping?: ColumnMapping,
  _typeHint?: T,
): T {
  const reverseMapping: Record<string, string> = {};
  if (mapping !== undefined) {
    for (const [camel, snake] of Object.entries(mapping)) {
      reverseMapping[snake] = camel;
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const fieldName = reverseMapping[key] ?? snakeToCamel(key);
    result[fieldName] = value;
  }
  return result as T;
}

/**
 * Convert an array of database rows to typed objects
 * @param records - Array of raw database rows
 * @param mapping - Column name mapping
 * @returns Array of typed objects with camelCase keys
 * @complexity O(n * m) where n is records and m is keys per record
 */
export function toCamelCaseArray<T = Record<string, unknown>>(
  records: Record<string, unknown>[],
  mapping?: ColumnMapping,
): T[] {
  return records.map((record) => toCamelCase<T>(record, mapping));
}

/**
 * Convert a camelCase object to snake_case for database storage
 * @param data - Object with camelCase keys
 * @param mapping - Column name mapping (camelCase → snake_case)
 * @returns Object with snake_case keys for SQL
 * @complexity O(n) where n is number of keys in the object
 */
export function toSnakeCase(
  data: Record<string, unknown>,
  mapping?: ColumnMapping,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      continue;
    }
    const columnName = mapping?.[key] ?? camelToSnake(key);
    result[columnName] = value;
  }
  return result;
}

// ============================================================================
// SQL Value Formatting
// ============================================================================

/**
 * Format a Date for PostgreSQL
 * Returns ISO string which PostgreSQL can parse
 * @param date - The date to format
 * @returns ISO-8601 string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format a value for JSONB storage
 * @param value - The value to serialize
 * @returns JSON string
 */
export function formatJsonb(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Parse a JSONB value from database
 * @param value - The raw JSONB string from database
 * @returns Parsed value or null if invalid/absent
 */
export function parseJsonb(value: string | null | undefined): unknown {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Build a column list for SELECT
 * @param columns - Array of column names or '*'
 * @returns Comma-separated column list
 */
export function buildColumnList(columns: string | string[]): string {
  if (columns === '*' || (Array.isArray(columns) && columns.length === 0)) {
    return '*';
  }
  const cols = Array.isArray(columns) ? columns : [columns];
  return cols.join(', ');
}

/**
 * Build a SET clause for UPDATE from an object
 * @param data - Object with values to set
 * @param mapping - Column name mapping
 * @returns SQL SET clause and parameter values
 */
export function buildSetClause(
  data: Record<string, unknown>,
  mapping: ColumnMapping,
): { clause: string; values: unknown[] } {
  const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
  const values: unknown[] = [];
  const parts: string[] = [];

  for (const [key, value] of entries) {
    const columnName = mapping[key] ?? camelToSnake(key);
    values.push(value);
    parts.push(`${columnName} = $${String(values.length)}`);
  }

  return { clause: parts.join(', '), values };
}

/**
 * Build an INSERT columns and values clause from an object
 * @param data - Object with values to insert
 * @param mapping - Column name mapping
 * @returns SQL columns, placeholders, and parameter values
 */
export function buildInsertClause(
  data: Record<string, unknown>,
  mapping: ColumnMapping,
): { columns: string; placeholders: string; values: unknown[] } {
  const entries = Object.entries(data).filter(([_, v]) => v !== undefined);
  const values: unknown[] = [];
  const columns: string[] = [];
  const placeholders: string[] = [];

  for (const [key, value] of entries) {
    const columnName = mapping[key] ?? camelToSnake(key);
    columns.push(columnName);
    values.push(value);
    placeholders.push(`$${String(values.length)}`);
  }

  return {
    columns: columns.join(', '),
    placeholders: placeholders.join(', '),
    values,
  };
}
