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
