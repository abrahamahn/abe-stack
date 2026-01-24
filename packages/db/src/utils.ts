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
 * @example camelToSnake('camelCase') => 'camel_case'
 * @example camelToSnake('PascalCase') => 'pascal_case'
 * @example camelToSnake('XMLHttpRequest') => 'xml_http_request'
 */
export function camelToSnake(str: string): string {
  // If string is already all uppercase (like 'SCREAMING_SNAKE_CASE'),
  // just lower case it to avoid inserting underscores between every letter
  if (str === str.toUpperCase()) {
    return str.toLowerCase();
  }

  return str
    .replace(/([a-z\d_])([A-Z])/g, '$1_$2') // Handle camel/Pascal boundaries (camelCase -> camel_case)
    .replace(/([A-Z]+)(?=[A-Z][a-z])/g, '$1_') // Handle acronyms (XMLHttp -> XML_Http)
    .replace(/-/g, '_') // Handle kebab-case -> kebab_case
    .toLowerCase();
}

/**
 * Convert snake_case or kebab-case to camelCase
 * @example snakeToCamel('created_at') => 'createdAt'
 * @example snakeToCamel('kebab-case') => 'kebabCase'
 * @example snakeToCamel('PascalCase') => 'firstName'
 * @example snakeToCamel('SCREAMING_SNAKE') => 'screamingSnake'
 */
export function snakeToCamel(str: string): string {
  // If the string is all uppercase (like SCREAMING_SNAKE_CASE), convert to lowercase first
  // but allow for mixed case like PascalCase (which has lowercase letters)
  const input = str === str.toUpperCase() ? str.toLowerCase() : str;

  return input
    .replace(/[-_]+(.)?/g, (_, c: string | undefined) => (c ? c.toUpperCase() : '')) // Handle separators
    .replace(/^(.)/, (c: string) => c.toLowerCase()); // Ensure first char is lowercase
}

/**
 * Column mapping type - maps TypeScript field names to SQL column names
 */
export type ColumnMapping = Record<string, string>;

/**
 * Convert a TypeScript object to SQL column/value pairs
 * ALSO supports converting a single string if input is string
 */
export function toSnakeCase(data: string, mapping?: ColumnMapping): string;
export function toSnakeCase(
  data: Record<string, unknown>,
  mapping?: ColumnMapping,
): Record<string, unknown>;
export function toSnakeCase(
  data: string | Record<string, unknown>,
  mapping?: ColumnMapping,
): string | Record<string, unknown> {
  if (typeof data === 'string') {
    return camelToSnake(data);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const columnName = mapping?.[key] ?? camelToSnake(key);
    result[columnName] = value;
  }
  return result;
}

/**
 * Convert a SQL record to TypeScript object
 * ALSO supports converting a single string if input is string
 */
export function toCamelCase(record: string, mapping?: ColumnMapping): string;
export function toCamelCase<T>(record: Record<string, unknown>, mapping?: ColumnMapping): T;
export function toCamelCase<T>(
  record: string | Record<string, unknown>,
  mapping?: ColumnMapping,
): string | T {
  if (typeof record === 'string') {
    return snakeToCamel(record);
  }

  // Create reverse mapping (snake_case -> camelCase)
  const reverseMapping: Record<string, string> = {};
  if (mapping) {
    for (const [camel, snake] of Object.entries(mapping)) {
      reverseMapping[snake] = camel;
    }
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
export function toCamelCaseArray<T>(
  records: Record<string, unknown>[],
  mapping?: ColumnMapping,
): T[] {
  return records.map((r) => toCamelCase<T>(r, mapping));
}

/**
 * Recursively key-map an object using a converter function
 */
function mapKeys(
  obj: unknown,
  mapper: (key: string) => string,
  seen = new WeakMap<object, unknown>(),
): unknown {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle Dates, RegExps, buffers
  if (
    obj instanceof Date ||
    obj instanceof RegExp ||
    (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj))
  ) {
    return obj;
  }

  // Circular reference check
  if (seen.has(obj)) {
    return seen.get(obj);
  }

  if (Array.isArray(obj)) {
    const result: unknown[] = [];
    seen.set(obj, result);
    obj.forEach((v) => result.push(mapKeys(v, mapper, seen)));
    return result;
  }

  // Handle plain objects
  const result: Record<string | symbol, unknown> = {};
  seen.set(obj, result);

  // Use simple for-in loop for maximum compatibility
  // Cast to any to iterate
  const o = obj as Record<string, unknown>;
  for (const key in o) {
    if (Object.prototype.hasOwnProperty.call(o, key)) {
      const newKey = mapper(key);
      result[newKey] = mapKeys(o[key], mapper, seen);
    }
  }

  // Handle symbols
  const symKeys = Object.getOwnPropertySymbols(o);
  for (const sym of symKeys) {
    result[sym] = (o as Record<symbol, unknown>)[sym];
  }

  return result;
}

/**
 * Recursively convert object keys to snake_case
 */
export function snakeifyKeys<T = unknown>(obj: unknown): T {
  return mapKeys(obj, camelToSnake) as T;
}

/**
 * Recursively convert object keys to camelCase
 */
export function camelizeKeys<T = unknown>(obj: unknown): T {
  return mapKeys(obj, snakeToCamel) as T;
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
