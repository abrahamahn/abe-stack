# 🖥️ Server Architecture

## 📋 Purpose

The server directory contains the complete backend implementation of the application, offering:

- A robust, modular server architecture
- Infrastructure components for core backend functionality
- Business logic organized into feature modules
- Shared utilities and common code
- High-performance C++ bindings for specialized operations
- API endpoints and service implementations

This server application is built on modern Node.js and TypeScript, providing a scalable, maintainable foundation for your backend services.

## 🧩 Key Components

### 1️⃣ Infrastructure (`infrastructure/`)

- Core framework components and utilities
- Common backend functionality abstracted into reusable modules
- Lower-level implementation details that support the rest of the application
- Examples: logging, database, storage, auth, config, etc.

### 2️⃣ Modules (`modules/`)

- Feature-specific implementations
- Business logic organized by domain
- API controllers and routes
- Service implementations
- Each module is self-contained with its own specific functionality

### 3️⃣ Shared (`shared/`)

- Utilities, types, and helpers shared across modules
- Common code that might be used by multiple feature modules
- Prevents code duplication and ensures consistency

### 4️⃣ C++ Extensions (`cpp/`)

- Native C++ extensions for high-performance operations
- Node.js bindings for computationally intensive tasks
- Used for specialized functionality requiring optimal performance

### 5️⃣ Server Initialization (`index.ts`)

- Application entry point
- Server initialization and bootstrapping
- Dependency injection setup
- Configuration loading

## 🚀 Getting Started

### Server Initialization

The main entry point for the server is `src/server/index.ts`, which handles:

1. Initializing the dependency injection container
2. Setting up the logger
3. Loading configuration
4. Creating the HTTP server
5. Setting up graceful shutdown

Here's a simplified view of the initialization flow:

```
Load Environment Variables → Initialize DI Container → Configure Logger →
Initialize Services → Start HTTP Server → Register Shutdown Handlers
```

### Running the Server

To start the server:

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

Environment configurations can be adjusted in `.env` files:

```
# .env
PORT=8080
HOST=localhost
NODE_ENV=development
```

## 🏗️ Architecture Overview

### Layered Architecture

The server follows a layered architecture pattern:

1. **Controller Layer**: Handles HTTP requests and responses
2. **Service Layer**: Contains business logic
3. **Repository Layer**: Data access and manipulation
4. **Infrastructure Layer**: Cross-cutting concerns and utilities

### Request Flow

A typical request flows through the system as follows:

```
HTTP Request → Middleware → Controller → Service → Repository → Database
                                       ↑         ↑
                                       └─────────┴── Infrastructure Services
```

### Dependency Injection

The server uses the Inversify DI container to manage dependencies:

```typescript
// Register a service
container.bind(TYPES.LoggerService).to(LoggerService).inSingletonScope();

// Inject dependencies
@injectable()
class UserService {
  constructor(
    @inject(TYPES.UserRepository) private userRepository: IUserRepository,
    @inject(TYPES.LoggerService) private logger: ILoggerService,
  ) {}
}
```

### Module Structure

Each feature module follows a consistent structure:

```
modules/users/
├── controllers/    # HTTP request handlers
├── services/       # Business logic
├── repositories/   # Data access
├── models/         # Data models
├── dto/            # Data transfer objects
└── index.ts        # Module exports
```

## 📦 Key Modules

### User Management

- User registration and authentication
- Profile management
- Role-based authorization

### Content Management

- Content creation, retrieval, update, deletion
- Media handling
- Versioning and history

### Notifications

- Notification delivery
- Subscription management
- Real-time updates via WebSockets

### API

- REST API endpoints
- Request validation
- Response formatting
- API documentation

## 🛠️ Development Guide

### Adding a New Feature Module

1. Create a new directory in `src/server/modules/`
2. Set up the basic module structure (controllers, services, etc.)
3. Define interfaces for the module's public API
4. Implement the module's functionality
5. Register any services with the DI container
6. Add API routes to the server

Example of a new module structure:

```
modules/payments/
├── controllers/
│   └── PaymentController.ts
├── services/
│   └── PaymentService.ts
├── repositories/
│   └── PaymentRepository.ts
├── models/
│   └── Payment.ts
├── dto/
│   ├── CreatePaymentDto.ts
│   └── PaymentResponseDto.ts
├── types/
│   └── index.ts
└── index.ts
```

### Connecting to Infrastructure

Use dependency injection to connect your module to infrastructure services:

```typescript
@injectable()
export class PaymentService {
  constructor(
    @inject(TYPES.DatabaseService) private db: IDatabaseService,
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.PaymentGateway) private paymentGateway: IPaymentGateway,
  ) {}

  async processPayment(payment: CreatePaymentDto): Promise<Payment> {
    this.logger.info("Processing payment", { amount: payment.amount });

    // Use injected services to process the payment
    const gatewayResponse = await this.paymentGateway.charge(payment);

    // Store payment in database
    const result = await this.db.payments.create({
      ...payment,
      gatewayReference: gatewayResponse.referenceId,
      status: gatewayResponse.status,
    });

    return result;
  }
}
```

### Testing

The server is designed to be highly testable through:

- Dependency injection for easy mocking
- Interface-based design
- Separation of concerns
- Clear module boundaries

Example test for a service:

```typescript
describe("PaymentService", () => {
  let paymentService: PaymentService;
  let mockDb: MockDatabaseService;
  let mockLogger: MockLoggerService;
  let mockPaymentGateway: MockPaymentGateway;

  beforeEach(() => {
    // Create mocks
    mockDb = new MockDatabaseService();
    mockLogger = new MockLoggerService();
    mockPaymentGateway = new MockPaymentGateway();

    // Create service with mocks
    paymentService = new PaymentService(mockDb, mockLogger, mockPaymentGateway);
  });

  it("should process a payment successfully", async () => {
    // Arrange
    const payment = { amount: 100, currency: "USD" };
    mockPaymentGateway.charge.resolves({
      referenceId: "test-ref",
      status: "success",
    });

    // Act
    const result = await paymentService.processPayment(payment);

    // Assert
    expect(result).toBeDefined();
    expect(result.status).toBe("success");
    expect(mockDb.payments.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        currency: "USD",
        gatewayReference: "test-ref",
        status: "success",
      }),
    );
  });
});
```

## 🔒 Security Considerations

- **Input Validation**: All user input is validated using schemas
- **Authentication**: JWT-based authentication with secure token handling
- **Authorization**: Role-based access control for API endpoints
- **Data Protection**: Sensitive data is encrypted at rest
- **HTTPS**: All production deployments use HTTPS
- **Rate Limiting**: API rate limiting prevents abuse
- **CSRF Protection**: Cross-Site Request Forgery protection is implemented
- **Content Security**: Security headers and proper content type handling

## 🚀 Deployment

The server can be deployed in several ways:

1. **Docker Containers**:

   ```bash
   docker build -t my-app-server .
   docker run -p 8080:8080 my-app-server
   ```

2. **Serverless Functions** (for specific APIs):

   - Configure in `serverless.yml`
   - Deploy with `serverless deploy`

3. **Traditional Node.js Deployment**:
   ```bash
   npm run build
   NODE_ENV=production node dist/index.js
   ```

## 📚 Further Resources

- See `infrastructure/README.md` for details on infrastructure components
- See `shared/README.md` for information on shared utilities
- Each module may contain its own documentation
- API documentation is available at `/api/docs` when running in development mode
