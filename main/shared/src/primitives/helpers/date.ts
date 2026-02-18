// main/shared/src/primitives/helpers/date.ts

/**
 * Formats a Date to ISO date-only string (YYYY-MM-DD), or returns null.
 * @param date - Date or null/undefined
 * @returns ISO date string or null
 */
export function toISODateOnly(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString().split('T')[0] ?? null;
}

/**
 * Formats a Date or ISO string to a locale date string.
 * @param date - Date, ISO string, or null/undefined
 * @returns Formatted date string or empty string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/**
 * Formats a Date or ISO string to a locale date-time string.
 * @param date - Date, ISO string, or null/undefined
 * @returns Formatted date-time string or empty string
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a Date or ISO string as a relative time string (e.g., "2 hours ago", "yesterday").
 * Falls back to formatDateTime for dates older than 7 days.
 * @param date - Date, ISO string, or null/undefined
 * @returns Relative time string or empty string
 */
export function formatTimeAgo(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = Date.now();
  const diffMs = now - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${String(diffMin)} ${diffMin === 1 ? 'minute' : 'minutes'} ago`;
  if (diffHour < 24) return `${String(diffHour)} ${diffHour === 1 ? 'hour' : 'hours'} ago`;
  if (diffDay === 1) return 'yesterday';
  if (diffDay < 7) return `${String(diffDay)} days ago`;
  return formatDateTime(d);
}
