# 🧪 Logging Unit Tests

## 📋 Overview

This directory contains unit tests for the logging infrastructure components. The tests validate the framework's logging capabilities, including different log levels, structured logging, and transport systems.

## 🧩 Test Files

| File                                                   | Description                                   |
| ------------------------------------------------------ | --------------------------------------------- |
| [LoggerService.test.ts](./LoggerService.test.ts)       | Tests the core logging service implementation |
| [ILoggerService.test.ts](./ILoggerService.test.ts)     | Tests the logger service interface contract   |
| [ServerLogger.test.ts](./ServerLogger.test.ts)         | Tests the HTTP request logging middleware     |
| [ConsoleTransport.test.ts](./ConsoleTransport.test.ts) | Tests the console output transport for logs   |

## 🔍 Key Test Scenarios

### Log Levels

- Debug level logging
- Info level logging
- Warning level logging
- Error level logging
- Critical level logging
- Log level filtering

### Structured Logging

- JSON log format
- Context data inclusion
- Metadata enrichment
- Correlation ID tracing
- Log object serialization

### Transport System

- Console output
- File output
- Multiple transport support
- Custom transport integration
- Transport error handling

### HTTP Request Logging

- Request timing
- Status code capture
- Response size tracking
- User identification
- Request path normalization

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock console
- Mock file system
- Mock HTTP requests/responses
- Clock mocking for timestamps

### Common Patterns

```typescript
// Example pattern for testing log levels
it("should respect log level filtering", () => {
  // Arrange
  const mockTransport = { log: jest.fn() };
  const logger = new LoggerService({
    level: "info",
    transports: [mockTransport],
  });

  // Act
  logger.debug("Debug message");
  logger.info("Info message");
  logger.warning("Warning message");
  logger.error("Error message");

  // Assert
  // Debug should be filtered out at info level
  expect(mockTransport.log).toHaveBeenCalledTimes(3);
  expect(mockTransport.log).not.toHaveBeenCalledWith(
    expect.objectContaining({ level: "debug", message: "Debug message" }),
  );
  expect(mockTransport.log).toHaveBeenCalledWith(
    expect.objectContaining({ level: "info", message: "Info message" }),
  );
  expect(mockTransport.log).toHaveBeenCalledWith(
    expect.objectContaining({ level: "warning", message: "Warning message" }),
  );
  expect(mockTransport.log).toHaveBeenCalledWith(
    expect.objectContaining({ level: "error", message: "Error message" }),
  );
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Log throughput testing
- Memory usage optimization
- Batched logging support

### Context Propagation

- Async context preservation
- Child logger inheritance
- Request-scoped context

### Format Testing

- JSON format validation
- Log line structure
- Timestamp formatting
- Special character handling

## 🔗 Related Components

- [Configuration](../config/README.md) - For logging configuration
- [Errors](../errors/README.md) - For error logging integration
- [Middleware](../middleware/README.md) - For request logging middleware
