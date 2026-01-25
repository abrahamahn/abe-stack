# ⚙️ Configuration Architecture

This directory houses the **Configuration Factory**, the central "brain" of the ABE Stack. Unlike standard Node.js applications that rely on fragile `process.env` strings, the ABE Stack transforms raw environment variables into a **validated, deeply-typed, and domain-mapped** configuration object.

## 📌 High-Level Philosophy

1. **Fail-Fast Validation:** The server refuses to boot if required variables are missing or if security constraints (like weak production secrets) are violated.
2. **Domain Isolation:** Logic is split by domain (Auth, Infra, Billing) to maintain a clean separation of concerns and prevent "mega-file" syndrome.
3. **Provider Agnostic:** Business logic remains clean by abstracting the switch between local development tools and production-grade infrastructure.

---

## 🏗 Three-Directory Architecture

The ABE Stack configuration system spans **three directories** that work together:

### 1. **`.config/env/`** - Environment Files

The source of truth for all environment variables.

```
.config/env/
├── .env.development     # Development settings
├── .env.production      # Production settings
├── .env.test            # Test settings
└── .env.local           # Local overrides (gitignored)
```

**Purpose:** Store environment-specific values  
**Documentation:** [.config/env/README.md](/.config/env/README.md)

### 2. **`packages/core/src/config/`** - Core System

The foundational, reusable configuration infrastructure.

```
packages/core/src/config/
├── loaders/             # Environment file loading
├── schema/              # Zod validation schemas
├── contracts/           # TypeScript type definitions
└── utils/               # Helper functions
```

**Purpose:** Load, validate, and provide types  
**Documentation:** [packages/core/src/config/README.md](../../../../packages/core/src/config/README.md)

### 3. **`apps/server/src/config/`** - Server Config (This Directory)

Server-specific configuration that transforms validated env into domain configs.

```
apps/server/src/config/
├── auth/                # Authentication configs
├── infra/               # Infrastructure configs
├── services/            # External service configs
└── factory.ts           # Assembles everything
```

**Purpose:** Transform env vars into typed domain configs  
**Documentation:** You're reading it!

### 🔄 How They Work Together

```
1. .config/env/*.env files
         ↓
2. packages/core/src/config/env.loader.ts (loads)
         ↓
3. packages/core/src/config/env.schema.ts (validates)
         ↓
4. apps/server/src/config/factory.ts (transforms)
         ↓
5. apps/server/src/app.ts (uses AppConfig)
```

---

## 🏗 The Multi-Stage Environment Strategy

The ABE Stack supports a sophisticated loading strategy with **six priority levels**:

| Priority | Source                 | Purpose                                | Location            | Git Status |
| -------- | ---------------------- | -------------------------------------- | ------------------- | ---------- |
| **1**    | **System Environment** | Runtime/Cloud vars (Vercel, AWS, etc.) | Deployment platform | N/A        |
| **2**    | **ENV_FILE**           | Explicit file path via env variable    | Custom path         | N/A        |
| **3**    | **`.env.local`**       | Local overrides and developer secrets  | `.config/env/`      | Ignored    |
| **4**    | **`.env.{NODE_ENV}`**  | Stage-specific (dev/prod/test)         | `.config/env/`      | Tracked    |
| **5**    | **`.env`**             | Shared base defaults                   | `.config/env/`      | Tracked    |
| **6**    | **Root Fallbacks**     | `.env.local`, `.env.{NODE_ENV}`, `.env` | Repository root    | Varies     |

**Priority rules:** Higher numbers override lower numbers. System environment always wins.

**Why root fallbacks?** Some deployment platforms expect `.env` files in the repository root. The loader checks both `.config/env/` (preferred) and root (fallback) for maximum flexibility.

---

## 🧩 The Provider Matrix

The stack is pre-configured to toggle between enterprise-grade services and local mocks via simple environment switches.

| Category          | Options                                      | Switch Variable          |
| ----------------- | -------------------------------------------- | ------------------------ |
| **Database**      | PostgreSQL, SQLite, MongoDB                  | `DATABASE_PROVIDER`      |
| **Storage**       | Local Filesystem, AWS S3 / R2                | `STORAGE_PROVIDER`       |
| **Cache**         | Local (Memory), Redis                        | `CACHE_PROVIDER`         |
| **Queue**         | Local (Memory/DB), Redis                     | `QUEUE_PROVIDER`         |
| **Auth**          | Local, OAuth (Google/GitHub/etc), Magic-Link | `AUTH_STRATEGIES`        |
| **Search**        | SQL (ILIKE), Elasticsearch                   | `SEARCH_PROVIDER`        |
| **Email**         | Console (Dev), SMTP, API (Resend/Postmark)   | `EMAIL_PROVIDER`         |
| **Billing**       | Stripe, PayPal                               | `BILLING_PROVIDER`       |
| **Notifications** | OneSignal, FCM, Courier                      | `NOTIFICATIONS_PROVIDER` |
| **Package Mgr**   | pnpm, npm, yarn                              | `PACKAGE_MANAGER_PROVIDER` |

---

## 📂 Directory Structure

```bash
apps/server/src/config/
├── auth/                    # Authentication & Security
│   ├── auth.ts              # Main auth config loader
│   ├── jwt.ts               # JWT rotation config
│   ├── rate-limit.ts        # Rate limiting config
│   └── index.ts             # Auth exports
├── infra/                   # Infrastructure Configuration
│   ├── cache.ts             # Cache provider config (Redis, in-memory)
│   ├── database.ts          # Database config (PostgreSQL, SQLite, MongoDB)
│   ├── package.ts           # Package manager config (pnpm, npm, yarn)
│   ├── queue.ts             # Queue provider config (Redis, in-memory)
│   ├── server.ts            # Server settings (port, CORS, proxy, etc.)
│   ├── storage.ts           # Storage provider config (S3, local, R2)
│   └── index.ts             # Infra exports
├── services/                # External Service Integrations
│   ├── billing.ts           # Billing config (Stripe, PayPal)
│   ├── email.ts             # Email config (SMTP, console)
│   ├── notifications.ts     # Push notifications (OneSignal, FCM, etc.)
│   ├── search.ts            # Search provider (Elasticsearch, SQL)
│   └── index.ts             # Services exports
├── factory.ts               # Main config factory (assembles everything)
├── index.ts                 # Public API exports
└── README.md                # This file
```

**Related directories:**

```bash
apps/server/src/__tests__/integration/
├── index.ts                 # Integration test setup
└── test-utils.ts            # Test utilities and helpers
```

---

## 🚀 The Configuration Lifecycle

### 1. Extraction (initEnv)

The stack uses `initEnv()` from `@abe-stack/core` to recursively resolve the project root and load the appropriate `.env` files based on the hierarchy above.

### 2. Validation (The Zod Gatekeeper)

Every variable is passed through `FullEnvSchema`. This ensures data integrity before the app even starts:

- **Ports** are coerced into numbers.
- **URLs** are validated against proper URI formats.
- **Enums** are strictly checked against supported providers.

### 3. Transformation & Domain Mapping

The `factory.ts` maps flat `.env` strings into a nested, immutable `AppConfig` object.

- _Example:_ `STRIPE_SECRET_KEY` is mapped to `config.billing.stripe.secretKey`.

### 4. Hard-Guards (Production Safety)

The `validate()` function applies business-critical security rules that schemas alone cannot catch:

- **SSL Enforcement:** Forces `DB_SSL=true` if `NODE_ENV=production`.
- **Provider Safety:** Blocks `console` email and `local` storage in production.
- **Secret Entropy:** Ensures `JWT_SECRET` meets minimum length and complexity requirements.

---

## 🛠 Usage in the Codebase

**Strict Rule:** Never access `process.env` directly in business logic. Always use the validated config object to ensure type safety and IDE autocompletion.

```typescript
import { loadConfig } from '@/config';

const config = loadConfig(process.env);

// Deeply typed access with IDE intellisense
if (config.storage.provider === 's3') {
  const bucket = config.storage.bucket;
}
```

---

## ➕ Extending the Configuration

To add a new variable, follow the **Triple-Point Update**:

1. **Contract:** Add the variable and Zod rules to `packages/core/src/contracts/config/environment.ts`.
2. **Factory:** Update the relevant loader in `apps/server/src/config/` (e.g., `infra/database.ts`) to map the new variable.
3. **Template:** Add the variable with documentation to `.env.example`.

---

## 🧪 Testing

We maintain 100% test coverage on configuration logic. This ensures that priority overrides and validation guards work exactly as expected before a single line of server code executes.

```bash
# Run all configuration tests
pnpm test config

# Run specific test files
pnpm test factory.test.ts
pnpm test auth.test.ts
```

---

> **🔒 SOC2 & Security Compliance:** > This system is built for compliance. Sensitive connection strings are redacted in logs via `getSafeConnectionString()`, and the strict separation of `.env.local` ensures secrets never leak into version control.
