# 🧪 Infrastructure Error Unit Tests

## 📋 Overview

This directory contains unit tests for the infrastructure-specific error types. These tests validate the error classes used to represent various issues that can occur within infrastructure components such as database connections, validation failures, and configuration problems.

## 🧩 Test Files

| File                                                             | Description                                                  |
| ---------------------------------------------------------------- | ------------------------------------------------------------ |
| [InfrastructureError.test.ts](./InfrastructureError.test.ts)     | Tests the base infrastructure error class                    |
| [DatabaseError.test.ts](./DatabaseError.test.ts)                 | Tests database-specific error classes                        |
| [ValidationError.test.ts](./ValidationError.test.ts)             | Tests validation error classes for input validation failures |
| [ConfigValidationError.test.ts](./ConfigValidationError.test.ts) | Tests configuration validation error classes                 |

## 🔍 Key Test Scenarios

### Error Classification

- Infrastructure error typing
- Error inheritance hierarchy
- Error code standardization
- HTTP status code mapping
- Error source identification

### Error Information

- Detailed error messages
- Error context collection
- Infrastructure component identification
- Operation identification
- Error categorization

### Specialized Errors

- Database error details
- Validation error field mappings
- Config error path tracking
- Schema validation details
- Runtime vs. startup errors

### Error Handling

- Recovery suggestions
- Retry possibilities
- Fallback mechanisms
- Self-healing capabilities
- Client-side recovery instructions

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock database errors
- Validation schema errors
- Configuration objects
- Context information

### Common Patterns

```typescript
// Example pattern for testing database error creation
it("should create database error with connection details", () => {
  // Arrange
  const connectionInfo = {
    host: "db.example.com",
    port: 5432,
    database: "test_db",
  };

  // Act
  const error = new DatabaseConnectionError("Failed to connect to database", {
    code: "DB_CONNECTION_ERROR",
    context: { connectionInfo, attempt: 3 },
  });

  // Assert
  expect(error.name).toBe("DatabaseConnectionError");
  expect(error.message).toBe("Failed to connect to database");
  expect(error.code).toBe("DB_CONNECTION_ERROR");
  expect(error.context.connectionInfo).toEqual(connectionInfo);
  expect(error.context.attempt).toBe(3);
  expect(error.statusCode).toBe(503); // Service Unavailable
});

// Example pattern for testing validation error
it("should create validation error with field details", () => {
  // Arrange
  const validationErrors = [
    { field: "email", message: "Invalid email format" },
    { field: "password", message: "Password too short" },
  ];

  // Act
  const error = new ValidationError("Validation failed", {
    code: "VALIDATION_ERROR",
    context: { validationErrors },
  });

  // Assert
  expect(error.name).toBe("ValidationError");
  expect(error.message).toBe("Validation failed");
  expect(error.code).toBe("VALIDATION_ERROR");
  expect(error.context.validationErrors).toEqual(validationErrors);
  expect(error.statusCode).toBe(400); // Bad Request

  // Test field-specific error extraction
  expect(error.getFieldErrors("email")).toEqual(["Invalid email format"]);
  expect(error.hasFieldErrors("password")).toBe(true);
});
```

## 📚 Advanced Testing Techniques

### Error Chaining

- Error cause tracking
- Root cause analysis
- Error transformation
- Error enrichment
- Multi-level error context

### Error Recovery

- Retry strategy testing
- Circuit breaker pattern
- Degraded operation testing
- Fallback mechanism testing
- Error isolation

### Error Translation

- Client-friendly messages
- Localized error messages
- Technical to user-friendly mapping
- Error code documentation
- Troubleshooting guides

## 🔗 Related Components

- [Technical Errors](../technical/README.md) - For lower-level system errors
- [Error Handler](../README.md) - For main error handling system
- [Database](../../database/README.md) - For database component integration
