# 🧪 Dependency Injection Unit Tests

## 📋 Overview

This directory contains unit tests for the dependency injection system. The tests validate the DI container's ability to register, resolve, and manage service dependencies with appropriate scoping.

## 🧩 Test Files

| File                                     | Description                                                                                    |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| [container.test.ts](./container.test.ts) | Tests the core dependency injection container, including registration, resolution, and scoping |
| [types.test.ts](./types.test.ts)         | Tests type token definitions and uniqueness for dependency identification                      |

## 🔍 Key Test Scenarios

### Service Registration

- Interface-based registration
- Implementation registration
- Factory function registration
- Value registration
- Registration overwrites and conflicts

### Service Resolution

- Basic dependency resolution
- Interface to implementation resolution
- Recursive dependency resolution
- Optional dependency handling
- Missing dependency detection

### Scoping and Lifetime

- Singleton scope behavior
- Transient scope behavior
- Scoped lifetime management
- Instance sharing between resolutions
- Container hierarchies

### Error Handling

- Circular dependency detection
- Resolution timeout handling
- Invalid registration detection
- Type compatibility validation

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock services for dependency chains
- Interface definitions
- Type tokens

### Common Patterns

```typescript
// Example pattern for testing singleton scoping
it("should reuse singleton instances", () => {
  // Arrange
  const container = new Container();

  // Register a service as singleton
  container.register(SERVICE_TOKEN, ServiceImpl).asSingleton();

  // Act
  const instance1 = container.resolve(SERVICE_TOKEN);
  const instance2 = container.resolve(SERVICE_TOKEN);

  // Assert
  expect(instance1).toBe(instance2); // Same reference
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Resolution speed benchmarks
- Memory usage optimization
- Registration performance

### Inheritance Testing

- Base class with derived implementations
- Interface implementation verification
- Generic type handling

### Integration Testing

- Resolving complex dependency trees
- Realistic service compositions
- Child containers and scopes

## 🔗 Related Components

- [Lifecycle](../lifecycle/README.md) - For lifecycle-aware services
- [Configuration](../config/README.md) - For configurable services
- [Logging](../logging/README.md) - For service resolution logging
