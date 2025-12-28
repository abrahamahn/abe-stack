# TODO: Boilerplate Delivery Plan

Guide to make the monorepo production-ready while keeping the renderer-agnostic philosophy (React/React Native/Electron-Tauri as view layers only).

## 1) Foundations & DX

- [ ] Confirm Node/pnpm versions align with repo policy (`>=18.19 <25`, `pnpm@10.26.2`).
- [ ] Harden env loading (`dotenv-flow`) and examples (`config/.env.*`) with required keys for server, email, DB, and client origins.
- [ ] Ensure `pnpm install` succeeds on clean checkout (no optional native deps breaking CI).
- [ ] Add dev bootstrap script to start DB (docker-compose) and run migrations/seed.
- [ ] Wire CI (lint, type-check, test, build) via GitHub Actions (or target CI).
- [ ] Cache strategy for Turbo/PNPM in CI.

## 2) Backend (Fastify + Drizzle + Postgres)

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

## 11) Delivery Checklist

- [ ] Clean install + `pnpm dev` smoke test passes across apps.
- [ ] `pnpm build` succeeds across workspace.
- [ ] `pnpm test`/`pnpm lint`/`pnpm type-check` green locally and in CI.
- [ ] Example environment variables populated for demo auth/email flows.
- [ ] Publish starter `full_code.txt` or similar export for sharing (kept gitignored).
