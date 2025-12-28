import { describe, it, expect } from "vitest";

import { formatDate } from "../../../../../server/shared/date/formatDate";

describe("formatDate", () => {
  it("should format Date object correctly", () => {
    const date = new Date(2023, 0, 15, 14, 30); // Jan 15, 2023, 2:30 PM
    const formatted = formatDate(date);
    expect(formatted).toContain("January 15, 2023");
  });

  it("should format string date correctly", () => {
    const dateString = "2023-02-20T10:15:00Z";
    const formatted = formatDate(dateString);
    expect(formatted).toContain("February 20, 2023");
  });

  it("should format timestamp correctly", () => {
    const timestamp = new Date(2023, 5, 10, 8, 45).getTime(); // June 10, 2023, 8:45 AM
    const formatted = formatDate(timestamp);
    expect(formatted).toContain("June 10, 2023");
  });

  it("should use provided locale", () => {
    const date = new Date(2023, 3, 5, 12, 0); // April 5, 2023, 12:00 PM
    const formatted = formatDate(date, "fr-FR");
    expect(formatted).toContain("avril");
    expect(formatted).toContain("2023");
  });

  it("should include time in the formatted string", () => {
    const date = new Date(2023, 7, 18, 16, 30); // August 18, 2023, 4:30 PM
    const formatted = formatDate(date);

    // The exact format might vary by environment, so we check for the presence of numbers
    // The time should contain digits for hours and minutes
    expect(formatted).toMatch(/\d+:\d+/);
  });

  it("should handle dates with single-digit day", () => {
    const date = new Date(2023, 8, 5, 9, 15); // September 5, 2023, 9:15 AM
    const formatted = formatDate(date);
    expect(formatted).toContain("September 5, 2023");
  });

  it("should handle dates with single-digit month", () => {
    const date = new Date(2023, 0, 20, 11, 45); // January 20, 2023, 11:45 AM
    const formatted = formatDate(date);
    expect(formatted).toContain("January 20, 2023");
  });

  it("should handle date at day boundary", () => {
    const date = new Date(2023, 6, 15, 0, 0, 0); // July 15, 2023, 12:00 AM
    const formatted = formatDate(date);
    expect(formatted).toContain("July 15, 2023");
    // Time might be formatted as 12:00 AM or 00:00, depending on locale
    expect(formatted).toMatch(/(:00|12:00)/);
  });

  it("should handle different locales correctly", () => {
    const date = new Date(2023, 11, 25, 15, 30); // December 25, 2023, 3:30 PM

    // Test different locales
    const englishFormatted = formatDate(date, "en-US");
    expect(englishFormatted).toContain("December 25, 2023");

    const frenchFormatted = formatDate(date, "fr-FR");
    expect(frenchFormatted).toContain("décembre");

    const germanFormatted = formatDate(date, "de-DE");
    expect(germanFormatted).toContain("Dezember");
  });
});
