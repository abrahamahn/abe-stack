# ABE Stack Changelog

**Last Updated: January 18, 2026**

All notable changes to this project are documented here. Format follows semantic versioning principles.

---

## 2026-01-18

### Package Minimization

Replaced large dependencies with lightweight custom implementations to reduce bundle size:

- **Replaced zxcvbn (~800KB) with custom password strength checker**
  - Created `packages/core/src/validation/passwordStrength.ts` (~5KB)
  - Implements entropy-based scoring (0-4 scale)
  - Detects common passwords (200+ entries with l33t speak variants)
  - Detects keyboard patterns, repeated/sequential characters
  - Provides user input penalization and crack time estimation
  - Added comprehensive tests in `passwordStrength.test.ts`

- **Replaced idb-keyval with native IndexedDB wrapper**
  - Created `packages/sdk/src/persistence/idb.ts` (~100 lines)
  - Provides `createStore`, `get`, `set`, `del`, `clear`, `keys` functions
  - Zero external dependencies, same API surface

### Dependency Cleanup

Hoisted common devDependencies to root and removed duplicates:

- **packages/core**: Removed typescript, vitest, tsc-alias, @types/node
- **packages/sdk**: Removed typescript, vitest, idb-keyval
- **packages/ui**: Removed typescript, tsc-alias, @types/react, @types/react-dom
- **Root**: Added tsc-alias (^1.8.16)

### Version Alignment

Fixed version mismatches across packages:

- **@ts-rest/core**: Aligned to ^3.52.1 (was 3.45.1 in packages/core)
- **zustand**: Aligned to ^5.0.9 (was 5.0.3 in apps/web)

### Lint Fixes

- **smtp.ts**: Fixed template literal type errors by extracting `Date.now()` and `Math.random()` to typed variables
- **cookie.ts**: Added explicit `: FastifyReply` return types to `setCookie` and `clearCookie` decorator functions

---

## 2026-01-17

### Linting Config Single Source of Truth

- Added `config/linting.json` as the canonical linting configuration
- Added `tools/sync/sync-linting.ts` to sync `package.json` and `.vscode/settings.json`
- Wired `pnpm sync:linting` into `pre-commit` to keep lint-staged and editor settings consistent

### TypeScript Project Reference Automation

- Added `tools/sync/sync-tsconfig.ts` to auto-generate project references
- Added `pnpm sync:tsconfig` and `pnpm sync:tsconfig:check` scripts
- Hooked `pnpm sync:tsconfig` into `pre-commit` to keep references consistent

### Build System Improvements

Fixed incremental build caching issues that caused stale builds when `dist` was deleted but `tsconfig.tsbuildinfo` remained:

- **Smart build scripts** - All package build scripts now auto-clean orphaned tsbuildinfo:
  - Added `[ -d dist ] || rm -f tsconfig.tsbuildinfo` check before `tsc --build`
  - Applies to: `packages/core`, `packages/sdk`, `packages/ui`

- **Consistent clean scripts** - All packages now remove both `dist` and `tsconfig.tsbuildinfo`

- **Server build/type-check separation** - Created `tsconfig.build.json` for builds (excludes tests) while `tsconfig.json` includes tests for type-checking. Fixed mock type error in `smtp.test.ts`

- **Desktop package reduction** - Reduced devDependencies from 7 to 2 (`electron`, `electron-builder`)

- **Web package reduction** - Reduced devDependencies from 8 to 1 (`@types/dompurify`)

- **Shared types hoisting** - Moved `@types/react` and `@types/react-dom` to root package.json

### Documentation Refactor

Refactored the large `config-setup.md` (1633 lines) into three focused documents:

- **`docs/dev/config-setup.md`** (~725 lines) - Core configuration:
  - Monorepo structure, pnpm workspace, dependency flow
  - TypeScript configuration hierarchy and project references
  - Path alias system and centralization
  - Build system with Turborepo pipeline
  - Package exports (subpath exports), tsc-alias
  - Vite configuration (web and desktop)
  - Caching strategy (Turbo, ESLint, Prettier, TypeScript)
  - Database configuration (Drizzle ORM)
  - Server domain configuration pattern
  - Quick reference with 25+ config file locations

- **`docs/dev/sync-scripts.md`** (~450 lines) - DX automation scripts:
  - Execution modes (sync, check, watch) and automation triggers
  - `sync-path-aliases.ts`: Scope tables, depth limits, excluded names
  - `sync-file-headers.ts`: File extensions, shebang handling
  - `sync-import-aliases.ts`: Barrel file detection, re-export preservation
  - `sync-test-folders.ts`: Code detection vs barrel-only directories
  - `sync-barrel-exports.ts`: Export parsing, auto-generated markers
  - `sync-css-theme.ts`: Hash-based caching, Prettier formatting
  - Manual vs automatic execution summary table

- **`docs/dev/dev-environment.md`** (~350 lines) - Development & CI:
  - Development workflow and `pnpm dev` internals
  - Testing configuration (Vitest)
  - E2E testing (Playwright)
  - Linting & formatting (ESLint, Prettier)
  - Git hooks (simple-git-hooks, lint-staged)
  - Docker configuration
  - CI/CD configuration (GitHub Actions)
  - Troubleshooting guide and debug commands

Updated `docs/INDEX.md` with new document references and keyword routing.

### Documentation Review & Consistency Fixes

Comprehensive review of all 36 markdown files to ensure consistency with current codebase:

- **Package Naming Fixes:**
  - Fixed `@abeahn/ui` → `@abe-stack/ui` in `packages/ui/README.md`
  - Fixed `@abeahn/shared` → `@abe-stack/core` in `packages/ui/README.md`
  - Fixed `@abeahn-ui` → `@abe-stack/ui` in `docs/dev/testing.md`
  - Fixed `@abeahn/ui` → `@abe-stack/ui` in `packages/ui/docs/_TEMPLATE.md`

- **Security Documentation Updates:**
  - Fixed bcrypt → Argon2id in `docs/README.md` (reflects actual implementation)
  - Updated `docs/todo/security/index.md` to reflect completed Phase 1 features
  - Updated password hashing references throughout security docs

- **Test Count Updates:**
  - Updated test count from `1000+` to `1900+` in `docs/README.md`
  - Updated test coverage table in `docs/dev/testing.md`:
    - packages/ui: 78 files, 772+ tests
    - packages/core: 8 files, 280+ tests
    - packages/sdk: 5 files, 48+ tests
    - apps/web: 25 files, 337+ tests
    - apps/server: 36 files, 508+ tests

- **Path Reference Fixes in `docs/INDEX.md`:**
  - Fixed `dev/use-cases.md` → `agent/use-cases.md`
  - Fixed `ui/todo.md` → `todo/ui/todo.md`
  - Updated Scope Guide with correct directory descriptions

- **Date Updates:**
  - Updated all outdated dates (January 10/15) to January 17, 2026 across:
    - `docs/ROADMAP.md`
    - `docs/INDEX.md`
    - `docs/todo/security/*.md`
    - `docs/todo/realtime/*.md`
    - `docs/todo/ui/todo.md`

- **Testing Documentation:**
  - Updated test example syntax from Jest to Vitest in `packages/ui/README.md`
  - Added `vi.fn()`, `vi.mock()` patterns to examples

### Build & Cache Fixes

- **Vite Glob Import Fix:**
  - Fixed `apps/web/src/features/demo/utils/docs.ts` glob imports
  - Changed from package paths (`@abe-stack/ui/docs/...`) to relative paths (`../../../../../../packages/ui/docs/...`)
  - Package exports don't include docs folder, so relative paths are required for Vite glob imports

- **Desktop Build Fix:**
  - Cleaned up stray compiled `.js` and `.js.map` files from `apps/desktop/src/`
  - These files were causing Rollup to fail with "default is not exported by src/App.js"
  - Added patterns to `.gitignore` to prevent future accidental commits

- **Turbo Cache Fix:**
  - Cleared stale `.turbo` cache that was caching build errors
  - Full rebuild passes: 18/18 tasks successful, 1900+ tests passing

### Documentation Consolidation

- **Deleted `apps/server/TODO.md`:**
  - Completed items (Phases 1-4, MVP) were already documented in CHANGELOG
  - Uncompleted items are covered by `docs/TODO.md` (more detailed product roadmap)
  - Advanced features (CHET-Stack) are in `docs/ROADMAP.md` Milestone 2
  - Security features (MFA, RBAC) are in `docs/ROADMAP.md` Milestone 3
  - Single source of truth: `docs/TODO.md` for product features, `docs/ROADMAP.md` for architectural milestones

### Barrel Export Conversion to Explicit Named Exports

Converted all `export * from` barrel exports to explicit named exports across the codebase for better tree-shaking and clearer dependency tracking.

- **Sync Script Improvements (`sync-barrel-exports.ts`):**
  - Now processes package `src` directories (skips app `src` directories)
  - Added support for parsing async functions (`export async function`)
  - Added support for parsing re-exports (`export { ... } from '...'`)
  - Fixed duplicate export detection when building parent barrels

- **Sync Script Improvements (`sync-import-aliases.ts`):**
  - Added multi-line export tracking to preserve re-exports in index files
  - Added `isMultiLineExportStart()` and `isMultiLineExportEnd()` helpers
  - Re-export lines in index.ts files now keep relative imports instead of being converted to path aliases

- **Converted Index Files:**
  - `packages/core/src/index.ts` - All exports now explicit
  - `packages/core/src/contracts/index.ts` - All exports now explicit
  - `packages/core/src/validation/index.ts` - All exports now explicit
  - `packages/sdk/src/index.ts` - All exports now explicit
  - `packages/ui/src/index.ts` - Manually converted (preserves namespace exports like `export * as elements`)
  - `packages/ui/src/layouts/index.ts` - All exports now explicit
  - `apps/web/src/features/index.ts` - All exports now explicit
  - `apps/web/src/features/demo/index.ts` - All exports now explicit

- **ESLint and Build Fixes:**
  - Added `apps/desktop/src/**/*.js` and `*.js.map` to ESLint ignore (compiled output)
  - Added same patterns to `.gitignore` to prevent accidental commits of compiled files
  - Fixed `MockInstance` type imports in test files for proper type safety

### Lint Error Fixes

Fixed all lint errors throughout the codebase (reduced from 90 to 0 errors):

- **Non-null Assertion Fixes:**
  - `jwt.test.ts` - Replaced `!` assertions with proper conditional checks
  - `static.test.ts` - Added proper null checks for mock call results
  - `security.test.ts` - Used optional chaining with conditional blocks

- **Unsafe Type Fixes:**
  - `security.test.ts` - Added proper type assertions for mock function results
  - `service.test.ts` (auth) - Typed drizzle mock arguments as `unknown[]`
  - `users/service.test.ts` - Typed drizzle mock parameters as `unknown`

- **Import Order Fixes:**
  - `middleware.test.ts` - Moved mocked imports before vitest imports
  - `service.test.ts` (auth) - Reorganized imports in proper order

- **Desktop Build Configuration:**
  - Created separate `src/electron/tsconfig.json` for electron files
  - Updated `eslint.config.ts` to use electron-specific tsconfig
  - Simplified build scripts to use the new tsconfig

### Build and Test Caching

- Added a cached theme CSS build step that skips regeneration when theme inputs are unchanged
- Enabled Turbo cache for the `test` task to reuse results when sources are unchanged
- Added a theme CSS watcher for dev that rebuilds on theme token edits
- Documented sync tooling (including theme CSS watcher) in root README
- Fixed theme CSS generator typing to support both light and dark token sets
- Fixed sync-import-aliases JSON helper typing and cleaned AGENTS markdown lint issues
- Pre-commit hooks now run sync scripts (including theme sync) before linting and type-checks
- Moved desktop Electron sources under `apps/desktop/src/electron` and removed the extra tsconfig
- Disabled auto-opening DevTools in desktop dev to avoid Autofill protocol warnings

### Comprehensive Server Test Coverage

Added 508+ unit tests covering all server modules and infrastructure:

- **Config Tests (91 tests):**
  - `loader.test.ts` - Configuration loading and validation (15 tests)
  - `auth.config.test.ts` - Auth config with JWT, refresh tokens, Argon2, OAuth (27 tests)
  - `database.config.test.ts` - Database config and connection string building (12 tests)
  - `email.config.test.ts` - Email provider selection and SMTP settings (9 tests)
  - `server.config.test.ts` - Server, CORS, and logging configuration (12 tests)
  - `storage.config.test.ts` - Storage provider configuration (7 tests)

- **Infrastructure Tests:**
  - `infra/crypto/jwt.test.ts` - Native JWT implementation (21 tests)
  - `infra/http/security.test.ts` - HTTP security headers and middleware (17 tests)
  - `infra/http/static.test.ts` - Static file serving (11 tests)
  - `infra/security/security.test.ts` - Account lockout and security events (29 tests)
  - `infra/pubsub/pubsub.test.ts` - Postgres PubSub messaging (44 tests)
  - `infra/rate-limit/limiter.test.ts` - Rate limiting (23 tests)
  - `infra/storage/*.test.ts` - Storage providers (48 tests total)
  - `infra/database/*.test.ts` - Transactions and optimistic locking (24 tests)
  - `infra/websocket/websocket.test.ts` - WebSocket connections (8 tests)
  - `infra/health/health.test.ts` - Health check endpoints (9 tests)
  - `infra/email/email.test.ts` - Email service providers (20 tests)

- **Module Tests:**
  - `modules/auth/handlers.test.ts` - Auth route handlers (17 tests)
  - `modules/auth/service.test.ts` - Auth business logic (14 tests)
  - `modules/auth/middleware.test.ts` - Auth middleware (21 tests)
  - `modules/auth/utils/*.test.ts` - JWT, password, refresh tokens (35 tests)
  - `modules/admin/*.test.ts` - Admin handlers and service (8 tests)
  - `modules/users/*.test.ts` - User handlers and service (8 tests)

- **Shared Tests:**
  - `shared/constants.test.ts` - Constants validation (13 tests)
  - `shared/errors.test.ts` - Error classes and utilities (29 tests)

### Test Infrastructure Improvements

- **Database Test Utilities:**
  - Added `asMockDb()` helper for type-safe mock database casting
  - Created standardized mock patterns for Drizzle ORM queries

- **TypeScript Configuration:**
  - Consolidated test configs into main tsconfig.json files
  - Removed separate tsconfig.test.json files (core, sdk, ui packages)
  - Added proper path aliases for test file resolution

- **Test Fixes:**
  - Fixed JWT algorithm validation test (non-empty fake signature for format check)
  - Fixed security test internal function spy assertions
  - Updated vitest mock patterns to v4.x API (`vi.fn<() => T>()` syntax)

### Sync Scripts Improvements

- **Path Alias Generation (`sync-path-aliases.ts`):**
  - Added `MAX_ALIAS_DEPTH=3` to limit alias depth (prevents overly nested aliases)
  - Added `EXCLUDED_ALIAS_NAMES` set to skip common directory names that cause conflicts:
    - `utils`, `helpers`, `types`, `constants` are now excluded from alias generation
  - Shallower directories now take priority for duplicate directory names
  - Fixed recursive scanning to properly handle nested directories

- **Import Alias Handling:**
  - Auth module now uses relative imports (`./utils`) instead of `@utils` alias
  - Barrel files (index.ts) skip alias conversion to maintain relative re-exports
  - Same-directory imports (`./foo`) are preserved as relative

- **All Sync Scripts Exclude `dist` Folders:**
  - `sync-path-aliases.ts` - `SKIP_DIRS` includes `dist`
  - `sync-barrel-exports.ts` - `EXCLUDED_DIRS` includes `dist`
  - `sync-import-aliases.ts` - `EXCLUDED_DIRS` includes `dist`
  - `sync-test-folders.ts` - `EXCLUDED_DIRS` includes `dist`
  - `sync-file-headers.ts` - `EXCLUDE_DIRS` includes `dist`

### Path Alias & Build Configuration Fixes

- **Vitest/Vite Alias Fixes:**
  - Added `@utils` to `uiInternalAliases` for UI package internal imports compatibility
  - Added `@catalog` alias pointing to `src/features/demo/catalog` for web app
  - Added `@shells`, `@containers`, `@layers` to `getUiAliases()` for UI test resolution
  - Removed conflicting `@utils` → core override in web aliases (UI's `@utils` takes precedence)

- **TypeScript Path Fixes:**
  - Fixed `apps/web/tsconfig.json`: `@pages` now points to `./src/pages` (was incorrectly pointing to `./src/features/auth/pages`)
  - Removed `@utils` alias from server tsconfig (now excluded by sync script)

- **Code Fixes:**
  - Fixed `apps/web/src/features/demo/utils/lazyDocs.ts`: Changed glob imports from package alias (`@abe-stack/ui/docs/...`) to relative paths (`../../../../../../packages/ui/docs/...`) since UI package exports don't include docs folder
  - Fixed `apps/server/src/infra/security/events.ts`: Added explicit types for `orderBy` callback and filter callbacks to resolve implicit `any` type errors

### Test File Type-Check Fixes

- **Server Test Files:**
  - `handlers.test.ts`: Fixed import paths from `@utils/index` to relative `../utils`; removed unnecessary `vi.Mock` type casts from `vi.mocked()` calls; fixed `createMockContext()` to properly cast return value as `AppContext`
  - `service.test.ts`: Fixed import paths from `@utils/index` to relative `../utils`; fixed `TEST_CONFIG` type casting with `as unknown as AuthConfig`; removed `extends DbClient` from mock interface; added missing `feedback` and `crackTimeDisplay` properties to `PasswordValidationResult` mocks
  - `websocket.test.ts`: Added `.js` extensions to all relative imports (required by node16/nodenext module resolution); added proper type imports and aliases for dynamic imports
  - `security.test.ts`: Added non-null assertions for mock result access; applied `asMockDb()` helper consistently to all function calls expecting `DbClient`

- **Web Test Files:**
  - `useLazyCatalog.test.tsx`: Updated `vi.fn` generic type syntax from two-parameter form `vi.fn<[Args], Return>()` to function type form `vi.fn<(args: Args) => Return>()` (vitest 4.x API)
  - `lazyDocs.test.ts`: Cast invalid test input `'unknown'` as `never` to suppress type error for intentional invalid category test

### Core Package Constants

- Added `packages/core/src/constants/` module with shared constants:
  - `time.ts` - Time conversion constants (MS_PER_SECOND, SECONDS_PER_MINUTE, etc.)
  - `http.ts` - HTTP status codes (HTTP_STATUS object with typed values)
  - `index.ts` - Barrel exports for constants

### Health Monitoring & Infrastructure Validation

- **Health Check Endpoints:**
  - `GET /health/detailed` - Full service status with latencies for all infrastructure components
  - `GET /health/routes` - Route tree view using Fastify's `printRoutes()`
  - `GET /health/ready` - Kubernetes-style readiness probe (returns 503 if database is down)
  - `GET /health/live` - Kubernetes-style liveness probe (always returns 200 with uptime)

- **Startup Validation Summary:**
  - Server now logs a formatted startup summary showing all service statuses
  - Displays database, email, storage, pubsub, websocket, and rate-limit status
  - Shows environment, listening URL, and route count

- **Infrastructure Improvements:**
  - Added `getSubscriptionCount()` to SubscriptionManager for health monitoring
  - Created `apps/server/src/infra/health/` module with reusable health check utilities
  - Storage default path changed to `../../uploads` (repo root level)

### Development Automation Suite

- Added sync tooling for path aliases, file headers, import aliases, test folders, and barrel exports
- `pnpm dev:start` runs the sync watchers automatically during development
- CI now validates the sync outputs via `sync:*:check` scripts

---

## 2026-01-15

### Documentation Consolidation & Infrastructure Additions

- Consolidated documentation sections and refreshed indices
- Added RBAC scaffolding and Postgres PubSub infrastructure
- Added WebSocket infrastructure for real-time updates
- Expanded auth middleware and request utilities for security logging

### Server Architecture Refactoring & Real-time Features (Complete)

Major refactoring of the server application completed, including real-time capabilities and security hardening:

- **Real-Time Infrastructure:**
  - `infra/websocket/` - WebSocket server with `@fastify/websocket`
  - `infra/pubsub/` - Postgres-based PubSub for horizontal scaling
  - `infra/pubsub/subscriptionManager.ts` - Subscription handling
  - Initial data push on subscription (Chet-stack pattern)

- **Security Hardening:**
  - **Trust Proxy:** Enabled `trustProxy` for correct IP detection behind proxies
  - **Safe IP Extraction:** Removed manual `x-forwarded-for` parsing
  - **JWT:** Strict algorithm (`HS256`) and format validation
  - **Error Handling:** Standardized `ApiErrorResponse` shape and global error handler

- **New Config System:**
  - `config/loader.ts` - Centralized configuration loading
  - `config/types.ts` - Configuration type definitions
  - Split config files: `auth.config.ts`, `database.config.ts`, `email.config.ts`, `server.config.ts`, `storage.config.ts`

- **Infrastructure Enhancements:**
  - `infra/database/client.ts` - Database client management
  - `infra/database/` - Optimistic locking utilities for version-based concurrent updates
  - `infra/email/` - Refactored email service with shared templates
  - `infra/email/` - Email template layout helper for consistent HTML emails
  - `infra/storage/` - Storage providers (Local/S3) with static file serving for local dev
  - `infra/security/` - Security lockout and types
  - `infra/pubsub/` - `publishAfterWrite` helper for post-write notifications
  - `infra/rate-limit/` - Rate limiter with custom store support

- **Authentication Enhancements:**
  - Password strength validation with feedback (zxcvbn-based scoring)
  - Service container pattern (`App` class) for dependency management

- **Logging:**
  - Pino structured logging with request context

- **Module Refactoring:**
  - `modules/` - Handlers refactored to use centralized `preHandler` middleware for auth
  - Removed duplicate error classes in favor of `shared/errors.ts`

---

## 2026-01-13

### Session - Build Tooling & Codebase Simplification

- **Pre-commit Type-check:** Added TypeScript type-checking to pre-commit hooks
- **pnpm Update:** Updated pnpm lockfile
- **Codebase Refactoring:** General code simplification and cleanup
- **Linting:** Applied lint fixes and formatting

---

## 2026-01-12

### Session - Hybrid Infra/Modules Architecture

Adopted a hybrid architecture separating infrastructure from business modules:

- **Infrastructure Layer (`infra/`):**
  - `ctx.ts` - ServerEnvironment type definition
  - `factory.ts` - createEnvironment, createMockEnvironment factories
  - `email/` - ConsoleEmailService, SmtpEmailService implementations
  - `security/` - Login lockout, security events

- **Modules Layer (`modules/`):**
  - `auth/` - Authentication middleware, handlers, utilities (JWT, password, refresh-token)

- **Pattern Change:**
  - Routes now import handlers from `modules/auth`
  - Backwards-compatible re-exports maintained in `lib/` and `services/`

### Session - ServerEnvironment Pattern & Custom Error Types

**Part 1: ServerEnvironment Context Object Pattern (chet-stack inspired)**

Following the pattern from chet-stack, implemented a single `ServerEnvironment` object that acts as an entry point for all server dependencies. This is the "Context Object" pattern, standard in GraphQL (Apollo) and Go backend services.

- **New Files:**
  - `apps/server/src/infra/ServerEnvironment.ts` - Type definition
  - `apps/server/src/infra/index.ts` - Barrel exports

- **Pattern Change:**
  - Before: Services decorated on Fastify (`app.db`, `app.storage`)
  - After: Single `ServerEnvironment` passed to handlers (`env.db`, `env.log`)

- **Benefits:**
  - Explicit dependencies (handler signature shows what it needs)
  - Easy to test (pass mock env object)
  - Framework agnostic (handlers don't depend on Fastify)
  - Single source of truth for all services

- **ServerEnvironment Type:**

  ```typescript
  type ServerEnvironment = {
    config: ServerEnv;
    db: DbClient;
    storage: StorageProvider;
    email: EmailService;
    log: FastifyBaseLogger;
  };
  ```

- **Updated Files:**
  - `apps/server/src/server.ts` - Creates environment, passes to routes
  - `apps/server/src/modules/index.ts` - All handlers now receive `env: ServerEnvironment`
  - `apps/server/src/infra/email.ts` - Exported `ConsoleEmailService` and `SmtpEmailService` classes
  - `apps/server/src/types/fastify.d.ts` - Removed storage decoration (kept db for health check)
  - Test files updated with mock ServerEnvironment

**Part 2: Custom HTTP Error Types**

Added type-safe custom error classes with HTTP status codes to `packages/core`:

- **New File:** `packages/core/src/errors.ts`

- **Error Classes:**
  - `HttpError` - Abstract base class
  - `ValidationError` (400) - Invalid input
  - `UnauthorizedError` (401) - Missing/invalid auth
  - `PermissionError` (403) - Lacks permission
  - `NotFoundError` (404) - Resource not found
  - `ConflictError` (409) - Transaction conflict
  - `UnprocessableError` (422) - Semantic validation error
  - `BrokenError` (424) - Server-side invariant broken
  - `RateLimitError` (429) - Rate limited

- **Utilities:**
  - `isHttpError()` - Type guard
  - `getSafeErrorMessage()` - Safe message for API responses
  - `getErrorStatusCode()` - Get status code from error

**Part 3: Configuration Fix**

- Renamed `.npmrc` to `.pnpmrc` to fix npm warning about unknown `store-dir` config

---

## 2026-01-10

### Session - Phase 2 Security Hardening Complete

**Database Transaction Support:**

- Created transaction wrapper utilities with `withTransaction()` helper
- Applied atomic transactions to registration, login, and token rotation
- Prevents orphaned database records during auth operations

**Token Reuse Security Event Logging:**

- Added `security_events` table with comprehensive indexing
- Created security event logging infrastructure with severity levels
- Logs token reuse attempts, family revocations, account lockouts, admin unlocks
- Added metrics and user activity query functions

**IP Extraction Proxy Validation:**

- Enhanced IP extraction with proxy validation
- Only trusts x-forwarded-for when `TRUST_PROXY=true`
- Validates immediate proxy against `TRUSTED_PROXIES` list
- Limits proxy chain depth to prevent spoofing
- Supports CIDR notation for trusted proxy ranges

**Admin Unlock Endpoint:**

- Added `POST /api/admin/auth/unlock` endpoint
- Requires admin role with JWT authentication
- Logs unlock events with admin user ID for audit trail

**Error Message Audit:**

- Centralized all error messages in constants
- Removed inline error strings from route handlers
- Prepared for future internationalization (i18n)

### Session - Documentation Reorganization

- Reorganized documentation into hierarchical structure under `docs/`
- Created consolidated README.md, CHANGELOG.md, and ROADMAP.md
- Organized architecture docs under `docs/architecture/`
- Moved realtime docs to `docs/architecture/realtime/`
- Security docs now under `docs/todo/security/`
- Development guides under `docs/dev/`
- Fixed TypeScript strict mode errors in test files
- Added proper null checks to array access in tests
- Installed `@types/nodemailer` for email service

---

## 2026-01-04

### Session 23 - File Reorganization

- **Component Classification Cleanup:**
  - Moved `Image.tsx` and `Card.tsx` from `elements/` to `components/` (have state/compound patterns)
  - Moved `Toaster.tsx` from `components/` to `elements/` (simple wrapper)
  - Moved `ResizablePanel.tsx` from `components/` to `layouts/shells/`
  - Moved `ProtectedRoute.tsx` from `components/` to `layouts/layers/`
  - Moved `AuthLayout.tsx` from `layouts/shells/` to `layouts/containers/`

- **Path Aliases:** Added @components, @elements, @hooks, @layouts, @styles, @test, @theme, @utils to packages/ui

- **Final Structure:**
  - Components (16): Accordion, Card, Dialog, Dropdown, FocusTrap, FormField, Image, LoadingContainer, Pagination, Popover, Radio, RadioGroup, Select, Slider, Tabs, Toast
  - Elements (24): Alert, Avatar, Badge, Box, Button, Checkbox, CloseButton, Divider, EnvironmentBadge, Heading, Input, Kbd, MenuItem, Progress, Skeleton, Spinner, Switch, Table, Text, TextArea, Toaster, Tooltip, VersionBadge, VisuallyHidden
  - Layouts/Shells (6): AppShell, BottombarLayout, LeftSidebarLayout, ResizablePanel, RightSidebarLayout, TopbarLayout
  - Layouts/Containers (4): AuthLayout, Container, PageContainer, StackedLayout
  - Layouts/Layers (4): Modal, Overlay, ProtectedRoute, ScrollArea
  - Hooks (13): useClickOutside, useControllableState, useCopyToClipboard, useDebounce, useDisclosure, useHistoryNav, useKeyboardShortcuts, useLocalStorage, useMediaQuery, useOnScreen, usePanelConfig, useThemeMode, useWindowSize

### Session 22 - ResizablePanel & DemoPage Fixes

- Added `reverse` prop to `ResizablePanelGroup` for column-reverse/row-reverse flex direction
- Fixed bottom bar and right bar positioning in DemoPage
- Fixed topbar header centering with equal-width containers

---

## 2026-01-03

### Session 21 - Major Feature Implementation

**Part 1: Provider Architecture**

- Created `AppProviders` component consolidating QueryClientProvider, AuthProvider, ApiProvider, HistoryProvider
- QueryClient created outside component to prevent recreation on re-renders

**Part 2: ThemeProvider**

- Created `ThemeProvider` and `useTheme` hook with mode, cycleMode, isDark, isLight, resolvedTheme
- localStorage persistence and data-theme attribute management
- 21 tests covering all functionality

**Part 3: Complete Auth System with Refresh Tokens**

- Database: Added `role` field to users, created `refreshTokens` table
- Server: Access tokens expire in 15 minutes, 7-day refresh tokens
- Routes: Register/Login create refresh tokens, Refresh rotates tokens, Logout invalidates
- Frontend: Auto-refresh interval (13 minutes), role-based access

**Part 4: DB Seeds**

- Seed script creates test users: admin@example.com, user@example.com, demo@example.com
- All use password: `password123`

---

## 2026-01-02

### Session 20 - Component Extraction

- **Extracted to packages/ui:**
  - `Kbd` - keyboard key display with size variants
  - `FormField` - label, error, helper text, required indicator
  - `LoadingContainer` - Spinner + Text for loading states
  - `EnvironmentBadge` - environment status display
  - `VersionBadge` - version display with optional prefix

- **New Hooks:**
  - `useKeyboardShortcuts` - global shortcuts with modifier support
  - `useThemeMode` - theme mode management with localStorage
  - `usePanelConfig` - panel configuration for resizable layouts

- **CSS Utilities:** Created `utilities.css` with `ui-` prefixed classes

### Session 19 - toastStore & HistoryProvider Extraction

- Moved `toastStore` to `packages/core/src/stores/toastStore.ts`
- Moved `HistoryProvider/useHistoryNav` to `packages/ui/src/hooks/useHistoryNav.tsx`
- Moved `ProtectedRoute` to `packages/ui/src/components/ProtectedRoute.tsx`
- Moved `Toaster` to `packages/ui/src/components/Toaster.tsx`

### Session 18 - DemoShell Enhancements

- Added version info (v1.1.0), environment badge, component count to bottom bar
- Added keyboard shortcuts: L (left panel), R (right panel), T (theme), Esc (deselect)
- Fixed panel size persistence with controlled mode

---

## 2026-01-01

### Sessions 1-17 - Testing Framework & TDD

**Testing Infrastructure (Session 1):**

- Installed @testing-library/user-event, msw@2.12.7, vitest-axe
- Created MSW configuration with handlers and server setup
- Created comprehensive testing documentation

**TDD Test Enhancements:**

- Switch: 1 → 24 tests
- Accordion: 2 → 33 tests
- Checkbox: 2 → 39 tests
- Dialog: 5 → 45 tests
- Dropdown: 4 → 39 tests
- Image: 6 → 47 tests (**Found real bug: state not reset on src change**)
- Modal: 4 → 51 tests
- Overlay: 1 → 35 tests
- Pagination: 2 → 39 tests
- Popover: 2 → 45 tests
- Radio: 2 → 39 tests
- RadioGroup: 3 → 35 tests
- Select: 2 → 20 tests

**Component Refactoring:**

- Implemented `RadioGroupContext` for proper context propagation
- Fixed Select keyboard navigation to skip disabled options
- Added `aria-activedescendant` to Select for accessibility

**Final Test Count:** 724 tests in packages/ui

---

## 2025-12-31

### UI Package Enhancements

- **Elements (~25):** Accordion, Alert, Avatar, Badge, Card, Checkbox, Divider, Dropdown/MenuItem, Heading, Input/TextArea, Modal/Overlay/Dialog, Pagination, Popover, Progress, Radio, Select, Skeleton, Slider, Switch, Tabs, Text, Toast, Tooltip, VisuallyHidden

- **Infrastructure:**
  - Hooks: useDisclosure, useControllableState, useClickOutside, useMediaQuery
  - Theme: colors, spacing, typography tokens with light/dark mode
  - Layouts: Container, AuthLayout, SidebarLayout, StackedLayout
  - Utils: cn (classname merging)

- **Demo:** Component gallery at `/features/demo`

---

## 2025-12-30

### Package Releases - v1.1.0

**@abe-stack/core (formerly @abeahn/shared) v1.1.0:**

- New secondary export paths for granular imports:
  - `@abe-stack/core/contracts` - Import only API contracts (ts-rest)
  - `@abe-stack/core/utils` - Import only utility functions (tokenStore)
  - `@abe-stack/core/env` - Import only environment validation
- Main export continues to work (100% backward compatible)

**@abe-stack/sdk (formerly @abeahn/api-client) v1.1.0:**

- Secondary export paths for granular imports:
  - `@abe-stack/sdk/types` - Import only TypeScript types
  - `@abe-stack/sdk/client` - Import only the API client factory
  - `@abe-stack/sdk/react-query` - Import only React Query integration
- Better tree-shaking for type-only imports

### UI Refinements (Sessions 20-52)

- ResizablePanel: collapsed styling, separator drag callbacks, invertResize support
- ScrollArea: custom scrollbar with fade-in/out, WebKit box-shadow technique
- Theme: Added `--ui-layout-border`, success/danger text tones
- Select: matched option typography to trigger, chevron toggle icon
- Dialog: styled trigger button for dark mode
- AuthLayout: card background to theme surface color

---

## 2025-12-29

### Major Documentation Overhaul

- Created CLAUDE.md (2600+ lines) - comprehensive development guide
- Created AGENTS.md - AI agent quick reference
- Split into modular `dev/` structure for context window optimization
- Established documentation workflow: log.md, TODO.md, milestone.md
- Quality gates: format, lint, type-check, test must pass

### Foundation Work

- Aligned API prefixing under `/api`
- Introduced `@abe-stack/server` with local and S3 providers
- Added UI elements: Flex, Stack, Text, Heading, Surface, and more
- Auth route tests and Playwright auth scaffold

---

## Pre-2025-12-29

### Core Stack Established

- **Monorepo:** Turborepo + pnpm workspaces, TS project refs
- **Backend:** Fastify + ts-rest + Drizzle, JWT auth, health checks
- **Frontend:** Vite + React, AuthContext, ProtectedRoute
- **API Client:** Type-safe client with bearer token injection
- **Testing:** Vitest config, Playwright scaffold
- **Infrastructure:** Docker, db restart scripts, export:ui script

---

## Package Release History

### @abe-stack/ui

#### [1.1.0] - 2026-01-03

**Added:**

- `ThemeProvider` component with `useTheme` hook for theme context
- `useKeyboardShortcuts` hook for global keyboard shortcuts with modifier support
- `useThemeMode` hook for theme mode management (system/light/dark)
- `usePanelConfig` hook for panel configuration with localStorage persistence
- `Kbd` component for keyboard key display with size variants
- `FormField` component with label, error message, helper text support
- `LoadingContainer` component combining Spinner and Text
- `EnvironmentBadge` component for environment status display
- `VersionBadge` component for version display
- `ProtectedRoute` component for auth-protected routes
- `Toaster` component for toast notifications
- `HistoryProvider` and `useHistoryNav` hook for history navigation
- CSS utilities in `utilities.css` for flex, gap, padding, margin, typography

**Changed:**

- `ResizablePanel` now supports controlled mode with `size` prop
- `ResizablePanelGroup` now supports `reverse` prop for flex direction
- Consolidated component styles into `components.css`
- Moved layout styles into `layouts.css`

**Fixed:**

- `Image` component now resets loading/error state when `src` prop changes
- `ResizablePanel` collapsed panel styling and animation
- `ScrollArea` scrollbar visibility and fade behavior
- Dark mode contrast improvements for toast, tooltip, and text elements

#### [1.0.0] - 2026-01-01

**Added:**

- Modern React testing stack (user-event, msw, vitest-axe)
- Comprehensive test coverage for 21+ element components
- MSW configuration for network mocking
- Accessibility testing with vitest-axe

**Changed:**

- Enhanced component tests with userEvent instead of fireEvent
- Added edge case coverage for all interactive components

**Fixed:**

- `Image` component state reset on src change (found through TDD)
- `Select` keyboard navigation now skips disabled options
- `RadioGroup` context propagation for name/value sharing

#### [0.9.0] - 2025-12-31

**Added:**

- Hooks: useDisclosure, useControllableState, useClickOutside, useMediaQuery
- Theme tokens: colors, spacing, typography
- Layout components: Container, AuthLayout, SidebarLayout, StackedLayout
- Utils: cn (classname utility)
- ComponentGallery page, Toaster with zustand, FocusTrap, Polymorphic Text/Heading

#### [0.8.0] - 2025-12-30

**Added:**

- Overlay, Modal, Drawer, Progress, Skeleton components
- Alert, InputElement, TextArea, Select elements
- Dropdown/MenuItem, Pagination, Table, Popover, Switch, Checkbox, Radio elements

#### [0.7.0] - 2025-12-29

**Added:**

- Dialog compound API (Root, Trigger, Overlay, Content, Title, Description)
- RTL tests for Tabs, Dropdown, Select
- Keyboard/focus tests for interactive components
- Dialog focus trap and focus restoration

#### [0.6.0] - 2025-12-29

**Added:**

- Initial UI element tests for Accordion and Modal
- Accordion toggle/aria-expanded tests
- Modal open/close via overlay tests

#### [0.5.0] - 2025-12-29

**Added:**

- Pruned elements to lean Radix-style set (~25 components)
- Accordion, Alert, Avatar, Badge, Card, Checkbox, Divider, and more

#### [0.4.0] - 2025-12-29

**Added:**

- Tooltip, Card, Pill, Link, Tabs, Accordion, Toast elements
- Icon, Avatar, IconButton, Chip, Badge, Kbd, Code elements
- Divider, Spacer, Grid, Container, VisuallyHidden elements

---

### @abe-stack/core (formerly @abeahn/shared)

#### [1.1.0] - 2025-12-30

**Added:**

- Secondary export paths for granular imports:
  - `@abe-stack/core/contracts` - API contracts (ts-rest)
  - `@abe-stack/core/utils` - Utility functions (tokenStore)
  - `@abe-stack/core/env` - Environment validation
- Publishing configuration for npm

**Migration:** No breaking changes - all existing imports continue to work.

#### [1.0.0] - Initial Release

**Added:**

- API contracts with ts-rest for type-safe client-server communication
- Authentication contracts (login, register, refresh, logout)
- User management contracts
- Storage configuration utilities
- Token store for client-side token management
- Environment validation with Zod schemas

---

### @abe-stack/sdk (formerly @abeahn/api-client)

#### [1.1.0] - 2025-12-30

**Added:**

- Secondary export paths for granular imports:
  - `@abe-stack/sdk/types` - TypeScript types only
  - `@abe-stack/sdk/client` - API client factory only
  - `@abe-stack/sdk/react-query` - React Query integration only
- Explicit `exports` field in package.json

**Migration:** No breaking changes - separating React Query from base client reduces bundle size in non-React environments.

#### [1.0.0] - Initial Release

**Added:**

- Type-safe API client using ts-rest
- React Query integration with custom hooks
- Automatic request/response typing
- Token-based authentication support
- Error handling utilities
