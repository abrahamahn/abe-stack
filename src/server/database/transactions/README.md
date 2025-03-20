# Database Transaction Manager

A robust transaction management system for PostgreSQL database operations in TypeScript, designed specifically for the Social Media & Multimedia Streaming Platform.

## Overview

The Transaction Manager provides a reliable, type-safe interface for handling database transactions with configurable isolation levels, timeout controls, and proper error handling. It ensures data integrity even under high concurrency scenarios typical in social media and streaming applications.

## Features

- **Fully Typed API**: Complete TypeScript support with proper typing for all operations
- **Configurable Isolation Levels**: Support for all PostgreSQL isolation levels
- **Transaction Options**: Fine-grained control over transaction behavior
- **Error Handling**: Automatic rollback on errors with detailed logging
- **Connection Management**: Proper handling of connection pooling and release
- **Savepoints**: Support for partial transaction rollbacks using savepoints
- **Batch Operations**: Optimized handling of multiple queries in a single transaction
- **Read-Only Transactions**: Specialized support for read-only operations
- **Timeout Controls**: Prevent long-running transactions from blocking resources

## Usage Examples

### Basic Transaction

```typescript
import { TransactionManager } from '../database/transactionManager';

async function createUserWithProfile(userData, profileData) {
  return TransactionManager.execute(async (client) => {
    // Insert user
    const userResult = await client.query(
      'INSERT INTO users(username, email) VALUES($1, $2) RETURNING id',
      [userData.username, userData.email]
    );
    
    const userId = userResult.rows[0].id;
    
    // Insert profile using the user ID
    await client.query(
      'INSERT INTO profiles(user_id, display_name, bio) VALUES($1, $2, $3)',
      [userId, profileData.displayName, profileData.bio]
    );
    
    return userId;
  });
}
```

### Transaction with Custom Isolation Level

```typescript
import { TransactionManager, IsolationLevel } from '../database/transactionManager';

async function processPayment(userId, amount) {
  return TransactionManager.execute(async (client) => {
    // First check balance
    const balanceResult = await client.query(
      'SELECT balance FROM accounts WHERE user_id = $1 FOR UPDATE',
      [userId]
    );
    
    const currentBalance = balanceResult.rows[0].balance;
    
    if (currentBalance < amount) {
      throw new Error('Insufficient funds');
    }
    
    // Update account balance
    await client.query(
      'UPDATE accounts SET balance = balance - $1 WHERE user_id = $2',
      [amount, userId]
    );
    
    // Record transaction
    await client.query(
      'INSERT INTO transactions(user_id, amount, type) VALUES($1, $2, $3)',
      [userId, amount, 'premium_subscription']
    );
    
    return { success: true };
  }, {
    isolation: IsolationLevel.SERIALIZABLE,
    timeout: 5000 // 5 seconds timeout
  });
}
```

### Read-Only Transaction

```typescript
import { TransactionManager, IsolationLevel } from '../database/transactionManager';

async function getStreamingAnalytics(contentId) {
  return TransactionManager.readTransaction(async (client) => {
    // Get view counts
    const viewsResult = await client.query(
      'SELECT COUNT(*) FROM content_views WHERE content_id = $1',
      [contentId]
    );
    
    // Get unique viewers
    const uniqueViewersResult = await client.query(
      'SELECT COUNT(DISTINCT user_id) FROM content_views WHERE content_id = $1',
      [contentId]
    );
    
    // Get average watch time
    const watchTimeResult = await client.query(
      'SELECT AVG(duration) FROM content_views WHERE content_id = $1',
      [contentId]
    );
    
    return {
      totalViews: viewsResult.rows[0].count,
      uniqueViewers: uniqueViewersResult.rows[0].count,
      averageWatchTime: watchTimeResult.rows[0].avg
    };
  }, IsolationLevel.REPEATABLE_READ);
}
```

### Batch Operations

```typescript
import { TransactionManager } from '../database/transactionManager';

async function batchUpdateContentStatus(contentIds, newStatus) {
  const queries = contentIds.map(id => ({
    text: 'UPDATE content SET status = $1, updated_at = NOW() WHERE id = $2',
    values: [newStatus, id]
  }));
  
  return TransactionManager.executeBatch(queries);
}
```

### Using Savepoints

```typescript
import { TransactionManager } from '../database/transactionManager';

async function processUserContent(userData, contentItems) {
  return TransactionManager.execute(async (client) => {
    // Create user first
    const userResult = await client.query(
      'INSERT INTO users(username, email) VALUES($1, $2) RETURNING id',
      [userData.username, userData.email]
    );
    
    const userId = userResult.rows[0].id;
    const processedContent = [];
    
    // Process each content item with savepoints
    for (let i = 0; i < contentItems.length; i++) {
      const item = contentItems[i];
      const savepointName = `content_${i}`;
      
      try {
        await TransactionManager.createSavepoint(client, savepointName);
        
        const contentResult = await client.query(
          'INSERT INTO content(user_id, title, data) VALUES($1, $2, $3) RETURNING id',
          [userId, item.title, item.data]
        );
        
        processedContent.push(contentResult.rows[0].id);
        
        await TransactionManager.releaseSavepoint(client, savepointName);
      } catch (error) {
        // If one content item fails, roll back just that item
        await TransactionManager.rollbackToSavepoint(client, savepointName);
        console.error(`Failed to process content item ${i}:`, error);
        // Continue with other items
      }
    }
    
    return {
      userId,
      processedContent
    };
  });
}
```

## API Reference

### TransactionManager.execute<T>(callback, options)

Executes a function within a database transaction and returns the result.

**Parameters:**
- `callback`: `(client: PoolClient) => Promise<T>` - Function to execute within the transaction
- `options`: `TransactionOptions` - Configuration options for the transaction
  - `isolation`: `IsolationLevel` - Transaction isolation level
  - `readOnly`: `boolean` - Whether the transaction is read-only
  - `deferrable`: `boolean` - Whether the transaction is deferrable (only applicable for SERIALIZABLE)
  - `timeout`: `number` - Statement timeout in milliseconds

**Returns:** `Promise<T>` - The result of the callback function

### TransactionManager.readTransaction<T>(callback, isolation)

Executes a read-only transaction.

**Parameters:**
- `callback`: `(client: PoolClient) => Promise<T>` - Function to execute
- `isolation`: `IsolationLevel` - Transaction isolation level (defaults to READ_COMMITTED)

**Returns:** `Promise<T>` - The result of the callback function

### TransactionManager.executeBatch(queries, options)

Executes multiple SQL queries within a single transaction.

**Parameters:**
- `queries`: `Array<{ text: string; values?: unknown[] }>` - Array of queries to execute
- `options`: `TransactionOptions` - Transaction configuration options

**Returns:** `Promise<QueryResult[]>` - Array of query results

### TransactionManager.multiOperationTransaction<T>(operations, options)

Executes multiple operations within a single transaction.

**Parameters:**
- `operations`: `Array<TransactionCallback<T>>` - Array of operations to perform
- `options`: `TransactionOptions` - Transaction configuration options

**Returns:** `Promise<T[]>` - Array of results from each operation

### Savepoint Methods

- **createSavepoint(client, name)**: Creates a savepoint within a transaction
- **rollbackToSavepoint(client, name)**: Rolls back to a savepoint within a transaction
- **releaseSavepoint(client, name)**: Releases a savepoint within a transaction

## Isolation Levels

The `IsolationLevel` enum provides all standard PostgreSQL isolation levels:

- `READ_UNCOMMITTED`: Lowest isolation level, allows dirty reads
- `READ_COMMITTED`: Prevents dirty reads, but allows non-repeatable reads and phantom reads
- `REPEATABLE_READ`: Prevents dirty reads and non-repeatable reads, but allows phantom reads
- `SERIALIZABLE`: Highest isolation level, prevents all concurrency anomalies

## Best Practices

1. **Keep Transactions Short**: Long-running transactions can block database resources
2. **Use Appropriate Isolation Levels**: Higher levels provide more safety but reduce concurrency
3. **Handle Errors Properly**: The manager automatically rolls back on errors, but you should handle them appropriately
4. **Use Read-Only Transactions**: For operations that don't modify data
5. **Consider Using Savepoints**: For complex operations where partial failures are acceptable
6. **Set Reasonable Timeouts**: Prevent transactions from running indefinitely

## Integration with Database Models

This Transaction Manager works seamlessly with the database schema from the Social Media & Multimedia Streaming Platform, supporting all the complex relationships and constraints defined in the schema.

## Error Handling

The Transaction Manager includes comprehensive error handling, automatically rolling back transactions when errors occur and providing detailed logs for debugging. All errors are properly propagated to calling code.

## Performance Considerations

- Connection pooling is handled automatically
- Transactions are automatically committed or rolled back
- Resources are properly released after use
- Statement timeouts prevent resource exhaustion

## License

This Transaction Manager is part of the Social Media & Multimedia Streaming Platform and is available under the same license terms.