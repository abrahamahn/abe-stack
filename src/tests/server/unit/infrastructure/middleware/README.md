# 🧪 Middleware Unit Tests

## 📋 Overview

This directory contains unit tests for the Express middleware components. The tests validate the functionality of various middleware used in HTTP request processing, including validation, rate limiting, and other request/response modifications.

## 🧩 Test Files

| File                                                           | Description                         |
| -------------------------------------------------------------- | ----------------------------------- |
| [validationMiddleware.test.ts](./validationMiddleware.test.ts) | Tests request validation middleware |
| [rateLimitMiddleware.test.ts](./rateLimitMiddleware.test.ts)   | Tests API rate limiting middleware  |

## 🔍 Key Test Scenarios

### Request Validation

- Schema-based validation
- Path parameter validation
- Query parameter validation
- Request body validation
- Header validation
- Custom validation functions

### Rate Limiting

- Request rate enforcement
- IP-based rate limiting
- User-based rate limiting
- Endpoint-specific limits
- Rate limit headers
- Limit bypass mechanisms

### Error Handling

- Validation error responses
- Rate limit exceeded responses
- Middleware error propagation
- Custom error formatting

### Middleware Chain

- Middleware order testing
- Next function behavior
- Early returns vs. continuation
- Response modification
- Request modification

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock Express request/response objects
- Mock next function
- Request body stubs
- Redis mock for rate limiting

### Common Patterns

```typescript
// Example pattern for testing validation middleware
it("should reject invalid request bodies", () => {
  // Arrange
  const schema = Joi.object({
    username: Joi.string().required(),
    email: Joi.string().email().required(),
  });

  const validationMiddleware = createValidationMiddleware({
    body: schema,
  });

  const req = {
    body: {
      username: "testuser",
      email: "invalid-email", // Invalid email format
    },
  } as unknown as Request;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  } as unknown as Response;

  const next = jest.fn();

  // Act
  validationMiddleware(req, res, next);

  // Assert
  expect(next).not.toHaveBeenCalled(); // Should not call next for invalid requests
  expect(res.status).toHaveBeenCalledWith(400);
  expect(res.json).toHaveBeenCalledWith(
    expect.objectContaining({
      error: expect.stringContaining("email"),
    }),
  );
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Middleware execution time
- Memory usage
- Request throughput with middleware

### Security Testing

- Input sanitization
- XSS prevention
- CSRF protection
- Header security

### Integration Pattern Testing

- Middleware composition
- Conditional middleware application
- Route-specific middleware

## 🔗 Related Components

- [Server](../server/README.md) - For Express server integration
- [Validation](../validation/README.md) - For schema validation
- [Security](../security/README.md) - For security middleware
