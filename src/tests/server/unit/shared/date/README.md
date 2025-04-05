# 🧪 Date Utility Unit Tests

## 📋 Overview

This directory contains unit tests for the date utility functions used throughout the application. These tests validate date manipulation, formatting, parsing, and comparison utilities that ensure consistent date handling across the codebase.

## 🧩 Test Files

The directory likely includes tests for various date utility functions:

- Date formatting and parsing
- Date arithmetic (adding/subtracting time periods)
- Date comparison
- Timezone handling
- Date validation
- ISO date conversions
- Relative time calculations

## 🔍 Key Test Scenarios

### Date Formatting

- Standard format patterns
- Localized formatting
- Custom format strings
- Format tokens (year, month, day, etc.)
- Timezone-aware formatting

### Date Parsing

- Standard format parsing
- Flexible input formats
- Timezone parsing
- Invalid date handling
- Partial date information

### Date Manipulation

- Adding/subtracting time units
- Setting specific date components
- Date normalization
- Month and year boundaries
- Leap year handling

### Date Comparison

- Before/after comparisons
- Date equality
- Date range operations
- Business day calculations
- Working hour calculations

## 🔧 Test Implementation Details

### Mocks and Stubs

- Fixed date references
- Timezone mocks
- Locale mocks

### Common Patterns

```typescript
// Example pattern for testing date formatting
it("should format dates according to specified patterns", () => {
  // Arrange
  const testDate = new Date("2023-05-15T14:30:45Z");

  // Act & Assert
  expect(formatDate(testDate, "YYYY-MM-DD")).toBe("2023-05-15");
  expect(formatDate(testDate, "DD/MM/YYYY")).toBe("15/05/2023");
  expect(formatDate(testDate, "MMMM D, YYYY")).toBe("May 15, 2023");
  expect(formatDate(testDate, "HH:mm:ss")).toBe("14:30:45");
});

// Example pattern for testing date manipulation
it("should correctly add time periods to dates", () => {
  // Arrange
  const startDate = new Date("2023-01-15T12:00:00Z");

  // Act & Assert
  expect(addDays(startDate, 5)).toEqual(new Date("2023-01-20T12:00:00Z"));
  expect(addMonths(startDate, 3)).toEqual(new Date("2023-04-15T12:00:00Z"));
  expect(addYears(startDate, 1)).toEqual(new Date("2024-01-15T12:00:00Z"));

  // Test month boundary
  const endOfMonth = new Date("2023-01-31T12:00:00Z");
  expect(addMonths(endOfMonth, 1)).toEqual(new Date("2023-02-28T12:00:00Z"));
});
```

## 📚 Advanced Testing Techniques

### Edge Cases

- Leap years (Feb 29)
- Month boundaries
- Year transitions
- DST transitions
- Date extremes (min/max dates)

### Internationalization

- Multi-locale testing
- Cultural date formats
- Week start differences
- Calendar system variations

### Performance Considerations

- Optimized date calculations
- Caching strategies
- Immutability checks

## 🔗 Related Utilities

- [String Utilities](../utils/README.md) - For string manipulation used in date formatting
- [Type Utilities](../types/README.md) - For date type definitions and type guards
