# 💉 Dependency Injection

## 📋 Purpose

The dependency injection system provides a robust framework for managing application dependencies, offering:

- Centralized service management and resolution
- Decoupled components with clear interfaces
- Simplified testing through dependency substitution
- Lifetime management for services (singleton, transient, etc.)
- Type-safe dependency resolution

This module serves as the backbone for the application's component architecture, enabling loosely coupled and maintainable code.

## 🧩 Key Components

### 1️⃣ Container Configuration

- **`container.ts`**: Configures the dependency injection container
- Registers all application services and their implementations
- Manages service lifecycles (singleton, transient, request-scoped)

### 2️⃣ Type Definitions

- **`types.ts`**: Defines symbolic identifiers for all injectable services
- Provides type safety when injecting dependencies
- Centralizes injection token definitions

### 3️⃣ Module Exports

- **`index.ts`**: Exposes the container and utility functions
- Provides helper methods for container access and service resolution

## 🛠️ Usage Instructions

### Defining an Injectable Service

```typescript
import { injectable, inject } from "inversify";
import { TYPES } from "@/server/infrastructure/di/types";
import { ILoggerService } from "@/server/infrastructure/logging";

// Define service interface
export interface IUserService {
  getUserById(id: string): Promise<User | null>;
}

// Implement service with dependencies
@injectable()
export class UserService implements IUserService {
  constructor(
    @inject(TYPES.LoggerService) private logger: ILoggerService,
    @inject(TYPES.DatabaseServer) private db: IDatabaseServer,
  ) {}

  async getUserById(id: string): Promise<User | null> {
    this.logger.debug(`Fetching user with ID: ${id}`);
    // Implementation...
  }
}
```

### Registering Services in the Container

```typescript
// In container.ts
import { Container } from "inversify";
import { TYPES } from "./types";
import { UserService } from "@/server/modules/users/UserService";
import { IUserService } from "@/server/modules/users/IUserService";

export function configureContainer(container: Container): void {
  // Register service as singleton
  container
    .bind<IUserService>(TYPES.UserService)
    .to(UserService)
    .inSingletonScope();

  // Register with factory function
  container
    .bind<ITokenService>(TYPES.TokenService)
    .toDynamicValue((context) => {
      const configService = context.container.get<IConfigService>(
        TYPES.ConfigService,
      );
      const secret = configService.getString("JWT_SECRET");
      return new TokenService(secret);
    })
    .inSingletonScope();
}
```

### Resolving Dependencies

```typescript
import { container } from "@/server/infrastructure/di";
import { TYPES } from "@/server/infrastructure/di/types";

// In application startup code
async function bootstrap(): Promise<void> {
  // Resolve a service from the container
  const appLifecycle = container.get(TYPES.ApplicationLifecycle);

  // Start the application
  await appLifecycle.initialize();
}
```

## 🏗️ Architecture Decisions

### InversifyJS as DI Container

- **Decision**: Use InversifyJS for dependency injection
- **Rationale**: Mature library with TypeScript support and advanced features
- **Benefit**: Type-safe dependency resolution with decorator support

### Symbolic Identifiers

- **Decision**: Use symbolic constants for service identifiers
- **Rationale**: Prevents string literal duplication and provides type safety
- **Implementation**: Centralized `TYPES` object in `types.ts`

### Interface-Based Injection

- **Decision**: Bind services to interfaces rather than concrete implementations
- **Rationale**: Improves testability and allows for implementation swapping
- **Benefit**: Loosely coupled components that depend on abstractions

### Centralized Registration

- **Decision**: Register all dependencies in a central location
- **Rationale**: Makes the component graph explicit and easier to manage
- **Implementation**: `container.ts` with modular registration functions

## ⚙️ Setup and Configuration Notes

### Container Configuration

For application startup, ensure the container is properly configured:

```typescript
import { Container } from "inversify";
import { configureContainer } from "@/server/infrastructure/di/container";

// Create and configure container
const container = new Container();
configureContainer(container);

// Export configured container
export { container };
```

### Testing with DI

For testing, create a separate container with mocked dependencies:

```typescript
import { Container } from "inversify";
import { TYPES } from "@/server/infrastructure/di/types";

// Setup test container
function setupTestContainer(): Container {
  const container = new Container();

  // Register mocks
  container.bind(TYPES.LoggerService).toConstantValue(mockLogger);
  container.bind(TYPES.DatabaseServer).toConstantValue(mockDatabase);

  // Register the service under test with real implementation
  container.bind(TYPES.UserService).to(UserService);

  return container;
}
```

### Lifecycle Management

When registering services, consider their appropriate lifecycle:

- **Singleton**: `inSingletonScope()` - Single instance shared app-wide
- **Transient**: `inTransientScope()` - New instance each time (default)
- **Request**: `inRequestScope()` - New instance per HTTP request
