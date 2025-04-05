# 🧩 Test Mocks and Utilities

## 📋 Overview

This directory contains mock implementations, test fixtures, and utility functions that facilitate effective testing across the codebase. These mocks help isolate components during testing by providing controlled alternatives to external dependencies.

## 📦 Available Mocks

| Mock                                        | Description                                      | Usage                                     |
| ------------------------------------------- | ------------------------------------------------ | ----------------------------------------- |
| [`MockDatabase`](./MockDatabase.ts)         | In-memory database implementation                | Database testing without real DB          |
| [`MockLogger`](./MockLogger.ts)             | Logger that captures log entries                 | Testing log output without side effects   |
| [`MockAuthService`](./MockAuthService.ts)   | Authentication service with predefined responses | Testing auth-dependent components         |
| [`MockHttpClient`](./MockHttpClient.ts)     | HTTP client that returns controlled responses    | Testing API clients without network calls |
| [`MockCacheService`](./MockCacheService.ts) | In-memory cache implementation                   | Testing cache interactions                |
| [`MockEventEmitter`](./MockEventEmitter.ts) | Event emitter that tracks events                 | Testing event-based systems               |

## 🛠️ Test Utilities

| Utility                                     | Description                              | Usage                                   |
| ------------------------------------------- | ---------------------------------------- | --------------------------------------- |
| [`TestFactory`](./TestFactory.ts)           | Creates test objects with default values | Generating test data consistently       |
| [`RequestContext`](./RequestContext.ts)     | Simulates Express request context        | Testing middleware and request handlers |
| [`TestServer`](./TestServer.ts)             | Configured Express server for testing    | API and integration testing             |
| [`ApiTestClient`](./ApiTestClient.ts)       | Simplified client for API tests          | Making test requests to endpoints       |
| [`WaitForCondition`](./WaitForCondition.ts) | Utilities for async testing              | Testing time-dependent operations       |

## 🔧 Using Mocks in Tests

### Mock Database Example

The `MockDatabase` provides an in-memory implementation that mimics the behavior of a real database:

```typescript
import { MockDatabase } from "../mocks/MockDatabase";
import { UserRepository } from "@/server/repositories/UserRepository";

describe("UserRepository", () => {
  let mockDb: MockDatabase;
  let userRepo: UserRepository;

  beforeEach(() => {
    // Create a fresh database for each test
    mockDb = new MockDatabase();

    // Seed with test data
    mockDb.seed("users", [
      { id: "user1", username: "testuser1", email: "test1@example.com" },
      { id: "user2", username: "testuser2", email: "test2@example.com" },
    ]);

    // Initialize the repository with the mock
    userRepo = new UserRepository(mockDb);
  });

  it("should find a user by username", async () => {
    const user = await userRepo.findByUsername("testuser1");
    expect(user).toBeDefined();
    expect(user.id).toBe("user1");
    expect(user.email).toBe("test1@example.com");
  });

  it("should create a new user", async () => {
    const newUser = {
      username: "newuser",
      email: "new@example.com",
    };

    const createdUser = await userRepo.create(newUser);
    expect(createdUser.id).toBeDefined();

    // Verify the user was added to the database
    const users = await mockDb.findAll("users");
    expect(users.length).toBe(3); // 2 initial + 1 new
  });
});
```

### Mock HTTP Client Example

The `MockHttpClient` allows testing API clients without making real network requests:

```typescript
import { MockHttpClient } from "../mocks/MockHttpClient";
import { WeatherService } from "@/server/services/WeatherService";

describe("WeatherService", () => {
  let mockHttpClient: MockHttpClient;
  let weatherService: WeatherService;

  beforeEach(() => {
    mockHttpClient = new MockHttpClient();
    weatherService = new WeatherService(mockHttpClient);
  });

  it("should fetch current weather", async () => {
    // Configure the mock to return a specific response
    mockHttpClient.mockResponse("/api/weather", {
      status: 200,
      data: {
        location: "New York",
        temperature: 72,
        conditions: "Sunny",
      },
    });

    const weather = await weatherService.getCurrentWeather("New York");

    // Verify the result
    expect(weather.temperature).toBe(72);
    expect(weather.conditions).toBe("Sunny");

    // Verify the correct URL was called
    expect(mockHttpClient.getLastUrl()).toBe(
      "/api/weather?location=New%20York",
    );
  });

  it("should handle API errors", async () => {
    // Configure the mock to return an error
    mockHttpClient.mockError("/api/weather", "Service unavailable", 503);

    // Expect the service to handle the error
    await expect(weatherService.getCurrentWeather("New York")).rejects.toThrow(
      "Weather service unavailable",
    );
  });
});
```

## 📊 Test Factory Example

The `TestFactory` provides consistent test data generation:

```typescript
import { TestFactory } from '../mocks/TestFactory';

describe('UserProfileComponent', () => {
  it('should display user information', () => {
    // Generate a test user with default values
    const user = TestFactory.createUser();

    // Or with specific overrides
    const adminUser = TestFactory.createUser({
      role: 'admin',
      permissions: ['read', 'write', 'delete']
    });

    // Create a full user profile
    const profile = TestFactory.createUserProfile({
      user: adminUser,
      preferences: {
        theme: 'dark',
        notifications: true
      }
    });

    // Use in component tests
    render(<UserProfileComponent user={profile} />);
    // ...
  });
});
```

## 🔄 Extending Mocks

### Adding a New Mock

To add a new mock:

1. Create a new file following the naming pattern `Mock[ServiceName].ts`
2. Implement the same interface as the real service
3. Add control methods to configure the mock's behavior
4. Document the mock in this README

Example of a new mock implementation:

```typescript
import { INotificationService } from "@/server/interfaces/INotificationService";

/**
 * Mock implementation of the NotificationService for testing
 */
export class MockNotificationService implements INotificationService {
  private sentNotifications: Array<{ userId: string; message: string }> = [];
  private shouldFail: boolean = false;

  /**
   * Records a notification without actually sending it
   */
  async sendNotification(userId: string, message: string): Promise<boolean> {
    if (this.shouldFail) {
      throw new Error("Failed to send notification");
    }

    this.sentNotifications.push({ userId, message });
    return true;
  }

  /**
   * Configure the mock to simulate failures
   */
  setShouldFail(shouldFail: boolean): void {
    this.shouldFail = shouldFail;
  }

  /**
   * Get all notifications that would have been sent
   */
  getSentNotifications(): Array<{ userId: string; message: string }> {
    return [...this.sentNotifications];
  }

  /**
   * Clear recorded notifications
   */
  reset(): void {
    this.sentNotifications = [];
    this.shouldFail = false;
  }
}
```

## 🚫 Best Practices

1. **Reset State**: Always reset mock state between tests to avoid test interdependence
2. **Match Interfaces**: Ensure mocks implement the same interface as the real service
3. **Provide Control**: Add methods to configure mock behavior for different test scenarios
4. **Verify Interactions**: Include methods to verify how the mock was used
5. **Keep It Simple**: Avoid complex logic in mocks that could introduce bugs
6. **Document Behavior**: Comment any differences from the real implementation

## 📚 Further Resources

- [Vitest Mocking Documentation](https://vitest.dev/guide/mocking.html)
- [Test Double Patterns](https://martinfowler.com/bliki/TestDouble.html)
- [Server Tests Documentation](../server/README.md)
