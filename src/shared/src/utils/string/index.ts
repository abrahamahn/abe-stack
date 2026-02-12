// src/shared/src/utils/string/index.ts
/**
 * String Utilities
 *
 * Pure string manipulation (formatting, case conversion) and
 * key-casing conversion for objects/records.
 *
 * NOTE: Both `string.ts` and `casing.ts` export `toCamelCase` with different
 * signatures. The string variant converts a single string to camelCase;
 * the casing variant converts object keys. Import from the specific module
 * when you need to disambiguate.
 */

export {
  canonicalizeEmail,
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  normalizeEmail,
  normalizeWhitespace,
  padLeft,
  slugify,
  stripControlChars,
  titleCase,
  toKebabCase,
  toPascalCase,
  trimTrailingSlashes,
  truncate,
} from './string';

export {
  camelToSnake,
  camelizeKeys,
  snakeToCamel,
  snakeifyKeys,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
  type KeyMapping,
} from './casing';
