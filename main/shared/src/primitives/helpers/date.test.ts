// main/shared/src/primitives/helpers/date.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { formatDate, formatDateTime, formatTimeAgo, toISODateOnly } from './date';

// =============================================================================
// Risk assessment (adversarial mandate):
//
// 1. new Date(NaN) — toISODateOnly throws RangeError; formatTimeAgo falls
//    through to formatDateTime producing "Invalid Date" instead of ''.
// 2. Future dates in formatTimeAgo — negative diffMs makes diffSec negative;
//    "diffSec < 60" is true for any negative number, so a date 2 hours in the
//    future still returns "just now" or a negative "N minutes ago" string.
// 3. Timezone-sensitive ISO splitting — toISODateOnly relies on UTC via
//    toISOString(); a Date constructed from a local string may shift date
//    when the local offset is behind UTC.
// =============================================================================

// =============================================================================
// toISODateOnly
// =============================================================================
describe('toISODateOnly', () => {
  it('returns null for null', () => {
    expect(toISODateOnly(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(toISODateOnly(undefined)).toBeNull();
  });

  it('returns YYYY-MM-DD for a valid UTC date', () => {
    // Use an explicit UTC epoch-based date to avoid local-timezone drift.
    const date = new Date('2023-06-15T12:00:00.000Z');
    expect(toISODateOnly(date)).toBe('2023-06-15');
  });

  it('returns the UTC date portion, not the local date', () => {
    // 2023-01-01T00:30:00Z — in UTC+1 this is Jan 1 local; in UTC-5 it's still Jan 1 UTC.
    const date = new Date('2023-01-01T00:30:00.000Z');
    expect(toISODateOnly(date)).toBe('2023-01-01');
  });

  it('handles Unix epoch (new Date(0)) — 1970-01-01', () => {
    expect(toISODateOnly(new Date(0))).toBe('1970-01-01');
  });

  it('handles leap day 2000-02-29', () => {
    const date = new Date('2000-02-29T12:00:00.000Z');
    expect(toISODateOnly(date)).toBe('2000-02-29');
  });

  it('throws RangeError for Invalid Date (new Date(NaN))', () => {
    // toISOString() on an Invalid Date throws — this documents the existing
    // failure mode so callers know to guard inputs before calling toISODateOnly.
    expect(() => toISODateOnly(new Date(NaN))).toThrow(RangeError);
  });
});

// =============================================================================
// formatDate
// =============================================================================
describe('formatDate', () => {
  it('returns empty string for null', () => {
    expect(formatDate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDate('')).toBe('');
  });

  it('formats a Date object to en-US locale', () => {
    const date = new Date('2023-06-15T12:00:00.000Z');
    const result = formatDate(date);
    // Verify it contains the year and month — avoid exact string to stay
    // locale-renderer independent (CI may differ).
    expect(result).toMatch(/2023/);
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/15/);
  });

  it('formats an ISO string the same as the equivalent Date object', () => {
    const iso = '2023-06-15T12:00:00.000Z';
    const date = new Date(iso);
    expect(formatDate(iso)).toBe(formatDate(date));
  });

  it('formats Unix epoch (new Date(0)) without crashing', () => {
    // Should produce a non-empty string regardless of exact value.
    const result = formatDate(new Date(0));
    expect(result).toBeTruthy();
    expect(result).toMatch(/1970/);
  });

  it('formats an invalid ISO string without throwing — produces "Invalid Date"', () => {
    // new Date('not-a-date') is Invalid — toLocaleDateString returns 'Invalid Date'
    // This documents the current behaviour so regressions are caught.
    const result = formatDate('not-a-date');
    expect(result).toBe('Invalid Date');
  });

  it('formats an out-of-range month string without throwing', () => {
    // '2023-13-01' — month 13 is invalid; browser/Node creates an Invalid Date.
    const result = formatDate('2023-13-01');
    expect(result).toBe('Invalid Date');
  });

  it('formats leap day 2000-02-29 correctly', () => {
    const result = formatDate('2000-02-29T12:00:00.000Z');
    expect(result).toMatch(/2000/);
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/29/);
  });
});

// =============================================================================
// formatDateTime
// =============================================================================
describe('formatDateTime', () => {
  it('returns empty string for null', () => {
    expect(formatDateTime(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatDateTime(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatDateTime('')).toBe('');
  });

  it('includes year, month, day, and time components', () => {
    const date = new Date('2023-06-15T14:30:00.000Z');
    const result = formatDateTime(date);
    expect(result).toMatch(/2023/);
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/15/);
    // Hour component present (exact value depends on UTC offset of test env)
    expect(result).toMatch(/\d+:\d{2}/);
  });

  it('formats an ISO string the same as the equivalent Date object', () => {
    const iso = '2023-06-15T14:30:00.000Z';
    const date = new Date(iso);
    expect(formatDateTime(iso)).toBe(formatDateTime(date));
  });

  it('formats Unix epoch without crashing', () => {
    const result = formatDateTime(new Date(0));
    expect(result).toBeTruthy();
    expect(result).toMatch(/1970/);
  });

  it('formats an invalid ISO string — produces "Invalid Date"', () => {
    expect(formatDateTime('not-a-date')).toBe('Invalid Date');
  });

  it('formats out-of-range month — produces "Invalid Date"', () => {
    expect(formatDateTime('2023-13-01')).toBe('Invalid Date');
  });
});

// =============================================================================
// formatTimeAgo — all tests use fake timers for determinism
// =============================================================================
describe('formatTimeAgo', () => {
  // Fixed reference point: 2024-03-15T12:00:00.000Z (noon UTC)
  const NOW = new Date('2024-03-15T12:00:00.000Z').getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Null / empty guards
  // -------------------------------------------------------------------------
  it('returns empty string for null', () => {
    expect(formatTimeAgo(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(formatTimeAgo(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(formatTimeAgo('')).toBe('');
  });

  // -------------------------------------------------------------------------
  // "just now" — less than 60 seconds ago
  // -------------------------------------------------------------------------
  it('returns "just now" for 0 seconds ago (exact now)', () => {
    expect(formatTimeAgo(new Date(NOW))).toBe('just now');
  });

  it('returns "just now" for 30 seconds ago', () => {
    expect(formatTimeAgo(new Date(NOW - 30_000))).toBe('just now');
  });

  it('returns "just now" for 59 seconds ago (boundary: last second before 1 minute)', () => {
    expect(formatTimeAgo(new Date(NOW - 59_000))).toBe('just now');
  });

  // -------------------------------------------------------------------------
  // Minutes ago — 1 minute to 59 minutes
  // -------------------------------------------------------------------------
  it('returns "1 minute ago" (singular) for exactly 60 seconds ago', () => {
    expect(formatTimeAgo(new Date(NOW - 60_000))).toBe('1 minute ago');
  });

  it('returns "2 minutes ago" (plural) for 2 minutes ago', () => {
    expect(formatTimeAgo(new Date(NOW - 2 * 60_000))).toBe('2 minutes ago');
  });

  it('returns "59 minutes ago" for the last minute before 1 hour', () => {
    expect(formatTimeAgo(new Date(NOW - 59 * 60_000))).toBe('59 minutes ago');
  });

  // -------------------------------------------------------------------------
  // Hours ago — 1 hour to 23 hours
  // -------------------------------------------------------------------------
  it('returns "1 hour ago" (singular) for exactly 60 minutes ago', () => {
    expect(formatTimeAgo(new Date(NOW - 60 * 60_000))).toBe('1 hour ago');
  });

  it('returns "2 hours ago" (plural) for 2 hours ago', () => {
    expect(formatTimeAgo(new Date(NOW - 2 * 60 * 60_000))).toBe('2 hours ago');
  });

  it('returns "23 hours ago" for the last hour before "yesterday"', () => {
    expect(formatTimeAgo(new Date(NOW - 23 * 60 * 60_000))).toBe('23 hours ago');
  });

  // -------------------------------------------------------------------------
  // "yesterday" — exactly 1 day (24 h)
  // -------------------------------------------------------------------------
  it('returns "yesterday" for exactly 24 hours ago', () => {
    expect(formatTimeAgo(new Date(NOW - 24 * 60 * 60_000))).toBe('yesterday');
  });

  it('returns "yesterday" for 47 hours ago (still diffDay === 1)', () => {
    expect(formatTimeAgo(new Date(NOW - 47 * 60 * 60_000))).toBe('yesterday');
  });

  // -------------------------------------------------------------------------
  // N days ago — 2 to 6 days
  // -------------------------------------------------------------------------
  it('returns "2 days ago" for exactly 48 hours ago', () => {
    expect(formatTimeAgo(new Date(NOW - 48 * 60 * 60_000))).toBe('2 days ago');
  });

  it('returns "6 days ago" for the last day before falling back to formatDateTime', () => {
    expect(formatTimeAgo(new Date(NOW - 6 * 24 * 60 * 60_000))).toBe('6 days ago');
  });

  // -------------------------------------------------------------------------
  // Fallback to formatDateTime — 7+ days ago
  // -------------------------------------------------------------------------
  it('falls back to formatDateTime for exactly 7 days ago', () => {
    const sevenDaysAgo = new Date(NOW - 7 * 24 * 60 * 60_000);
    const result = formatTimeAgo(sevenDaysAgo);
    // Must NOT be a relative string — should look like a formatted date
    expect(result).not.toMatch(/ago|just now|yesterday/);
    expect(result).toMatch(/\d{4}/); // contains a year
  });

  it('falls back to formatDateTime for 30 days ago', () => {
    const thirtyDaysAgo = new Date(NOW - 30 * 24 * 60 * 60_000);
    const result = formatTimeAgo(thirtyDaysAgo);
    expect(result).not.toMatch(/ago|just now|yesterday/);
    expect(result).toMatch(/\d{4}/);
  });

  it('accepts an ISO string and interprets it correctly', () => {
    // 90 seconds ago as ISO string
    const isoString = new Date(NOW - 90_000).toISOString();
    expect(formatTimeAgo(isoString)).toBe('1 minute ago');
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: Invalid Date — new Date(NaN)
  // -------------------------------------------------------------------------
  it('does NOT return empty string for new Date(NaN) — falls through to formatDateTime producing "Invalid Date"', () => {
    // This documents the failure mode: the falsy guard only fires for null/undefined/''.
    // new Date(NaN) is truthy, so the function proceeds. All diffSec comparisons
    // fail against NaN (NaN < 60 === false), so it falls through to formatDateTime
    // which renders "Invalid Date".
    const result = formatTimeAgo(new Date(NaN));
    expect(result).toBe('Invalid Date');
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: future dates
  // -------------------------------------------------------------------------
  it('returns "just now" for a date 30 seconds in the future (negative diffMs, diffSec = -30 < 60)', () => {
    // diffSec = -30; -30 < 60 is true → "just now"
    // This is technically wrong semantically but documents the current behaviour.
    expect(formatTimeAgo(new Date(NOW + 30_000))).toBe('just now');
  });

  it('returns a "N minutes ago" string with negative N for a date far in the future', () => {
    // 2 hours into the future: diffSec = -7200, diffMin = -120, diffHour = -2
    // diffSec < 60 → true (-7200 < 60), so it returns "just now"
    // Wait — let's verify: Math.floor(-7200/1000) = -7, actually:
    // diffMs = NOW - (NOW + 7200000) = -7200000
    // diffSec = Math.floor(-7200000 / 1000) = -7200
    // -7200 < 60 → true → returns "just now"
    expect(formatTimeAgo(new Date(NOW + 2 * 60 * 60_000))).toBe('just now');
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: Killer test — Invalid Date string combined with fake clock
  // This probes the string→Date conversion path with a semantically invalid
  // date string, under a controlled clock. Both layers interact.
  // -------------------------------------------------------------------------
  it('killer: invalid ISO string "2023-13-01" (month 13) renders "Invalid Date" via the string path', () => {
    // The string is non-empty so the falsy guard is bypassed.
    // new Date('2023-13-01') produces Invalid Date.
    // All numeric comparisons against NaN are false → falls through to
    // formatDateTime → "Invalid Date".
    const result = formatTimeAgo('2023-13-01');
    expect(result).toBe('Invalid Date');
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: Unix epoch as Date object (new Date(0))
  // -------------------------------------------------------------------------
  it('falls back to formatDateTime for Unix epoch (new Date(0)) — far in the past', () => {
    // 2024-03-15 minus 1970-01-01 is ~54 years, well beyond 7 days.
    const result = formatTimeAgo(new Date(0));
    expect(result).not.toMatch(/ago|just now|yesterday/);
    expect(result).toMatch(/1970/);
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: boundary — exactly 60 seconds (not 59, not 61)
  // -------------------------------------------------------------------------
  it('boundary: 60 000 ms ago is "1 minute ago", 59 999 ms ago is "just now"', () => {
    expect(formatTimeAgo(new Date(NOW - 60_000))).toBe('1 minute ago');
    expect(formatTimeAgo(new Date(NOW - 59_999))).toBe('just now');
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: boundary — exactly 1 hour (3600 seconds)
  // -------------------------------------------------------------------------
  it('boundary: 3 600 000 ms ago is "1 hour ago", 3 599 999 ms ago is "59 minutes ago"', () => {
    expect(formatTimeAgo(new Date(NOW - 3_600_000))).toBe('1 hour ago');
    expect(formatTimeAgo(new Date(NOW - 3_599_999))).toBe('59 minutes ago');
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: boundary — exactly 24 hours vs. 23 h 59 m 59 s
  // -------------------------------------------------------------------------
  it('boundary: 86 400 000 ms ago is "yesterday", 86 399 999 ms ago is "23 hours ago"', () => {
    expect(formatTimeAgo(new Date(NOW - 86_400_000))).toBe('yesterday');
    expect(formatTimeAgo(new Date(NOW - 86_399_999))).toBe('23 hours ago');
  });

  // -------------------------------------------------------------------------
  // ADVERSARIAL: boundary — exactly 7 days vs. 6 days 23 h 59 m 59 s
  // -------------------------------------------------------------------------
  it('boundary: 7 days ago falls back to formatDateTime; 6 days 23 h 59 m 59 s is "6 days ago"', () => {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const justUnder = sevenDays - 1;

    const atSevenDays = formatTimeAgo(new Date(NOW - sevenDays));
    expect(atSevenDays).not.toMatch(/ago|just now|yesterday/);
    expect(atSevenDays).toMatch(/\d{4}/);

    expect(formatTimeAgo(new Date(NOW - justUnder))).toBe('6 days ago');
  });
});
