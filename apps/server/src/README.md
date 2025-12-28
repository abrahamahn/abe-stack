# 🖥️ ABE Stack Server Architecture

## 📋 Overview

The ABE Stack server is a comprehensive, enterprise-grade backend implementation built with TypeScript and Node.js. It features a clean, layered architecture with dependency injection, comprehensive infrastructure services, and modular domain organization.

## 🏗️ Architectural Principles

### Clean Architecture Pattern

The server follows clean architecture principles with clear separation of concerns:

```
┌─────────────────────────────────────┐
│           API Layer                 │ ← HTTP Controllers, Routes, Middleware
├─────────────────────────────────────┤
│        Application Layer            │ ← Business Logic Services
├─────────────────────────────────────┤
│         Domain Layer                │ ← Entities, Value Objects, Business Rules
├─────────────────────────────────────┤
│      Infrastructure Layer           │ ← Database, External APIs, File System
└─────────────────────────────────────┘
```

### Dependency Injection Architecture

- **Framework**: Inversify with TypeScript decorators
- **Pattern**: Constructor injection with interface-based design
- **Scope**: Singleton services for performance and state consistency
- **Container**: Centralized service registration and resolution

## 📁 Directory Structure

```
src/server/
├── infrastructure/           # Cross-cutting infrastructure concerns
│   ├── cache/               # Caching layer (Redis, in-memory)
│   ├── config/              # Configuration management
│   ├── database/            # Database connections and utilities
│   ├── di/                  # Dependency injection container
│   ├── errors/              # Error handling and custom exceptions
│   ├── files/               # File system operations
│   ├── jobs/                # Background job processing
│   ├── lifecycle/           # Application lifecycle management
│   ├── logging/             # Structured logging system
│   ├── middleware/          # Express middleware
│   ├── processor/           # Media and stream processing
│   ├── promises/            # Promise utilities
│   ├── pubsub/              # Pub/sub messaging
│   ├── queue/               # Message queuing
│   ├── search/              # Search engine integration
│   ├── security/            # Authentication, authorization, CSRF
│   ├── server/              # HTTP server management
│   ├── storage/             # File storage providers
│   └── utils/               # General utilities
├── modules/                 # Business domain modules
│   ├── core/                # Core business functionality
│   │   ├── auth/            # Authentication & authorization
│   │   ├── email/           # Email services
│   │   ├── geo/             # Geolocation services
│   │   ├── permission/      # Role-based access control
│   │   ├── sessions/        # Session management
│   │   └── users/           # User management
│   ├── preferences/         # User preferences
│   └── base/                # Base classes and interfaces
├── shared/                  # Shared utilities and types
├── tests/                   # Test suites
└── index.ts                 # Application entry point
```

## 🔧 Infrastructure Layer Deep Dive

### 1. Configuration Management (`infrastructure/config/`)

**Advanced Configuration System with Multiple Sources**

```typescript
// Multi-environment configuration loading
ConfigService.load({
  environment: process.env.NODE_ENV,
  sources: ['file', 'env', 'secrets'],
  validation: true,
});

// Type-safe configuration access
const port = configService.getNumber('PORT', 8080);
const dbUrl = configService.getString('DATABASE_URL');
const features = configService.getArray('ENABLED_FEATURES');
```

**Key Features:**

- **Environment-based**: `.env.{environment}` files in `config/.env/`
- **Secret Management**: Pluggable providers (File, Environment, Memory)
- **Schema Validation**: Joi-based validation with detailed error reporting
- **Type Safety**: Strongly typed getters for different data types
- **Hot Reloading**: Configuration change notifications
- **Namespace Support**: Hierarchical configuration organization

### 2. Database Layer (`infrastructure/database/`)

**Enterprise Database Management with PostgreSQL**

```typescript
// Advanced connection pooling
const dbServer = new DatabaseServer({
  host: 'localhost',
  port: 5432,
  database: 'abe_stack',
  pool: {
    min: 2,
    max: 20,
    acquireTimeoutMillis: 30000,
    createTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
  },
});

// Transaction support with retry logic
await dbServer.transaction(
  async (client) => {
    await client.query('INSERT INTO users...');
    await client.query('INSERT INTO profiles...');
  },
  { retryOnSerializationFailure: true },
);
```

**Key Features:**

- **Connection Pooling**: Advanced pool management with metrics
- **Transaction Support**: Nested transactions with rollback handling
- **Query Builder**: Parameter binding and SQL injection prevention
- **Retry Logic**: Automatic retry for serialization failures
- **Performance Monitoring**: Query performance tracking with tags
- **Health Checks**: Connection health monitoring

### 3. Caching Layer (`infrastructure/cache/`)

**Multi-Level Caching Strategy**

```typescript
// Redis-backed caching with fallback
const cache = new RedisCacheService({
  host: 'localhost',
  port: 6379,
  fallback: new MemoryCacheService(),
});

// Function memoization
const memoizedFunction = cache.memoize(expensiveOperation, {
  ttl: 300, // 5 minutes
  keyGenerator: (args) => `operation:${args.id}`,
});
```

**Key Features:**

- **Multiple Backends**: Redis, in-memory with provider pattern
- **TTL Management**: Automatic expiration with background cleanup
- **Memoization**: Function result caching
- **Statistics**: Hit/miss ratio tracking
- **Batch Operations**: Multi-get/set for performance

### 4. Logging Infrastructure (`infrastructure/logging/`)

**Structured Logging with Context Propagation**

```typescript
// Hierarchical logger creation
const userLogger = logger.createLogger('UserService');
const paymentLogger = userLogger.createLogger('PaymentProcessor');

// Rich metadata logging
logger.info('Payment processed', {
  userId: user.id,
  amount: payment.amount,
  correlationId: req.correlationId,
  duration: performance.now() - startTime,
});
```

**Key Features:**

- **Structured Logging**: JSON-formatted logs with metadata
- **Context Inheritance**: Child loggers inherit parent context
- **Correlation IDs**: Request tracking across services
- **Performance Tracking**: Built-in timing capabilities
- **Multiple Transports**: Console, file, external logging services

### 5. Security Infrastructure (`infrastructure/security/`)

**Comprehensive Security Stack**

```typescript
// JWT token management with refresh
const tokenManager = new TokenManager({
  accessTokenTTL: '15m',
  refreshTokenTTL: '7d',
  algorithm: 'HS256',
});

// CSRF protection
app.use(
  csrfMiddleware({
    secretKey: Buffer.from(process.env.CSRF_SECRET, 'hex'),
    cookieName: 'csrf-token',
    headerName: 'X-CSRF-Token',
  }),
);
```

**Security Features:**

- **JWT Management**: Access/refresh token handling with blacklisting
- **Password Security**: Strength validation, hashing with bcrypt
- **CSRF Protection**: Token-based CSRF protection
- **Rate Limiting**: Configurable rate limiting middleware
- **Encryption**: AES encryption for sensitive data
- **Input Validation**: Request validation middleware
- **Security Headers**: Helmet.js integration for security headers

### 6. Job Processing System (`infrastructure/jobs/`)

**Background Job Processing with Persistence**

```typescript
// Job submission with priority and retry
await jobService.submit({
  type: 'email-notification',
  data: { userId, templateId, variables },
  priority: JobPriority.HIGH,
  retryOptions: {
    maxAttempts: 3,
    backoffStrategy: 'exponential',
  },
});

// Job processing with concurrency control
const processor = new EmailJobProcessor();
await processor.start({ concurrency: 5 });
```

**Key Features:**

- **Priority Queuing**: Priority-based job scheduling
- **Retry Logic**: Exponential backoff with configurable attempts
- **Concurrency Control**: Configurable worker concurrency
- **Job Dependencies**: Job chaining and dependency management
- **Persistence**: File-based job storage with recovery
- **Monitoring**: Job status tracking and metrics

### 7. Storage Infrastructure (`infrastructure/storage/`)

**Pluggable Storage with Provider Pattern**

```typescript
// Local storage with automatic directory creation
const storage = new LocalStorageProvider({
  basePath: './storage',
  baseUrl: 'https://api.example.com/files',
  tempDir: './temp',
});

// File operations with metadata
const result = await storage.save({
  file: uploadedFile,
  path: 'users/avatars',
  options: {
    generateThumbnail: true,
    extractMetadata: true,
  },
});
```

**Key Features:**

- **Provider Pattern**: Extensible to cloud storage (S3, GCS, Azure)
- **Metadata Extraction**: Automatic file metadata extraction
- **Streaming Support**: Large file handling with streams
- **URL Generation**: Secure URL generation for file access
- **Directory Management**: Automatic directory creation

## 🏢 Module Organization

### Core Domain Modules (`modules/core/`)

#### Authentication Module (`auth/`)

**Feature-Based Organization:**

```
auth/
├── api/                     # HTTP layer
│   ├── controllers/         # Request handlers
│   ├── routes/             # Route definitions
│   └── di/                 # DI module registration
├── features/               # Business logic by feature
│   ├── core/               # Login, register, logout
│   ├── token/              # JWT token management
│   ├── password/           # Password reset, change
│   ├── mfa/                # Multi-factor authentication
│   └── social/             # Social login providers
├── middleware/             # Auth-specific middleware
├── services/               # Core auth services
├── storage/                # Auth repositories
└── config/                 # Auth configuration
```

**Implementation Pattern:**

```typescript
@injectable()
export class AuthService {
  constructor(
    @inject(TYPES.UserRepository) private userRepo: IUserRepository,
    @inject(TYPES.TokenManager) private tokenManager: ITokenManager,
    @inject(TYPES.PasswordService) private passwordService: IPasswordService,
    @inject(TYPES.LoggerService) private logger: ILoggerService,
  ) {}

  async authenticate(credentials: LoginDto): Promise<AuthResult> {
    const user = await this.userRepo.findByEmail(credentials.email);
    if (!user) throw new AuthenticationError('Invalid credentials');

    const isValid = await this.passwordService.verify(credentials.password, user.passwordHash);
    if (!isValid) throw new AuthenticationError('Invalid credentials');

    const tokens = await this.tokenManager.generateTokenPair(user);
    this.logger.info('User authenticated', { userId: user.id });

    return { user, tokens };
  }
}
```

#### User Management (`users/`)

**Complete User Lifecycle Management:**

```typescript
// User service with comprehensive operations
@injectable()
export class UserService {
  async createUser(userData: CreateUserDto): Promise<User> {
    // Validation, creation, and onboarding job
    const user = await this.userRepo.create(userData);
    await this.jobService.submit({
      type: 'user-onboarding',
      data: { userId: user.id },
    });
    return user;
  }

  async updateProfile(userId: string, updates: ProfileUpdateDto): Promise<User> {
    // Profile updates with audit logging
    const updated = await this.userRepo.update(userId, updates);
    this.logger.info('Profile updated', { userId, changes: Object.keys(updates) });
    return updated;
  }
}
```

#### Permission System (`permission/`)

**Role-Based Access Control (RBAC):**

```typescript
// Permission checking middleware
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    const hasPermission = await permissionService.userHasPermission(user.id, permission);

    if (!hasPermission) {
      throw new ForbiddenError(`Permission required: ${permission}`);
    }

    next();
  };
};

// Usage in routes
router.post('/admin/users', requirePermission('users:create'), userController.createUser);
```

### Base Classes (`modules/base/`)

**Foundation Classes for Consistent Patterns:**

```typescript
// Base repository with common CRUD operations
export abstract class BaseRepository<T> {
  constructor(
    @inject(TYPES.DatabaseServer) protected db: IDatabaseServer,
    @inject(TYPES.LoggerService) protected logger: ILoggerService,
  ) {}

  async findById(id: string): Promise<T | null> {
    const result = await this.db.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async create(data: Partial<T>): Promise<T> {
    // Common creation logic with validation
    await this.validate(data);
    return this.performCreate(data);
  }

  protected abstract get tableName(): string;
  protected abstract validate(data: Partial<T>): Promise<void>;
  protected abstract performCreate(data: Partial<T>): Promise<T>;
}
```

## 🔄 Data Flow and Request Lifecycle

### Typical Request Flow

```
1. HTTP Request → Express Server
2. CORS Middleware → Security Headers
3. Authentication Middleware → Token Validation
4. Authorization Middleware → Permission Check
5. Request Validation → Input Sanitization
6. Controller → Business Logic Delegation
7. Service Layer → Business Rules Application
8. Repository Layer → Data Access
9. Database/Cache → Data Retrieval/Storage
10. Response Transformation → HTTP Response
```

### Service Communication Pattern

```typescript
// Example: User registration flow
export class UserController {
  async register(req: Request, res: Response) {
    // 1. Input validation
    const userData = await this.validateInput(req.body);

    // 2. Service orchestration
    const user = await this.userService.createUser(userData);

    // 3. Event emission
    await this.eventService.emit('user.registered', { user });

    // 4. Response
    res.status(201).json(this.transformUser(user));
  }
}

export class UserService {
  async createUser(userData: CreateUserDto): Promise<User> {
    // 1. Business logic
    await this.validateUserData(userData);

    // 2. Password processing
    userData.password = await this.passwordService.hash(userData.password);

    // 3. Data persistence
    const user = await this.userRepository.create(userData);

    // 4. Background processing
    await this.jobService.submit({
      type: 'welcome-email',
      data: { userId: user.id },
    });

    return user;
  }
}
```

## 🧪 Testing Architecture

### Test Organization

```
tests/
├── unit/                   # Unit tests for individual components
│   ├── infrastructure/     # Infrastructure service tests
│   └── modules/           # Module-specific tests
├── integration/           # Integration tests
│   ├── api/              # API endpoint tests
│   └── database/         # Database integration tests
└── e2e/                  # End-to-end tests
```

### Testing Patterns

```typescript
// Unit test with dependency injection mocking
describe('UserService', () => {
  let userService: UserService;
  let mockUserRepo: MockUserRepository;
  let mockJobService: MockJobService;

  beforeEach(() => {
    mockUserRepo = new MockUserRepository();
    mockJobService = new MockJobService();

    userService = new UserService(mockUserRepo, mockJobService, mockLogger);
  });

  it('should create user and trigger onboarding', async () => {
    // Arrange
    const userData = { email: 'test@example.com', name: 'Test User' };
    mockUserRepo.create.resolves({ id: '123', ...userData });

    // Act
    const result = await userService.createUser(userData);

    // Assert
    expect(result.id).toBe('123');
    expect(mockJobService.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'user-onboarding',
        data: { userId: '123' },
      }),
    );
  });
});
```

## 🔧 Development Guidelines

### Adding New Features

1. **Create Module Structure:**

   ```bash
   mkdir -p src/server/modules/payments/{api,services,repositories,models}
   ```

2. **Define Interfaces:**

   ```typescript
   export interface IPaymentService {
     processPayment(request: PaymentRequest): Promise<Payment>;
     refundPayment(paymentId: string): Promise<Refund>;
   }
   ```

3. **Implement Services:**

   ```typescript
   @injectable()
   export class PaymentService implements IPaymentService {
     constructor(
       @inject(TYPES.PaymentRepository) private repo: IPaymentRepository,
       @inject(TYPES.PaymentGateway) private gateway: IPaymentGateway,
     ) {}
   }
   ```

4. **Register with DI Container:**
   ```typescript
   container.bind<IPaymentService>(TYPES.PaymentService).to(PaymentService);
   ```

### Configuration Management

```typescript
// Define configuration schema
const paymentConfigSchema = {
  PAYMENT_GATEWAY_URL: { type: 'string', required: true },
  PAYMENT_TIMEOUT_MS: { type: 'number', default: 30000 },
  PAYMENT_RETRY_ATTEMPTS: { type: 'number', default: 3 },
};

// Use in service
@injectable()
export class PaymentService {
  constructor(@inject(TYPES.ConfigService) private config: IConfigService) {
    this.gatewayUrl = this.config.getString('PAYMENT_GATEWAY_URL');
    this.timeout = this.config.getNumber('PAYMENT_TIMEOUT_MS');
  }
}
```

## 🚀 Deployment and Operations

### Environment Configuration

```bash
# Development
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://localhost:5432/abe_stack_dev
REDIS_URL=redis://localhost:6379

# Production
NODE_ENV=production
PORT=443
DATABASE_URL=postgresql://prod-db:5432/abe_stack
REDIS_URL=redis://prod-redis:6379
LOG_LEVEL=warn
```

### Health Monitoring

```typescript
// Health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: await dbService.isHealthy(),
      cache: await cacheService.isHealthy(),
      queue: await queueService.isHealthy(),
    },
  };

  const isHealthy = Object.values(health.services).every(Boolean);
  res.status(isHealthy ? 200 : 503).json(health);
});
```

### Performance Monitoring

```typescript
// Request performance middleware
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = performance.now();

  res.on('finish', () => {
    const duration = performance.now() - start;
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration.toFixed(2)}ms`,
    });
  });

  next();
};
```

## 📚 Additional Resources

- **API Documentation**: Available at `/api/docs` in development mode
- **Database Schema**: See `migrations/` directory for schema definitions
- **Configuration Reference**: See `config/schema/` for all configuration options
- **Security Guide**: See `docs/security.md` for security best practices
- **Performance Guide**: See `docs/performance.md` for optimization strategies

## 🤝 Contributing

When contributing to the server codebase:

1. Follow the established patterns and architecture
2. Add comprehensive tests for new functionality
3. Update documentation for new features
4. Use dependency injection for all services
5. Follow TypeScript best practices
6. Ensure proper error handling and logging

The ABE Stack server provides a solid foundation for building scalable, maintainable backend applications with enterprise-level patterns and practices.
