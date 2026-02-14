// main/shared/src/utils/string/casing.ts
/**
 * Casing Utilities
 *
 * Generic helpers for converting between camelCase and snake_case keys.
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
    .replace(/[-_]+(.)?/g, (_, c: string | undefined) =>
      c !== undefined && c !== '' ? c.toUpperCase() : '',
    ) // Handle separators
    .replace(/^(.)/, (c: string) => c.toLowerCase()); // Ensure first char is lowercase
}

/**
 * Optional mapping for field name conversion
 */
export type KeyMapping = Record<string, string>;

/**
 * Convert a generic object/string to SQL-like snake_case keys
 * ALSO supports converting a single string if input is string
 */
export function toSnakeCase(data: string, mapping?: KeyMapping): string;
export function toSnakeCase(
  data: Record<string, unknown>,
  mapping?: KeyMapping,
): Record<string, unknown>;
export function toSnakeCase(
  data: string | Record<string, unknown>,
  mapping?: KeyMapping,
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
 * Convert a generic object/string to camelCase keys
 * ALSO supports converting a single string if input is string
 */
export function toCamelCase(record: string, mapping?: KeyMapping): string;
export function toCamelCase<T>(
  record: Record<string, unknown>,
  mapping?: KeyMapping,
  _typeHint?: T,
): T;
export function toCamelCase(
  record: string | Record<string, unknown>,
  mapping?: KeyMapping,
): unknown {
  if (typeof record === 'string') {
    return snakeToCamel(record);
  }

  // Create reverse mapping (snake_case -> camelCase)
  const reverseMapping: Record<string, string> = {};
  if (mapping !== undefined) {
    for (const [camel, snake] of Object.entries(mapping)) {
      reverseMapping[snake] = camel;
    }
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    const fieldName = reverseMapping[key] ?? snakeToCamel(key);
    result[fieldName] = value;
  }
  return result;
}

/**
 * Convert an array of records to TypeScript objects
 */
export function toCamelCaseArray<T = Record<string, unknown>>(
  records: Record<string, unknown>[],
  mapping?: KeyMapping,
): T[] {
  // toCamelCase<T>(Record, ...) always returns T (never string)
  // because the input is Record<string, unknown>, not string.
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
  if (obj === null || obj === undefined || typeof obj !== 'object') {
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

  // Handle Arrays
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
export function snakeifyKeys(obj: unknown): unknown {
  return mapKeys(obj, camelToSnake);
}

/**
 * Recursively convert object keys to camelCase
 */
export function camelizeKeys(obj: unknown): unknown {
  return mapKeys(obj, snakeToCamel);
}
