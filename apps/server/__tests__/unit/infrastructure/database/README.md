# 🧪 Database Unit Tests

## 📋 Overview

This directory contains unit tests for the database infrastructure components. The tests validate the database server's connection management, query execution, migration handling, and transaction processing capabilities.

## 🧩 Test Files

| File                                                       | Description                                                                                        |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [DatabaseServer.test.ts](./DatabaseServer.test.ts)         | Tests the core database server implementation, including connection management and query execution |
| [IDatabaseServer.test.ts](./IDatabaseServer.test.ts)       | Tests the interface contract for database server implementations                                   |
| [MigrationManager.test.ts](./MigrationManager.test.ts)     | Tests database migration functionality, including versioning and schema updates                    |
| [migrationConfig.test.ts](./migrationConfig.test.ts)       | Tests configuration loading and validation for migrations                                          |
| [migrationAuth.test.ts](./migrationAuth.test.ts)           | Tests authentication and authorization for database migrations                                     |
| [TransactionService.test.ts](./TransactionService.test.ts) | Tests transaction management, including commits, rollbacks, and nested transactions                |

## 🔍 Key Test Scenarios

### Connection Management

- Connection establishment and pooling
- Connection failure handling and retries
- Connection string parsing and validation
- Connection health monitoring

### Query Execution

- Basic query operations (SELECT, INSERT, UPDATE, DELETE)
- Parameterized query support
- Query result processing
- Error handling during query execution

### Migration Processing

- Schema version detection
- Forward migration execution
- Rollback handling
- Transaction support during migrations
- Migration logging

### Transaction Management

- Transaction isolation levels
- Commit and rollback operations
- Nested transactions
- Distributed transactions
- Error handling during transactions

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock database clients
- In-memory database for fast testing
- Mock migration files
- Connection pool mocks

### Common Patterns

```typescript
// Example pattern for testing transaction rollback
it("should roll back transaction on error", async () => {
  // Arrange
  const mockDb = new MockDatabase();
  const service = new TransactionService(mockDb);

  // Act & Assert
  await expect(async () => {
    await service.withTransaction(async (client) => {
      await client.query("INSERT INTO test VALUES ($1)", ["value"]);
      throw new Error("Deliberate error");
    });
  }).rejects.toThrow("Deliberate error");

  // Verify rollback was called
  expect(mockDb.rollback).toHaveBeenCalled();

  // Verify data was not committed
  const result = await mockDb.query("SELECT * FROM test");
  expect(result.rows).toHaveLength(0);
});
```

## 📚 Advanced Testing Techniques

### Schema Validation Testing

- Table structure verification
- Index existence checking
- Foreign key constraint validation

### Performance Testing

- Connection pool optimization
- Query execution timing
- Index usage verification

### Error Recovery Testing

- Connection loss simulation
- Deadlock detection and resolution
- Query timeout handling

## 🔗 Related Components

- [Configuration](../config/README.md) - For database configuration
- [Lifecycle](../lifecycle/README.md) - For database startup/shutdown hooks
- [Logging](../logging/README.md) - For query logging and error reporting
