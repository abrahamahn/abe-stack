# 🧪 Application Lifecycle Unit Tests

## 📋 Overview

This directory contains unit tests for the application lifecycle management components. The tests validate the framework's ability to properly initialize, manage runtime, and perform graceful shutdown of application components.

## 🧩 Test Files

| File                                                             | Description                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| [ApplicationLifecycle.test.ts](./ApplicationLifecycle.test.ts)   | Tests the main lifecycle service implementation       |
| [IApplicationLifecycle.test.ts](./IApplicationLifecycle.test.ts) | Tests the lifecycle service interface contract        |
| [sleep.test.ts](./sleep.test.ts)                                 | Tests the sleep utility function for pause operations |

## 🔍 Key Test Scenarios

### Startup Management

- Hook registration and execution
- Dependency order validation
- Conditional initialization
- Timeout handling
- Error handling during startup

### Shutdown Management

- Graceful shutdown process
- Resource cleanup
- Shutdown timeout enforcement
- Service termination order
- Error handling during shutdown

### Health Checking

- Component health validation
- Periodic health checking
- Degraded state detection
- Recovery mechanisms
- Health aggregation

### Error Recovery

- Self-healing behaviors
- Restart strategies
- Circuit breaker patterns
- Partial startup handling
- Dependency failure isolation

## 🔧 Test Implementation Details

### Mocks and Stubs

- Mock services with lifecycle hooks
- Timing control
- Process signal mocks

### Common Patterns

```typescript
// Example pattern for testing ordered startup
it("should execute startup hooks in dependency order", async () => {
  // Arrange
  const executionOrder: string[] = [];
  const lifecycle = new ApplicationLifecycle();

  // Register hooks with dependencies
  lifecycle.addStartupHook("database", async () => {
    executionOrder.push("database");
  });

  lifecycle.addStartupHook(
    "api",
    async () => {
      executionOrder.push("api");
    },
    ["database"],
  ); // Depends on database

  lifecycle.addStartupHook("cache", async () => {
    executionOrder.push("cache");
  });

  lifecycle.addStartupHook(
    "jobs",
    async () => {
      executionOrder.push("jobs");
    },
    ["database", "cache"],
  ); // Depends on database and cache

  // Act
  await lifecycle.startup();

  // Assert - check dependency order
  // database & cache can be in any order (no dependencies between them)
  // api must be after database
  // jobs must be after both database and cache
  expect(executionOrder.indexOf("database")).toBeLessThan(
    executionOrder.indexOf("api"),
  );
  expect(executionOrder.indexOf("database")).toBeLessThan(
    executionOrder.indexOf("jobs"),
  );
  expect(executionOrder.indexOf("cache")).toBeLessThan(
    executionOrder.indexOf("jobs"),
  );
});
```

## 📚 Advanced Testing Techniques

### Signal Handling Testing

- SIGTERM signal testing
- SIGINT signal testing
- Custom signal handling

### State Transition Testing

- Testing state transitions (starting → started → stopping → stopped)
- Invalid state transition prevention
- Concurrent state change handling

### Timeout Testing

- Startup timeout testing
- Shutdown timeout testing
- Long-running hook handling

## 🔗 Related Components

- [Logging](../logging/README.md) - For lifecycle event logging
- [Errors](../errors/README.md) - For lifecycle error handling
- [Server](../server/README.md) - For HTTP server lifecycle integration
