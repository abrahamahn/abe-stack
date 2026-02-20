// main/apps/web/src/i18n/format.test.ts
/**
 * Tests for i18n formatting utilities.
 *
 * Covers:
 * - formatDate: locale-aware date formatting
 * - formatNumber: locale-aware number formatting
 * - formatCurrency: currency formatting
 * - formatRelativeTime: relative time formatting
 *
 * @module i18n-format-test
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatCurrency, formatDate, formatNumber, formatRelativeTime } from './format';

// ============================================================================
// formatDate
// ============================================================================

describe('formatDate', () => {
  it('should format a Date object for en-US', () => {
    const date = new Date('2024-03-15T00:00:00Z');
    const result = formatDate(date, 'en-US', { timeZone: 'UTC' });
    expect(result).toContain('3');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should format an ISO string for en-US', () => {
    const result = formatDate('2024-03-15T00:00:00Z', 'en-US', { timeZone: 'UTC' });
    expect(result).toContain('3');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should format a date for fr locale', () => {
    const date = new Date('2024-03-15T00:00:00Z');
    const result = formatDate(date, 'fr', { timeZone: 'UTC' });
    expect(result).toContain('15');
    const containsMonth = result.includes('03') || result.includes('3');
    expect(containsMonth).toBe(true);
    expect(result).toContain('2024');
  });

  it('should accept dateStyle option', () => {
    const date = new Date('2024-03-15T00:00:00Z');
    const result = formatDate(date, 'en-US', { dateStyle: 'long', timeZone: 'UTC' });
    expect(result).toContain('March');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('should format date for es locale', () => {
    const date = new Date('2024-03-15T00:00:00Z');
    const result = formatDate(date, 'es', { timeZone: 'UTC' });
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });
});

// ============================================================================
// formatNumber
// ============================================================================

describe('formatNumber', () => {
  it('should format a number for en-US with comma grouping', () => {
    const result = formatNumber(1234567.89, 'en-US');
    expect(result).toBe('1,234,567.89');
  });

  it('should format a number for de with period grouping', () => {
    const result = formatNumber(1234567.89, 'de');
    // German uses . for thousands and , for decimals
    expect(result).toContain('1.234.567');
  });

  it('should format a small number without grouping', () => {
    const result = formatNumber(42, 'en-US');
    expect(result).toBe('42');
  });

  it('should format zero', () => {
    const result = formatNumber(0, 'en-US');
    expect(result).toBe('0');
  });

  it('should format negative numbers', () => {
    const result = formatNumber(-1234.56, 'en-US');
    // Should contain the digits and a minus sign
    expect(result).toContain('1,234.56');
  });

  it('should accept number format options', () => {
    const result = formatNumber(0.456, 'en-US', { style: 'percent' });
    expect(result).toContain('46');
    expect(result).toContain('%');
  });
});

// ============================================================================
// formatCurrency
// ============================================================================

describe('formatCurrency', () => {
  it('should format USD for en-US', () => {
    const result = formatCurrency(1234.56, 'USD', 'en-US');
    expect(result).toContain('$');
    expect(result).toContain('1,234.56');
  });

  it('should format EUR for de', () => {
    const result = formatCurrency(1234.56, 'EUR', 'de');
    // German locale puts the euro sign after the number
    expect(result).toContain('1.234,56');
  });

  it('should format JPY without decimals', () => {
    const result = formatCurrency(1234, 'JPY', 'ja');
    // JPY does not use decimal places
    expect(result).toContain('1,234');
  });

  it('should format zero amount', () => {
    const result = formatCurrency(0, 'USD', 'en-US');
    expect(result).toContain('$');
    expect(result).toContain('0');
  });

  it('should format GBP for en-US', () => {
    const result = formatCurrency(99.99, 'GBP', 'en-US');
    expect(result).toContain('99.99');
  });
});

// ============================================================================
// formatRelativeTime
// ============================================================================

describe('formatRelativeTime', () => {
  beforeEach(() => {
    // Fix "now" to a known timestamp for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should format seconds ago', () => {
    const date = new Date('2024-06-15T11:59:30Z'); // 30 seconds ago
    const result = formatRelativeTime(date, 'en-US');
    expect(result).toContain('30');
    expect(result).toContain('second');
  });

  it('should format minutes ago', () => {
    const date = new Date('2024-06-15T11:55:00Z'); // 5 minutes ago
    const result = formatRelativeTime(date, 'en-US');
    expect(result).toContain('5');
    expect(result).toContain('minute');
  });

  it('should format hours ago', () => {
    const date = new Date('2024-06-15T10:00:00Z'); // 2 hours ago
    const result = formatRelativeTime(date, 'en-US');
    expect(result).toContain('2');
    expect(result).toContain('hour');
  });

  it('should format days ago', () => {
    const date = new Date('2024-06-12T12:00:00Z'); // 3 days ago
    const result = formatRelativeTime(date, 'en-US');
    expect(result).toContain('3');
    expect(result).toContain('day');
  });

  it('should format an ISO string', () => {
    const result = formatRelativeTime('2024-06-15T11:55:00Z', 'en-US');
    expect(result).toContain('5');
    expect(result).toContain('minute');
  });

  it('should format in Spanish', () => {
    const date = new Date('2024-06-15T10:00:00Z'); // 2 hours ago
    const result = formatRelativeTime(date, 'es');
    expect(result).toContain('2');
    // Spanish uses "horas" or "hora"
    expect(result.toLowerCase()).toMatch(/hora/);
  });

  it('should format future dates', () => {
    const date = new Date('2024-06-15T14:00:00Z'); // 2 hours from now
    const result = formatRelativeTime(date, 'en-US');
    expect(result).toContain('2');
    expect(result).toContain('hour');
    // Should indicate future, not past
    expect(result).not.toContain('ago');
  });

  it('should format "yesterday" or "1 day ago" for 1 day in the past', () => {
    const date = new Date('2024-06-14T12:00:00Z'); // 1 day ago
    const result = formatRelativeTime(date, 'en-US');
    // Intl.RelativeTimeFormat with numeric: 'auto' may return "yesterday"
    expect(result === 'yesterday' || result === '1 day ago').toBe(true);
  });
});
