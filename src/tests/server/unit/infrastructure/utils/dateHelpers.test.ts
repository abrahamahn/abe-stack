import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  formatDate,
  SecondMs,
  MinuteMs,
  HourMs,
  DayMs,
  MinuteS,
  HourS,
  DayS,
} from "../../../../../server/infrastructure/utils/dateHelpers";

describe("dateHelpers", () => {
  describe("Time Constants", () => {
    it("should have correct millisecond constants", () => {
      expect(SecondMs).toBe(1000);
      expect(MinuteMs).toBe(60 * SecondMs);
      expect(HourMs).toBe(60 * MinuteMs);
      expect(DayMs).toBe(24 * HourMs);
    });

    it("should have correct second constants", () => {
      expect(MinuteS).toBe(60);
      expect(HourS).toBe(60 * MinuteS);
      expect(DayS).toBe(24 * HourS);
    });

    it("should maintain correct relationships between constants", () => {
      expect(MinuteMs).toBe(MinuteS * SecondMs);
      expect(HourMs).toBe(HourS * SecondMs);
      expect(DayMs).toBe(DayS * SecondMs);
    });
  });

  describe("formatDate", () => {
    beforeEach(() => {
      // Mock the current date to be fixed for testing
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should format date relative to now", () => {
      const now = new Date("2024-01-01T12:00:00Z");
      const oneHourAgo = new Date("2024-01-01T11:00:00Z");
      const oneDayAgo = new Date("2023-12-31T12:00:00Z");

      expect(formatDate(now.toISOString())).toBe("less than a minute ago");
      expect(formatDate(oneHourAgo.toISOString())).toBe("about 1 hour ago");
      expect(formatDate(oneDayAgo.toISOString())).toBe("about 1 day ago");
    });

    it("should handle future dates", () => {
      const oneHourFromNow = new Date("2024-01-01T13:00:00Z");
      const oneDayFromNow = new Date("2024-01-02T12:00:00Z");

      expect(formatDate(oneHourFromNow.toISOString())).toBe("in about 1 hour");
      expect(formatDate(oneDayFromNow.toISOString())).toBe("in about 1 day");
    });

    it("should handle same day with different times", () => {
      const morning = new Date("2024-01-01T09:00:00Z");
      const evening = new Date("2024-01-01T18:00:00Z");

      expect(formatDate(morning.toISOString())).toBe("about 3 hours ago");
      expect(formatDate(evening.toISOString())).toBe("in about 6 hours");
    });

    it("should handle edge cases", () => {
      const justNow = new Date("2024-01-01T12:00:00Z");
      const almostNow = new Date("2024-01-01T11:59:59Z");
      const justBeforeNow = new Date("2024-01-01T12:00:01Z");

      expect(formatDate(justNow.toISOString())).toBe("less than a minute ago");
      expect(formatDate(almostNow.toISOString())).toBe(
        "less than a minute ago",
      );
      expect(formatDate(justBeforeNow.toISOString())).toBe(
        "less than a minute ago",
      );
    });

    it("should handle invalid date strings", () => {
      expect(() => formatDate("invalid-date")).toThrow();
      expect(() => formatDate("")).toThrow();
      expect(() => formatDate("2024-13-45")).toThrow();
    });

    it("should handle different time zones", () => {
      const utcDate = new Date("2024-01-01T12:00:00Z");
      const estDate = new Date("2024-01-01T07:00:00-05:00");
      const pstDate = new Date("2024-01-01T04:00:00-08:00");

      expect(formatDate(utcDate.toISOString())).toBe("less than a minute ago");
      expect(formatDate(estDate.toISOString())).toBe("less than a minute ago");
      expect(formatDate(pstDate.toISOString())).toBe("less than a minute ago");
    });
  });
});
