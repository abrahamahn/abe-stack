# 🧪 Queue Unit Tests

## 📋 Overview

This directory contains unit tests for the queue management infrastructure components. The tests validate the functionality of queue implementations, including item queuing, batched processing, and priority handling.

## 🧩 Test Files

| File                                           | Description                                                                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------- |
| [BatchedQueue.test.ts](./BatchedQueue.test.ts) | Tests the batched queue implementation for efficient processing of multiple items |

## 🔍 Key Test Scenarios

### Queue Operations

- Item enqueuing
- Item dequeuing
- Queue length tracking
- Queue emptiness checking
- Queue clearing

### Batched Processing

- Batch size configuration
- Batch processing triggers
- Partial batch handling
- Batch timeout processing
- Batch aggregation

### Priority Handling

- Priority level assignment
- Priority-based dequeuing
- Priority inheritance
- Priority inversion prevention
- Default priority assignment

### Concurrency Management

- Concurrent enqueue operations
- Concurrent dequeue operations
- Thread safety
- Lock-free operations
- Atomic batch processing

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock queue items
- Mock processors
- Timing control
- Concurrency simulation

### Common Patterns

```typescript
// Example pattern for testing batched processing
it("should process items in batches of specified size", async () => {
  // Arrange
  const mockProcessor = jest.fn();
  const batchedQueue = new BatchedQueue({
    batchSize: 3,
    processor: mockProcessor,
  });

  // Act
  batchedQueue.enqueue("item1");
  batchedQueue.enqueue("item2");
  batchedQueue.enqueue("item3"); // This should trigger processing
  batchedQueue.enqueue("item4");
  batchedQueue.enqueue("item5");
  batchedQueue.enqueue("item6"); // This should trigger processing again

  // Allow async processing to complete
  await new Promise((resolve) => setTimeout(resolve, 10));

  // Assert
  expect(mockProcessor).toHaveBeenCalledTimes(2);
  expect(mockProcessor).toHaveBeenNthCalledWith(1, ["item1", "item2", "item3"]);
  expect(mockProcessor).toHaveBeenNthCalledWith(2, ["item4", "item5", "item6"]);
});
```

## 📚 Advanced Testing Techniques

### Performance Testing

- Queue throughput measurement
- Memory usage optimization
- Scaling behavior

### Error Handling

- Failed item processing
- Retry mechanisms
- Poison message handling
- Dead letter queues

### Persistence Testing

- Queue durability across restarts
- Persistent queue state
- Recovery from interruption
- Checkpoint management

## 🔗 Related Components

- [Jobs](../jobs/README.md) - For job scheduling
- [Processor](../processor/README.md) - For item processing
- [Promises](../promises/README.md) - For async queue operations
