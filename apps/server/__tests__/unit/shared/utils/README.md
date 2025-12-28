# 🧪 Core Utilities Unit Tests

## 📋 Overview

This directory contains unit tests for the core utility functions used throughout the application. These tests validate fundamental utility functions that provide essential operations for common programming tasks, focusing on pure functions and core algorithms.

## 🧩 Test Files

The directory likely includes tests for various utility categories:

- Mathematical utilities
- String manipulation utilities
- Array/object utilities
- Functional programming utilities
- Hashing and encoding utilities
- URL manipulation utilities
- Common algorithm implementations

## 🔍 Key Test Scenarios

### Mathematical Utilities

- Numeric operations
- Statistical functions
- Random number generation
- Range operations
- Numeric validation

### String Utilities

- String parsing
- String search and replacement
- String validation
- Encoding/decoding
- Templating

### Array/Object Utilities

- Sorting algorithms
- Filtering operations
- Searching functions
- Transformation utilities
- Equality comparisons

### Functional Programming

- Composable function utilities
- Lazy evaluation
- Higher-order functions
- Functors and monads
- Immutable operations

## 🔧 Test Implementation Details

### Mocks and Stubs

- Sample data sets
- Edge case inputs
- Performance benchmarks

### Common Patterns

```typescript
// Example pattern for testing string utilities
it("should correctly perform string operations", () => {
  // Truncation
  expect(truncate("This is a long string", 10)).toBe("This is...");
  expect(truncate("Short", 10)).toBe("Short");
  expect(truncate("", 10)).toBe("");

  // Pluralization
  expect(pluralize("item", 1)).toBe("item");
  expect(pluralize("item", 2)).toBe("items");
  expect(pluralize("category", 0)).toBe("categories");

  // String template
  expect(template("Hello, {{name}}!", { name: "World" })).toBe("Hello, World!");
  expect(
    template("{{greeting}}, {{name}}!", { greeting: "Hi", name: "User" }),
  ).toBe("Hi, User!");
});

// Example pattern for testing array utilities
it("should correctly process arrays", () => {
  // Grouping
  const users = [
    { id: 1, role: "admin" },
    { id: 2, role: "user" },
    { id: 3, role: "admin" },
    { id: 4, role: "user" },
  ];

  const grouped = groupBy(users, "role");
  expect(grouped).toEqual({
    admin: [
      { id: 1, role: "admin" },
      { id: 3, role: "admin" },
    ],
    user: [
      { id: 2, role: "user" },
      { id: 4, role: "user" },
    ],
  });

  // Unique
  expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
  expect(unique(["a", "b", "b", "c"])).toEqual(["a", "b", "c"]);

  // Chunk
  expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Big O complexity validation
- Memory usage profiling
- Execution time benchmarking
- Optimization validation

### Security Testing

- Input sanitization
- Output encoding
- Random number security
- Hash collision resistance

### Compatibility Testing

- Browser compatibility
- Node.js compatibility
- Different JavaScript runtimes
- TypeScript version compatibility

## 🔗 Related Utilities

- [Helpers](../helpers/README.md) - For higher-level helper functions
- [Types](../types/README.md) - For type definitions used by utilities
- [Date](../date/README.md) - For date-specific utilities
