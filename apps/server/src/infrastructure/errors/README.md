# 🛑 Error Handling System

## 📋 Purpose

The error handling system provides a robust framework for managing application errors, offering:

- Consistent error structure and reporting
- Error classification and categorization
- Centralized error processing pipeline
- Customized error responses for different environments
- Detailed logging for troubleshooting
- Type-safe error creation and handling

This module ensures that errors are properly captured, logged, and presented to users in an appropriate format.

## 🧩 Key Components

### 1️⃣ Core Error Types

- **`AppError`**: Base application error with classification
- **`ServiceError`**: Domain-specific service errors
- **`TechnicalError`**: System and infrastructure errors

### 2️⃣ Error Handler

- **`ErrorHandler`**: Processes and formats error responses
- **`IErrorHandler`**: Interface defining error handling contract
- Transforms errors into appropriate API responses

### 3️⃣ Specialized Error Types

- **`infrastructure/`**: Infrastructure-specific errors
- **`modules/`**: Module-specific domain errors
- Pre-defined error types with appropriate HTTP status codes

## 🛠️ Usage Instructions

### Creating Custom Errors

```typescript
import { AppError, ServiceError } from "@/server/infrastructure/errors";

// Using base application error
throw new AppError({
  message: "Unable to complete operation",
  code: "OPERATION_FAILED",
  statusCode: 400,
});

// Using service error
throw new ServiceError({
  message: "User not found",
  code: "USER_NOT_FOUND",
  statusCode: 404,
  context: { userId: "123" },
});
```

### Creating Domain-Specific Errors

```typescript
import { ServiceError } from "@/server/infrastructure/errors";

// Define specific error types
export class UserNotFoundError extends ServiceError {
  constructor(userId: string) {
    super({
      message: `User with ID ${userId} not found`,
      code: "USER_NOT_FOUND",
      statusCode: 404,
      context: { userId },
    });
  }
}

// Usage in service
if (!user) {
  throw new UserNotFoundError(userId);
}
```

### Handling Errors in Express

```typescript
import { ErrorHandler } from "@/server/infrastructure/errors";
import express from "express";

const app = express();
const errorHandler = new ErrorHandler();

// Your routes...

// Global error handler middleware (last in chain)
app.use((err, req, res, next) => {
  const response = errorHandler.handleError(err);

  res.status(response.statusCode).json({
    error: response.error,
    message: response.message,
    code: response.code,
    // Don't include stack trace in production
    ...(process.env.NODE_ENV !== "production" && { stack: response.stack }),
  });
});
```

## 🏗️ Architecture Decisions

### Hierarchical Error Structure

- **Decision**: Use error class hierarchy for different error types
- **Rationale**: Provides consistent structure with specialized behavior
- **Benefit**: Enables error-specific handling throughout the application

### Error Classification

- **Decision**: Categorize errors by domain and technical areas
- **Rationale**: Simplifies error handling and improves diagnostics
- **Implementation**: Folder structure and error codes reflect domains

### Error Context

- **Decision**: Include context data with errors
- **Rationale**: Additional information helps with diagnostics
- **Implementation**: Context object attached to error instances

### Environment-Aware Responses

- **Decision**: Customize error responses based on environment
- **Rationale**: Detailed errors for development, sanitized for production
- **Benefit**: Prevents sensitive information disclosure in production

## ⚙️ Setup and Configuration Notes

### Error Handler Configuration

Configure the error handler with appropriate options:

```typescript
import { ErrorHandler } from "@/server/infrastructure/errors";

const errorHandler = new ErrorHandler({
  includeStackTrace: process.env.NODE_ENV !== "production",
  defaultStatusCode: 500,
  defaultErrorCode: "INTERNAL_SERVER_ERROR",
  logErrors: true,
});
```

### HTTP Integration

For Express applications, add the error handler middleware:

```typescript
import { errorMiddleware } from "@/server/infrastructure/errors";

// Add after all other middlewares and routes
app.use(errorMiddleware);
```

### Logging Integration

The error handler integrates with the logging system:

```typescript
import { ErrorHandler } from "@/server/infrastructure/errors";
import { LoggerService } from "@/server/infrastructure/logging";

const logger = new LoggerService();
const errorHandler = new ErrorHandler({ logger });
```

### Common Error Codes

Standard error codes include:

- **`VALIDATION_ERROR`**: Input validation failures
- **`NOT_FOUND`**: Resource not found
- **`UNAUTHORIZED`**: Authentication required
- **`FORBIDDEN`**: Permission denied
- **`INTERNAL_SERVER_ERROR`**: Unexpected system error
