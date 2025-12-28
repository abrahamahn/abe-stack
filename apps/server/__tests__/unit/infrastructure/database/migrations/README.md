# 📊 Database Migrations Unit Tests

## 📋 Overview

This directory contains unit tests for database migration components that manage database schema changes, version control, and migration workflows. These tests ensure that database structure can be reliably modified in a controlled, reversible manner.

## 🛡️ Migration Areas Covered

- **🔄 Schema Changes**: Table creation, modification, and removal
- **📈 Version Management**: Migration versioning and tracking
- **⏪ Rollbacks**: Reversing migrations when needed
- **🔒 Security**: Authentication and authorization for migrations
- **📝 Logging**: Tracking migration execution and results

## 🧩 Test Files

| File                                                   | Description                                              |
| ------------------------------------------------------ | -------------------------------------------------------- |
| [migrationManager.test.ts](./migrationManager.test.ts) | Tests for core migration execution and management        |
| [migrationAuth.test.ts](./migrationAuth.test.ts)       | Tests for migration authentication and security controls |

## 🔍 Key Test Scenarios

### 🔄 Migration Execution

- Forward migration application
- Migration ordering and dependencies
- Transaction management during migrations
- Error handling during migration failures
- Migration performance monitoring

### ⏪ Rollback Operations

- Single migration rollback
- Rolling back to specific versions
- Handling rollback failures
- Transaction management during rollbacks
- Validation of database state after rollback

### 📈 Version Management

- Migration versioning strategies
- Migration history tracking
- Current version detection
- Migration status reporting
- Handling out-of-order migrations

### 🔒 Migration Security

- Authentication for migration operations
- Authorization checks for sensitive migrations
- Audit logging for migration activities
- Environmental safeguards (prod vs. dev)
- Secure storage of migration scripts

### 📝 Logging and Monitoring

- Migration execution logging
- Performance metrics collection
- Error reporting
- Status notifications
- Migration history queries

## 🚀 Running Tests

To run all migration tests:

```bash
npm test src/tests/server/unit/infrastructure/database/migrations
```

To run a specific test file:

```bash
npm test src/tests/server/unit/infrastructure/database/migrations/[test-file-name]
```

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock database connections
- Mock migration scripts
- Mock migration history tables
- Mock authentication services

### Common Patterns

```typescript
// Example pattern for testing migration execution
it("should apply pending migrations in correct order", async () => {
  // Arrange
  const mockMigrations = [
    {
      id: "20230101120000",
      name: "create_users_table",
      up: vi.fn().mockResolvedValue(true),
      down: vi.fn(),
    },
    {
      id: "20230102120000",
      name: "add_email_to_users",
      up: vi.fn().mockResolvedValue(true),
      down: vi.fn(),
    },
  ];

  const mockDb = {
    beginTransaction: vi.fn().mockResolvedValue(true),
    commit: vi.fn().mockResolvedValue(true),
    rollback: vi.fn().mockResolvedValue(true),
    query: vi.fn().mockImplementation((sql) => {
      if (sql.includes("SELECT * FROM migrations")) {
        return Promise.resolve([]); // No migrations applied yet
      }
      return Promise.resolve([]);
    }),
    exec: vi.fn().mockResolvedValue(true),
  };

  const migrationManager = new MigrationManager(mockDb, mockMigrations);

  // Act
  const result = await migrationManager.migrateUp();

  // Assert
  expect(mockDb.beginTransaction).toHaveBeenCalledTimes(2); // One per migration
  expect(mockMigrations[0].up).toHaveBeenCalledBefore(mockMigrations[1].up);
  expect(mockDb.commit).toHaveBeenCalledTimes(2);
  expect(mockDb.query).toHaveBeenCalledWith(
    expect.stringContaining("INSERT INTO migrations"),
    expect.arrayContaining([expect.any(String), "create_users_table"])
  );
  expect(result.migrationsApplied).toBe(2);
  expect(result.status).toBe("success");
});
```

## 📈 Test Coverage

The tests aim to provide comprehensive coverage of:

- ✅ Migration application and rollback
- ⚠️ Error handling and transaction management
- 🔒 Security controls and authentication
- 📊 Version tracking and history management
- ⏱️ Performance considerations

## 📝 Adding New Tests

When adding new migration features:

1. Create a corresponding test file following the naming convention `migration[Feature].test.ts`
2. Use the existing test structure as a template
3. Test both successful migration flows and failure scenarios
4. Ensure proper database state verification
5. Test integration with authentication and logging systems

## ✅ Best Practices

- 🔄 Test both up and down migrations
- 📚 Document migration dependencies clearly
- 🧩 Verify database state after each migration
- 🔍 Test performance on large migrations
- ⚠️ Test rollback behavior thoroughly

## 🔗 Related Components

- [Database](../README.md) - For core database integration
- [Security](../../security/README.md) - For authentication controls
- [Config](../../config/README.md) - For environment configuration
