# ⚙️ Core Configuration System

**The foundation of ABE Stack's configuration architecture** - a framework-agnostic system that loads, validates, and provides type-safe access to environment variables.

## 🎯 Purpose

This package provides the **core infrastructure** that all ABE Stack applications use for configuration. It's designed to be:

- **Framework Agnostic** - Works with any Node.js application
- **Type Safe** - Full TypeScript support with runtime validation
- **Fail Fast** - Invalid configuration prevents application startup
- **Zero Dependencies** - Only uses Node.js built-ins and custom Schema<T> for validation

## 📂 Directory Structure

```
packages/core/src/config/
├── contracts/           # TypeScript type definitions for all configs
│   ├── auth.ts          # Authentication config types
│   ├── infra.ts         # Infrastructure config types (database, cache, queue, storage)
│   ├── services.ts      # Service config types (billing, email, notifications, search)
│   ├── notification.ts  # Notification provider types
│   └── index.ts         # Exports all type contracts
├── env.loader.ts        # Loads .env files with priority-based merging
├── env.schema.ts        # Schema that validates all environment variables
├── parsers.ts           # Type-safe utility functions for parsing env values
├── index.ts             # Public API exports
└── README.md            # This file
```

---

## 🔄 How the System Works

The configuration system operates in **four stages**:

### Stage 1: Environment Loading

**File:** `env.loader.ts`

The `initEnv()` function searches for `.env` files and loads them into `process.env` following a priority-based merge strategy.

**Loading Priority** (highest to lowest):

1. **System Environment** - Runtime variables from your deployment platform (Vercel, AWS, Docker, etc.)
2. **ENV_FILE** - Explicit file path set via `ENV_FILE` environment variable
3. **`.env.local`** - Local developer overrides (in `config/env/` directory)
4. **`.env.{NODE_ENV}`** - Stage-specific files like `.env.development`, `.env.production`, `.env.test` (in `config/env/` directory)
5. **`.env`** - Base configuration file (in `config/env/` directory)
6. **Root Fallbacks** - `.env.local`, `.env.{NODE_ENV}`, and `.env` in repository root (for deployment flexibility)

**Why this order?** Higher priority sources override lower ones. This allows you to:

- Set production secrets via your cloud platform (highest priority)
- Override defaults locally without committing changes (`.env.local`)
- Share team defaults via git (`.env.development`, `.env.production`)
- Provide base values that work everywhere (`.env`)

**Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│  1. System Environment (Vercel, AWS, Docker)                │  ← Highest Priority
├─────────────────────────────────────────────────────────────┤
│  2. ENV_FILE (explicit path)                                │
├─────────────────────────────────────────────────────────────┤
│  3. config/env/.env.local (local overrides)                │
├─────────────────────────────────────────────────────────────┤
│  4. config/env/.env.{NODE_ENV} (stage-specific)            │
├─────────────────────────────────────────────────────────────┤
│  5. config/env/.env (base configuration)                   │
├─────────────────────────────────────────────────────────────┤
│  6. Root fallbacks (.env.local, .env.{NODE_ENV}, .env)      │  ← Lowest Priority
└─────────────────────────────────────────────────────────────┘
```

### Stage 2: Schema Validation

**File:** `env.schema.ts`

After loading, the `EnvSchema` validates all environment variables using the custom Schema<T> system. This ensures:

- **Required variables exist** - Missing variables cause immediate failure
- **Types are correct** - Strings are coerced to numbers, booleans, etc.
- **Formats are valid** - URLs have protocols, ports are numbers, enums match allowed values
- **Security constraints** - Production secrets must be strong, localhost URLs blocked in production

The custom Schema<T> system provides runtime validation with TypeScript type inference. The schema IS the type.

**Example validation rules:**

- `JWT_SECRET` must be 32+ characters in production
- `DATABASE_URL` must be a valid connection string
- `NODE_ENV` must be one of: `development`, `production`, `test`
- `PORT` must be a number between 1-65535

### Stage 3: Type Contracts

**Directory:** `contracts/`

While `env.schema.ts` validates **raw environment strings**, the contracts define **transformed configuration objects** used by your application.

**Why separate?**

- **Environment variables** are flat strings: `JWT_SECRET=abc123`, `JWT_ISSUER=myapp`
- **Application config** is structured objects: `{ jwt: { secret: 'abc123', issuer: 'myapp' } }`

The contracts provide TypeScript types for these structured configs. They're used by the server's config loaders (in `apps/server/src/config/`) to transform flat env vars into nested, domain-organized configuration objects.

**Example:**

```typescript
// env.schema.ts validates these raw strings:
JWT_SECRET=my_secret
JWT_ISSUER=myapp
ACCESS_TOKEN_EXPIRY=15m

// contracts/auth.ts defines this structure:
interface JWTConfig {
  secret: string;
  issuer: string;
  accessTokenExpiry: string;
}

// apps/server/src/config/auth/jwt.ts transforms env → config:
export function loadJWTConfig(env: FullEnv): JWTConfig {
  return {
    secret: env.JWT_SECRET,
    issuer: env.JWT_ISSUER,
    accessTokenExpiry: env.ACCESS_TOKEN_EXPIRY,
  };
}
```

### Stage 4: Utility Parsers

**File:** `parsers.ts`

Type-safe helper functions for parsing environment values with defaults and validation.

**Available parsers:**

- `getInt(env, key, default)` - Parse integers with optional default
- `getBool(env, key, default)` - Parse booleans (handles 'true', '1', 'yes', etc.)
- `getList(env, key, default)` - Parse comma-separated lists
- `getRequired(env, key)` - Get required value or throw error

These are used throughout the codebase for consistent, safe environment variable access.

---

## 📖 Understanding env.schema.ts

The `env.schema.ts` file is the **gatekeeper** of your application. It defines every environment variable your app can use.

**Structure:**

```typescript
export const BaseEnvSchema: Schema<BaseEnv> = createSchema<BaseEnv>((data: unknown) => {
  const obj = parseObject(data, 'BaseEnv');
  return {
    NODE_ENV: createEnumSchema(['development', 'production', 'test'] as const, 'NODE_ENV').parse(
      withDefault(obj['NODE_ENV'], 'development'),
    ),
    PORT: coerceNumber(withDefault(obj['PORT'], 8080), 'PORT'),
  };
});
```

**Key features:**

1. **Coercion** - `coerceNumber()` converts string "8080" to number 8080
2. **Optional with defaults** - `withDefault()` and `parseOptional()` helpers
3. **Enums** - `createEnumSchema()` restricts to specific values
4. **Custom validation** - Inline logic in the parse function for complex rules
5. **Production guards** - Extra validation when `NODE_ENV === 'production'`

**Why not just TypeScript?** TypeScript only validates at compile time. The Schema<T> system validates at runtime, catching configuration errors before your app starts.

---

## 🔌 Usage Examples

### Basic Usage

```typescript
import { initEnv, loadServerEnv } from '@abe-stack/server-engine/config';

// 1. Load .env files into process.env
initEnv();

// 2. Validate and get typed environment
const env = loadServerEnv(); // Exits process if validation fails

// 3. Use validated environment
console.log(`Server starting on port ${env.PORT}`);
```

### In Application Code

```typescript
import type { AuthConfig } from '@abe-stack/server-engine/config';

// Use type contracts for function parameters
function setupAuth(config: AuthConfig) {
  // config is fully typed with IDE autocomplete
  console.log(`Auth strategies: ${config.strategies.join(', ')}`);
}
```

### With Parsers

```typescript
import { getInt, getBool, getList } from '@abe-stack/server-engine/config';

const port = getInt(process.env, 'PORT', 3000);
const debug = getBool(process.env, 'DEBUG', false);
const allowedOrigins = getList(process.env, 'CORS_ORIGINS', ['http://localhost:3000']);
```

---

## 🧪 Testing

The core config system has comprehensive test coverage:

```bash
# Run all config tests
pnpm test packages/core/src/config

# Run specific test files
pnpm test env.loader.test.ts
pnpm test env.schema.test.ts
pnpm test parsers.test.ts
```

**What's tested:**

- Environment loading priority
- File parsing (quoted values, comments, multiline)
- Schema validation (required fields, types, formats)
- Production security guards
- Parser functions (type coercion, defaults)

---

## 🔧 Extending the System

### Adding a New Environment Variable

**1. Add to schema** (`env.schema.ts`):

```typescript
export const MyServiceEnvSchema: Schema<MyServiceEnv> = createSchema<MyServiceEnv>(
  (data: unknown) => {
    const obj = parseObject(data, 'MyServiceEnv');
    return {
      MY_NEW_API_KEY: parseString(obj['MY_NEW_API_KEY'], 'MY_NEW_API_KEY'),
      MY_NEW_TIMEOUT: coerceNumber(withDefault(obj['MY_NEW_TIMEOUT'], 5000), 'MY_NEW_TIMEOUT'),
    };
  },
);
```

**2. Add to environment files** (`config/env/.env.development.example`):

```bash
# My New Service
MY_NEW_API_KEY=your_api_key_here
MY_NEW_TIMEOUT=5000
```

**3. (Optional) Add type contract** if you're creating a structured config:

```typescript
// contracts/my-service.ts
export interface MyServiceConfig {
  apiKey: string;
  timeout: number;
}
```

**4. (Optional) Create loader** in `apps/server/src/config/services/`:

```typescript
export function loadMyServiceConfig(env: FullEnv): MyServiceConfig {
  return {
    apiKey: env.MY_NEW_API_KEY,
    timeout: env.MY_NEW_TIMEOUT,
  };
}
```

### Adding a New Contract Type

Create a new file in `contracts/` or add to an existing one:

```typescript
// contracts/analytics.ts
export interface AnalyticsConfig {
  enabled: boolean;
  trackingId: string;
  sampleRate: number;
}
```

Export from `contracts/index.ts`:

```typescript
export type { AnalyticsConfig } from './analytics';
```

---

## 📚 Related Documentation

- **Environment Files:** [config/env/README.md](../../../../config/env/README.md) - How to set up and manage .env files
- **Server Config:** [apps/server/src/config/README.md](../../../apps/server/src/config/README.md) - How the server transforms env into domain configs
- **Deployment Guide:** [docs/deploy/env.md](../../../../docs/deploy/env.md) - Production deployment configuration

---

## 🏗 Architecture Principles

1. **Framework Agnostic** - No dependencies on Express, Fastify, or any framework
2. **Type Safe** - Full TypeScript support with strict mode
3. **Fail Fast** - Validation errors prevent application startup (no silent failures)
4. **Zero Runtime Dependencies** - Custom Schema<T> for validation, rest is Node.js built-ins
5. **Testable** - All functions are pure and easily testable
6. **Extensible** - Easy to add new variables, contracts, and validation rules
7. **Secure by Default** - Production guards prevent weak secrets and insecure configurations

---

## 💡 Key Concepts

**Environment Variables vs Configuration Objects**

- **Environment Variables** (validated by `env.schema.ts`):
  - Flat key-value pairs: `DATABASE_HOST=localhost`, `DATABASE_PORT=5432`
  - Strings that need parsing: `"5432"` → `5432`, `"true"` → `true`
  - Validated at application startup

- **Configuration Objects** (typed by `contracts/`):
  - Nested, structured data: `{ database: { host: 'localhost', port: 5432 } }`
  - Proper types: numbers, booleans, arrays, objects
  - Used throughout application code

The core package handles the first part (env vars), the server config handles the second part (config objects).

**Why This Separation?**

- **Reusability** - Core package can be used by web, desktop, or any Node.js app
- **Clarity** - Clear boundary between "what comes from environment" vs "what the app uses"
- **Flexibility** - Different apps can transform the same env vars into different config structures
