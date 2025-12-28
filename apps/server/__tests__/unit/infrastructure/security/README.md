# 🔒 Security Infrastructure Unit Tests

## 📋 Overview

This directory contains comprehensive unit tests for the security infrastructure components of the application. These tests validate the functionality, robustness, and security of various security-related features.

## 🛡️ Security Areas Covered

- **🔑 Authentication**: Token management, password handling, encryption
- **👮 Authorization**: User permissions, role-based access
- **🛑 Protection Mechanisms**: CSRF protection, rate limiting, input validation
- **🔄 Communication Security**: CORS configuration, cookie management
- **🔏 Data Integrity**: Encryption, signatures, hashing

## 🧩 Test Files

| File                                                             | Description                                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [cookieUtils.test.ts](./cookieUtils.test.ts)                     | Tests for cookie management utilities including setting, getting, and clearing cookies |
| [corsConfig.test.ts](./corsConfig.test.ts)                       | Tests for Cross-Origin Resource Sharing (CORS) configuration                           |
| [CorsConfigService.test.ts](./CorsConfigService.test.ts)         | Tests for the CORS configuration service                                               |
| [csrfUtils.test.ts](./csrfUtils.test.ts)                         | Tests for Cross-Site Request Forgery (CSRF) protection utilities                       |
| [encryptionUtils.test.ts](./encryptionUtils.test.ts)             | Tests for encryption and decryption utilities, signatures, and hashing                 |
| [middlewareUtils.test.ts](./middlewareUtils.test.ts)             | Tests for security middleware components including CSRF protection                     |
| [passwordUtils.test.ts](./passwordUtils.test.ts)                 | Tests for password hashing, verification, generation, and strength validation          |
| [rateLimitMiddleware.test.ts](./rateLimitMiddleware.test.ts)     | Tests for rate limiting functionality to prevent abuse                                 |
| [securityHelpers.test.ts](./securityHelpers.test.ts)             | Tests for general security helpers including input sanitization                        |
| [signatureHelpers.test.ts](./signatureHelpers.test.ts)           | Tests for signature generation and verification                                        |
| [tokenTypes.test.ts](./tokenTypes.test.ts)                       | Tests for token type definitions and utilities                                         |
| [tokenUtils.test.ts](./tokenUtils.test.ts)                       | Tests for token utility functions                                                      |
| [TokenBlacklistService.test.ts](./TokenBlacklistService.test.ts) | Tests for token blacklisting functionality                                             |
| [TokenManager.test.ts](./TokenManager.test.ts)                   | Tests for the token management service                                                 |
| [TokenStorageService.test.ts](./TokenStorageService.test.ts)     | Tests for token storage functionality                                                  |
| [validationMiddleware.test.ts](./validationMiddleware.test.ts)   | Tests for request validation middleware                                                |
| [WebSocketAuthService.test.ts](./WebSocketAuthService.test.ts)   | Tests for WebSocket authentication service                                             |

## 🔍 Key Test Scenarios

### 🔐 Token Management

- Token generation and validation
- Access and refresh token handling
- Token expiration and renewal
- Token revocation and blacklisting
- Payload validation

### 🔒 Encryption and Hashing

- Data encryption and decryption
- Password hashing and verification
- Secret key management
- Signature creation and verification
- Salt generation and handling

### 🛡️ Request Protection

- CSRF token validation
- Rate limiting for API endpoints
- Input validation and sanitization
- Origin validation
- Request throttling

### 🍪 Cookie Security

- Secure cookie settings
- HttpOnly flags
- SameSite policies
- Cookie expiration
- Cookie-based authentication

### 🌐 CORS Security

- Origin validation
- Preflight requests
- Allowed methods and headers
- Credentials handling
- Exposure of headers

## 🚀 Running Tests

To run all security tests:

```bash
npm test src/tests/server/unit/infrastructure/security
```

To run a specific test file:

```bash
npm test src/tests/server/unit/infrastructure/security/[test-file-name]
```

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock token storage and blacklist services
- Mock request/response objects
- Mock configuration services
- Mock crypto functions

### Common Patterns

```typescript
// Example pattern for testing token verification
it("should verify a valid access token", async () => {
  // Arrange
  const token = "valid-token";
  const decodedToken = {
    userId: "user123",
    jti: "token-id-123",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  // Mock JWT verification
  vi.mocked(jwt.verify).mockReturnValueOnce(decodedToken as any);

  // Mock token storage and blacklist
  vi.mocked(mockTokenStorage.hasToken).mockResolvedValueOnce(true);
  vi.mocked(mockTokenStorage.getTokenData).mockResolvedValueOnce({
    userId: "user123",
    createdAt: new Date(),
    expiresIn: 3600,
    metadata: { type: "access" },
  });

  vi.mocked(mockTokenBlacklist.check).mockResolvedValueOnce({
    isBlacklisted: false,
  });

  // Act
  const result = await tokenManager.verifyAccessToken(token);

  // Assert
  expect(result.valid).toBe(true);
});
```

## 📈 Test Coverage

The tests aim to provide comprehensive coverage of:

- ✅ All public methods and functions
- ⚠️ Error handling paths
- 🔒 Security vulnerability prevention
- 🛠️ Configuration options and customization

## 📝 Adding New Tests

When adding new security features:

1. Create a corresponding test file following the naming convention `[feature].test.ts`
2. Use the existing test structure as a template
3. Cover all public methods and important edge cases
4. Ensure proper mocking of dependencies
5. Test both success and failure scenarios

## ✅ Best Practices

- 🔄 Keep tests independent and isolated
- 📚 Use descriptive test names that explain the expected behavior
- 🧩 Mock external dependencies properly
- 🔍 Test security features against potential vulnerabilities
- ⚠️ Verify correct error handling

## 🔗 Related Components

- [Server](../server/README.md) - For HTTP server security integration
- [Config](../config/README.md) - For security configuration
- [Logging](../logging/README.md) - For security event logging
