# ABE Stack Milestones

Current stack

- Monorepo: Turborepo + pnpm workspaces; TS project refs; apps (web, server, desktop, mobile) and packages (shared, db, api-client, ui, storage).
- Tooling: ESLint strict/type-aware, Prettier, simple-git-hooks (pre-commit lint-staged, pre-push lint+type-check), Turbo pipelines.
- TypeScript config: strict mode, incremental builds, shared base config.
- Env: Zod-validated server env (database, JWT, storage, etc.), dotenv-flow.

Backend (Fastify + ts-rest + Drizzle)

- Shared ts-rest contract with Zod schemas under `/api/*`.
- Fastify server with CORS, Helmet, health checks, root/api ping routes.
- Auth routes: register/login/me with JWT issuance/verification.
- DB: Drizzle schema for users; connection builder; server decorates Fastify with `db`.
- Storage: pluggable storage providers (`@abeahn/storage`) with local filesystem and S3 + presigned URLs; storage config derived from env and injected into Fastify.
- JWT handling: lazy secret read with validation; no dev fallback.
- Scripts: seed and DB health-check placeholders.
- Tests: auth contract/integration tests using `fastify.inject`.

API client

- Thin client consuming the shared contract; host-only base URL with `/api` prefixing; optional `fetchImpl`; bearer token injection.
- Types re-exported from shared contract.

Frontend

- Web (Vite + React) wired to api-client/tokenStore; pages (Home, Dashboard, Login), AuthContext/useAuth, ProtectedRoute.
- Playwright auth happy-path scaffold (gated by `E2E_BASE_URL`).
- UI package: web/electron-oriented primitives (Button, Card, Input, Badge, Spinner, Layout, Box).
- Desktop: Electron renderer shell wiring UI components.
- Mobile: React Native starter app.

Shared

- Contracts: auth/users with Zod schemas; exported types; apiContract.
- Env schema and storage config mapping.
- Token store utility (localStorage/memory).
- Utils placeholder.

Testing

- Vitest config shared; server auth tests; Playwright scaffold for web E2E.
- Type-check scripts per package; linting configured globally.

Docs & Developer Experience

- **CLAUDE.md**: Comprehensive development guide (2600+ lines) covering:
  - Core architecture principles (DRY, separation of concerns, React-as-renderer)
  - Framework-agnostic core philosophy and minimal dependencies
  - Development workflows (features, bug fixes, legacy code removal)
  - Common patterns (API client, forms, env vars, DB queries)
  - Anti-patterns with examples
  - Use cases from Anthropic/OpenAI teams
  - Mandatory pre-completion checklist (format, lint, type-check, test)
  - Autonomous work guidelines for AI agents
  - Documentation workflow (log/log.md, TODO.md, dev/testing/index.md)
  - **AGENTS.md**: Quick reference for AI agents with core principles and documentation requirements
  - **log/log.md**: Comprehensive change log documenting all changes, decisions, and technical debt
  - **TODO.md**: Active task list format with status tracking, blockers, and completion dates
  - **dev/testing/index.md**: Testing strategy (unit/contract/integration/e2e), folder structure, coverage expectations
  - **log/milestone.md**: High-level project state tracking (this file)
  - **Quality Gates**: Non-negotiable pre-completion checks ensuring all code passes format, lint, type-check, and test before marking complete
  - **AI Agent Workflow**: Structured start/during/end-of-session requirements for documentation maintenance

UI Package Enhancements (2024-12-31)

- **Primitives (~25 lean components)**: Accordion, Alert, Avatar, Badge, Card, Checkbox, Divider, Dropdown/MenuItem, Heading, Input/TextArea, Modal/Overlay/Dialog, Pagination, Popover, Progress, Radio, Select, Skeleton, Slider, Switch, Tabs, Text, Toast, Tooltip, VisuallyHidden
- **Infrastructure**:
  - Hooks: useDisclosure, useControllableState, useClickOutside, useMediaQuery
  - Theme: colors, spacing, typography tokens with light/dark mode
  - Layouts: Container, AuthLayout, SidebarLayout, StackedLayout
  - Utils: cn (classname merging)
- **Testing**: RTL tests for keyboard navigation, focus management, accessibility (ARIA)
- **Demo**: Component gallery at `/demo` route in apps/web showcasing all primitives with live examples
- **DX Improvements**: Polymorphic Text/Heading typing, FocusTrap for modals, portal-based overlays

Infra/Ops

- pnpm/turbo workspace wiring; Dockerfile/docker-compose present; db restart script; tool scripts folder.
- export:ui script for generating ui_code.txt documentation.
