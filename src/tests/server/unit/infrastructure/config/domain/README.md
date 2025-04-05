# 🧪 Domain Configuration Unit Tests

## 📋 Overview

This directory contains unit tests for domain-specific configuration components. These tests validate configuration schemas, loaders, and providers for various domains within the application, such as database, storage, email, and security settings.

## 🧩 Test Files

| File                                                               | Description                                            |
| ------------------------------------------------------------------ | ------------------------------------------------------ |
| [DatabaseConfig.test.ts](./DatabaseConfig.test.ts)                 | Tests database configuration schema and validation     |
| [DatabaseConfigProvider.test.ts](./DatabaseConfigProvider.test.ts) | Tests the provider for database-specific configuration |
| [EmailConfig.test.ts](./EmailConfig.test.ts)                       | Tests email service configuration and validation       |
| [SecurityConfig.test.ts](./SecurityConfig.test.ts)                 | Tests security settings configuration and validation   |
| [ServerConfig.test.ts](./ServerConfig.test.ts)                     | Tests HTTP server configuration and validation         |
| [StorageConfig.test.ts](./StorageConfig.test.ts)                   | Tests file storage configuration and validation        |

## 🔍 Key Test Scenarios

### Schema Validation

- Required field validation
- Type validation
- Format validation
- Range validation
- Pattern matching
- Enum value validation

### Environment Integration

- Environment variable mapping
- Environment-specific defaults
- Production vs. development settings
- Configuration inheritance
- Override precedence

### Configuration Loading

- File-based configuration
- Environment-based configuration
- In-memory configuration
- Configuration merging
- Default application

### Configuration Transformation

- Connection string parsing
- URL normalization
- Sensitive data handling
- Type conversion
- Unit conversion

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock configuration sources
- Environment variable mocks
- Configuration loaders
- Validation functions

### Common Patterns

```typescript
// Example pattern for testing database configuration validation
it("should validate database configuration", () => {
  // Arrange
  const validConfig = {
    host: "localhost",
    port: 5432,
    database: "test_db",
    username: "dbuser",
    password: "password123",
    ssl: true,
  };

  const invalidConfig = {
    host: "localhost",
    port: -1, // Invalid port
    database: "", // Empty database name
    username: "dbuser",
    password: "password123",
  };

  // Act
  const validResult = DatabaseConfig.validate(validConfig);
  const invalidResult = DatabaseConfig.validate(invalidConfig);

  // Assert
  expect(validResult.isValid).toBe(true);
  expect(validResult.errors).toBeUndefined();

  expect(invalidResult.isValid).toBe(false);
  expect(invalidResult.errors).toContainEqual(
    expect.objectContaining({ path: "port" }),
  );
  expect(invalidResult.errors).toContainEqual(
    expect.objectContaining({ path: "database" }),
  );
});

// Example pattern for testing config provider
it("should provide database configuration", async () => {
  // Arrange
  const configService = new MockConfigService({
    "database.host": "db.example.com",
    "database.port": "5432",
    "database.name": "production_db",
    "database.user": "admin",
    "database.password": "secret",
  });

  const dbConfigProvider = new DatabaseConfigProvider(configService);

  // Act
  const dbConfig = await dbConfigProvider.getConfig();

  // Assert
  expect(dbConfig).toEqual({
    host: "db.example.com",
    port: 5432, // Note: converted to number
    database: "production_db",
    username: "admin",
    password: "secret",
    ssl: false, // Default value
    poolSize: 10, // Default value
  });
});
```

## 📚 Advanced Testing Techniques

### Cross-Domain Configuration

- Inter-domain dependencies
- Consistency validation
- Reference resolution
- Circular reference detection

### Security Auditing

- Secret masking
- Sensitive data identification
- Access control validation
- Principle of least privilege

### Configuration Evolution

- Backward compatibility
- Migration strategies
- Deprecation handling
- Version-specific validation

## 🔗 Related Components

- [Config Service](../README.md) - For main configuration system
- [Secrets](../secrets/README.md) - For sensitive configuration handling
- [Validation](../../validation/README.md) - For schema validation
