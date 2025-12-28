# 🧪 HTTP Server Unit Tests

## 📋 Overview

This directory contains unit tests for the HTTP server infrastructure components. The tests validate the server's initialization, request handling, middleware integration, and graceful shutdown capabilities.

## 🧩 Test Files

| File                                             | Description                                                                                                 |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| [ServerManager.test.ts](./ServerManager.test.ts) | Tests the HTTP server manager implementation for initialization, request handling, and lifecycle management |

## 🔍 Key Test Scenarios

### Server Initialization

- Port binding
- Host configuration
- HTTPS/TLS setup
- Server options
- Middleware registration
- Router configuration

### Request Handling

- Route registration
- HTTP method handling
- Path parameter extraction
- Query parameter handling
- Request body parsing
- Response generation

### Error Handling

- Global error catching
- Route-specific error handling
- 404 handling
- 500 internal error handling
- Malformed request handling
- Timeout handling

### Server Lifecycle

- Graceful startup
- Graceful shutdown
- Connection draining
- Health checking
- Keep-alive connection management
- Process signal handling

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock Express app
- Mock request/response objects
- Mock routes
- Mock middleware

### Common Patterns

```typescript
// Example pattern for testing server initialization
it("should initialize server with correct port and host", async () => {
  // Arrange
  const mockExpress = jest.fn(() => ({
    listen: jest.fn((port, host, callback) => {
      callback();
      return { close: jest.fn() };
    }),
    use: jest.fn(),
    all: jest.fn(),
  }));

  const serverManager = new ServerManager({
    port: 3000,
    host: "localhost",
    expressFactory: mockExpress,
  });

  // Act
  await serverManager.start();

  // Assert
  expect(mockExpress).toHaveBeenCalled();
  expect(mockExpress().listen).toHaveBeenCalledWith(
    3000,
    "localhost",
    expect.any(Function),
  );
});

// Example pattern for testing middleware registration
it("should register middleware in correct order", async () => {
  // Arrange
  const mockApp = {
    use: jest.fn(),
    listen: jest.fn().mockReturnValue({ close: jest.fn() }),
  };
  const mockExpress = jest.fn(() => mockApp);

  const middleware1 = (req, res, next) => next();
  const middleware2 = (req, res, next) => next();

  const serverManager = new ServerManager({
    port: 3000,
    expressFactory: mockExpress,
  });

  // Act
  serverManager.addMiddleware(middleware1);
  serverManager.addMiddleware(middleware2);
  await serverManager.start();

  // Assert
  expect(mockApp.use).toHaveBeenCalledTimes(2);
  expect(mockApp.use.mock.calls[0][0]).toBe(middleware1);
  expect(mockApp.use.mock.calls[1][0]).toBe(middleware2);
});
```

## 📚 Advanced Testing Techniques

### Stress Testing

- Concurrent request handling
- Connection limits
- Request timeouts
- Memory usage during load

### Protocol Testing

- HTTP/1.1 compliance
- HTTP/2 support
- WebSocket integration
- CORS configuration

### Security Testing

- Secure headers
- HTTPS configuration
- Certificate validation
- Redirect handling

## 🔗 Related Components

- [Middleware](../middleware/README.md) - For HTTP middleware integration
- [Lifecycle](../lifecycle/README.md) - For server lifecycle hooks
- [Logging](../logging/README.md) - For request logging
