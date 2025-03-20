# Database Migration System

A TypeScript-based database migration management system for PostgreSQL databases. This system helps manage database schema changes in a structured, version-controlled way.

## Overview

This migration system provides a way to:

- Track database schema changes
- Apply migrations in order
- Roll back migrations when needed
- Create new migration files from templates
- Support both SQL and TypeScript/JavaScript migrations

## Features

- Automatic migration tracking in a dedicated database table
- Timestamp-based ordering of migrations
- Transaction support for safe rollbacks
- TypeScript support for complex migrations
- Migration status reporting
- Database reset functionality for development environments

## Files

The system consists of two main files:

1. `migrationConfig.ts`: Configuration settings and template generation
2. `migrationManager.ts`: Core migration execution logic

## Installation

### Prerequisites

- Node.js
- PostgreSQL database
- TypeScript

### Setup

1. Make sure you have a PostgreSQL database connection configured in your application.
2. The migration system uses the `DatabaseConnectionManager` to get a database pool.

## Usage

### Import the Migration Manager

```typescript
import migrationManager from '@database/migrations/migrationManager';
```

### Create a New Migration

```typescript
// Create a new migration file
await migrationManager.createMigration('add_users_table');
// Will create a file like: 20250320_123456_add_users_table.ts
```

### Check Migration Status

```typescript
// Get status of all migrations
const status = await migrationManager.status();
console.log('Executed migrations:', status.executed);
console.log('Pending migrations:', status.pending);
```

### Apply Migrations

```typescript
// Run all pending migrations
await migrationManager.migrate();
```

### Rollback a Migration

```typescript
// Rollback the most recent migration
await migrationManager.rollbackMigration();
```

### Reset Database (⚠️ Use with caution!)

```typescript
// Reset the entire database (will drop all tables except migrations table)
await migrationManager.resetDatabase();
```

## Writing Migrations

### TypeScript Migrations

TypeScript migrations should export two functions: `up` and `down`.

```typescript
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export function up(pgm: MigrationBuilder): void {
  // Add migration code here
  pgm.createTable('users', {
    id: 'id',
    name: { type: 'varchar(1000)', notNull: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  
  pgm.createIndex('users', 'email');
}

export function down(pgm: MigrationBuilder): void {
  // Add rollback code here
  pgm.dropTable('users');
}
```

### SQL Migrations

SQL migrations can be created as `.sql` files. For rollbacks, create a corresponding `.down.sql` file.

Example: `20250320_123456_add_users_table.sql`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(1000) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX users_email_idx ON users(email);
```

Rollback file: `20250320_123456_add_users_table.down.sql`
```sql
DROP TABLE users;
```

## Configuration

The migration system is configured through the `migrationConfig` object in `migrationConfig.ts`. Default settings:

```typescript
export const migrationConfig: MigrationConfig = {
  migrations_path: path.join(
    process.cwd(),
    "src/server/database/migrations/migrations",
  ),
  migrations_table: "migrations",
  migration_file_extension: ".ts", // Support for TypeScript migrations
};
```

You can modify these settings to change:
- Where migration files are stored
- What table is used to track migrations
- What file extension to use for new migrations

## Best Practices

1. **Always test migrations**: Test your migrations on development databases before applying them to production.
2. **Include both up and down migrations**: Always provide a way to roll back changes.
3. **Keep migrations atomic**: Each migration should handle one logical change to the database.
4. **Use transactions**: Ensure all changes within a migration succeed or fail together.
5. **Version control your migrations**: Keep migration files in your repository alongside your code.

## Contributing

When contributing to this migration system, please ensure:

1. All new features have corresponding tests
2. Documentation is updated
3. Your code follows the project's style guidelines

## License

Abraham Joongwhan Ahn. All Rights Reserved.