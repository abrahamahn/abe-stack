# 🧪 Error Handling Unit Tests

## 📋 Overview

This directory contains unit tests for the error handling infrastructure components. The tests validate the error hierarchy, error classification, serialization, and global error handling capabilities.

## 🧩 Test Files

| File                                               | Description                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| [AppError.test.ts](./AppError.test.ts)             | Tests the base application error class and its core functionality |
| [ServiceError.test.ts](./ServiceError.test.ts)     | Tests service-level error classes and domain-specific errors      |
| [TechnicalError.test.ts](./TechnicalError.test.ts) | Tests infrastructure/technical error classes                      |
| [ErrorHandler.test.ts](./ErrorHandler.test.ts)     | Tests the error handling service implementation                   |
| [IErrorHandler.test.ts](./IErrorHandler.test.ts)   | Tests the error handler interface contract                        |
| [index.test.ts](./index.test.ts)                   | Tests the module exports and public API                           |
| [technical/](./technical/)                         | Tests for technical error types (network, DB, etc.)               |
| [modules/](./modules/)                             | Tests for module-specific error types                             |
| [infrastructure/](./infrastructure/)               | Tests for infrastructure-specific error types                     |

## 🔍 Key Test Scenarios

### Error Classification

- Error type identification
- Error hierarchy traversal
- Error code assignment
- HTTP status code mapping

### Error Context

- Context data capture
- Stack trace processing
- Error source identification
- Error correlation

### Error Serialization

- JSON serialization
- Client-safe error information
- Sensitive data filtering
- i18n/localization support

### Global Error Handling

- Uncaught exception handling
- Promise rejection handling
- Error logging
- Error transformation

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock logger
- Mock error reporters
- Context capture mocks

### Common Patterns

```typescript
// Example pattern for testing error serialization
it("should serialize errors to a safe format", () => {
  // Arrange
  const error = new ServiceError("Test error", {
    code: "TEST_ERROR",
    statusCode: 400,
    context: {
      userId: "123",
      sensitiveField: "should-not-appear",
    },
    safe: ["userId"],
  });

  // Act
  const serialized = errorHandler.serializeError(error);

  // Assert
  expect(serialized).toEqual({
    message: "Test error",
    code: "TEST_ERROR",
    context: {
      userId: "123",
      // sensitiveField should be filtered out
    },
    statusCode: 400,
  });
  expect(serialized.context.sensitiveField).toBeUndefined();
});
```

## 📚 Advanced Testing Techniques

### Error Chain Testing

- Nested/wrapped error handling
- Cause chain traversal
- Root cause extraction

### i18n Testing

- Localized error messages
- Message templating
- Language fallbacks

### Security Testing

- Information disclosure prevention
- Stack trace sanitization
- Error obfuscation for sensitive errors

## 🔗 Related Components

- [Logging](../logging/README.md) - For error logging
- [Middleware](../middleware/README.md) - For error handling middleware
- [Server](../server/README.md) - For HTTP error responses
