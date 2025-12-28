# 🧪 Utilities Unit Tests

## 📋 Overview

This directory contains unit tests for the general utility infrastructure components. The tests validate common helper functions used throughout the application, including date manipulation, object comparison, and random ID generation.

## 🧩 Test Files

| File                                           | Description                                              |
| ---------------------------------------------- | -------------------------------------------------------- |
| [dateHelpers.test.ts](./dateHelpers.test.ts)   | Tests date manipulation and formatting utility functions |
| [randomId.test.ts](./randomId.test.ts)         | Tests random identifier generation utilities             |
| [shallowEqual.test.ts](./shallowEqual.test.ts) | Tests object comparison utility functions                |

## 🔍 Key Test Scenarios

### Date Utilities

- Date formatting
- Date parsing
- Timezone handling
- Relative time calculation
- Date arithmetic
- Date validation

### ID Generation

- Random string generation
- UUID generation
- ID uniqueness
- ID format validation
- Predictable testing IDs
- ID collision prevention

### Object Comparison

- Shallow object equality
- Property comparison
- Array comparison
- Nested object handling
- Type handling
- Edge case handling (null, undefined)

## 🔧 Test Implementation Details

### Mocks and Stubs

- Fixed date objects
- Mock random generators
- Sample objects for comparison

### Common Patterns

```typescript
// Example pattern for testing date formatting
it("should format dates correctly", () => {
  // Arrange
  const date = new Date("2023-01-15T12:30:45Z");

  // Act
  const formatted = dateHelpers.formatDate(date, "YYYY-MM-DD");

  // Assert
  expect(formatted).toBe("2023-01-15");
});

// Example pattern for testing random ID generation
it("should generate unique random IDs", () => {
  // Arrange
  const options = { length: 10 };

  // Act
  const id1 = randomId.generate(options);
  const id2 = randomId.generate(options);

  // Assert
  expect(id1).toHaveLength(10);
  expect(id2).toHaveLength(10);
  expect(id1).not.toBe(id2); // IDs should be unique
});

// Example pattern for testing object comparison
it("should compare objects correctly", () => {
  // Arrange
  const obj1 = { a: 1, b: 2 };
  const obj2 = { a: 1, b: 2 };
  const obj3 = { a: 1, b: 3 };

  // Act & Assert
  expect(shallowEqual(obj1, obj2)).toBe(true);
  expect(shallowEqual(obj1, obj3)).toBe(false);
  expect(shallowEqual(null, null)).toBe(true);
  expect(shallowEqual(undefined, undefined)).toBe(true);
  expect(shallowEqual(obj1, null)).toBe(false);
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Function execution speed
- Memory usage
- Optimization verification

### Edge Case Testing

- Empty inputs
- Extreme values
- Invalid inputs
- Type flexibility

### Internationalization Testing

- Multi-language support
- Locale-specific formatting
- Character encoding handling

## 🔗 Related Components

- All other components - Utilities are used throughout the application
- [Logging](../logging/README.md) - For date formatting in logs
- [Security](../security/README.md) - For secure random ID generation
