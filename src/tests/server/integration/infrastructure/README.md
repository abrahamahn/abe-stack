# 🧪 Infrastructure Integration Tests

## 📋 Purpose

The infrastructure integration tests validate the functionality and integration of core infrastructure components, ensuring:

- Components work correctly with their dependencies
- Modules function properly in real-world scenarios
- APIs behave according to their specifications
- Components handle edge cases and error conditions properly
- Integration points between modules work as expected

These tests serve as a critical quality assurance layer, verifying that the infrastructure components work correctly both individually and together.

## 🧩 Test Suite Organization

### Test Files Structure

Each infrastructure component has a dedicated test file:

| Test File            | Component Tested      | Key Areas Covered                                              |
| -------------------- | --------------------- | -------------------------------------------------------------- |
| `cache.test.ts`      | Cache Service         | Memory caching, distributed caching, expiration, serialization |
| `config.test.ts`     | Configuration         | Environment loading, validation, overrides, secrets            |
| `database.test.ts`   | Database Services     | Connections, queries, transactions, migrations                 |
| `di.test.ts`         | Dependency Injection  | Container registration, resolution, scoping, factories         |
| `errors.test.ts`     | Error Handling        | Custom errors, serialization, global handlers                  |
| `files.test.ts`      | File System           | File operations, path handling, metadata                       |
| `jobs.test.ts`       | Background Jobs       | Job scheduling, execution, retries, distribution               |
| `lifecycle.test.ts`  | Application Lifecycle | Startup, shutdown, hooks, health checks                        |
| `logging.test.ts`    | Logging               | Log levels, formatting, transports, contexts                   |
| `middleware.test.ts` | HTTP Middleware       | Request processing, validation, authentication                 |
| `processor.test.ts`  | Media Processing      | Image processing, video handling, transformations              |
| `promises.test.ts`   | Promise Utilities     | Deferred promises, batching, timeouts                          |
| `pubsub.test.ts`     | Pub/Sub System        | Message publishing, subscriptions, real-time events            |
| `queue.test.ts`      | Queue Management      | Batched processing, prioritization, retries                    |
| `security.test.ts`   | Security              | Authentication, encryption, signatures, hashing                |
| `server.test.ts`     | HTTP Server           | Request handling, routing, lifecycle                           |
| `storage.test.ts`    | Storage System        | File storage, retrieval, providers                             |

### Supporting Files

- `test_files/`: Contains test fixtures and sample files for testing
- `index.test.ts`: Tests for the main server entry point and initialization

## 🔍 Key Testing Approaches

### 1. Integration-Focused

These tests focus on the integration between components rather than isolated unit testing. They verify that:

- Components can be properly initialized with their dependencies
- Systems work together as expected
- Real-world scenarios are handled correctly

### 2. Environment Setup and Teardown

Each test suite includes:

- Proper setup of test environment before tests
- Cleanup of resources after tests complete
- Isolation between test cases to prevent interference

Example:

```typescript
describe("Database Service", () => {
  let dbService: DatabaseService;

  beforeAll(async () => {
    // Set up test database
    dbService = new DatabaseService({
      connectionString: TEST_DB_CONNECTION,
      poolSize: 5,
    });
    await dbService.connect();
    await dbService.migrate();
  });

  afterAll(async () => {
    // Clean up resources
    await dbService.disconnect();
  });

  // Individual test cases...
});
```

### 3. Mock Integration

Where appropriate, external dependencies are mocked while maintaining the real behavior of the component under test:

```typescript
describe("Storage Service with Mock Provider", () => {
  let storageService: StorageService;
  let mockProvider: MockStorageProvider;

  beforeEach(() => {
    // Create a mock provider that tracks calls but doesn't use real storage
    mockProvider = new MockStorageProvider();

    // Initialize the real service with the mock provider
    storageService = new StorageService({
      defaultProvider: mockProvider,
    });
  });

  it("should store files through the provider", async () => {
    const testData = Buffer.from("test content");
    await storageService.storeFile({
      content: testData,
      filename: "test.txt",
      contentType: "text/plain",
    });

    // Verify the provider was called correctly
    expect(mockProvider.storeFile).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: "test.txt",
        contentType: "text/plain",
      }),
    );
  });
});
```

### 4. Real-World Scenarios

Tests include real-world scenarios to validate component behavior:

```typescript
describe("Cache Service", () => {
  // ...

  it("should handle concurrent cache operations", async () => {
    const cacheService = new CacheService();

    // Perform concurrent operations
    const results = await Promise.all([
      cacheService.set("key1", "value1"),
      cacheService.set("key2", "value2"),
      cacheService.get("key1"),
      cacheService.delete("key1"),
      cacheService.has("key2"),
    ]);

    expect(results[2]).toBe("value1"); // get result
    expect(results[4]).toBe(true); // has result

    // Verify final state
    expect(await cacheService.has("key1")).toBe(false);
    expect(await cacheService.has("key2")).toBe(true);
  });
});
```

### 5. Error Conditions

Tests validate error handling and recovery:

```typescript
describe("Database Transaction Handling", () => {
  // ...

  it("should rollback transaction on error", async () => {
    // Start with clean state
    await db.users.deleteMany({});

    try {
      await db.transaction(async (tx) => {
        // First operation succeeds
        await tx.users.create({ name: "Test User" });

        // Second operation fails
        await tx.users.create(null); // This will throw
      });
    } catch (error) {
      // Expected to throw
    }

    // Verify transaction was rolled back
    const users = await db.users.findMany({});
    expect(users.length).toBe(0);
  });
});
```

## 📝 Test Case Examples

### Cache Integration Tests

```typescript
// cache.test.ts
describe("Cache Service Integration", () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService({
      defaultTtl: 60, // 60 seconds
    });
  });

  it("should store and retrieve values", async () => {
    await cacheService.set("testKey", { complex: "object" });
    const result = await cacheService.get("testKey");
    expect(result).toEqual({ complex: "object" });
  });

  it("should handle TTL expiration", async () => {
    await cacheService.set("expireKey", "value", 1); // 1 second TTL

    // Value should exist initially
    expect(await cacheService.has("expireKey")).toBe(true);

    // Wait for expiration
    await new Promise((resolve) => setTimeout(resolve, 1100));

    // Value should be gone after TTL
    expect(await cacheService.has("expireKey")).toBe(false);
  });

  // More test cases...
});
```

### PubSub Integration Tests

```typescript
// pubsub.test.ts
describe("WebSocket Service Integration", () => {
  let wsService: WebSocketService;
  let mockServer: any;
  let mockClient: any;

  beforeEach(async () => {
    // Set up a mock server
    mockServer = createMockServer();

    // Initialize the WebSocket service
    wsService = new WebSocketService({
      server: mockServer,
      path: "/ws",
    });

    await wsService.initialize();

    // Create a mock client
    mockClient = createMockWebSocketClient("ws://localhost/ws");
    await mockClient.connect();
  });

  afterEach(async () => {
    await mockClient.disconnect();
    await wsService.shutdown();
    mockServer.close();
  });

  it("should deliver messages to subscribers", async () => {
    // Set up a subscription
    await mockClient.subscribe("test-topic");

    // Create a promise to await the message
    const messagePromise = mockClient.waitForMessage();

    // Publish a message
    await wsService.publish("test-topic", { data: "test-message" });

    // Wait for and verify the message
    const receivedMessage = await messagePromise;
    expect(receivedMessage).toEqual({
      topic: "test-topic",
      data: { data: "test-message" },
    });
  });

  // More test cases...
});
```

## 🛠️ Running the Tests

### Command Line

Run all infrastructure integration tests:

```bash
npm run test:integration
```

Run specific test file:

```bash
npm run test:integration -- database.test.ts
```

Run with specific pattern:

```bash
npm run test:integration -- -t "should handle cache expiration"
```

### Test Environment

Tests use:

- In-memory databases where possible
- Local file system in temp directories
- Mocked external services
- Custom test configuration

### Configuration

Tests use a dedicated test configuration that's loaded from:

- Environment variables with `TEST_` prefix
- `.env.test` file
- Default test values in the test setup

## 📊 Test Coverage

Integration tests focus on achieving:

- High coverage of integration points
- Validation of primary user flows
- Testing of edge cases and error conditions
- Verification of performance characteristics

Coverage reports can be generated with:

```bash
npm run test:coverage
```

## 🔄 CI/CD Integration

These tests are run as part of the CI/CD pipeline:

- On every pull request
- Before deployment to staging
- As part of nightly builds

## 🧰 Test Utilities

Common test utilities:

- `TestUtils`: Helper functions for testing
- `MockFactory`: Creates mock implementations
- `TestFixtures`: Pre-defined test data
- `TestEnvironment`: Setup/teardown utilities

Example usage:

```typescript
import { TestUtils, MockFactory } from "../../test-utils";

describe("Database Tests", () => {
  const testDb = TestUtils.createTestDatabase();
  const mockLogger = MockFactory.createLogger();

  // Test cases...
});
```

## 🔍 Debugging Tests

When tests fail:

1. Check the detailed error output
2. Look for related error logs in the test output
3. Use the `--inspect` flag to debug with Chrome DevTools:
   ```bash
   node --inspect node_modules/.bin/jest --runInBand database.test.ts
   ```
4. Add more detailed logging with:
   ```typescript
   console.log(TestUtils.formatObject(result));
   ```
