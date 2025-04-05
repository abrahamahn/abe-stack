# 🧪 Secret Provider Unit Tests

## 📋 Overview

This directory contains unit tests for the secret provider components, which are responsible for securely loading, managing, and providing access to sensitive configuration values like passwords, API keys, and other credentials.

## 🧩 Test Files

| File                                                               | Description                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| [SecretProvider.test.ts](./SecretProvider.test.ts)                 | Tests the base secret provider interface and shared functionality         |
| [FileSecretProvider.test.ts](./FileSecretProvider.test.ts)         | Tests the file-based implementation for loading secrets from secure files |
| [EnvSecretProvider.test.ts](./EnvSecretProvider.test.ts)           | Tests the environment variable-based implementation for accessing secrets |
| [InMemorySecretProvider.test.ts](./InMemorySecretProvider.test.ts) | Tests the in-memory implementation used for testing and development       |

## 🔍 Key Test Scenarios

### Secret Loading

- Loading from different sources
- Secret format validation
- Default values handling
- Required vs. optional secrets
- Secret key normalization

### Secret Access

- Secure retrieval
- Type conversion
- Access control
- Secret masking
- Normalized naming

### Security Features

- Encrypted storage
- Memory protection
- Automatic masking in logs
- Access auditing
- Secret rotation

### Provider Management

- Provider initialization
- Provider fallbacks
- Provider chaining
- Environment-specific providers
- Provider error handling

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock file system
- Mock environment variables
- Sample secret data
- Encryption mocks

### Common Patterns

```typescript
// Example pattern for testing secret retrieval
it("should retrieve secrets by key", async () => {
  // Arrange
  const secretProvider = new InMemorySecretProvider({
    secrets: {
      "db.password": "super-secret-db-password",
      "api.key": "test-api-key-12345",
    },
  });

  // Act
  const dbPassword = await secretProvider.getSecret("db.password");
  const apiKey = await secretProvider.getSecret("api.key");
  const nonExistentSecret = await secretProvider.getSecret(
    "nonexistent",
    "default-value",
  );

  // Assert
  expect(dbPassword).toBe("super-secret-db-password");
  expect(apiKey).toBe("test-api-key-12345");
  expect(nonExistentSecret).toBe("default-value");
});

// Example pattern for testing file secret provider
it("should load secrets from file", async () => {
  // Arrange
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "secret-test-"));
  const secretsPath = path.join(tempDir, "secrets.json");

  // Create a test secrets file
  await fs.writeFile(
    secretsPath,
    JSON.stringify({
      "db.password": "file-db-password",
      "jwt.secret": "file-jwt-secret",
    }),
  );

  const fileSecretProvider = new FileSecretProvider({
    filePath: secretsPath,
  });

  // Act
  await fileSecretProvider.initialize();
  const dbPassword = await fileSecretProvider.getSecret("db.password");
  const jwtSecret = await fileSecretProvider.getSecret("jwt.secret");

  // Assert
  expect(dbPassword).toBe("file-db-password");
  expect(jwtSecret).toBe("file-jwt-secret");

  // Cleanup
  await fs.rm(tempDir, { recursive: true, force: true });
});
```

## 📚 Advanced Testing Techniques

### Encryption Testing

- Encrypted file handling
- Key management
- Decryption validation
- Tamper detection

### Multi-Source Testing

- Layered provider configuration
- Override precedence
- Environmental fallbacks
- Secret merging

### Security Validation

- Access pattern analysis
- Memory exposure checking
- Secure disposal validation
- Least privilege validation

## 🔗 Related Components

- [Config](../README.md) - For main configuration system
- [Security](../../security/README.md) - For encryption and security utilities
- [Error Handling](../../errors/README.md) - For secret access error handling
