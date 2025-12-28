/**
 * Format a date into a human-readable string
 * @param date The date to format
 * @param locale The locale to use for formatting (defaults to en-US)
 * @returns A formatted date string
 */
export function formatDate(
  date: Date | string | number,
  locale = "en-US",
): string {
  const d = new Date(date);
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
