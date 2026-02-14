// main/shared/src/utils/string/string.ts
/**
 * String Utilities
 *
 * Pure string manipulation utilities (formatting, case conversion, etc.).
 * Security-sensitive ID generation has been moved to ./crypto/random.ts
 */

/**
 * Converts a string to a URL-friendly slug.
 *
 * @param str - Input string to slugify
 * @returns Slugified string
 */
export function slugify(str: string): string {
  if (str === '') return '';

  const lower = str.toLowerCase().trim();
  let result = '';
  let lastWasHyphen = true; // skip leading separators
  for (let i = 0; i < lower.length; i++) {
    const c = lower.charCodeAt(i);
    const char = lower[i];
    // Keep alphanumeric characters
    if (char !== undefined && ((c >= 97 && c <= 122) || (c >= 48 && c <= 57))) {
      result += char;
      lastWasHyphen = false;
    } else if (!lastWasHyphen) {
      // Collapse whitespace, underscores, hyphens, and other chars into single hyphen
      result += '-';
      lastWasHyphen = true;
    }
  }
  // Remove trailing hyphen
  if (result.endsWith('-')) {
    result = result.slice(0, -1);
  }
  return result;
}

/**
 * Capitalizes the first letter of a string.
 *
 * @param str - Input string to capitalize
 * @returns Capitalized string
 */
export function capitalize(str: string): string {
  if (str === '') return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Capitalizes the first letter of each word in a string.
 *
 * @param str - Input string to title case
 * @returns Title-cased string
 */
export function titleCase(str: string): string {
  if (str === '') return '';
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Truncates a string to a specified length and adds an ellipsis.
 *
 * @param str - Input string to truncate
 * @param maxLength - Maximum length of the string (default: 100)
 * @param suffix - Suffix to add (default: '...')
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number = 100, suffix: string = '...'): string {
  if (str === '' || str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Removes extra whitespace from a string.
 *
 * @param str - Input string to trim
 * @returns String with normalized whitespace
 */
export function normalizeWhitespace(str: string): string {
  if (str === '') return '';
  return str.replace(/\s+/g, ' ').trim();
}

/**
 * Strips control characters and null bytes from a string.
 * This is a basic safety measure but DOES NOT provide full HTML/XSS sanitization.
 *
 * @param input - Input string to process
 * @returns Cleaned string
 */
export function stripControlChars(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes
  let sanitized = input.replace(/\0/g, '');

  // Remove control characters (except tab, newline, carriage return)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
}

/**
 * Escapes HTML entities in a string.
 *
 * @param str - Input string to escape
 * @returns String with HTML entities escaped
 */
export function escapeHtml(str: string): string {
  if (str === '') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Normalize an email address for consistent storage and lookup.
 *
 * Applies in order:
 * 1. Trim whitespace
 * 2. Lowercase the entire address
 *
 * For advanced canonicalization (Gmail dot-removal, `+` alias stripping),
 * use {@link canonicalizeEmail} instead.
 *
 * @param email - Raw email input
 * @returns Normalized email (trimmed, lowercased)
 * @complexity O(n) where n = email length
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Canonicalize an email address for duplicate detection.
 *
 * Applies in order:
 * 1. Trim + lowercase ({@link normalizeEmail})
 * 2. Strip `+` alias from local part (`user+tag@domain` → `user@domain`)
 * 3. Remove dots from Gmail/Googlemail local parts (`j.doe` → `jdoe`)
 *
 * Use the canonical form for uniqueness checks; store the original
 * (normalized) form for display and communication.
 *
 * @param email - Raw email input
 * @returns Canonical email for duplicate detection
 * @complexity O(n) where n = email length
 */
export function canonicalizeEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const atIndex = normalized.indexOf('@');

  if (atIndex === -1) return normalized;

  let localPart = normalized.substring(0, atIndex);
  const domain = normalized.substring(atIndex + 1);

  // Strip + alias: user+tag@domain → user@domain
  const plusIndex = localPart.indexOf('+');
  if (plusIndex !== -1) {
    localPart = localPart.substring(0, plusIndex);
  }

  // Gmail dot-insensitivity: j.doe@gmail.com → jdoe@gmail.com
  const gmailDomains = ['gmail.com', 'googlemail.com'];
  if (gmailDomains.includes(domain)) {
    localPart = localPart.replace(/\./g, '');
  }

  return `${localPart}@${domain}`;
}

/**
 * Converts a string to camelCase.
 *
 * @param str - Input string to convert
 * @returns camelCase string
 */
export function toCamelCase(str: string): string {
  if (str === '') return '';
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
}

/**
 * Converts a string to kebab-case.
 *
 * @param str - Input string to convert
 * @returns kebab-case string
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
 *
 * @param str - Input string to convert
 * @returns PascalCase string
 */
export function toPascalCase(str: string): string {
  if (str === '') return '';
  return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (word) => word.toUpperCase()).replace(/\s+/g, '');
}

/**
 * Pads a string to a specified length with a character.
 *
 * @param str - Input string to pad
 * @param length - Target length
 * @param padChar - Character to pad with (default: ' ')
 * @returns Padded string
 */
export function padLeft(str: string, length: number, padChar: string = ' '): string {
  if (str.length >= length) return str;
  return padChar.repeat(length - str.length) + str;
}

/**
 * Counts the number of words in a string.
 *
 * @param str - Input string to count words in
 * @returns Number of words
 */
export function countWords(str: string): number {
  if (str === '') return 0;
  return str.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Counts the number of characters in a string (excluding whitespace).
 *
 * @param str - Input string to count characters in
 * @returns Number of characters excluding whitespace
 */
export function countCharactersNoWhitespace(str: string): number {
  if (str === '') return 0;
  return str.replace(/\s/g, '').length;
}

/**
 * Removes trailing slash characters from a URL or path string.
 *
 * @param value - Input string to trim
 * @returns String with trailing slashes removed
 */
export function trimTrailingSlashes(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  let end = value.length;
  // charCode 47 === '/'
  while (end > 0 && value.charCodeAt(end - 1) === 47) {
    end--;
  }
  return value.slice(0, end);
}

/**
 * Formats a byte count to a human-readable string (e.g. "1.5 MB").
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${String(parseFloat((bytes / Math.pow(k, i)).toFixed(2)))} ${sizes[i] ?? 'B'}`;
}
