# 🧪 Configuration Unit Tests

## 📋 Overview

This directory contains unit tests for the configuration system components. The tests validate the framework's ability to load, validate, and provide access to configuration settings from various sources.

## 🧩 Test Files

| File                                               | Description                                                                                                    |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [ConfigService.test.ts](./ConfigService.test.ts)   | Tests the implementation of the configuration service, handling environment variables, defaults, and overrides |
| [ConfigSchema.test.ts](./ConfigSchema.test.ts)     | Tests schema validation, type conversion, and constraint enforcement                                           |
| [environments.test.ts](./environments.test.ts)     | Tests environment-specific configuration loading and management                                                |
| [IConfigService.test.ts](./IConfigService.test.ts) | Tests the interface contract for configuration services                                                        |
| [LoggingConfig.test.ts](./LoggingConfig.test.ts)   | Tests logging-specific configuration schema and defaults                                                       |
| [domain/](./domain/)                               | Tests for domain-specific configuration schemas and handlers                                                   |
| [secrets/](./secrets/)                             | Tests for secure configuration and secrets management                                                          |

## 🔍 Key Test Scenarios

### Configuration Loading

- Environment variable processing
- Default value application
- Configuration file parsing
- In-memory configuration

### Schema Validation

- Type validation (string, number, boolean, etc.)
- Required fields checking
- Format validation (email, URL, etc.)
- Numeric constraints (min, max, etc.)

### Environment Management

- Environment detection (dev, test, prod)
- Environment-specific overrides
- Fallback hierarchies
- Runtime environment changes

### Secret Handling

- Secure storage and retrieval
- Masking sensitive values in logs
- Encryption/decryption of secrets
- Secret rotation

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock environment variables
- Mock file system for config files
- Mock secret storage

### Common Patterns

```typescript
// Example pattern for testing environment variable loading
it("should load values from environment variables", () => {
  // Arrange
  process.env.TEST_CONFIG_VALUE = "test-value";

  // Act
  const configService = new ConfigService();

  // Assert
  expect(configService.get("testConfigValue")).toBe("test-value");
});
```

## 🔗 Related Components

- [Dependency Injection](../di/README.md) - For configuration registration
- [Error Handling](../errors/README.md) - For configuration validation errors
- [Logging](../logging/README.md) - For logging configuration
