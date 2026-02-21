# @bslt/shared

Environment-agnostic shared package for the BSLT. Contains all business logic, schemas, API contracts, error hierarchies, and platform utilities — consumed by both server and client apps.

**Zero runtime dependencies.** Pure TypeScript with Zod schemas.

## Architecture

### Internal DAG

```
primitives  ->  engine  ->  core  ->  contracts  ->  api
```

Lower layers cannot import higher layers. This is enforced by `eslint-plugin-boundaries`.

### Layer Responsibilities

| Layer          | Purpose                                                                                 | Location          |
| -------------- | --------------------------------------------------------------------------------------- | ----------------- |
| **primitives** | Zero-dependency vocabulary: `Schema<T>`, branded IDs, `Result<T,E>`, helpers, constants | `src/primitives/` |
| **engine**     | Infrastructure contracts and platform-agnostic utilities                                | `src/engine/`     |
| **core**       | Business logic: entity schemas, validation, domain functions                            | `src/core/`       |
| **contracts**  | API endpoint definitions (`satisfies Contract`)                                         | `src/contracts/`  |
| **api**        | API router combining all contracts                                                      | `src/api/`        |
| **config**     | Environment variable schemas and validation                                             | `src/config/`     |

## Folder Structure

### `src/primitives/`

The foundation layer with zero internal dependencies.

| Directory          | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `schema/`          | `Schema<T>`, `createSchema()`, parsers, branded IDs (`TenantId`, `UserId`, etc.) |
| `helpers/`         | Result monad, API response types, crypto utils, string/object/parse helpers      |
| `config/`          | Config types, env schemas, `LogLevel`                                            |
| `constants/`       | Regex patterns, time constants, media MIME mappings                              |
| `api.ts`           | Contract vocabulary types (`EndpointDef`, `Contract`, `Schema`, `ErrorCode`)     |
| `logger.ts`        | `Logger` and `ServerLogger` interfaces                                           |
| `observability.ts` | `ErrorTracker`, `HasErrorTracker` interfaces                                     |
| `environment.ts`   | `ServerEnvironment` interface                                                    |

### `src/engine/`

Infrastructure contracts and platform-agnostic utilities. 25 modules.

| Module            | Purpose                                                                   |
| ----------------- | ------------------------------------------------------------------------- |
| `api-keys/`       | API key schemas: creation, listing, revocation                            |
| `cache/`          | LRU cache, memoize utility, cache provider types, error hierarchy         |
| `constants/`      | Platform constants: HTTP status codes, error codes, limits, rate limits   |
| `context/`        | DI context types: `BaseContext`, `HasEmail`, `HasStorage`, `HasCache`     |
| `crypto/`         | JWT sign/verify/decode, token store, secure random                        |
| `di/`             | Module registration contracts (`ModuleDeps`, `ModuleRegistrationOptions`) |
| `email/`          | Email template schemas and delivery logging                               |
| `env/`            | Environment validation (`baseEnvSchema`, `validateEnv`, `getRawEnv`)      |
| `errors/`         | All error classes (HTTP + auth) and `mapErrorToHttpResponse`              |
| `feature-flags/`  | Feature flag CRUD, tenant overrides, evaluation logic                     |
| `files/`          | File metadata, upload/download, storage provider abstraction              |
| `health/`         | Health, readiness, and liveness probe schemas and check functions         |
| `http/`           | Response envelopes, route definitions, cookies, CSRF, proxy, multipart    |
| `jobs/`           | Background job queue schemas, retry/backoff, dead-letter                  |
| `logger/`         | Structured logging, correlation IDs, console logger                       |
| `media/`          | File type detection, processing types, upload validation                  |
| `native/`         | Bridge interface for Electron and React Native                            |
| `pagination/`     | Cursor-based and offset-based pagination                                  |
| `ports/`          | Infrastructure service interfaces (hexagonal architecture)                |
| `pubsub/`         | WebSocket subscription management for real-time updates                   |
| `realtime/`       | Operational transformation, version conflict resolution                   |
| `search/`         | Search DSL: query building, filtering, facets, serialization              |
| `security/`       | Input sanitization, injection detection, rate limiting                    |
| `usage-metering/` | Resource consumption tracking for billing                                 |
| `webhooks/`       | Webhook registration, delivery tracking, retry logic                      |

### `src/core/`

Business logic only. 11 domain modules.

| Module           | Purpose                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `activities/`    | User and workspace activity feed with cursor pagination                                          |
| `admin/`         | System admin: user/tenant management, impersonation, security events, system stats               |
| `audit-log/`     | Audit event recording, filtering, and display                                                    |
| `auth/`          | All authentication flows: login, register, OAuth, MFA, WebAuthn, magic link, sessions, passwords |
| `billing/`       | Plans, subscriptions, checkout, invoices, payment methods, entitlements                          |
| `compliance/`    | GDPR: legal documents, consent management, data export, account deletion                         |
| `constants/`     | Domain-level constants: auth, billing, compliance, IAM, notifications, product                   |
| `notifications/` | In-app notifications, push (FCM), preferences, quiet hours                                       |
| `tenant/`        | Workspace/organization CRUD, settings, membership, invitations, role hierarchy                   |
| `transactions/`  | Undo/redo operation types for offline-first editing                                              |
| `users/`         | User profiles, sessions, avatar, username, lifecycle, roles                                      |

### `src/contracts/`

API endpoint definitions. 16 contract files defining 183 endpoints total.

| Contract                    | Endpoints | Domain                    |
| --------------------------- | --------- | ------------------------- |
| `contract.auth.ts`          | 53        | Authentication flows      |
| `contract.admin.ts`         | 30        | System administration     |
| `contract.tenant.ts`        | 17        | Workspaces + membership   |
| `contract.users.ts`         | 15        | User profile management   |
| `contract.billing.ts`       | 15        | Billing and subscriptions |
| `contract.notifications.ts` | 11        | Notifications and push    |
| `contract.compliance.ts`    | 7         | GDPR compliance           |
| `contract.feature.flags.ts` | 7         | Feature flags             |
| `contract.webhooks.ts`      | 6         | Webhook management        |
| `contract.jobs.ts`          | 5         | Background job queue      |
| `contract.api.keys.ts`      | 4         | API key management        |
| `contract.files.ts`         | 4         | File uploads              |
| `contract.health.ts`        | 3         | Health probes             |
| `contract.activities.ts`    | 2         | Activity feeds            |
| `contract.audit.log.ts`     | 2         | Audit log                 |
| `contract.realtime.ts`      | 2         | Real-time sync            |

### `src/api/`

Combines all contracts into a single `apiRouter` for server and client consumption.

### `src/config/`

Environment variable schemas split by concern: auth, billing, cache, database, email, frontend, notification, queue, search, server, storage.

## Key Relationships

- **Tenant + Membership:** Membership schemas live inside `core/tenant/` because all membership endpoints nest under `/tenants/:tenantId/`.
- **Billing + Usage Metering:** Usage metering (engine) provides schemas and aggregation. Billing (core) exposes the API at `GET /billing/usage`.
- **Email vs Notifications:** Email is infrastructure (template storage, delivery logging). Notifications is a business domain (in-app, push, preferences).
- **Files vs Media:** Files handles metadata and upload/download records. Media provides file type detection and processing types.
- **Admin consolidates:** The admin contract aggregates cross-cutting admin operations across users, tenants, security, billing, and system health.

## Package Exports

```typescript
import { ... } from '@bslt/shared'             // Root barrel (everything)
import { ... } from '@bslt/shared/primitives'   // Primitives layer only
import { ... } from '@bslt/shared/engine'        // Engine layer only
import { ... } from '@bslt/shared/core'          // Core layer only
import { ... } from '@bslt/shared/contracts'     // API contracts only
import { ... } from '@bslt/shared/api'           // API router
import { ... } from '@bslt/shared/config'        // Config schemas
```

## Domain Reference

For the complete registry of all 36 modules including schema files, key exports, endpoint details, and error classes, see [`docs/todo/DOMAIN.md`](../../docs/todo/DOMAIN.md).
