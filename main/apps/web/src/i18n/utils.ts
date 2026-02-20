// main/apps/web/src/i18n/utils.ts
/**
 * Utility functions for the i18n system.
 *
 * Provides string interpolation, translation map flattening,
 * and locale detection from browser settings.
 *
 * @module i18n-utils
 */

import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './types';

import type { FlatTranslationMap, Locale, TranslationMap } from './types';

// ============================================================================
// String Interpolation
// ============================================================================

/**
 * Replace `{placeholder}` tokens in a template string with provided values.
 *
 * @param template - The template string containing `{key}` placeholders
 * @param params - Key-value pairs to substitute into the template
 * @returns The interpolated string
 *
 * @example
 * ```typescript
 * interpolate('Hello, {name}!', { name: 'John' });
 * // => 'Hello, John!'
 *
 * interpolate('{count} items remaining', { count: 5 });
 * // => '5 items remaining'
 * ```
 *
 * @complexity O(n * m) where n is template length and m is number of params
 */
export function interpolate(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (params === undefined) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = params[key];
    if (value === undefined) {
      return match;
    }
    return String(value);
  });
}

// ============================================================================
// Translation Map Flattening
// ============================================================================

/**
 * Flatten a nested translation object into dot-notation keys.
 *
 * Converts nested objects like `{ auth: { login: { title: 'Sign In' } } }`
 * into flat maps like `{ 'auth.login.title': 'Sign In' }`.
 *
 * Already-flat keys (e.g., `'common.save': 'Save'`) are preserved as-is.
 *
 * @param nested - A potentially nested translation map
 * @returns A flat map with dot-notation keys
 *
 * @example
 * ```typescript
 * flattenTranslations({
 *   common: { save: 'Save', cancel: 'Cancel' },
 *   'auth.login.title': 'Sign In',
 * });
 * // => { 'common.save': 'Save', 'common.cancel': 'Cancel', 'auth.login.title': 'Sign In' }
 * ```
 *
 * @complexity O(n) where n is total number of leaf values
 */
export function flattenTranslations(nested: TranslationMap): FlatTranslationMap {
  const flat: FlatTranslationMap = {};

  for (const [key, value] of Object.entries(nested)) {
    if (typeof value === 'string') {
      flat[key] = value;
    } else {
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        flat[`${key}.${nestedKey}`] = nestedValue;
      }
    }
  }

  return flat;
}

// ============================================================================
// Locale Detection
// ============================================================================

/**
 * Detect the user's preferred locale from browser settings.
 *
 * Checks `navigator.language` and `navigator.languages` for a supported
 * locale. Falls back to `DEFAULT_LOCALE` ('en-US') if no match is found.
 *
 * Matching strategy:
 * 1. Exact match (e.g., 'en-US' matches 'en-US')
 * 2. Language prefix match (e.g., 'es-MX' matches 'es')
 *
 * @returns The detected locale or the default locale
 *
 * @example
 * ```typescript
 * // Browser language is 'es-MX'
 * detectLocale(); // => 'es'
 *
 * // Browser language is 'en-US'
 * detectLocale(); // => 'en-US'
 *
 * // Browser language is 'ko' (not supported)
 * detectLocale(); // => 'en-US'
 * ```
 *
 * @complexity O(n * m) where n is navigator.languages length and m is SUPPORTED_LOCALES length
 */
export function detectLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }

  const browserLocales = navigator.languages.length > 0
    ? navigator.languages
    : [navigator.language];

  for (const browserLocale of browserLocales) {
    // Exact match
    const exactMatch = SUPPORTED_LOCALES.find(
      (supported) => supported === browserLocale,
    );
    if (exactMatch !== undefined) {
      return exactMatch;
    }

    // Language prefix match (e.g., 'es-MX' -> 'es')
    const parts = browserLocale.split('-');
    const languagePrefix: string = parts[0] !== undefined ? parts[0] : browserLocale;
    const prefixMatch = SUPPORTED_LOCALES.find(
      (supported) => supported === languagePrefix || supported.startsWith(`${languagePrefix}-`),
    );
    if (prefixMatch !== undefined) {
      return prefixMatch;
    }
  }

  return DEFAULT_LOCALE;
}
