// src/shared/src/utils/date.ts

/**
 * Format an ISO date string as a short date (e.g. "Jan 15, 2026").
 */
export function formatDate(iso: string | null): string {
  if (iso === null) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * Format an ISO date string as a date with time (e.g. "Jan 15, 2026, 2:30 PM").
 */
export function formatDateTime(iso: string | null): string {
  if (iso === null) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

/**
 * Convert a Date (or null/undefined) to an ISO string, returning null for missing values.
 */
export function toISOStringOrNull(date: Date | string | null | undefined): string | null {
  if (date === null || date === undefined) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}

/**
 * Convert a Date to an ISO date-only string (YYYY-MM-DD), or null for missing values.
 */
export function toISODateOnly(date: Date | string | null | undefined): string | null {
  if (date === null || date === undefined) return null;
  const iso = typeof date === 'string' ? date : date.toISOString();
  return iso.slice(0, 10);
}

/**
 * Format an ISO date string as a relative time (e.g. "3h ago", "2d ago").
 */
export function formatTimeAgo(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${String(diffDays)}d ago`;
    if (diffHours > 0) return `${String(diffHours)}h ago`;
    if (diffMins > 0) return `${String(diffMins)}m ago`;
    return 'just now';
  } catch {
    return iso;
  }
}
