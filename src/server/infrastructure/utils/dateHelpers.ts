import {
  formatRelative,
  isToday,
  isTomorrow,
  isYesterday,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from "date-fns";

export const SecondMs = 1000;
export const MinuteMs = 60 * SecondMs;
export const HourMs = 60 * MinuteMs;
export const DayMs = 24 * HourMs;

export const MinuteS = 60;
export const HourS = 60 * MinuteS;
export const DayS = 24 * HourS;

export function formatDate(isoDate: string): string {
  const now = new Date();
  const target = new Date(isoDate);
  const diffMinutes = differenceInMinutes(target, now);
  const diffHours = differenceInHours(target, now);
  const diffDays = differenceInDays(target, now);

  // Same timestamp handling - treat as "less than a minute ago"
  if (Math.abs(diffMinutes) < 1) {
    return "less than a minute ago";
  }

  // Handle future dates
  if (diffMinutes > 0) {
    if (diffMinutes < 60)
      return `in ${diffMinutes} minute${diffMinutes === 1 ? "" : "s"}`;
    if (diffDays < 1)
      return `in about ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
    if (diffDays === 1) return "in about 1 day";
    return `in about ${diffDays} days`;
  }

  // Handle past dates
  if (diffMinutes < 0) {
    const absDiffMin = Math.abs(diffMinutes);
    if (absDiffMin < 60)
      return `${absDiffMin} minute${absDiffMin === 1 ? "" : "s"} ago`;

    const absDiffHours = Math.abs(diffHours);
    if (absDiffHours < 24)
      return `about ${absDiffHours} hour${absDiffHours === 1 ? "" : "s"} ago`;

    const absDiffDays = Math.abs(diffDays);
    if (absDiffDays === 1) return "about 1 day ago";
    return `about ${absDiffDays} days ago`;
  }

  // Handle same day - this will mostly be caught by the diffMinutes < 1 check above
  if (isToday(target)) {
    // For same day but not exactly current time, prefer relative format
    if (Math.abs(diffHours) < 1) {
      return "less than a minute ago";
    }

    // Handle hours difference on the same day
    if (diffHours > 0) {
      return `in about ${diffHours} hour${diffHours === 1 ? "" : "s"}`;
    } else {
      return `about ${Math.abs(diffHours)} hour${Math.abs(diffHours) === 1 ? "" : "s"} ago`;
    }
  }

  // Handle yesterday/tomorrow
  if (isYesterday(target)) return "about 1 day ago";
  if (isTomorrow(target)) return "in about 1 day";

  // Default to relative format for other cases
  return formatRelative(target, now);
}
