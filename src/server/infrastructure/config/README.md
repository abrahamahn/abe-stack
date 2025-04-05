# ⚙️ Configuration System

## 📋 Purpose

The configuration system provides a robust, type-safe framework for managing application settings across different environments. It offers:

- Strongly-typed access to configuration values
- Environment-specific configuration files
- Schema-based validation
- Secure handling of sensitive information
- Default values with override capabilities
- Consistent API for configuration access across the application

This module acts as the foundation for all application settings, enabling reliable configuration management for the entire application.

## 🧩 Key Components

### 1️⃣ Core Configuration Service

- **`ConfigService`**: Central service for accessing all configuration
- **`IConfigService`**: Interface defining the configuration contract
- **`ConfigSchema`**: Schema-based validation for configuration values

### 2️⃣ Environment Management

- **`environments.ts`**: Environment detection and configuration loading
- **`.env` folder**: Environment-specific configuration files
- **Environment variables**: Runtime configuration values

### 3️⃣ Domain-Specific Configuration

- **`domain` folder**: Type-safe configuration models for different subsystems
- Domain providers like `DatabaseConfigProvider`, `EmailConfigProvider`, etc.
- Strongly-typed configuration interfaces

### 4️⃣ Secrets Management

- **`secrets` folder**: Secure storage and retrieval of sensitive data
- Multiple provider implementations for different security contexts
- Clear separation between regular configuration and secrets

## 🛠️ Usage Instructions

### Basic Configuration Access

```typescript
import { inject, injectable } from "inversify";
import { IConfigService } from "@/server/infrastructure/config";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class YourService {
  constructor(@inject(TYPES.ConfigService) private config: IConfigService) {}

  async initialize(): Promise<void> {
    // Simple configuration access with type conversion
    const port = this.config.getNumber("PORT", 3000);
    const debugMode = this.config.getBoolean("DEBUG_MODE", false);
    const apiKey = this.config.getString("API_KEY", "default-key");

    // With generics for complex types
    const options = this.config.getObject<{ timeout: number }>("OPTIONS", {
      timeout: 30000,
    });

    console.log(
      `Starting service on port ${port} with timeout ${options.timeout}ms`,
    );
  }
}
```

### Domain-Specific Configuration

```typescript
import { inject, injectable } from "inversify";
import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class DatabaseService {
  constructor(
    @inject(TYPES.DatabaseConfigProvider)
    private dbConfig: DatabaseConfigProvider,
  ) {}

  async connect(): Promise<void> {
    // Get strongly-typed configuration
    const config = this.dbConfig.getConfig();

    console.log(
      `Connecting to ${config.host}:${config.port}/${config.database}`,
    );

    // Connection logic using the configuration...
  }
}
```

### Environment-Based Configuration

```typescript
import { isDevelopment, isProduction } from "@/server/infrastructure/config";

function setupCache(): void {
  if (isDevelopment()) {
    // Use in-memory cache for development
    setupInMemoryCache();
  } else if (isProduction()) {
    // Use Redis cache for production
    setupRedisCache();
  }
}
```

### Configuration Validation

```typescript
import { ConfigSchema } from "@/server/infrastructure/config";

// Define validation schema
const schema: ConfigSchema = {
  properties: {
    API_TIMEOUT: {
      type: "number",
      required: true,
      default: 5000,
      min: 1000,
      max: 30000,
      description: "API request timeout in milliseconds",
    },
    RETRY_ATTEMPTS: {
      type: "number",
      required: false,
      default: 3,
      min: 0,
      max: 10,
      description: "Number of retry attempts for failed requests",
    },
  },
};

// Validate configuration
configService.ensureValid(schema);
```

## 🏗️ Architecture Decisions

### Layered Configuration Strategy

- **Decision**: Implement a multi-layered configuration system
- **Rationale**: Different parts of the system need different types of configuration
- **Implementation**:
  - Core configuration service for basic access
  - Domain-specific providers for typed access
  - Secrets providers for sensitive data

### Schema-Based Validation

- **Decision**: Validate configuration against defined schemas
- **Rationale**: Catches configuration errors early and provides clear error messages
- **Benefit**: Reduces runtime errors due to missing or invalid configuration

### Environment-Specific Configuration

- **Decision**: Use different configuration files per environment
- **Rationale**: Allows for proper configuration in each environment
- **Implementation**: `.env.development`, `.env.test`, `.env.production`

### Dependency Injection Integration

- **Decision**: Integrate with the DI container
- **Rationale**: Makes configuration access consistent across the application
- **Benefit**: Services only need to depend on the configuration they need

### Secret Separation

- **Decision**: Separate secrets from regular configuration
- **Rationale**: Different security requirements for sensitive data
- **Implementation**: Dedicated secret providers with secure access patterns

## ⚙️ Configuration Architecture

```
config/
│
├── ConfigService.ts        # Core configuration service
├── ConfigSchema.ts         # Schema-based validation
├── IConfigService.ts       # Service interface
├── environments.ts         # Environment detection utilities
├── index.ts                # Public API exports
│
├── domain/                 # Domain-specific configuration
│   ├── DatabaseConfig.ts   # Database settings
│   ├── EmailConfig.ts      # Email settings
│   ├── ServerConfig.ts     # Server settings
│   ├── SecurityConfig.ts   # Security settings
│   └── ...
│
├── secrets/                # Sensitive data management
│   ├── SecretProvider.ts   # Provider interface
│   ├── EnvSecretProvider.ts# Environment-based secrets
│   ├── FileSecretProvider.ts# File-based secrets
│   └── ...
│
└── .env/                   # Environment configuration files
    ├── .env.development    # Development settings
    ├── .env.test           # Test settings
    └── .env.production     # Production settings
```

## 🔄 Workflow

1. **Environment Loading**: On application startup, the appropriate environment file is loaded based on `NODE_ENV`
2. **Core Configuration**: The `ConfigService` loads and provides access to all configuration values
3. **Domain Configuration**: Domain-specific providers load and validate their configuration
4. **Service Usage**: Application services request configuration through dependency injection
5. **Secret Access**: Sensitive data is accessed through secure secret providers

## 🔗 Related Components

| Component            | Documentation                            |
| -------------------- | ---------------------------------------- |
| Domain Configuration | [domain/README.md](./domain/README.md)   |
| Environment Files    | [.env/README.md](./.env/README.md)       |
| Secrets Management   | [secrets/README.md](./secrets/README.md) |
