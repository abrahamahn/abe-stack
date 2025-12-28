# 🔄 Reset Utilities Unit Tests

## 📋 Overview

This directory contains unit tests for reset utility components that help manage application state resets, cleanup operations, and test environment preparations. These utilities ensure consistent test environments and proper system resets.

## 🛡️ Reset Areas Covered

- **🧹 Environment Cleanup**: Test environment preparation and cleanup
- **🔄 State Resets**: Application state reset operations
- **💾 Data Restoration**: Resetting to known data states
- **🧪 Test Isolation**: Ensuring tests don't affect each other
- **⏱️ Runtime Resets**: Runtime environment reconfigurations

## 🧩 Test Files

| File                                                 | Description                                |
| ---------------------------------------------------- | ------------------------------------------ |
| [ResetService.test.ts](./ResetService.test.ts)       | Tests for core reset service functionality |
| [DatabaseReset.test.ts](./DatabaseReset.test.ts)     | Tests for database reset operations        |
| [CacheReset.test.ts](./CacheReset.test.ts)           | Tests for cache clearing utilities         |
| [FileSystemReset.test.ts](./FileSystemReset.test.ts) | Tests for filesystem cleanup operations    |
| [RuntimeReset.test.ts](./RuntimeReset.test.ts)       | Tests for runtime configuration resets     |

## 🔍 Key Test Scenarios

### 🧹 Environment Setup and Teardown

- Test environment initialization
- Test environment cleanup
- Resource allocation and release
- Temporary file cleanup
- Environment variable restoration

### 🔄 Database Operations

- Database state resets
- Schema resets
- Test data seeding
- Transaction rollbacks
- Connection pool management

### 💾 Cache Management

- Cache invalidation
- Memory cache clearing
- Distributed cache resets
- Cache key pattern invalidation
- Cache warm-up operations

### 🧪 Test Isolation

- State isolation between tests
- Mocking reset operations
- Parallel test execution support
- Test dependency management
- Test sequencing control

### ⏱️ Runtime Configuration

- Configuration resets
- Service registry cleanup
- Connection pool management
- Thread and process management
- Resource allocation tracking

## 🚀 Running Tests

To run all reset utility tests:

```bash
npm test src/tests/server/unit/infrastructure/utils/reset
```

To run a specific test file:

```bash
npm test src/tests/server/unit/infrastructure/utils/reset/[test-file-name]
```

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock database connections
- Mock filesystem operations
- Mock cache clients
- Mock configuration providers

### Common Patterns

```typescript
// Example pattern for testing database reset functionality
it("should reset database to initial state", async () => {
  // Arrange
  const mockDatabase = {
    tables: ["users", "posts", "comments"],
    truncateTable: vi.fn().mockResolvedValue(true),
    resetSequence: vi.fn().mockResolvedValue(true),
    runMigrations: vi.fn().mockResolvedValue(true),
    seedData: vi.fn().mockResolvedValue(true),
  };

  const resetService = new DatabaseResetService(mockDatabase);

  // Act
  await resetService.resetToInitialState({
    preserveTables: ["migrations"],
    seedTestData: true,
  });

  // Assert
  // Should truncate all tables except the preserved one
  expect(mockDatabase.truncateTable).toHaveBeenCalledTimes(3);
  expect(mockDatabase.truncateTable).toHaveBeenCalledWith("users");
  expect(mockDatabase.truncateTable).toHaveBeenCalledWith("posts");
  expect(mockDatabase.truncateTable).toHaveBeenCalledWith("comments");

  // Should reset sequences
  expect(mockDatabase.resetSequence).toHaveBeenCalledTimes(3);

  // Should seed test data
  expect(mockDatabase.seedData).toHaveBeenCalledWith(expect.any(Object));
});
```

## 📈 Test Coverage

The tests aim to provide comprehensive coverage of:

- ✅ All reset utility functions
- ⚠️ Error handling during reset operations
- 🔄 Correct sequence of reset steps
- 🛡️ Prevention of data loss in production environments
- ⏱️ Performance of reset operations

## 📝 Adding New Tests

When adding new reset features:

1. Create a corresponding test file following the naming convention `[feature]Reset.test.ts`
2. Use the existing test structure as a template
3. Test both successful and failed reset scenarios
4. Ensure proper cleanup even when reset operations fail
5. Test integration with other system components

## ✅ Best Practices

- 🔄 Always restore initial state after tests
- 📚 Document reset dependencies clearly
- 🧩 Test with realistic system states
- 🔍 Verify complete reset of all components
- ⚠️ Handle error cases and partial resets

## 🔗 Related Components

- [Database](../../database/README.md) - For database integration
- [Caching](../../caching/README.md) - For cache reset operations
- [Config](../../config/README.md) - For configuration reset operations
