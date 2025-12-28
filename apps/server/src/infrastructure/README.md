# 🏗️ ABE Stack Infrastructure Framework

## 📋 Overview

The ABE Stack infrastructure framework provides an enterprise-grade, modular foundation for building scalable server-side applications. Built with TypeScript and following clean architecture principles, it offers comprehensive solutions for cross-cutting concerns while maintaining high performance, testability, and maintainability.

## 🎯 Core Features

- **Enterprise Architecture**: Clean architecture with dependency injection and modular design
- **Comprehensive Infrastructure**: Complete solutions for caching, logging, security, job processing, and storage
- **Type Safety**: Full TypeScript support with strong typing throughout
- **Performance Optimized**: Advanced connection pooling, caching strategies, and resource management
- **Highly Testable**: Interface-based design with comprehensive mocking support
- **Production Ready**: Battle-tested patterns with extensive error handling and monitoring

## 🏗️ Architecture Overview

The infrastructure follows a layered, dependency-injected architecture:

```
┌─────────────────────────────────────┐
│        Application Layer            │ ← Business Logic Services
├─────────────────────────────────────┤
│      Infrastructure Layer           │ ← Cross-cutting Concerns
│  ┌─────────────┬─────────────────┐  │
│  │   Core      │   Components    │  │
│  │ - Config    │ - Database      │  │
│  │ - DI        │ - Cache         │  │
│  │ - Logging   │ - Storage       │  │
│  │ - Errors    │ - Security      │  │
│  │ - Lifecycle │ - Jobs          │  │
│  └─────────────┴─────────────────┘  │
└─────────────────────────────────────┘
```

## 🧩 Infrastructure Components

### 🔧 Core Foundation

#### **Configuration Management** (`config/`)
Advanced configuration system with multiple sources and validation:

```typescript
// Environment-based configuration with schema validation
const dbConfig = configService.getConfig('database', {
  host: { type: 'string', required: true },
  port: { type: 'number', default: 5432 },
  ssl: { type: 'boolean', default: false }
});

// Type-safe access with defaults
const port = configService.getNumber('PORT', 8080);
const features = configService.getArray('ENABLED_FEATURES');
```

**Features:**
- Multi-environment support (`.env.{environment}` files)
- Schema validation with Joi
- Secret management with pluggable providers
- Hot reloading with change notifications
- Type-safe configuration access

#### **Dependency Injection** (`di/`)
Inversify-based DI container with advanced features:

```typescript
// Service registration with interfaces
container.bind<IUserService>(TYPES.UserService).to(UserService);
container.bind<IUserRepository>(TYPES.UserRepository).to(UserRepository);

// Constructor injection with decorators
@injectable()
export class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: IUserRepository,
    @inject(TYPES.LoggerService) private logger: ILoggerService
  ) {}
}
```

**Features:**
- Symbol-based type identifiers for type safety
- Singleton and transient scoping
- Interface-based service contracts
- Factory methods and lazy initialization
- Hierarchical container support

#### **Logging Infrastructure** (`logging/`)
Structured logging with context propagation:

```typescript
// Hierarchical logger creation with context inheritance
const userLogger = logger.createLogger('UserService');
const paymentLogger = userLogger.createLogger('PaymentProcessor');

// Rich metadata logging with correlation IDs
logger.info('Payment processed', {
  userId: user.id,
  amount: payment.amount,
  correlationId: req.correlationId,
  duration: performance.now() - startTime
});
```

**Features:**
- JSON-structured logging with metadata
- Context inheritance and correlation ID tracking
- Multiple transport support (console, file, external)
- Performance timing with built-in metrics
- Configurable log levels and filtering

#### **Error Handling** (`errors/`)
Comprehensive error management with structured error types:

```typescript
// Hierarchical error types with context
throw new ValidationError('Invalid email format', {
  field: 'email',
  value: userInput.email,
  constraints: ['email', 'required']
});

// Global error handling with correlation
GlobalErrorHandler.register(logger);
```

**Features:**
- Hierarchical error class system
- Structured error metadata
- Global uncaught exception handling
- HTTP status code mapping
- Error correlation and tracking

### 💾 Data & Storage Systems

#### **Database Layer** (`database/`)
Advanced PostgreSQL integration with enterprise features:

```typescript
// Connection pooling with health monitoring
const dbServer = new DatabaseServer({
  host: 'localhost',
  port: 5432,
  database: 'abe_stack',
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000
  }
});

// Transaction support with retry logic
await dbServer.transaction(async (client) => {
  await client.query('INSERT INTO users VALUES ($1, $2)', [id, name]);
  await client.query('INSERT INTO profiles VALUES ($1, $2)', [userId, data]);
}, { retryOnSerializationFailure: true });
```

**Features:**
- Advanced connection pooling with metrics
- Transaction management with retry logic
- Query performance monitoring
- Health checks and diagnostics
- Migration system support

#### **Caching Layer** (`cache/`)
Multi-level caching with Redis and in-memory fallback:

```typescript
// Redis with in-memory fallback
const cache = new RedisCacheService({
  host: 'localhost',
  port: 6379,
  fallback: new MemoryCacheService()
});

// Function memoization with TTL
const memoizedFunction = cache.memoize(expensiveOperation, {
  ttl: 300, // 5 minutes
  keyGenerator: (args) => `operation:${args.id}`
});

// Statistics and monitoring
const stats = cache.getStatistics(); // { hits, misses, hitRatio }
```

**Features:**
- Multiple cache backends (Redis, in-memory)
- Function memoization with custom key generation
- TTL management with background cleanup
- Hit/miss statistics and performance metrics
- Batch operations for performance

#### **Storage Infrastructure** (`storage/`)
Pluggable storage with provider pattern:

```typescript
// Local storage with automatic directory creation
const storage = new LocalStorageProvider({
  basePath: './storage',
  baseUrl: 'https://api.example.com/files',
  tempDir: './temp'
});

// File operations with metadata extraction
const result = await storage.save({
  file: uploadedFile,
  path: 'users/avatars',
  options: {
    generateThumbnail: true,
    extractMetadata: true
  }
});
```

**Features:**
- Provider pattern for multiple backends (local, cloud)
- Automatic metadata extraction
- Streaming support for large files
- Secure URL generation
- Directory management and cleanup

### 🔒 Security & Authentication

#### **Security Infrastructure** (`security/`)
Comprehensive security toolkit:

```typescript
// JWT token management with refresh
const tokenManager = new TokenManager({
  accessTokenTTL: '15m',
  refreshTokenTTL: '7d',
  algorithm: 'HS256'
});

// Password security with strength validation
const hashedPassword = await passwordService.hash(plainPassword);
const isValid = await passwordService.verify(plainPassword, hashedPassword);

// CSRF protection with configurable options
app.use(csrfMiddleware({
  secretKey: Buffer.from(process.env.CSRF_SECRET, 'hex'),
  cookieName: 'csrf-token',
  headerName: 'X-CSRF-Token'
}));
```

**Features:**
- JWT access/refresh token management with blacklisting
- Password hashing with bcrypt and strength validation
- CSRF protection with token-based validation
- Rate limiting with configurable strategies
- Input validation and sanitization
- AES encryption for sensitive data

### ⚡ Processing & Background Jobs

#### **Job Processing System** (`jobs/`)
Enterprise job queue with persistence and monitoring:

```typescript
// Job submission with priority and retry options
await jobService.submit({
  type: 'email-notification',
  data: { userId, templateId, variables },
  priority: JobPriority.HIGH,
  retryOptions: {
    maxAttempts: 3,
    backoffStrategy: 'exponential'
  }
});

// Job processor with concurrency control
const processor = new EmailJobProcessor();
await processor.start({ concurrency: 5 });
```

**Features:**
- Priority-based job scheduling
- Exponential backoff retry logic
- Configurable worker concurrency
- Job dependency management
- Persistent storage with recovery
- Real-time monitoring and metrics

#### **Media Processing** (`processor/`)
Advanced media and stream processing:

```typescript
// Image processing pipeline
const processor = new MediaProcessor();
await processor.processImage({
  inputPath: 'uploads/original.jpg',
  operations: [
    { type: 'resize', width: 800, height: 600 },
    { type: 'optimize', quality: 85 },
    { type: 'watermark', position: 'bottom-right' }
  ],
  outputPath: 'processed/thumbnail.jpg'
});
```

**Features:**
- Image/video processing with FFmpeg
- Stream-based processing pipelines
- Batch processing utilities
- Format conversion and optimization
- Watermarking and effects

### 🌐 Communication & Messaging

#### **Pub/Sub System** (`pubsub/`)
Real-time messaging with WebSocket support:

```typescript
// WebSocket server with topic-based messaging
const pubsub = new WebSocketPubSubService();
await pubsub.start({ port: 8081 });

// Publishing to topics
await pubsub.publish('user.notifications', {
  userId: user.id,
  type: 'message',
  data: { from: sender.id, message: content }
});

// Subscribing to topics
pubsub.subscribe('user.notifications', (message) => {
  // Handle real-time notification
});
```

**Features:**
- WebSocket-based real-time communication
- Topic-based message routing
- Client connection management
- Message persistence and replay
- Scalable pub/sub architecture

#### **Queue System** (`queue/`)
Efficient batch processing and task queuing:

```typescript
// Batch processing with rate limiting
const queue = new BatchQueue({
  batchSize: 100,
  flushInterval: 5000,
  maxConcurrent: 3
});

queue.add({ type: 'email', recipient: user.email, template: 'welcome' });
queue.add({ type: 'analytics', event: 'user_registered', userId: user.id });
```

**Features:**
- Batched operation queuing
- Rate limiting and throttling
- Priority queuing
- Error handling with retries
- Memory-efficient processing

## 🚀 Quick Start

### Basic Application Setup

```typescript
import { container } from '@/server/infrastructure/di';
import { TYPES } from '@/server/infrastructure/di/types';

// 1. Initialize core services
const configService = new ConfigService();
const logger = new LoggerService();
const dbServer = new DatabaseServer(configService, logger);

// 2. Register with DI container
container.bind(TYPES.ConfigService).toConstantValue(configService);
container.bind(TYPES.LoggerService).toConstantValue(logger);
container.bind(TYPES.DatabaseServer).toConstantValue(dbServer);

// 3. Start application lifecycle
const lifecycle = new ApplicationLifecycle();

lifecycle.registerStartupHook('database', async () => {
  await dbServer.initialize();
}, []);

lifecycle.registerStartupHook('server', async () => {
  const server = container.get<ServerManager>(TYPES.ServerManager);
  await server.start();
}, ['database']);

// 4. Start the application
await lifecycle.startup();
```

### Environment Configuration

```bash
# Core Configuration
NODE_ENV=development
PORT=8080
HOST=0.0.0.0

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/abe_stack
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# Cache
REDIS_URL=redis://localhost:6379
CACHE_TTL_DEFAULT=300

# Security
JWT_SECRET=your-secret-key
JWT_ACCESS_TOKEN_TTL=15m
JWT_REFRESH_TOKEN_TTL=7d
CSRF_SECRET=your-csrf-secret

# Jobs & Processing
JOB_CONCURRENCY=5
JOB_RETRY_ATTEMPTS=3
```

## 🧪 Testing Infrastructure

The infrastructure is designed for comprehensive testing:

```typescript
// Unit testing with mocked dependencies
describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: MockUserRepository;
  let mockLogger: MockLoggerService;

  beforeEach(() => {
    mockUserRepo = new MockUserRepository();
    mockLogger = new MockLoggerService();

    userService = new UserService(mockUserRepo, mockLogger);
  });

  it('should create user with validation', async () => {
    const userData = { email: 'test@example.com', name: 'Test User' };
    mockUserRepo.create.resolves({ id: '123', ...userData });

    const result = await userService.createUser(userData);

    expect(result.id).toBe('123');
    expect(mockUserRepo.create).toHaveBeenCalledWith(userData);
  });
});

// Integration testing with test containers
describe('DatabaseServer Integration', () => {
  let dbServer: DatabaseServer;

  beforeAll(async () => {
    dbServer = new DatabaseServer(testConfig);
    await dbServer.initialize();
  });

  afterAll(async () => {
    await dbServer.close();
  });

  it('should handle transactions with retry', async () => {
    await dbServer.transaction(async (client) => {
      await client.query('INSERT INTO test_table VALUES ($1)', ['test']);
    });
  });
});
```

## 📊 Monitoring & Observability

### Health Monitoring

```typescript
// Comprehensive health checks
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await dbServer.isHealthy(),
      cache: await cacheService.isHealthy(),
      storage: await storageService.isHealthy(),
      jobs: await jobService.isHealthy()
    },
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      connections: dbServer.getConnectionStats()
    }
  };

  const isHealthy = Object.values(health.services).every(Boolean);
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Performance Metrics

```typescript
// Performance middleware with metrics collection
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();

  res.on('finish', () => {
    const duration = performance.now() - start;

    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
      userAgent: req.get('User-Agent'),
      correlationId: req.correlationId
    });

    // Send metrics to monitoring system
    metricsService.recordRequestDuration(duration, {
      method: req.method,
      route: req.route?.path,
      statusCode: res.statusCode
    });
  });

  next();
};
```

## 🔧 Extension & Customization

### Adding Custom Storage Provider

```typescript
import { IStorageProvider, StorageOptions } from '@/server/infrastructure/storage';

export class S3StorageProvider implements IStorageProvider {
  constructor(private options: S3Options) {}

  async save(options: StorageOptions): Promise<string> {
    // AWS S3 implementation
    const uploadResult = await this.s3Client.upload({
      Bucket: this.options.bucket,
      Key: options.path,
      Body: options.file,
      ContentType: options.contentType
    }).promise();

    return uploadResult.Location;
  }

  async get(path: string): Promise<Buffer> {
    const result = await this.s3Client.getObject({
      Bucket: this.options.bucket,
      Key: path
    }).promise();

    return result.Body as Buffer;
  }

  // Implement other required methods...
}

// Register the provider
storageService.registerProvider('s3', new S3StorageProvider({
  bucket: 'my-app-storage',
  region: 'us-west-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
}));
```

### Custom Job Processor

```typescript
import { BaseJobProcessor, JobData } from '@/server/infrastructure/jobs';

export class EmailJobProcessor extends BaseJobProcessor {
  protected async processJob(jobData: JobData): Promise<void> {
    const { userId, templateId, variables } = jobData.data;

    // Get user email
    const user = await this.userService.findById(userId);
    if (!user) throw new Error(`User not found: ${userId}`);

    // Render email template
    const emailContent = await this.templateService.render(templateId, {
      ...variables,
      user: user.name
    });

    // Send email
    await this.emailService.send({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.body
    });

    this.logger.info('Email sent successfully', {
      userId,
      templateId,
      recipient: user.email
    });
  }
}
```

## 📝 Best Practices

1. **Dependency Injection**: Always use the DI container for service dependencies
2. **Interface Design**: Define clear interfaces for all services
3. **Error Handling**: Use structured error types with proper context
4. **Logging**: Include correlation IDs and relevant metadata
5. **Configuration**: Use type-safe configuration access
6. **Testing**: Write comprehensive unit and integration tests
7. **Performance**: Monitor and optimize critical paths
8. **Security**: Follow security best practices for all components

## 📚 Module Documentation

Each infrastructure module has detailed documentation:

- **[Configuration](./config/README.md)** - Advanced configuration management
- **[Database](./database/README.md)** - Database connectivity and management
- **[Caching](./cache/README.md)** - Multi-level caching strategies
- **[Security](./security/README.md)** - Security utilities and authentication
- **[Jobs](./jobs/README.md)** - Background job processing
- **[Logging](./logging/README.md)** - Structured logging infrastructure
- **[Storage](./storage/README.md)** - File storage and management

The ABE Stack infrastructure provides a robust, scalable foundation for building enterprise-grade applications with clean architecture, comprehensive testing, and production-ready features.