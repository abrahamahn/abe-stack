# 🧪 Technical Error Unit Tests

## 📋 Overview

This directory contains unit tests for the technical error types in the error handling infrastructure. These errors represent low-level infrastructure and system-level issues that occur during application execution.

## 🧩 Test Files

| File                                               | Description                                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [TechnicalError.test.ts](./TechnicalError.test.ts) | Tests the technical error class implementations, which represent system-level errors |

## 🔍 Key Test Scenarios

### Error Classification

- Error type identification
- Error hierarchy validation
- Error code mapping
- HTTP status code assignment
- Technical vs. application error distinction

### Error Context

- System information capture
- Resource identification
- Component identification
- Operational context
- Stack trace processing

### Error Handling

- Recovery suggestions
- Retry strategies
- Fallback mechanisms
- Error reporting metadata
- Error correlation

### Serialization

- JSON serialization
- Safe error reporting
- Sensitive data filtering
- Logging format
- Client response formatting

## 🔧 Test Implementation Details

### Mocks and Stubs

- Sample error contexts
- Mock system information
- Stack trace samples
- Resource identifiers

### Common Patterns

```typescript
// Example pattern for testing technical error instantiation
it("should create a technical error with appropriate defaults", () => {
  // Arrange & Act
  const error = new TechnicalError("Database connection failed");

  // Assert
  expect(error.name).toBe("TechnicalError");
  expect(error.message).toBe("Database connection failed");
  expect(error.statusCode).toBe(500); // Technical errors default to 500
  expect(error.isOperational).toBe(false); // Technical errors are not operational by default
});

// Example pattern for testing error serialization
it("should serialize with technical context", () => {
  // Arrange
  const context = {
    component: "DatabaseServer",
    operation: "connect",
    resourceId: "postgres-main-db",
    attempt: 3,
  };

  const error = new TechnicalError("Database connection timeout", {
    code: "DB_CONNECTION_TIMEOUT",
    context,
  });

  // Act
  const serialized = error.toJSON();

  // Assert
  expect(serialized).toEqual({
    name: "TechnicalError",
    message: "Database connection timeout",
    code: "DB_CONNECTION_TIMEOUT",
    statusCode: 500,
    context: {
      component: "DatabaseServer",
      operation: "connect",
      resourceId: "postgres-main-db",
      attempt: 3,
    },
  });
});
```

## 📚 Advanced Testing Techniques

### Error Extension Testing

- Specialized technical error subclasses
- Custom technical error properties
- Error metadata inheritance

### Integration Testing

- Error handler integration
- Logging integration
- Error monitoring service integration

### Specialized Error Types

- Network errors
- I/O errors
- Resource exhaustion errors
- System constraint errors
- External service errors

## 🔗 Related Components

- [Infrastructure Errors](../infrastructure/README.md) - For infrastructure-specific error types
- [ErrorHandler](../README.md) - For main error handling system
- [Logging](../../logging/README.md) - For error logging
