# 🧪 Shared Utilities Unit Tests

## 📋 Overview

This directory contains unit tests for the shared utilities used across the application. These tests validate common functionality, types, helpers, and utilities that provide the foundation for the rest of the codebase.

## 🧩 Test Structure

The shared unit tests are organized into the following subdirectories:

| Directory                         | Description                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| [`date/`](./date/README.md)       | Tests for date manipulation, formatting, and parsing utilities     |
| [`helpers/`](./helpers/README.md) | Tests for general helper functions used throughout the application |
| [`types/`](./types/README.md)     | Tests for shared type definitions, type guards, and type utilities |
| [`utils/`](./utils/README.md)     | Tests for core utility functions and common operations             |

## 🔍 Testing Approach

The shared utilities represent the foundational layer of the application and are used extensively throughout the codebase. Testing these components is critical as they impact virtually all parts of the application.

### Testing Priorities

1. **Correctness**: Ensuring functions produce correct results for all inputs
2. **Edge Cases**: Thorough testing of boundary conditions and special cases
3. **Performance**: Validating efficient implementation of frequently used utilities
4. **Compatibility**: Ensuring consistent behavior across different environments
5. **Type Safety**: Verifying proper TypeScript typing and type guards

### Testing Patterns

Shared utility tests typically follow these patterns:

- **Pure Function Testing**: Testing input/output relationships for deterministic functions
- **Type Guard Validation**: Ensuring type guards correctly identify types
- **Exhaustive Testing**: Covering a wide range of inputs, especially for core functions
- **Reference Implementation Comparison**: Comparing results with known correct implementations
- **Property-Based Testing**: Using property-based tests for utilities with mathematical properties

## 🛠️ Common Test Utilities

The shared tests themselves use several common test utilities:

```typescript
// Example of a test helper for testing pure functions
function testPureFunction<T, R>(fn: (input: T) => R, testCases: Array<[T, R]>) {
  testCases.forEach(([input, expectedOutput]) => {
    const result = fn(input);
    expect(result).toEqual(expectedOutput);
  });
}

// Example of a type assertion helper
function assertType<T>(value: any, typeGuard: (val: any) => val is T): void {
  expect(typeGuard(value)).toBe(true);
}
```

## 📚 Key Testing Considerations

### Cross-Component Dependencies

These utilities often form the basis for other components. Changes to shared utilities can have wide-ranging impacts, making thorough testing essential.

### Backward Compatibility

Tests help ensure backward compatibility when utilities are modified, preventing unintended breaking changes.

### Documentation Through Tests

Tests serve as living documentation for how utilities should be used, providing examples for developers.

## 🔗 Related Components

- [Infrastructure Tests](../infrastructure/README.md) - Tests for infrastructure components that use these shared utilities
- [Module Tests](../modules/README.md) - Tests for business modules that depend on shared utilities

## 🚀 Running the Tests

To run the shared utility tests:

```bash
# Run all shared tests
npm run test:unit -- shared

# Run specific shared test category
npm run test:unit -- shared/utils
```
