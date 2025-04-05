# 🗄️ Database Infrastructure

## 📋 Purpose

The database infrastructure provides a robust foundation for database operations, offering:

- Type-safe database access layer
- Transaction management
- Migration support for schema changes
- Connection pooling and lifecycle management
- Query building and execution utilities
- Performance monitoring and metrics

This module serves as the data persistence layer for the application, ensuring reliable and efficient database operations.

## 🧩 Key Components

### 1️⃣ Database Server

- **`DatabaseServer`**: Core implementation for database operations
- **`IDatabaseServer`**: Interface defining the database contract
- Handles connection management, queries, and transactions

### 2️⃣ Transaction Management

- **`TransactionService`**: Manages database transactions
- Provides utilities for atomic operations and rollbacks
- Supports nested transactions and savepoints

### 3️⃣ Migration Framework

- **`migrationManager`**: Manages database schema migrations
- **`migrationConfig`**: Configuration for migration operations
- **`migrationAuth`**: Authentication for migration operations
- Supports versioned migrations with up/down capabilities

## 🛠️ Usage Instructions

### Basic Query Execution

```typescript
import { inject, injectable } from "inversify";
import { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class UserRepository {
  constructor(@inject(TYPES.DatabaseServer) private db: IDatabaseServer) {}

  async getUserById(id: string): Promise<User | null> {
    const result = await this.db.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);

    return result.rows[0] || null;
  }
}
```

### Transaction Management

```typescript
import { inject, injectable } from "inversify";
import { IDatabaseServer } from "@/server/infrastructure/database";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class PaymentService {
  constructor(@inject(TYPES.DatabaseServer) private db: IDatabaseServer) {}

  async transferFunds(
    fromAccount: string,
    toAccount: string,
    amount: number,
  ): Promise<void> {
    // Execute operations in a transaction
    await this.db.transaction(async (client) => {
      // Deduct from source account
      await client.query(
        "UPDATE accounts SET balance = balance - $1 WHERE id = $2",
        [amount, fromAccount],
      );

      // Add to destination account
      await client.query(
        "UPDATE accounts SET balance = balance + $1 WHERE id = $2",
        [amount, toAccount],
      );

      // Record transaction
      await client.query(
        "INSERT INTO transfers (from_account, to_account, amount, created_at) VALUES ($1, $2, $3, NOW())",
        [fromAccount, toAccount, amount],
      );
    });
  }
}
```

### Running Migrations

```typescript
import { migrationManager } from "@/server/infrastructure/database";

async function updateDatabaseSchema(): Promise<void> {
  // Initialize migration manager
  await migrationManager.initialize();

  // Run pending migrations
  const results = await migrationManager.migrateUp();

  console.log(`Applied ${results.length} migrations`);

  // For specific version
  // await migrationManager.migrateUp('20230415_add_user_profiles');
}
```

## 🏗️ Architecture Decisions

### PostgreSQL as Primary Database

- **Decision**: Use PostgreSQL as the primary database
- **Rationale**: Strong ACID compliance, robust feature set, and JSON support
- **Benefit**: Reliable data storage with advanced query capabilities

### Connection Pooling

- **Decision**: Implement connection pooling
- **Rationale**: Reduces connection overhead and improves performance
- **Implementation**: Configurable pool size and timeout settings

### SQL-First Approach

- **Decision**: Use SQL directly rather than an ORM
- **Rationale**: Better control over queries and performance
- **Tradeoffs**: Requires more manual SQL writing, but offers more flexibility

### Migration-Based Schema Management

- **Decision**: Use versioned migrations for schema changes
- **Rationale**: Provides reliable way to track and apply database changes
- **Implementation**: Up/down migration scripts with versioning

## ⚙️ Setup and Configuration Notes

### Database Connection

Configure database connection through environment variables:

```
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=abe_stack
DB_SSL=false
DB_MAX_CONNECTIONS=20
```

### Migration Directory Structure

Migrations are stored in a structured format:

```
migrations/
├── 20230101_initial_schema/
│   ├── up.sql       # Apply migration
│   └── down.sql     # Revert migration
├── 20230215_add_user_profiles/
│   ├── up.sql
│   └── down.sql
└── ...
```

### Performance Considerations

- Connection pool size should be tuned based on workload
- Long-running transactions should be avoided
- Consider using prepared statements for frequently executed queries
