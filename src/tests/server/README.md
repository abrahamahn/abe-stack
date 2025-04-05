# 🖥️ Server Tests

## 📋 Overview

This directory contains tests specifically for the server-side components of the application. The tests are organized by type (unit, integration, API) and by domain area, allowing for focused testing of specific functionality.

## 📂 Directory Structure

| Directory                                 | Description                                                |
| ----------------------------------------- | ---------------------------------------------------------- |
| [`unit/`](./unit/README.md)               | Unit tests for server-side components                      |
| [`integration/`](./integration/README.md) | Integration tests verifying interaction between components |
| [`api/`](./api/README.md)                 | API tests validating HTTP endpoints                        |

## 🔍 Test Types

### Unit Tests

Unit tests focus on testing individual functions, classes, and components in isolation. External dependencies are mocked to ensure focused testing of the unit's behavior.

```typescript
// Example of a unit test for a utility function
describe("formatDate", () => {
  it("should format a date in yyyy-mm-dd format", () => {
    const date = new Date("2023-05-15");
    expect(formatDate(date)).toBe("2023-05-15");
  });
});
```

### Integration Tests

Integration tests verify that different components work together correctly. These tests often use real implementations instead of mocks for some dependencies.

```typescript
// Example of an integration test for cache and database interaction
describe("CacheWithDatabase", () => {
  it("should retrieve data from cache if available", async () => {
    const dbService = new DatabaseService();
    const cacheService = new CacheService();
    const userService = new UserService(dbService, cacheService);

    // Test that user data is retrieved from cache
    await userService.getUserById("user-123");
    // Verify cache was used instead of database
  });
});
```

### API Tests

API tests validate HTTP endpoints, ensuring they return the expected responses, handle errors appropriately, and interact correctly with the rest of the system.

```typescript
// Example of an API test for a user endpoint
describe("GET /api/users/:id", () => {
  it("should return 200 and user data for valid ID", async () => {
    const response = await request(app).get("/api/users/valid-id");
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("username");
  });

  it("should return 404 for non-existent user", async () => {
    const response = await request(app).get("/api/users/non-existent");
    expect(response.status).toBe(404);
  });
});
```

## 🧪 Testing Infrastructure Components

For testing the server infrastructure components (like caching, database, logging), we follow these patterns:

1. **Direct Component Testing**: Testing the component's API in isolation
2. **Integration with Dependent Services**: Testing how components interact with others
3. **Error and Edge Case Handling**: Validating behavior under failure conditions

Example for testing a cache service:

```typescript
describe("CacheService", () => {
  let cacheService: CacheService;

  beforeEach(() => {
    cacheService = new CacheService();
  });

  it("should store and retrieve values", async () => {
    await cacheService.set("key1", "value1");
    const value = await cacheService.get("key1");
    expect(value).toBe("value1");
  });

  it("should return null for non-existent keys", async () => {
    const value = await cacheService.get("non-existent");
    expect(value).toBeNull();
  });

  it("should respect TTL settings", async () => {
    await cacheService.set("key1", "value1", { ttl: 50 });
    await new Promise((resolve) => setTimeout(resolve, 60));
    const value = await cacheService.get("key1");
    expect(value).toBeNull();
  });
});
```

## 🛠️ Test Utilities

We provide several utilities to make testing server components easier:

- [`MockDatabase`](../mocks/MockDatabase.ts): In-memory database for testing
- [`RequestContext`](../mocks/RequestContext.ts): Simulates Express request context
- [`TestServer`](../mocks/TestServer.ts): Creates a test server instance for API testing

Example usage:

```typescript
import { MockDatabase } from "../../mocks/MockDatabase";

describe("UserRepository", () => {
  let mockDb: MockDatabase;
  let userRepo: UserRepository;

  beforeEach(() => {
    mockDb = new MockDatabase();
    mockDb.seed("users", [{ id: "user1", username: "testuser" }]);

    userRepo = new UserRepository(mockDb);
  });

  it("should find a user by id", async () => {
    const user = await userRepo.findById("user1");
    expect(user).toBeDefined();
    expect(user.username).toBe("testuser");
  });
});
```

## 🏃‍♂️ Running Server Tests

```bash
# Run all server tests
npm run test:server

# Run specific server test types
npm run test:server:unit
npm run test:server:integration
npm run test:server:api

# Run tests for specific infrastructure components
npx vitest run src/tests/server/unit/infrastructure/cache
npx vitest run src/tests/server/integration/infrastructure/database
```

## 📚 Further Resources

- [Server Architecture Documentation](../../../server/README.md)
- [Test Mocks Guide](../mocks/README.md)
- [API Testing Best Practices](../../docs/api-testing.md)
