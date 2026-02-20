// main/apps/web/src/i18n/format.ts
/**
 * Locale-aware formatting utilities using the Intl API.
 *
 * Provides date, number, currency, and relative time formatting
 * that respects the user's locale settings.
 *
 * @module i18n-format
 */

import type { Locale } from './types';

// ============================================================================
// Date Formatting
// ============================================================================

/**
 * Format a date according to the specified locale.
 *
 * Uses `Intl.DateTimeFormat` for locale-aware date rendering.
 *
 * @param date - The date to format (Date object or ISO string)
 * @param locale - The locale to use for formatting
 * @param options - Optional Intl.DateTimeFormatOptions to customise output
 * @returns The formatted date string
 *
 * @example
 * ```typescript
 * formatDate(new Date('2024-03-15'), 'en-US');
 * // => '3/15/2024'
 *
 * formatDate(new Date('2024-03-15'), 'de', { dateStyle: 'long' });
 * // => '15. März 2024'
 *
 * formatDate('2024-03-15T10:30:00Z', 'fr');
 * // => '15/03/2024'
 * ```
 *
 * @complexity O(1)
 */
export function formatDate(
  date: Date | string,
  locale: Locale,
  options?: Intl.DateTimeFormatOptions,
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Format a number according to the specified locale.
 *
 * Uses `Intl.NumberFormat` for locale-aware number rendering,
 * including appropriate digit grouping and decimal separators.
 *
 * @param num - The number to format
 * @param locale - The locale to use for formatting
 * @param options - Optional Intl.NumberFormatOptions to customise output
 * @returns The formatted number string
 *
 * @example
 * ```typescript
 * formatNumber(1234567.89, 'en-US');
 * // => '1,234,567.89'
 *
 * formatNumber(1234567.89, 'de');
 * // => '1.234.567,89'
 *
 * formatNumber(0.456, 'en-US', { style: 'percent' });
 * // => '46%'
 * ```
 *
 * @complexity O(1)
 */
export function formatNumber(
  num: number,
  locale: Locale,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(num);
}

// ============================================================================
// Currency Formatting
// ============================================================================

/**
 * Format a monetary amount with the appropriate currency symbol.
 *
 * Uses `Intl.NumberFormat` with `style: 'currency'` for locale-aware
 * currency rendering.
 *
 * @param amount - The monetary amount to format
 * @param currency - ISO 4217 currency code (e.g., 'USD', 'EUR', 'JPY')
 * @param locale - The locale to use for formatting
 * @returns The formatted currency string
 *
 * @example
 * ```typescript
 * formatCurrency(1234.56, 'USD', 'en-US');
 * // => '$1,234.56'
 *
 * formatCurrency(1234.56, 'EUR', 'de');
 * // => '1.234,56 €'
 *
 * formatCurrency(1234, 'JPY', 'ja');
 * // => '￥1,234'
 * ```
 *
 * @complexity O(1)
 */
export function formatCurrency(
  amount: number,
  currency: string,
  locale: Locale,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
}

// ============================================================================
// Relative Time Formatting
// ============================================================================

/**
 * Time unit thresholds for relative time formatting.
 * Each entry defines the maximum elapsed seconds for a unit and the
 * corresponding Intl.RelativeTimeFormat unit.
 */
const RELATIVE_TIME_THRESHOLDS: Array<{
  max: number;
  unit: Intl.RelativeTimeFormatUnit;
  divisor: number;
}> = [
  { max: 60, unit: 'second', divisor: 1 },
  { max: 3600, unit: 'minute', divisor: 60 },
  { max: 86400, unit: 'hour', divisor: 3600 },
  { max: 2592000, unit: 'day', divisor: 86400 },
  { max: 31536000, unit: 'month', divisor: 2592000 },
  { max: Infinity, unit: 'year', divisor: 31536000 },
];

/**
 * Format a date as a relative time string (e.g., "2 hours ago", "yesterday").
 *
 * Uses `Intl.RelativeTimeFormat` for locale-aware relative time rendering.
 * Automatically selects the most appropriate time unit.
 *
 * @param date - The date to format relative to now (Date object or ISO string)
 * @param locale - The locale to use for formatting
 * @returns The formatted relative time string
 *
 * @example
 * ```typescript
 * // Assuming current time is 2024-03-15T12:00:00Z
 *
 * formatRelativeTime(new Date('2024-03-15T10:00:00Z'), 'en-US');
 * // => '2 hours ago'
 *
 * formatRelativeTime(new Date('2024-03-14T12:00:00Z'), 'en-US');
 * // => '1 day ago' or 'yesterday'
 *
 * formatRelativeTime(new Date('2024-03-15T10:00:00Z'), 'es');
 * // => 'hace 2 horas'
 * ```
 *
 * @complexity O(1) - bounded iteration over threshold list
 */
export function formatRelativeTime(
  date: Date | string,
  locale: Locale,
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const elapsedSeconds = Math.round((dateObj.getTime() - now) / 1000);
  const absoluteElapsed = Math.abs(elapsedSeconds);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  for (const { max, unit, divisor } of RELATIVE_TIME_THRESHOLDS) {
    if (absoluteElapsed < max) {
      const value = Math.round(elapsedSeconds / divisor);
      return rtf.format(value, unit);
    }
  }

  // Fallback (should not be reached due to Infinity threshold)
  return rtf.format(Math.round(elapsedSeconds / 31536000), 'year');
}
