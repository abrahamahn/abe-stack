// main/shared/src/primitives/helpers/string.ts

/**
 * @file String Utilities
 * @description Helpers for casing, formatting, and string manipulation.
 * @module Primitives/Helpers/String
 */

// ============================================================================
// 1. Case Conversion
// ============================================================================

/**
 * Convert camelCase to snake_case.
 *
 * @example camelToSnake('camelCase') => 'camel_case'
 * @param str - The input string (camelCase or PascalCase).
 * @returns The string in snake_case.
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
 * Convert snake_case or kebab-case to camelCase.
 *
 * @example snakeToCamel('created_at') => 'createdAt'
 * @param str - The input string.
 * @returns The string in camelCase.
 */
export function snakeToCamel(str: string): string {
  const input = str === str.toUpperCase() ? str.toLowerCase() : str;

  return input
    .replace(/[-_]+(.)?/g, (_, c: string | undefined) =>
      c !== undefined && c !== '' ? c.toUpperCase() : '',
    )
    .replace(/^(.)/, (c: string) => c.toLowerCase());
}

/**
 * Converts a string to kebab-case.
 * @param str - Input string.
 */
export function toKebabCase(str: string): string {
  if (str === '') return '';
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a string to PascalCase.
 * @param str - Input string.
 */
export function toPascalCase(str: string): string {
  if (str === '') return '';
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/\s+/g, '');
}

// ============================================================================
// 2. Object Key Mapping
// ============================================================================

/** Mapping of source keys to destination keys. */
export type KeyMapping = Record<string, string>;

/**
 * Convert keys of an object (or a string value) to snake_case.
 * @param data - Object or string to convert.
 * @param mapping - Optional custom key mapping.
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
 * Convert keys of an object (or a string value) to camelCase.
 * @param record - Object or string to convert.
 * @param mapping - Optional custom key mapping.
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
    if (record.includes(' ')) {
      return record
        .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
          return index === 0 ? word.toLowerCase() : word.toUpperCase();
        })
        .replace(/\s+/g, '');
    }
    return snakeToCamel(record);
  }

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
 * Convert an array of objects to camelCase keys.
 */
export function toCamelCaseArray<T = Record<string, unknown>>(
  records: Record<string, unknown>[],
  mapping?: KeyMapping,
): T[] {
  return records.map((r) => toCamelCase<T>(r, mapping));
}

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
    ArrayBuffer.isView(obj)
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

/** Recursively convert object keys to snake_case. */
export function snakeifyKeys(obj: unknown): unknown {
  return mapKeys(obj, camelToSnake);
}

/** Recursively convert object keys to camelCase. */
export function camelizeKeys(obj: unknown): unknown {
  return mapKeys(obj, snakeToCamel);
}

// ============================================================================
// 3. String Formatting
// ============================================================================

/** Capitalizes the first letter of a string. */
export function capitalize(str: string): string {
  if (str === '') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/** Capitalizes the first letter of each word in a string. */
export function titleCase(str: string): string {
  if (str === '') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** Converts a string to a URL-friendly slug. */
export function slugify(str: string): string {
  if (str === '') return '';

  const lower = str.toLowerCase().trim();
  let result = '';
  let lastWasHyphen = true;
  for (let i = 0; i < lower.length; i++) {
    const c = lower.charCodeAt(i);
    const char = lower[i];
    if (char !== undefined && ((c >= 97 && c <= 122) || (c >= 48 && c <= 57))) {
      result += char;
      lastWasHyphen = false;
    } else if (!lastWasHyphen) {
      result += '-';
      lastWasHyphen = true;
    }
  }
  if (result.endsWith('-')) {
    result = result.slice(0, -1);
  }
  return result;
}

/** Truncates a string to a specified length and adds an ellipsis. */
export function truncate(str: string, maxLength: number = 100, suffix: string = '...'): string {
  if (str === '' || str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/** Removes extra whitespace from a string (multiple spaces become one). */
export function normalizeWhitespace(str: string): string {
  if (str === '') return '';
  return str.replace(/\s+/g, ' ').trim();
}

/** Pads a string to a specified length with a character (default space). */
export function padLeft(str: string, length: number, padChar: string = ' '): string {
  if (str.length >= length) return str;
  return padChar.repeat(length - str.length) + str;
}

// ============================================================================
// 4. Validation & Sanitization
// ============================================================================

/** Normalize an email address (trim, lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Canonicalize an email address for duplicate detection (strips aliases, dots in gmail). */
export function canonicalizeEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.indexOf('@');

  if (atIndex === -1) return normalized;

  let localPart = normalized.substring(0, atIndex);
  const domain = normalized.substring(atIndex + 1);

  const plusIndex = localPart.indexOf('+');
  if (plusIndex !== -1) {
    localPart = localPart.substring(0, plusIndex);
  }

  const gmailDomains = ['gmail.com', 'googlemail.com'];
  if (gmailDomains.includes(domain)) {
    localPart = localPart.replace(/\./g, '');
  }

  return `${localPart}@${domain}`;
}

/** Removes trailing slash characters from a URL or path string. */
export function trimTrailingSlashes(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end--;
  }
  return value.slice(0, end);
}

/** Strips control characters and null bytes from a string. */
export function stripControlChars(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Strip null bytes, then other control chars (exclude \t U+0009, \n U+000A, \r U+000D).
  // RegExp constructor used to avoid no-control-regex lint rule on literal control chars.
  const nullByteRe = new RegExp(String.fromCharCode(0), 'gu');
  // Matches C0 controls except HT/LF/CR, and DEL (U+007F).
  const controlCharsRe = new RegExp(
    '[' +
      String.fromCharCode(0) + '-' + String.fromCharCode(8) +
      String.fromCharCode(11) +
      String.fromCharCode(12) +
      String.fromCharCode(14) + '-' + String.fromCharCode(31) +
      String.fromCharCode(127) +
    ']',
    'gu',
  );
  let sanitized = input.replace(nullByteRe, '');
  sanitized = sanitized.replace(controlCharsRe, '');

  return sanitized;
}

/** Escapes HTML entities in a string. */
export function escapeHtml(str: string): string {
  if (str === '') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ============================================================================
// 5. String Metrics
// ============================================================================

/** Counts the number of words in a string. */
export function countWords(str: string): number {
  if (str === '') return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/** Counts the number of characters in a string (excluding whitespace). */
export function countCharactersNoWhitespace(str: string): number {
  if (str === '') return 0;
  return str.replace(/\s/g, '').length;
}

/** Formats a byte count to a human-readable string (e.g. "1.5 MB"). */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(2)))} ${sizes[i] ?? 'B'}`;
}
