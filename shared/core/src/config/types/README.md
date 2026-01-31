// shared/core/src/config/types/README.md

# Configuration Types

**Internal configuration type definitions for the backend server.**

## Purpose

This directory contains **configuration types** - the TypeScript interfaces that define the structure of your application's configuration. These are **internal to the backend** and not exposed via the API.

## Contracts vs Config Types

**Why separate from `infra/contracts`?**

| Aspect         | `infra/contracts`   | `config/types`                |
| -------------- | ---------------------- | ----------------------------- |
| **Purpose**    | API contracts          | Configuration structure       |
| **Used by**    | Frontend + Backend     | Backend only                  |
| **Examples**   | `LoginRequest`, `User` | `AppConfig`, `DatabaseConfig` |
| **Scope**      | External API surface   | Internal server config        |
| **Visibility** | Public (shared)        | Private (backend only)        |

**Key difference:** Config types define how your server is configured (database connection, Redis settings, etc.), while contracts define what data crosses the HTTP boundary.

## Structure

```
types/
├── auth.ts          # Auth configuration (JWT, OAuth, sessions)
├── infra.ts         # Infrastructure (database, cache, queue, storage)
├── services.ts      # External services (email, billing, notifications)
├── notification.ts  # Notification service configuration
└── index.ts         # Main exports (AppConfig)
```

## Usage

### Loading Configuration

```typescript
import { type AppConfig } from '@abe-stack/core/config';
import { initEnv } from '@abe-stack/core/config';

// Load and validate environment variables
initEnv();

// Access typed configuration
const config: AppConfig = {
  env: process.env.NODE_ENV,
  database: {
    provider: 'postgresql',
    host: process.env.POSTGRES_HOST,
    // ...
  },
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    // ...
  },
};
```

### In Application Code

```typescript
import { type DatabaseConfig } from '@abe-stack/core/config';

function createDatabaseConnection(config: DatabaseConfig) {
  // Type-safe database configuration
  if (config.provider === 'postgresql') {
    return createPostgresConnection(config);
  }
  // ...
}
```

## What Goes Here?

✅ **Configuration Types** (belongs in `config/types`)

- Server configuration structure
- Database connection settings
- External service credentials
- Feature flags
- Environment-specific settings

❌ **Not Configuration Types** (belongs elsewhere)

- API request/response types → `infra/contracts`
- Business logic types → `shared/core/src/modules`
- Infrastructure implementation → `shared/core/src/infrastructure`

## Examples

### Good: Configuration Type

```typescript
// ✅ Defines how the server is configured
export interface DatabaseConfig {
  provider: 'postgresql' | 'sqlite' | 'mongodb';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl: boolean;
  maxConnections: number;
}
```

### Bad: API Contract (wrong place)

```typescript
// ❌ This is an API contract, belongs in infra/contracts
export interface User {
  id: string;
  email: string;
  name: string;
}
```

## Best Practices

### 1. Keep Config Types Separate from Runtime Values

```typescript
// ✅ Good - type definition
export interface AuthConfig {
  jwtSecret: string;
  jwtExpiry: string;
}

// ❌ Bad - mixing types with values
export const authConfig = {
  jwtSecret: process.env.JWT_SECRET, // Runtime value
  jwtExpiry: '15m',
};
```

### 2. Use Discriminated Unions for Providers

```typescript
export type DatabaseConfig = PostgresConfig | SqliteConfig | MongoConfig;

export interface PostgresConfig {
  provider: 'postgresql';
  host: string;
  port: number;
  // ...
}

export interface SqliteConfig {
  provider: 'sqlite';
  filePath: string;
  // ...
}
```

### 3. Document Configuration Options

```typescript
/**
 * Authentication configuration
 *
 * @property jwtSecret - Secret key for signing JWT tokens (min 32 chars)
 * @property accessTokenExpiry - Access token lifetime (e.g., '15m', '1h')
 * @property refreshTokenExpiry - Refresh token lifetime (e.g., '7d', '30d')
 */
export interface AuthConfig {
  jwtSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}
```

### 4. Provide Type-Safe Defaults

```typescript
export const DEFAULT_SERVER_CONFIG: Partial<ServerConfig> = {
  port: 8080,
  host: '0.0.0.0',
  logLevel: 'info',
};
```

## Related

- **Environment Schemas** (`../env.schema.ts`) - Zod schemas for validating env vars
- **Environment Loader** (`../env.loader.ts`) - Loads and validates environment variables
- **Parsers** (`../parsers.ts`) - Utilities for parsing env var values

## Migration from `contracts/`

This directory was previously named `contracts/` but was renamed to `types/` to avoid confusion with `infra/contracts` (API contracts).

**Old path:** `shared/core/src/config/contracts/`  
**New path:** `shared/core/src/config/types/`

The rename clarifies that these are internal configuration types, not API contracts.
