# Shared Utils: Async Module - Current Behavior Spec

**Status:** DRAFT (Current State)
**Module:** `@bslt/shared/utils/async`
**Source:** `main/shared/src/utils/async`

## Overview

The Async module provides utilities for managing asynchronous operations, specifically focusing on batch processing, backpressure, and deferred promise resolution.

## Core Capabilities

### 1. Batched Queue (`BatchedQueue<T, R>`)

- **Purpose:** Aggregates individual tasks into groups to be processed in bulk (e.g., bulk database inserts, API batch endpoints).
- **Backpressure:** Automatically rejects new `enqueue()` requests when the internal buffer exceeds `maxQueueSize`.
- **Latency Control:** Processes a batch when either `maxBatchSize` is reached OR `maxWaitMs` has elapsed.
- **Concurrency:** Ensures only one batch processing function runs at a time (`isProcessing` lock).

### 2. Error Handling & Retries

- **Fail-Fast:** Can be configured to stop all processing and clear the queue on the first error.
- **Retry Logic:** Supports exponential backoff retries for failed batches.
- **Failure Isolation:** Even if a batch fails, the queue attempts to reject only the promises associated with that batch (unless `fail-fast` is enabled).

## API Surface

### `BatchedQueue`

| Method    | Input     | Output          | Side Effects                                                      |
| :-------- | :-------- | :-------------- | :---------------------------------------------------------------- |
| `enqueue` | `item: T` | `Promise<R>`    | Adds to `tasks`. Starts timer if needed. Throws `QueueFullError`. |
| `clear`   | `void`    | `void`          | Rejects all pending promises with "Queue cleared". Resets state.  |
| `flush`   | `void`    | `Promise<void>` | Forces immediate processing of current tasks.                     |
| `size`    | `void`    | `number`        | Returns current task count.                                       |

### Configuration Options (`BatchedQueueOptions`)

| Option          | Default               | Description                                |
| :-------------- | :-------------------- | :----------------------------------------- |
| `maxBatchSize`  | 10                    | Triggers processing when reached.          |
| `maxWaitMs`     | 1000                  | Triggers processing after delay.           |
| `maxQueueSize`  | 1000                  | Hard limit on pending items.               |
| `errorHandling` | `'continue'`          | `'continue'`, `'fail-fast'`, or `'retry'`. |
| `retryConfig`   | `{ retries: 3, ... }` | Controls exponential backoff.              |

## Behavior Notes & Edge Cases

1.  **Result Mapping:** The processor must return an array of results `R[]` exactly matching the length/order of the input batch `T[]`.
    - _Risk:_ If the processor returns fewer results than inputs, the queue rejects the "orphaned" promises with "Processor returned fewer results than expected".
    - _Risk:_ If the processor returns _more_ results, they are ignored.
2.  **Timer Management:** The timer is self-clearing. Calling `enqueue` resets the timer logic only if it wasn't already running.
3.  **Concurrency:** `processBatch` is locked. If `enqueue` triggers a batch while another is processing, the new batch waits until the next event loop tick (effectively).
4.  **Memory:** Uses an unbounded array `tasks` up to `maxQueueSize`. Each task holds a closure over `item` and `DeferredPromise`.

## Observed Limitations / Flaws (For Audit)

- **Result Correlation:** Reliance on array index alignment (Input[i] -> Output[i]) is fragile. If one item fails inside the batch processor but others succeed, the whole batch might be mis-mapped or rejected entirely depending on the processor implementation.
- **Retry Granularity:** Retries happen at the _Batch_ level. If one bad apple causes the batch to fail, the whole batch is retried (potentially causing side effects for the good apples if the processor isn't idempotent).
- **Error Propagation:** If `errorHandling` is `'continue'`, a batch failure rejects all promises in that batch with the _same_ error object.

## Usage Example

```typescript
const queue = new BatchedQueue(
  async (ids: string[]) => {
    // Bulk fetch from DB
    return db.users.findMany({ where: { id: { in: ids } } });
  },
  { maxBatchSize: 50, maxWaitMs: 200 },
);

// Usage
const user = await queue.enqueue('user-123');
```
