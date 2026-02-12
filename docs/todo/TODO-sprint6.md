# TODO Sprint 6

Source: `docs/todo/TODO.md`
Sprint heading: ### Sprint 6: Post-Launch Platform Maturity & Growth
Unchecked items captured: 75

> Auto-generated from TODO.md. This file contains only unchecked checklist items for this sprint.
> **ROADMAP completeness:** Every incomplete (`[ ]`) item in ROADMAP.md is tracked in this sprint.

## 6.1 Passkeys / WebAuthn (ROADMAP Milestone 2)

**Backend — WebAuthn Registration + Authentication:**
- [x] Schema: `webauthn_credentials` table — `id`, `user_id`, `credential_id`, `public_key`, `counter`, `transports`, `device_type`, `backed_up`, `name`, `created_at`, `last_used_at`
- [x] Migration: `0027_webauthn_credentials.sql`
- [x] Repository: `webauthn_credentials` CRUD — create, findByUserId, findByCredentialId, updateCounter, delete
- [x] Service: `core/auth/webauthn/service.ts` — registration challenge, registration verification, authentication challenge, authentication verification
- [x] Service: use `@simplewebauthn/server` for attestation/assertion
- [x] Config: `auth.webauthn` section — `rpName`, `rpId`, `origin`, `attestation` preference

**Routes:**
- [x] Route: `POST /api/auth/webauthn/register/options` — generate registration challenge (protected)
- [x] Route: `POST /api/auth/webauthn/register/verify` — verify attestation, store credential (protected)
- [x] Route: `POST /api/auth/webauthn/login/options` — generate authentication challenge (public)
- [x] Route: `POST /api/auth/webauthn/login/verify` — verify assertion, issue tokens (public)
- [x] Route: `GET /api/users/me/passkeys` — list registered passkeys (protected)
- [x] Route: `PATCH /api/users/me/passkeys/:id` — rename passkey (protected)
- [x] Route: `DELETE /api/users/me/passkeys/:id` — delete passkey (protected, requires sudo)

**Client + UI:**
- [x] Client API: WebAuthn methods on `ApiClient` — registration, login, management
- [x] UI: Passkey registration flow — "Add Passkey" button in Security settings → browser prompt → success
- [x] UI: Passkey management list — name, device type, last used, rename/delete actions
- [x] UI: Passkey login option on login page — "Sign in with Passkey" button → browser prompt → dashboard
- [x] UI: conditional UI — show passkey option only when `PublicKeyCredential` is available in browser

**Tests:**
- [x] Unit: challenge generation, attestation verification mock, assertion verification mock, counter validation
- [ ] Integration: register passkey → use to authenticate → verify session created; delete passkey → can't login with it
- [ ] E2E: settings → register passkey → see in list → login with passkey → dashboard (WebAuthn mock in Playwright)

## 6.2 Real-Time Collaboration Hooks (ROADMAP Milestone 1, Phases 1+2+3+6)

**Tests:**
- [ ] E2E: two browser tabs → edit in tab A → see update in tab B; offline → online → sync

## 6.3 Platform Developer Experience (ROADMAP Infrastructure Improvements)

**Generated API Client (ROADMAP Infrastructure > API Versioning & Typed Client):**
- [ ] Tool: publish as `@abe-stack/api-client` package (or npm-ready output) *(deferred to ROADMAP)*
- [ ] Tool: generate React Query hooks from client definitions *(deferred to ROADMAP)*
- [ ] CI: regenerate client on route/schema changes (pre-commit or CI step) *(deferred to ROADMAP)*

**Tests:**
- [ ] Integration: generated client successfully calls all routes *(deferred to ROADMAP)*

## 6.4 Scaling & Performance Infrastructure

**Caching Layer:**
- [ ] Service: session store in Redis (optional, for horizontal scaling) — deferred (JWT-based, no server sessions)

**Horizontal Scaling:**
- [ ] Infra: shared job queue — Redis-backed queue for multi-instance job processing — deferred (MemoryQueueStore sufficient)

**CDN & Asset Optimization:**
- [ ] Infra: CDN configuration for static assets (Cloudflare, CloudFront, or BunnyCDN) — deferred (deployment-specific)
- [ ] Service: asset fingerprinting — Vite already does content hashing
- [ ] Service: image CDN — on-the-fly resize/optimize via CDN transform (or Imgproxy) — deferred
- [ ] Service: edge caching rules — static assets (1 year), API (no-cache), HTML (short TTL) — deferred

**Tests:**
- [ ] Integration: cache hit/miss/invalidation lifecycle
- [ ] Integration: read replica routing — write → primary, read → replica
- [ ] Load test: multi-instance deployment handles 500+ concurrent users

## 6.5 Undo/Redo UI Integration (ROADMAP Milestone 1, Phase 4)

**Tests:**
- [ ] Integration: create record → undo → record removed → redo → record restored
- [ ] E2E: perform action → Ctrl+Z → action reversed → Ctrl+Shift+Z → action restored

## 6.6 Storybook Production Build (CHECKLIST 12)

**Configuration:**
- [ ] Config: Storybook 8+ setup — `main.ts`, `preview.ts`, Vite builder
- [ ] Config: viewport presets — mobile, tablet, desktop
- [ ] Config: accessibility addon — a11y checks in every story

**Stories:**
- [ ] Stories: layouts — AuthLayout, Container, Modal, AppShell, ResizablePanel, SidePeek
- [ ] Stories: patterns — forms, navigation, data tables, loading states, error states, empty states
- [ ] Stories: billing — PlanCard, PricingTable, InvoiceRow, SubscriptionStatus

**CI:**
- [ ] CI: Storybook build step — validate all stories compile without errors
- [ ] CI: Chromatic or Percy — visual regression testing (optional)
- [ ] Deploy: Storybook hosted at `/storybook` or separate subdomain

## 6.7 Internationalization (i18n) Foundation

**Foundation:**
- [ ] Service: i18n framework setup — `react-intl`, `react-i18next`, or lightweight custom solution
- [ ] Service: message extraction — extract all user-facing strings to locale files
- [ ] Config: default locale (`en-US`), fallback behavior
- [ ] Config: locale detection — browser preference → user preference → default

**Infrastructure:**
- [ ] Service: locale files structure — `locales/en-US.json`, `locales/es.json`, etc.
- [ ] Service: lazy-load locale files — only load active locale, not all
- [ ] Service: date/time/number formatting — use `Intl` APIs with user's locale
- [ ] Service: pluralization rules — handle singular/plural/zero forms

**Integration Points:**
- [ ] UI: language selector in user preferences (settings)
- [ ] API: `Accept-Language` header support — localized error messages from server
- [ ] DB: user preference `locale` column (add to preferences if not exists)

**Tests:**
- [ ] Unit: string interpolation, pluralization, date formatting per locale
- [ ] Integration: set locale preference → API returns localized messages
- [ ] E2E: switch language → UI text updates → refresh → preference persisted

## 6.8 Real-Time Data Permissions (ROADMAP Milestone 1, Phase 5)

**Row-Level Validation:**
- [ ] Service: row-level read validation — filter records by user's permission set before returning
- [ ] Service: row-level write validation — reject writes to records user cannot modify
- [ ] Service: permission records loading — preload user's permissions on connection/auth

**Permission Patterns:**
- [ ] Service: workspace permission pattern — workspace members see workspace records
- [ ] Service: board/project permission pattern — per-board access control (viewer, editor, admin)
- [ ] Service: task/record ownership pattern — owner + shared-with permissions
- [ ] Service: permission inheritance — workspace admin overrides board-level restrictions

**Integration with Real-Time Hooks:**
- [ ] Service: permission-aware subscriptions — WebSocket only publishes to authorized subscribers
- [ ] Service: permission change propagation — revoke access → remove from subscription + client cache
- [ ] Client: `useRecord`/`useRecords` honor permissions — 403 graceful handling in hooks

**Tests:**
- [ ] Unit: permission evaluation for read/write across ownership/role/share patterns
- [ ] Integration: user A writes record → user B (no permission) does not receive update
- [ ] Integration: permission revoked → user stops receiving updates immediately
- [ ] E2E: share record with teammate → teammate sees it; revoke → teammate loses access
