// packages/db/src/utils.ts
/**
 * Database Utilities
 *
 * Helpers for working with database records and column mappings.
 */

// ============================================================================
// Column Name Conversion
// ============================================================================

/**
 * Convert camelCase to snake_case
 * @example camelToSnake('createdAt') => 'created_at'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Convert snake_case to camelCase
 * @example snakeToCamel('created_at') => 'createdAt'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Column mapping type - maps TypeScript field names to SQL column names
 */
export type ColumnMapping = Record<string, string>;

/**
 * Convert a TypeScript object to SQL column/value pairs
 * @param data Object with camelCase keys
 * @param mapping Column mapping (camelCase -> snake_case)
 * @returns Object with snake_case keys
 */
export function toSnakeCase(
  data: Record<string, unknown>,
  mapping: ColumnMapping,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const columnName = mapping[key] ?? camelToSnake(key);
    result[columnName] = value;
  }
  return result;
}

/**
 * Convert a SQL record to TypeScript object
 * @param record Object with snake_case keys
 * @param mapping Column mapping (camelCase -> snake_case)
 * @returns Object with camelCase keys
 */
export function toCamelCase<T>(record: Record<string, unknown>, mapping: ColumnMapping): T {
  // Create reverse mapping (snake_case -> camelCase)
  const reverseMapping: Record<string, string> = {};
  for (const [camel, snake] of Object.entries(mapping)) {
    reverseMapping[snake] = camel;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const fieldName = reverseMapping[key] ?? snakeToCamel(key);
    result[fieldName] = value;
  }
  return result as T;
}

/**
 * Convert an array of SQL records to TypeScript objects
 */
export function toCamelCaseArray<T>(records: Record<string, unknown>[], mapping: ColumnMapping): T[] {
  return records.map((r) => toCamelCase<T>(r, mapping));
}

// ============================================================================
// SQL Value Formatting
// ============================================================================

/**
 * Format a Date for PostgreSQL
 * Returns ISO string which PostgreSQL can parse
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format a value for JSONB storage
 */
export function formatJsonb(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Parse a JSONB value from database
 */
export function parseJsonb<T = unknown>(value: string | null | undefined): T | null {
  if (value === null || value === undefined) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Build a column list for SELECT
 * @param columns Array of column names or '*'
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
 * Returns { clause: string, values: unknown[] }
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
