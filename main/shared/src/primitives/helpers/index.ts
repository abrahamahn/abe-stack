// main/shared/src/primitives/helpers/index.ts

export {
  DeferredPromise,
  delay
} from './async';

export {
  assert,
  assertDefined,
  assertNever,
  deepEqual,
  getFieldValue,
  hasDangerousKeys,
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isSafeObjectKey,
  isString,
  sanitizePrototype
} from './object';

export {
  camelizeKeys,
  camelToSnake,
  canonicalizeEmail,
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  formatBytes,
  normalizeEmail,
  normalizeWhitespace,
  padLeft,
  slugify,
  snakeifyKeys,
  snakeToCamel,
  stripControlChars,
  titleCase,
  toCamelCase,
  toCamelCaseArray,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  trimTrailingSlashes,
  truncate
} from './string';

export type { KeyMapping } from './string';

export {
  getBool,
  getInt,
  getList,
  getRequired
} from './parse';
