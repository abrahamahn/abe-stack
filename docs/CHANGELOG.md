# ABE Stack Changelog

**Last Updated: January 15, 2026**

All notable changes to this project are documented here. Format follows semantic versioning principles.

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
  - `infra/email/` - Refactored email service with shared templates
  - `infra/storage/` - Storage providers (Local/S3) with static file serving for local dev
  - `infra/security/` - Security lockout and types

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
