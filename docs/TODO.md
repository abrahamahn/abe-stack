# TODO: Boilerplate Delivery Plan

Guide to make the monorepo production-ready while keeping the renderer-agnostic philosophy (React/React Native/Electron-Tauri as view layers only).

## 1) Foundations & DX

- [x] Confirm Node/pnpm versions align with repo policy (`>=18.19 <25`, `pnpm@10.26.2`).
- [x] Harden env loading (`dotenv-flow`) and examples (`config/.env.*`) with required keys for server, email, DB, and client origins.
- [x] Ensure `pnpm install` succeeds on clean checkout (no optional native deps breaking CI).
- [x] Add dev bootstrap script to start DB (docker-compose) and run migrations/seed.
- [x] Wire CI (lint, type-check, test, build) via GitHub Actions (or target CI).
- [x] Cache strategy for Turbo/PNPM in CI.

## 2) Frontend (Web + Shared UI)

### packages/ui (Reusable UI Library)

- [x] Audit and align primitives/components with industry best practices (accessibility, keyboard nav, ARIA, focus management).
- [x] Standardize component APIs (controlled/uncontrolled patterns, polymorphic typing where needed).
- [x] Expand documentation examples for each component (usage, props, do/don't).
- [x] Add missing UI tests for critical behaviors (a11y, keyboard interactions, focus traps).
- [x] Ensure theme tokens cover spacing, typography, color, and motion consistently.
- [x] Publishable DX: consistent exports, tree-shakeable entrypoints, and clear versioning notes.

### Demo Surface (Live UI Gallery)

- [ ] Implement a dedicated `/demo` page, with a main render area
- [ ] Build a resizable pane layout shell (top/bottom/left/right/center) with mouse drag handles and toggles per pane; persist sizes per user.
- [ ] Center pane renders the active demo; side panes host component docs, prop tables, and usage notes.
- [ ] Top bar: category tabs (primitives, components, hooks, layouts, test, theme, utils) that filter the catalog.
- [ ] Component registry: map each component to demos, states, props schema, and related docs.
- [ ] Demo cards include live controls (props knobs), copyable snippets, and notes for do/don't.
- [ ] Cover primary/secondary/disabled/loading/error/empty states for each component where applicable.
- [ ] Include layout variations (stack, split, grid, dock, modal, drawer, sheet, tabs) and responsive breakpoints.
- [ ] Add interactive UX examples that combine components (forms, search, data table, wizard, auth, notifications).
- [ ] Theme controls: light/dark and density toggles; place the theme switch in the bottom pane with live preview.
- [ ] Keyboard accessibility pass for demo navigation and resize handles; document shortcuts.
- [ ] In-app docs panel links to related `docs/dev` guidance where relevant.

### IMPORTANT: Every single components in packages/ui should be presented in an interactive ui/ux and with toggleable/resizeable top/left/right/bottom bar and main render area on the center.

## 3) Backend (Fastify + Drizzle + Postgres)

- [ ] Serve routes via `@ts-rest/fastify` using the shared contract to keep server/client in lockstep.
- [ ] Define DB schema in `packages/db/src/schema` (users, sessions, verification tokens, audit tables).
- [ ] Migrations: generate and run via `drizzle-kit`; add `pnpm db:migrate` + `pnpm db:push`.
- [ ] Seed script for local dev users and feature toggles.
- [ ] Auth flows: signup, login, logout, refresh, password reset, email verification token issuance/validation.
- [ ] Email service abstraction (provider-agnostic); add local stub transporter + templates.
- [ ] Input validation with Zod; consistent error envelope and status codes.
- [ ] Rate limiting + CORS + Helmet defaults; request logging.
- [ ] Health checks and readiness endpoints.
- [ ] API versioning and OpenAPI/typed client generation hookup (align with `packages/api-client`).

## 3) Frontend (Web)

- [ ] Home shell with resizable panes (top/bottom/left/right/main); persist layout state.
- [ ] Auth screens (signup/login/forgot/reset/verify email) wired to API client.
- [ ] Global query/state setup (React Query), theming, and router guard logic.
- [ ] Error boundary + toasts/snackbars for API errors.
- [ ] Accessibility pass (focus management, keyboard resize handles).
- [ ] E2E happy path (Playwright) for auth and layout resize persistence.

## 4) Desktop (Electron, Tauri-ready)

- [ ] Share UI with web; keep renderer thin.
- [ ] IPC or HTTP strategy for auth/session; secure storage of tokens (keytar/file-safe).
- [ ] Window management mirroring web layout; remember pane sizes across launches.
- [ ] Package signing/build targets (AppImage/NSIS/mac) and auto-update strategy (note if deferred).
- [ ] Document Tauri migration steps (if/when needed).

## 5) Mobile (React Native)

- [ ] Navigation baseline (stack) with auth-protected routes.
- [ ] Screens for auth + minimal home reflecting core layout concepts (tabs/stack + sheet for panes).
- [ ] API client usage with React Query; network error handling.
- [ ] Secure token storage (SecureStore/Keychain/Keystore) and refresh flow.
- [ ] Metro config and build sanity (Android/iOS); add Detox or equivalent E2E (optional).

## 6) Shared Packages

- [ ] `packages/api-client`: align with server routes, re-export types, handle auth headers/refresh, response normalization.
- [ ] `packages/ui`: shared components (buttons, inputs, layout primitives, pane resizers), theme tokens, dark/light support.
- [ ] `packages/shared`: domain types, validation schemas, utilities (date, money, feature flags), logging helpers.
- [ ] `packages/db`: ensure schema exports are tree-shakeable; publish/consume pattern documented.
- [ ] Generate fetch/React Query clients from the shared ts-rest contract for web/desktop/mobile consumption.

## 7) Infrastructure & Ops

- [ ] Dockerfile/docker-compose for server + Postgres + maildev (dev).
- [ ] Production Postgres settings guidance (connection pooling, SSL).
- [ ] Secrets management note (env, Vault, SSM).
- [ ] Observability hooks: request logs, basic metrics, and error reporting placeholders.
- [ ] Backups/retention plan for DB (documented checklist).

## 8) Security & Compliance

- [ ] Password policy + bcrypt cost tuning; account lockout/backoff on brute force.
- [ ] CSRF story (mainly for web forms if cookies are used), CORS allowlist.
- [ ] Input validation coverage; output encoding where needed.
- [ ] Dependencies audit (pnpm audit or npm audit-lite) and update cadence.
- [ ] GDPR-ready data export/delete stubs (documented).

## 9) Testing

- [ ] Unit tests for auth flows and schema validation.
- [ ] Integration tests for API routes (vitest + supertest/fastify inject).
- [ ] Playwright E2E for auth + layout resize persistence.
- [ ] Snapshot/golden tests for key UI components (optional).
- [ ] Test data builders/factories for consistent fixtures.

## 10) Documentation

- [ ] Update README once core features land (status badges, links to docs).
- [ ] Add quickstart guides per app (web/desktop/mobile) under `docs/`.
- [ ] API docs (OpenAPI link or generated client usage) in `docs/api`.
- [ ] Release checklist (versioning, changelog, tagging).
- [x] 2025-12-29 Modularize ARCHITECTURE/TESTING/WORKFLOWS docs and add INDEX.md.
- [x] 2025-12-29 Clarify workflow to not auto-fix pre-existing lint/type-check/test failures.
- [x] 2025-12-29 Split PRINCIPLES, compress PATTERNS/ANTI_PATTERNS, add keyword routing, update Last Updated stamps.
- [x] 2025-12-29 Add context retention summaries, resume mode, session bridge, and migration classification guidance.
- [x] 2025-12-29 Move CLAUDE/AGENTS/GEMINI into docs/ and normalize doc references.
- [x] 2025-12-29 Rename dev overview docs to index.md within their modules and update references.
- [x] 2025-12-29 Fix remaining doc references after index renames.
- [x] 2025-12-29 Normalize agent doc paths/names and align template numbering/testing matrix.
- [x] 2025-12-29 Rename underscore/caps docs to lowercase-hyphen and move coding-standards/performance/use-cases into module folders.
- [x] 2025-12-29 Rename log docs to lowercase (log.md, milestone.md) and update references.
- [x] 2025-12-29 Clarify agent vs dev doc scope in INDEX.md.
- [x] 2025-12-29 Refresh README with doc links, startup paths, guardrails, and test caveat.
- [x] 2025-12-29 Add README Why/5-minute Docker run/architecture diagram/badges.
- [x] 2025-12-29 Add velocity tips, index template, examples index, and expand AGENTS guide.

## 11) Delivery Checklist

- [ ] Clean install + `pnpm dev` smoke test passes across apps.
- [x] `pnpm build` succeeds across workspace.
- [x] `pnpm test`/`pnpm lint`/`pnpm type-check` green locally and in CI.
- [ ] Example environment variables populated for demo auth/email flows.
- [ ] Publish starter `full_code.txt` or similar export for sharing (kept gitignored).
