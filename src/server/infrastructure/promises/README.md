# 🔄 Promises Utilities

## 📋 Purpose

The promises module provides enhanced utilities for working with JavaScript Promises, offering:

- Advanced control over promise resolution and rejection
- Deferred promise patterns for external resolution
- Promise extension capabilities
- Timeout and cancellation mechanisms
- Utilities for promise composition and manipulation
- Safe error handling patterns for asynchronous operations

This module extends the native Promise functionality to provide more robust and flexible asynchronous programming capabilities.

## 🧩 Key Components

### 1️⃣ Deferred Promise

- **`DeferredPromise`**: Implementation of the deferred pattern
- Provides external control over promise resolution/rejection
- Enables advanced promise manipulation scenarios

### 2️⃣ Module Exports

- **`index.ts`**: Exports promise utilities
- Provides easy access to promise-related functionality

## 🛠️ Usage Instructions

### Using Deferred Promises

```typescript
import { DeferredPromise } from "@/server/infrastructure/promises";

async function fetchWithTimeout(
  url: string,
  timeoutMs: number,
): Promise<Response> {
  // Create a deferred promise
  const deferred = new DeferredPromise<Response>();

  // Start the fetch
  fetch(url).then(deferred.resolve).catch(deferred.reject);

  // Set up timeout
  const timeoutId = setTimeout(() => {
    deferred.reject(new Error(`Request timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  // Wait for resolution or rejection
  try {
    const response = await deferred.promise;
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
```

### Implementing Cancellable Operations

```typescript
import { DeferredPromise } from "@/server/infrastructure/promises";

class CancellableOperation<T> {
  private deferred = new DeferredPromise<T>();
  private isCancelled = false;

  get promise(): Promise<T> {
    return this.deferred.promise;
  }

  cancel(reason = "Operation cancelled"): void {
    this.isCancelled = true;
    this.deferred.reject(new Error(reason));
  }

  async execute(operation: () => Promise<T>): Promise<T> {
    try {
      if (this.isCancelled) {
        throw new Error("Operation cancelled before execution");
      }

      const result = await operation();
      this.deferred.resolve(result);
      return result;
    } catch (error) {
      this.deferred.reject(error);
      throw error;
    }
  }
}

// Usage
async function longRunningTask(
  cancellable: CancellableOperation<string>,
): Promise<void> {
  await cancellable.execute(async () => {
    // Simulate long task
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return "Task completed successfully";
  });
}

// In client code
const operation = new CancellableOperation<string>();

// Start operation
longRunningTask(operation).catch((err) => {
  console.log("Task failed:", err.message);
});

// Later, cancel if needed
setTimeout(() => {
  operation.cancel("User aborted the operation");
}, 2000);

// Get the result (will reject if cancelled)
operation.promise
  .then((result) => console.log(result))
  .catch((err) => console.log("Operation failed:", err.message));
```

### Promise Queue

```typescript
import { DeferredPromise } from "@/server/infrastructure/promises";

class PromiseQueue {
  private queue: Array<() => Promise<any>> = [];
  private running = false;
  private concurrency: number;
  private activeCount = 0;

  constructor(concurrency = 1) {
    this.concurrency = concurrency;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    const deferred = new DeferredPromise<T>();

    this.queue.push(async () => {
      try {
        const result = await fn();
        deferred.resolve(result);
        return result;
      } catch (error) {
        deferred.reject(error);
        throw error;
      }
    });

    this.process();

    return deferred.promise;
  }

  private async process(): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;

    while (this.queue.length > 0 && this.activeCount < this.concurrency) {
      const task = this.queue.shift();

      if (!task) {
        continue;
      }

      this.activeCount++;

      task()
        .catch(() => {})
        .finally(() => {
          this.activeCount--;
          this.process();
        });
    }

    this.running = false;
  }
}

// Usage
const queue = new PromiseQueue(2); // Process 2 tasks concurrently

// Add multiple tasks to the queue
for (let i = 0; i < 5; i++) {
  queue
    .add(async () => {
      console.log(`Starting task ${i}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(`Completed task ${i}`);
      return i;
    })
    .then((result) => {
      console.log(`Got result: ${result}`);
    });
}
```

## 🏗️ Architecture Decisions

### Deferred Promise Pattern

- **Decision**: Implement deferred promises
- **Rationale**: Provides more control over promise lifecycle
- **Benefit**: Enables external resolution/rejection of promises

### Typed Promises

- **Decision**: Full TypeScript support for promises
- **Rationale**: Type safety for asynchronous operations
- **Implementation**: Generic type parameters for promise results

### Composition Over Inheritance

- **Decision**: Use composition instead of extending native Promise
- **Rationale**: Avoids issues with Promise subclassing
- **Implementation**: Wrapper classes with promise delegates

### Error Handling Emphasis

- **Decision**: Focus on robust error handling patterns
- **Rationale**: Asynchronous errors are common failure points
- **Benefit**: Prevents unhandled promise rejections

## ⚙️ Setup and Configuration Notes

### Basic Usage

To use the promise utilities in your code:

```typescript
import { DeferredPromise } from "@/server/infrastructure/promises";

// Create a deferred promise
const deferred = new DeferredPromise<YourResultType>();

// Use the promise
someAsyncOperation()
  .then((result) => {
    deferred.resolve(result);
  })
  .catch((error) => {
    deferred.reject(error);
  });

// Return the promise to callers
return deferred.promise;
```

### Debugging Promises

For better promise debugging:

```typescript
import { DeferredPromise } from "@/server/infrastructure/promises";
import { logger } from "@/server/infrastructure/logging";

// Create a promise with debugging
const deferred = new DeferredPromise<string>({
  debugLabel: "UserOperation",
  logUnhandledRejections: true,
  logger: logger,
});

// Promise will log if unhandled
deferred.promise.catch((error) => {
  // This prevents unhandled rejection warning
});
```

### Promise Extensions

Extended promise capabilities:

```typescript
import { DeferredPromise } from "@/server/infrastructure/promises";

// Create a promise with timeout
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  const deferred = new DeferredPromise<T>();

  const timeoutId = setTimeout(() => {
    deferred.reject(new Error(`Operation timed out after ${timeoutMs}ms`));
  }, timeoutMs);

  promise
    .then((result) => {
      clearTimeout(timeoutId);
      deferred.resolve(result);
    })
    .catch((error) => {
      clearTimeout(timeoutId);
      deferred.reject(error);
    });

  return deferred.promise;
};

// Usage
const result = await withTimeout(fetchData(), 5000);
```

### Error Handling Best Practices

Recommended error handling patterns:

```typescript
import { DeferredPromise } from "@/server/infrastructure/promises";
import { logger } from "@/server/infrastructure/logging";

async function safeAsyncOperation<T>(
  operation: () => Promise<T>,
): Promise<{ success: true; data: T } | { success: false; error: Error }> {
  try {
    const result = await operation();
    return { success: true, data: result };
  } catch (error) {
    logger.error("Async operation failed", { error });
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Usage
const result = await safeAsyncOperation(async () => {
  // Some async operation that might fail
  return await api.fetchData();
});

if (result.success) {
  // Use result.data safely
} else {
  // Handle error case
}
```
