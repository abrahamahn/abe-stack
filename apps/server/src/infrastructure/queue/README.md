# 🔄 Queue Management System

## 📋 Purpose

The queue management system provides mechanisms for handling asynchronous processing tasks, offering:

- Efficient batching of related operations
- Prioritization of queue entries
- Throttling and rate limiting
- Failure handling and retry mechanisms
- Performance optimization for high-throughput scenarios
- Memory-efficient processing of large data sets

This module serves as a foundation for handling operations that benefit from batched processing, reducing database load, API calls, and improving overall system performance.

## 🧩 Key Components

### 1️⃣ Batched Queue

- **`BatchedQueue`**: Implementation for grouped processing operations
- Optimizes performance by processing items in efficient batches
- Supports priority levels, throttling, and concurrent execution

### 2️⃣ Module Exports

- **`index.ts`**: Exports queue implementations and utilities
- Provides easy access to queue functionality

## 🛠️ Usage Instructions

### Basic Batched Queue

```typescript
import { BatchedQueue } from "@/server/infrastructure/queue";

// Create a queue for processing user notifications
const notificationQueue = new BatchedQueue<UserNotification>({
  batchSize: 50, // Process 50 notifications at once
  flushInterval: 5000, // Process at least every 5 seconds
  processor: async (items) => {
    // Process a batch of notifications
    await notificationService.sendBatch(items);

    // Return success for all items
    return items.map(() => ({ success: true }));
  },
});

// Add items to the queue
await notificationQueue.enqueue({
  userId: "user123",
  message: "New message received",
  type: "chat",
});

// Queue will automatically process based on batch size or interval
```

### Prioritized Queue

```typescript
import { BatchedQueue } from "@/server/infrastructure/queue";

// Create a prioritized email queue
const emailQueue = new BatchedQueue<EmailMessage>({
  batchSize: 20,
  flushInterval: 10000,
  priorityLevels: 3, // 0 = highest, 2 = lowest
  processor: async (emails) => {
    // Send batch of emails
    const results = await emailService.sendBulk(emails);

    // Return results for each email
    return results.map((result) => ({
      success: result.status === "sent",
      error: result.status === "failed" ? result.error : undefined,
    }));
  },
});

// Add high priority email (priority 0)
await emailQueue.enqueue(
  {
    to: "user@example.com",
    subject: "Security Alert",
    body: "Your account has been accessed from a new device.",
  },
  0, // High priority
);

// Add normal priority email (priority 1)
await emailQueue.enqueue(
  {
    to: "user@example.com",
    subject: "Weekly Newsletter",
    body: "Here are this week's updates...",
  },
  1, // Normal priority
);
```

### Handling Processor Failures

```typescript
import { BatchedQueue } from "@/server/infrastructure/queue";
import { logger } from "@/server/infrastructure/logging";

// Create a queue with error handling
const apiCallQueue = new BatchedQueue<ApiRequest>({
  batchSize: 10,
  flushInterval: 2000,
  processor: async (requests) => {
    try {
      // Make bulk API call
      const responses = await apiClient.bulkRequest(requests);

      // Map responses to individual results
      return responses.map((resp) => ({ success: resp.ok }));
    } catch (error) {
      // Log the batch error
      logger.error("Batch API call failed", { error });

      // Mark all items as failed
      return requests.map(() => ({
        success: false,
        error: error.message,
        retryable: error.code !== "INVALID_AUTH", // Don't retry auth errors
      }));
    }
  },
  retryStrategy: {
    maxRetries: 3,
    backoff: {
      initialDelay: 1000,
      multiplier: 2,
      maxDelay: 30000,
    },
  },
});
```

### Complex Queue with Custom Handling

```typescript
import { BatchedQueue } from "@/server/infrastructure/queue";
import { logger } from "@/server/infrastructure/logging";

// Define item type with custom fields
interface ReportTask {
  id: string;
  userId: string;
  reportType: string;
  parameters: Record<string, any>;
  priority: number;
}

// Create advanced queue
const reportQueue = new BatchedQueue<ReportTask>({
  name: "report-generation",
  batchSize: 5,
  flushInterval: 15000,

  // Group similar reports together in same batch
  batchingStrategy: (items) => {
    // Group by report type
    const groups = new Map<string, ReportTask[]>();

    for (const item of items) {
      const key = item.reportType;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(item);
    }

    // Return batches, respecting max batch size
    return Array.from(groups.values())
      .filter((group) => group.length > 0)
      .map((group) => group.slice(0, 5));
  },

  // Process each batch
  processor: async (tasks) => {
    logger.info(`Processing ${tasks.length} ${tasks[0].reportType} reports`);

    const results = [];

    for (const task of tasks) {
      try {
        // Generate individual report
        await reportService.generate(task.id, task.parameters);
        results.push({ success: true });
      } catch (error) {
        logger.error(`Failed to generate report ${task.id}`, { error });
        results.push({
          success: false,
          error: error.message,
          retryable: !error.permanent,
        });
      }
    }

    return results;
  },

  // Configure retries
  retryStrategy: {
    maxRetries: 2,
    retryableCheck: (error) => error?.retryable !== false,
    backoff: {
      initialDelay: 5000,
      multiplier: 2,
    },
  },

  // Hooks for monitoring
  hooks: {
    onEnqueue: (item) => {
      logger.debug(`Report ${item.id} queued`, { type: item.reportType });
    },
    onBatchStart: (batch) => {
      logger.info(`Starting batch of ${batch.length} reports`);
    },
    onBatchComplete: (batch, results) => {
      const success = results.filter((r) => r.success).length;
      logger.info(`Completed batch: ${success}/${batch.length} successful`);
    },
    onProcessed: (item, result) => {
      if (result.success) {
        logger.debug(`Report ${item.id} generated successfully`);
      } else {
        logger.warn(`Report ${item.id} failed: ${result.error}`);
      }
    },
  },
});
```

## 🏗️ Architecture Decisions

### Batched Processing

- **Decision**: Implement batched processing
- **Rationale**: Improves efficiency for operations with overhead
- **Benefit**: Reduced API calls, database transactions, and network overhead

### Configurable Batch Sizing

- **Decision**: Allow flexible batch size configuration
- **Rationale**: Different operations have different optimal batch sizes
- **Implementation**: Batch size, flush intervals, and custom batching strategies

### Priority Handling

- **Decision**: Support item prioritization
- **Rationale**: Critical operations should be processed before less important ones
- **Implementation**: Multi-level priority queues with configurable levels

### Resilience Patterns

- **Decision**: Implement robust error handling and retries
- **Rationale**: Ensures operations eventually complete despite transient failures
- **Benefit**: Increased system reliability with minimal manual intervention

## ⚙️ Setup and Configuration Notes

### Basic Configuration

Configure the queue with appropriate options:

```typescript
import { BatchedQueue } from "@/server/infrastructure/queue";

// Generic configuration pattern
const queue = new BatchedQueue<T>({
  // Naming and identification
  name: "my-processing-queue",

  // Batch configuration
  batchSize: 50, // Maximum items in a batch
  flushInterval: 10000, // Maximum wait time in ms

  // Processing configuration
  concurrency: 2, // Process up to 2 batches simultaneously
  throttle: 100, // Minimum ms between batch processing

  // Processor implementation
  processor: async (items) => {
    // Process batch of items
    return items.map((item) => ({ success: true }));
  },
});
```

### Retry Configuration

Setting up retry behavior:

```typescript
// Retry configuration
const queue = new BatchedQueue<T>({
  // Basic configuration...

  // Retry strategy
  retryStrategy: {
    maxRetries: 3, // Max retry attempts
    retryableCheck: (error) => {
      // Check if error is retryable
      return error?.transient === true;
    },
    backoff: {
      initialDelay: 1000, // Start with 1 second delay
      multiplier: 2, // Double delay each retry
      maxDelay: 60000, // Cap at 1 minute
    },
  },
});
```

### Memory Management

For handling large volumes of data:

```typescript
// Memory-conscious configuration
const queue = new BatchedQueue<T>({
  // Basic configuration...

  // Memory management
  maxQueueSize: 10000, // Maximum items in memory
  dropBehavior: "reject-new", // Reject new items when full

  // Alternative drop behavior
  // dropBehavior: "drop-oldest" // Drop oldest items when full

  // Persistence options
  persistence: {
    enabled: true,
    storageKey: "my-queue-backup",
    saveInterval: 60000, // Save state every minute
    storage: fileSystemStorage, // Storage implementation
  },
});
```

### Shutdown Handling

Clean shutdown process:

```typescript
// In your application shutdown code
async function shutdown() {
  // Stop accepting new items
  queue.pause();

  try {
    // Wait for pending items to process with timeout
    await queue.drain(30000); // 30 second timeout
    console.log("Queue drained successfully");
  } catch (error) {
    console.error("Failed to drain queue:", error);

    // Save pending items for later processing
    await queue.saveState();
  }
}
```

### Monitoring Integration

Integrating with monitoring systems:

```typescript
import { BatchedQueue } from "@/server/infrastructure/queue";
import { metrics } from "@/server/infrastructure/metrics";

const queue = new BatchedQueue<T>({
  // Basic configuration...

  // Monitoring hooks
  hooks: {
    onEnqueue: (item) => {
      metrics.increment("queue.items.enqueued", { queue: "my-queue" });
    },
    onBatchStart: (batch) => {
      metrics.gauge("queue.batch.size", batch.length, { queue: "my-queue" });
    },
    onBatchComplete: (batch, results) => {
      const success = results.filter((r) => r.success).length;
      metrics.gauge("queue.batch.success_rate", success / batch.length, {
        queue: "my-queue",
      });
    },
    onQueueSizeChange: (size) => {
      metrics.gauge("queue.size", size, { queue: "my-queue" });
    },
    onError: (error) => {
      metrics.increment("queue.errors", { queue: "my-queue" });
    },
  },
});
```
