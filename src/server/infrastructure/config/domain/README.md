# ⚙️ Configuration Domain

## 📋 Purpose

The configuration domain provides a strongly-typed, validated configuration model for the application. It offers:

- Type-safe access to configuration values
- Default values for all settings
- Validation rules to ensure configuration correctness
- Domain-specific configuration providers for different subsystems
- Environment-based configuration overrides

This module acts as a bridge between raw environment variables and the strongly-typed configuration objects needed by application services.

## 🧩 Key Components

### 1️⃣ Configuration Models

Each domain-specific area has its own configuration interface:

- **DatabaseConfig**: Database connection and pool settings
- **EmailConfig**: SMTP server and email delivery settings
- **ServerConfig**: HTTP server options and environment information
- **SecurityConfig**: Authentication, authorization, and encryption settings
- **StorageConfig**: File storage locations and options
- **LoggingConfig**: Logging levels, formats, and destinations
- **CacheConfig**: Memory and Redis cache settings
- **MigrationConfig**: Database migration settings and templates

### 2️⃣ Configuration Providers

Provider classes that load, validate, and deliver configuration:

- **DatabaseConfigProvider**: Database connection settings
- **EmailConfigProvider**: Email delivery configuration
- **ServerConfigProvider**: Web server settings
- **SecurityConfigProvider**: Auth and security options
- **StorageConfigProvider**: File storage settings
- **LoggingConfigProvider**: Logging system configuration
- **CacheConfigProvider**: In-memory and Redis cache configuration
- **MigrationConfigProvider**: Database migration configuration

### 3️⃣ Module Exports (`index.ts`)

Exports all configuration models and providers for use throughout the application.

## 🛠️ Usage Instructions

### Accessing Configuration

```typescript
import { inject, injectable } from "inversify";
import { DatabaseConfigProvider } from "@/server/infrastructure/config/domain";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class YourService {
  constructor(
    @inject(TYPES.DatabaseConfigProvider)
    private dbConfigProvider: DatabaseConfigProvider
  ) {}

  async connect() {
    const dbConfig = this.dbConfigProvider.getConfig();

    // Use typed configuration
    console.log(
      `Connecting to ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`
    );

    // Connection logic...
  }
}
```

### Using Cache Configuration

```typescript
import { inject, injectable } from "inversify";
import {
  CacheConfigProvider,
  CacheProviderType,
} from "@/server/infrastructure/config/domain";
import { TYPES } from "@/server/infrastructure/di/types";

@injectable()
class CacheConsumer {
  constructor(
    @inject(TYPES.CacheServiceConfig)
    private cacheConfigProvider: CacheConfigProvider
  ) {}

  setupCache() {
    const cacheConfig = this.cacheConfigProvider.getConfig();

    if (cacheConfig.provider === CacheProviderType.REDIS) {
      console.log(
        `Using Redis cache at ${cacheConfig.redis?.host}:${cacheConfig.redis?.port}`
      );
      // Redis setup logic...
    } else {
      console.log("Using in-memory cache");
      // Memory cache setup logic...
    }
  }
}
```

### Environment Variable Configuration

Configuration is loaded from environment variables with sensible defaults:

```
# Database config example
DB_HOST=localhost
DB_PORT=5432
DB_NAME=my_database
DB_USER=postgres
DB_PASSWORD=secret
DB_MAX_CONNECTIONS=20

# Cache config example
CACHE_PROVIDER=redis
CACHE_REDIS_HOST=localhost
CACHE_REDIS_PORT=6379
CACHE_REDIS_PASSWORD=optional-password
CACHE_REDIS_DB=0
CACHE_REDIS_KEY_PREFIX=app-cache:
```

## 🏗️ Architecture Decisions

### Domain-Specific Providers

- **Decision**: Split configuration into domain-specific providers rather than one global config
- **Rationale**: Improves maintainability and simplifies dependency injection
- **Benefit**: Services only need to depend on the specific configuration they use

### Validation on Access

- **Decision**: Validate configuration when it's accessed, not just at startup
- **Rationale**: Ensures configuration remains valid even after dynamic updates
- **Implementation**: Each provider includes its own validation schema

### Default Values

- **Decision**: Provide sensible defaults for all configuration options
- **Rationale**: Makes development easier and reduces required configuration
- **Tradeoffs**: Production environments should explicitly set critical values

### Environment Variable Source

- **Decision**: Use environment variables as the primary configuration source
- **Rationale**: Standard practice for cloud-native applications, simplifies deployment
- **Enhancement**: Providers can be extended to support additional sources (files, databases)

### Type Safety

- **Decision**: Make all configuration strongly typed through interfaces
- **Rationale**: Prevents runtime errors by catching configuration type mismatches early
- **Benefit**: Better IDE support with autocomplete for configuration properties

### Provider-Based Choice Selection

- **Decision**: Use provider types (enums) to select implementations (e.g., cache types)
- **Rationale**: Makes it easy to switch implementations through configuration
- **Benefit**: Simplifies testing and environment-specific setups

## ⚙️ Setup and Configuration Notes

### Required Environment Variables

Minimal required variables for production:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
PORT=3000
```

### Configuration Validation

Configuration is automatically validated when accessed:

```typescript
// In your application startup code
const dbConfig = dbConfigProvider.getConfig();
// This will throw if validation fails
```

### Overriding Defaults

All configuration has sensible defaults, but can be overridden:

1. Set environment variables
2. Set in `.env` file (development only)
3. Pass via command line (e.g., `PORT=4000 npm start`)

### Security Considerations

- Sensitive values (passwords, keys) should be injected as environment variables
- Don't commit `.env` files to source control
- Use secrets management for production deployments
