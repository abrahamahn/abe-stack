import { formatRelative } from "date-fns";

export const SecondMs = 1000;
export const MinuteMs = 60 * SecondMs;
export const HourMs = 60 * MinuteMs;
export const DayMs = 24 * HourMs;

export const MinuteS = 60;
export const HourS = 60 * MinuteS;
export const DayS = 24 * MinuteS;

export function formatDate(isoDate: string) {
  const now = new Date();
  const target = new Date(isoDate);
  return formatRelative(target, now);
}
