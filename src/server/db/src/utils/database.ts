// src/server/db/src/utils/database.ts
/**
 * Database Utilities
 *
 * Helpers for working with database records and column mappings.
 * Re-exports shared case-conversion utilities; adds DB-specific wrappers
 * that filter undefined values and use ColumnMapping types.
 *
 * @module
 */

import {
  camelToSnake,
  camelizeKeys,
  snakeToCamel,
  snakeifyKeys,
} from '@abe-stack/shared';

// Re-export shared casing utilities so the barrel (utils/index.ts) stays unchanged
export { camelToSnake, camelizeKeys, snakeToCamel, snakeifyKeys };

// ============================================================================
// Column Mapping Type
// ============================================================================

/**
 * Maps camelCase property names to snake_case column names
 */
export type ColumnMapping = Record<string, string>;

// ============================================================================
// Case Conversion (DB-specific wrappers with ColumnMapping support)
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
