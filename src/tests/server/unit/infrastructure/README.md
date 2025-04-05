# 🧪 Infrastructure Unit Tests

## 📋 Purpose

The infrastructure unit tests provide a comprehensive validation suite for individual components within the infrastructure layer, ensuring:

- Each component behaves correctly in isolation
- Methods implement their contracts properly
- Edge cases are handled appropriately
- Type interfaces are correctly implemented
- Error handling works as expected

These unit tests complement the integration tests by focusing on isolating each component and testing its behavior independently of other components.

## 🧩 Test Organization

The unit tests are organized into folders mirroring the infrastructure components:

| Folder                             | Component Tested      | Key Aspects                                    |
| ---------------------------------- | --------------------- | ---------------------------------------------- |
| [`cache/`](#cache-tests)           | Caching System        | In-memory storage, expiration, retrieval       |
| [`config/`](#config-tests)         | Configuration         | Environment variables, validation, schemas     |
| [`database/`](#database-tests)     | Database              | Connections, queries, migrations, transactions |
| [`di/`](#di-tests)                 | Dependency Injection  | Container, bindings, resolution                |
| [`errors/`](#errors-tests)         | Error Handling        | Error classes, handlers, serialization         |
| [`files/`](#files-tests)           | File Utilities        | Path handling, file operations                 |
| [`jobs/`](#jobs-tests)             | Background Jobs       | Scheduling, execution, persistence             |
| [`lifecycle/`](#lifecycle-tests)   | Application Lifecycle | Hooks, startup, shutdown                       |
| [`logging/`](#logging-tests)       | Logging               | Log levels, formatting, transports             |
| [`middleware/`](#middleware-tests) | Express Middleware    | Request handling, validation                   |
| [`processor/`](#processor-tests)   | Media Processing      | Image, video, and stream processing            |
| [`promises/`](#promises-tests)     | Promise Utilities     | Deferred promises, async patterns              |
| [`pubsub/`](#pubsub-tests)         | Pub/Sub System        | WebSockets, message delivery                   |
| [`queue/`](#queue-tests)           | Queue Management      | Batched operations, prioritization             |
| [`security/`](#security-tests)     | Security              | Authentication, hashing, encryption            |
| [`server/`](#server-tests)         | HTTP Server           | Request handling, middleware, routing          |
| [`storage/`](#storage-tests)       | Storage System        | File storage, providers, metadata              |
| [`utils/`](#utils-tests)           | Utilities             | Helper functions, common utilities             |

## 🔍 Unit Testing Approach

### Test Isolation

Each component is tested in isolation with:

- Mocked dependencies
- Stubbed external systems
- In-memory implementations where applicable
- Dependency injection for easier mocking

### Testing Patterns

The unit tests follow common patterns:

1. **Arrange**: Set up the component and its dependencies
2. **Act**: Invoke the method or functionality being tested
3. **Assert**: Verify the expected outcome

### Mock Objects

Tests use a combination of:

- Hand-written mocks for simple dependencies
- Jest mock functions for tracking calls
- TypeMoq for complex mocking scenarios
- Mock implementations of interfaces

## 📚 Detailed Test Documentation

<a id="cache-tests"></a>

### Cache Tests (`cache/`)

Tests for the caching system, focusing on:

- **CacheService.test.ts**: Implementation of the cache service
- **ICacheService.test.ts**: Interface contract testing
- **startupHooks.test.ts**: Cache initialization during application startup

Key testing scenarios:

- Setting and retrieving cached values
- TTL (Time-To-Live) handling
- Cache eviction and memory management
- Serialization/deserialization of complex objects
- Concurrency handling

<a id="config-tests"></a>

### Config Tests (`config/`)

Tests for configuration management, including:

- **ConfigService.test.ts**: Service implementation tests
- **ConfigSchema.test.ts**: Schema validation tests
- **environments.test.ts**: Environment-specific configuration
- **IConfigService.test.ts**: Interface contract testing
- **LoggingConfig.test.ts**: Logging-specific configuration
- **domain/**: Domain-specific configuration tests
- **secrets/**: Secret management tests

Key testing scenarios:

- Loading environment variables
- Schema validation
- Type conversions
- Default values
- Secret handling
- Environment overrides

<a id="database-tests"></a>

### Database Tests (`database/`)

Tests for database functionality:

- **DatabaseServer.test.ts**: Core database server implementation
- **IDatabaseServer.test.ts**: Interface contract testing
- **MigrationManager.test.ts**: Database migration functionality
- **migrationConfig.test.ts**: Migration configuration
- **migrationAuth.test.ts**: Authentication for migrations
- **TransactionService.test.ts**: Transaction management

Key testing scenarios:

- Connection management
- Query execution
- Transaction handling
- Migration processing
- Error recovery
- Connection pooling

<a id="di-tests"></a>

### Dependency Injection Tests (`di/`)

Tests for the dependency injection system:

- **container.test.ts**: DI container implementation
- **types.test.ts**: Type token definitions

Key testing scenarios:

- Service registration
- Service resolution
- Singleton scoping
- Factory registrations
- Circular dependency detection
- Type token uniqueness

<a id="errors-tests"></a>

### Error Tests (`errors/`)

Tests for error handling components:

- **AppError.test.ts**: Base error class
- **ServiceError.test.ts**: Service-level errors
- **TechnicalError.test.ts**: Technical/infrastructure errors
- **ErrorHandler.test.ts**: Error handling service
- **IErrorHandler.test.ts**: Interface contract testing
- **technical/**: Technical error types
- **modules/**: Module-specific errors
- **infrastructure/**: Infrastructure-specific errors

Key testing scenarios:

- Error hierarchy
- Error serialization
- HTTP status code mapping
- Error context preservation
- Localized error messages
- Global error handling

<a id="files-tests"></a>

### Files Tests (`files/`)

Tests for file system utilities:

- **fileHelpers.test.ts**: File operation helpers
- **pathHelpers.test.ts**: Path manipulation utilities

Key testing scenarios:

- File existence checking
- Directory creation
- Path normalization
- Filename sanitization
- File reading/writing
- MIME type detection

<a id="jobs-tests"></a>

### Jobs Tests (`jobs/`)

Tests for the background job system:

- **JobService.test.ts**: Job service implementation
- **IJobService.test.ts**: Interface contract testing
- **JobTypes.test.ts**: Job type definitions
- **storage/**: Job persistence tests

Key testing scenarios:

- Job scheduling
- Job execution
- Error handling and retries
- Concurrent job processing
- Delayed execution
- Persistent jobs

<a id="lifecycle-tests"></a>

### Lifecycle Tests (`lifecycle/`)

Tests for application lifecycle management:

- **ApplicationLifecycle.test.ts**: Main lifecycle implementation
- **IApplicationLifecycle.test.ts**: Interface contract testing
- **sleep.test.ts**: Utility for pausing execution

Key testing scenarios:

- Startup hook registration and execution
- Shutdown hook registration and execution
- Dependency ordering
- Health checks
- Error handling during startup/shutdown
- Timeout handling

<a id="logging-tests"></a>

### Logging Tests (`logging/`)

Tests for the logging system:

- **LoggerService.test.ts**: Main logger service
- **ILoggerService.test.ts**: Interface contract testing
- **ServerLogger.test.ts**: HTTP request logging
- **ConsoleTransport.test.ts**: Console output transport

Key testing scenarios:

- Log level filtering
- Structured logging
- Context preservation
- Format customization
- Transport management
- Performance logging

<a id="middleware-tests"></a>

### Middleware Tests (`middleware/`)

Tests for Express middleware components:

- **validationMiddleware.test.ts**: Request validation middleware
- **rateLimitMiddleware.test.ts**: Rate limiting middleware

Key testing scenarios:

- Request validation
- Rate limiting
- Error handling
- Request modification
- Response modification
- Middleware chaining

<a id="processor-tests"></a>

### Processor Tests (`processor/`)

Tests for media processing components:

- **ImageProcessor.test.ts**: Image manipulation
- **MediaProcessor.test.ts**: General media processing
- **StreamProcessor.test.ts**: Streaming data processing

Key testing scenarios:

- Image resizing and transformation
- Format conversion
- Metadata extraction
- Stream processing
- Error handling
- Resource management

<a id="promises-tests"></a>

### Promises Tests (`promises/`)

Tests for promise utilities:

- **DeferredPromise.test.ts**: Deferred promise implementation

Key testing scenarios:

- External resolution/rejection
- Timeout handling
- Promise chaining
- Error propagation
- State management
- Cancellation

<a id="pubsub-tests"></a>

### PubSub Tests (`pubsub/`)

Tests for the publish-subscribe system:

- **WebSocketService.test.ts**: WebSocket server implementation
- **IWebSocketService.test.ts**: Interface contract testing
- **PubSubTypes.test.ts**: Type definitions for pub/sub
- **WebSocketTypes.test.ts**: WebSocket-specific types

Key testing scenarios:

- Connection management
- Message publishing
- Subscription handling
- Authentication/authorization
- Error handling
- Reconnection logic

<a id="queue-tests"></a>

### Queue Tests (`queue/`)

Tests for the queue management system:

- **BatchedQueue.test.ts**: Batched processing queue

Key testing scenarios:

- Item queuing
- Batch processing
- Priority handling
- Concurrency control
- Error handling and retries
- Queue draining

<a id="security-tests"></a>

### Security Tests (`security/`)

Tests for security components:

- **authHelpers.test.ts**: Authentication helpers
- **securityHelpers.test.ts**: General security utilities
- **signatureHelpers.test.ts**: Digital signature functionality

Key testing scenarios:

- Password hashing and verification
- Token generation and validation
- Encryption/decryption
- Signature creation and verification
- Input sanitization
- Authorization checks

<a id="server-tests"></a>

### Server Tests (`server/`)

Tests for the HTTP server:

- **ServerManager.test.ts**: HTTP server management

Key testing scenarios:

- Server initialization
- Request handling
- Middleware registration
- Error handling
- Graceful shutdown
- Health checks

<a id="storage-tests"></a>

### Storage Tests (`storage/`)

Tests for the storage system:

- **StorageService.test.ts**: Main storage service
- **LocalStorageProvider.test.ts**: File system storage implementation
- **IStorageProvider.test.ts**: Interface contract testing
- **StorageTypes.test.ts**: Type definitions
- **ContentTypes.test.ts**: MIME type handling
- **FileUtils.test.ts**: File utility helpers

Key testing scenarios:

- File storage and retrieval
- Metadata handling
- Provider management
- Stream handling
- Content type validation
- Path management

<a id="utils-tests"></a>

### Utils Tests (`utils/`)

Tests for general utility functions:

- **randomId.test.ts**: Random identifier generation
- **dateHelpers.test.ts**: Date manipulation utilities
- **shallowEqual.test.ts**: Object comparison

Key testing scenarios:

- Random ID generation
- Date formatting and parsing
- Object equality comparison
- Type conversion
- String manipulation
- Common utility operations

## 🛠️ Running the Tests

### Command Line

Run all unit tests:

```bash
npm run test:unit
```

Run specific test folder:

```bash
npm run test:unit -- infrastructure/cache
```

Run with specific pattern:

```bash
npm run test:unit -- -t "should expire cache items"
```

### Jest Configuration

The tests use Jest with:

- TypeScript support
- Mock timers for testing time-dependent code
- Snapshot testing for complex objects
- Code coverage reporting

## 🔍 Writing New Tests

When writing new unit tests:

1. **Test Organization**: Place tests in the corresponding subfolder
2. **Naming Convention**: Use `ComponentName.test.ts` format
3. **Mock Dependencies**: Isolate the component under test
4. **Complete Coverage**: Test all public methods and edge cases
5. **Test Independence**: Ensure tests can run in any order
6. **Setup/Teardown**: Clean up resources in `afterEach`/`afterAll`

Example test structure:

```typescript
import { CacheService } from "@/server/infrastructure/cache";
import { MockLogger } from "../../mocks";

describe("CacheService", () => {
  let cacheService: CacheService;
  let mockLogger: MockLogger;

  beforeEach(() => {
    // Set up mocks
    mockLogger = new MockLogger();

    // Create the component under test
    cacheService = new CacheService({ logger: mockLogger });
  });

  afterEach(() => {
    // Clean up
    cacheService.clear();
  });

  describe("set", () => {
    it("should store a value in the cache", async () => {
      // Arrange
      const key = "test-key";
      const value = { data: "test-value" };

      // Act
      await cacheService.set(key, value);

      // Assert
      const result = await cacheService.get(key);
      expect(result).toEqual(value);
    });

    // More tests...
  });

  // More method tests...
});
```
