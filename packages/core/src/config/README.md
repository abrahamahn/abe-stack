# ⚙️ Core Configuration System

This directory contains the **foundational configuration system** used across all ABE Stack applications. It provides environment loading, validation, type contracts, and utility functions.

## 🎯 Purpose

The core config system is **framework-agnostic** and **reusable**. It handles:

- Loading `.env` files with priority-based merging
- Validating environment variables with Zod schemas
- Providing TypeScript type contracts for all configurations
- Offering utility functions for parsing environment values

## 📂 Directory Structure

```
packages/core/src/config/
├── contracts/           # TypeScript type definitions
│   ├── auth.ts          # Auth config types (JWT, OAuth, rate limiting)
│   ├── infra.ts         # Infrastructure types (database, cache, queue, storage)
│   ├── services.ts      # Service types (billing, email, notifications, search)
│   ├── notification.ts  # Notification provider types
│   └── index.ts         # Exports all contracts
├── env.loader.ts        # Environment file loading with priority-based merging
├── env.schema.ts        # Zod schema for all environment variables
├── parsers.ts           # Type-safe parsers (getInt, getBool, getList, etc.)
└── index.ts             # Public API exports
```

## 🔄 How It Works

### 1. Environment Loading (`env.loader.ts`)

The `initEnv()` function loads environment files in priority order:

```typescript
import { initEnv } from '@abe-stack/core/config';

// Loads .env files and populates process.env
initEnv();
```

**Loading Priority** (highest to lowest):

1. System environment variables
2. `ENV_FILE` (explicit file path)
3. `.config/env/.env.local`
4. `.config/env/.env.{NODE_ENV}`
5. `.config/env/.env`
6. Root fallbacks

### 2. Validation (`schema/env.schema.ts`)

The `FullEnvSchema` validates all environment variables:

```typescript
import { loadServerEnv } from '@abe-stack/core/config';

// Loads AND validates environment
const env = loadServerEnv(); // Exits with error if validation fails
```

**Validation Features:**

- Type coercion (strings → numbers, booleans)
- Format validation (URLs, emails, enums)
- Required vs optional fields
- Default values
- Custom validation rules

### 3. Type Contracts (`contracts/`)

TypeScript interfaces define the shape of all configurations:

```typescript
import type { AuthConfig, DatabaseConfig } from '@abe-stack/core/config';

// Fully typed configuration objects
const authConfig: AuthConfig = {
  strategies: ['local', 'google'],
  jwt: { secret: '...', accessTokenExpiry: '15m', ... },
  // ... IDE autocomplete for all fields
};
```

### 4. Utility Parsers (`utils/parsers.ts`)

Type-safe helpers for parsing environment variables:

```typescript
import { getInt, getBool, getList } from '@abe-stack/core/config';

const port = getInt(process.env, 'PORT', 3000); // number
const debug = getBool(process.env, 'DEBUG', false); // boolean
const hosts = getList(process.env, 'ALLOWED_HOSTS'); // string[]
```

## 📦 Exports

### Main Exports

```typescript
// Loaders
export { initEnv, loadServerEnv, validateEnvironment } from './loaders/dotenv';

// Schema
export { FullEnvSchema as envSchema } from './schema/env.schema';
export type { FullEnv } from './schema/env.schema';

// Contracts (all types)
export type {
  AuthConfig,
  DatabaseConfig,
  CacheConfig,
  QueueConfig,
  StorageConfig,
  EmailConfig,
  BillingConfig,
  NotificationConfig,
  SearchConfig,
  // ... and many more
} from './contracts';

// Utilities
export { getInt, getBool, getList, getRequired } from './utils/parsers';
```

## 🔌 Usage in Applications

### In Server Application

```typescript
// apps/server/src/main.ts
import { loadServerEnv } from '@abe-stack/core/config';

// Load and validate environment
const env = loadServerEnv();

// Use validated environment
console.log(`Starting server on port ${env.PORT}`);
```

### In Custom Loaders

```typescript
// apps/server/src/config/auth/auth.ts
import type { AuthConfig, FullEnv } from '@abe-stack/core/config';
import { getInt, getBool } from '@abe-stack/core/config';

export function loadAuthConfig(env: FullEnv): AuthConfig {
  return {
    strategies: env.AUTH_STRATEGIES.split(','),
    jwt: {
      secret: env.JWT_SECRET,
      accessTokenExpiry: env.JWT_ACCESS_EXPIRY,
      // ...
    },
    // ...
  };
}
```

## 🧪 Testing

The core config system has comprehensive test coverage:

```bash
# Run all config tests
pnpm test packages/core/src/config

# Run specific tests
pnpm test dotenv.test.ts
pnpm test env.schema.test.ts
```

## 🔧 Extending the System

### Adding a New Environment Variable

1. **Add to schema** (`schema/env.schema.ts`):

```typescript
export const FullEnvSchema = z.object({
  // ... existing fields
  MY_NEW_VAR: z.string().min(1),
});
```

2. **Add type contract** (if needed in `contracts/`):

```typescript
export interface MyServiceConfig {
  apiKey: string;
  endpoint: string;
}
```

3. **Update `.env.example`** in `.config/env/`:

```bash
# My New Service
MY_NEW_VAR=example_value
```

### Adding a New Contract Type

Create a new file in `contracts/` or add to existing:

```typescript
// contracts/my-service.ts
export interface MyServiceConfig {
  enabled: boolean;
  apiKey: string;
  timeout: number;
}
```

Export from `contracts/index.ts`:

```typescript
export type { MyServiceConfig } from './my-service';
```

## 📚 Related Documentation

- **Environment Files:** [.config/env/README.md](/.config/env/README.md)
- **Server Config:** [apps/server/src/config/README.md](/apps/server/src/config/README.md)
- **Deployment Guide:** [docs/deploy/env.md](/docs/deploy/env.md)

## 🏗 Architecture Principles

1. **Framework Agnostic** - No server/framework dependencies
2. **Type Safe** - Full TypeScript support with strict types
3. **Fail Fast** - Validation errors prevent app startup
4. **Zero Dependencies** - Only uses Node.js built-ins and Zod
5. **Testable** - All functions are pure and easily testable
6. **Extensible** - Easy to add new variables and contracts
