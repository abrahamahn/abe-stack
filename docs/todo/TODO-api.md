# TODO API Standardization Plan

Last updated: 2026-02-13

## Phase Tracker

- [x] Phase 1: Contract + Runtime Schema Foundation (**Completed**)
- [x] Phase 2: Client API Centralization Adoption (**Completed**)
- [x] Phase 3: Server Registration Alignment to Shared Router (**Completed**)
- [x] Phase 4: CI Governance Enforcement and Cleanup (**Completed**)
- [x] Phase 5: Response Shape Normalization + Auth Contract Hardening (**Completed**)
- [x] Phase 6: Transport Consistency (CSRF) (**Completed**)
- [x] Phase 7: Contract-Fidelity Governance Checks (**Completed**)
- [x] Phase 8: Rollout Cleanup + Deprecation Removal (**Completed**)

---

## Phase 1: Contract + Runtime Schema Foundation (Completed)

Goal:

- Standardize shared API contracts and runtime schemas across server and `client/api`.

Scope:

- Ensure server routes are represented in shared contracts.
- Ensure route-level request validation uses shared schemas.
- Ensure `client/api` request/response paths use shared runtime parsing where available.
- Establish contract drift and client coverage audits.

Final status:

- Contract drift is currently at:
  - `contract-only = 0`
  - `route-only = 0`
- Client coverage drift is currently at:
  - `uncovered routes = 0`
  - `method mismatches = 0`
- Strict governance checks enabled in CI verification path (`ci:verify`):
  - `pnpm audit:api-governance:strict`
- Runtime validation coverage for mutating routes:
  - `114` mutating routes total
  - `114` routes with runtime schema
  - `0` exceptions

Phase 1 verification notes (2026-02-13):

- Billing mutating routes were verified as schema-backed after fixing manifest adapter schema forwarding.
- Notifications delete route now uses shared runtime schema (`notificationDeleteRequestSchema`) to align route validation with contracts.
- Multipart upload endpoints are now schema-backed via shared schemas:
  - `fileUploadRequestSchema` for `POST /api/files/upload`
  - `avatarUploadRequestSchema` for `PUT /api/users/me/avatar`

Exit criteria:

- No critical contract/runtime mismatches.
- Stable audit baseline accepted for Phase 2 rollout.
- Strict governance checks wired into CI or pre-merge verification workflow.

---

## Phase 2: Client API Centralization Adoption

(Completed)

Goal:

- Centralize API calls into shared clients/adapters and reduce scattered raw endpoint usage.

Scope:

- Migrate remaining app-level raw API calls to `@bslt/api` (or contract-backed adapters).
- Standardize auth/header/retry/error handling paths through common client helpers.
- Remove duplicated route strings in feature code where practical.

Progress (2026-02-13):

- Notifications slice migrated:
  - Extended `@bslt/api` notification client to cover in-app notification endpoints:
    - `listNotifications`
    - `markRead`
    - `markAllRead`
    - `deleteNotification`
  - Web notifications adapter now delegates to centralized `@bslt/api` client instead of owning endpoint strings.
  - Shared notification runtime schemas now align with actual server list response shape (`{ notifications, unreadCount }`) and include mutation response schemas for mark-read/delete.
- Workspace slice migrated:
  - Added centralized workspace client in `@bslt/api` (`createWorkspaceClient`) for tenant/member/invitation operations.
  - Web workspace adapter now delegates to centralized `@bslt/api` workspace client.
- Settings slice migrated:
  - Added centralized settings client in `@bslt/api` (`createSettingsClient`) for profile/password/avatar/sessions/sudo/account-lifecycle/api-key operations.
  - Web settings adapter now delegates to centralized `@bslt/api` settings client.
- Admin slice migrated:
  - Added centralized admin client in `@bslt/api` (`createAdminClient`) for admin user/security/jobs/audit/feature-flag endpoints.
  - Web admin API service now delegates to centralized `@bslt/api` admin client.
- Activities slice migrated:
  - Added centralized activities client in `@bslt/api` (`createActivitiesClient`) for global/tenant activity feeds.
  - Web activities API adapter now delegates to centralized `@bslt/api` activities client.
- Media slice migrated:
  - Added centralized media client in `@bslt/api` (`createMediaClient`) for upload/retrieve/delete/status operations.
  - Web media API adapter now delegates to centralized `@bslt/api` media client.

Remaining high-priority web adapters for Phase 2:

- None currently identified in the Phase 2 high-priority adapter set.

Verification snapshot:

- No `createCsrfRequestClient` usage remains in `main/apps/web/src/features`.
- No non-test raw `fetch(...)` callsites remain in `main/apps/web/src`.

Exit criteria:

- Remaining high-priority raw API call sites migrated.
- Client coverage audit backlog significantly reduced and tracked by domain.

---

## Phase 3: Server Registration Alignment to Shared Router

(Completed)

Goal:

- Move server endpoint authority closer to shared contract/router definitions.

Scope:

- Align server route registration with shared router/contracts as source-of-truth.
- Reduce path/method duplication between server registration and shared contracts.
- Keep route metadata and validation wiring consistent at registration boundaries.

Progress (2026-02-13):

- Added centralized route module registries for server registration/tooling:
  - `main/apps/server/src/routes/routeModules.ts` (app runtime modules)
  - `main/apps/server/src/routes/apiManifestRouteModules.ts` (API-only modules for tooling)
- Updated server route registration to iterate shared module registry:
  - `main/apps/server/src/routes/routes.ts`
- Updated route manifest generator to consume shared API-only module registry:
  - `main/tools/scripts/audit/route-manifest.ts`
- Result: server registration wiring and route-manifest tooling no longer duplicate module-by-module lists.
- Added shared billing route adapter used by both runtime route registration and manifest generation:
  - `main/apps/server/src/routes/billingRouteAdapter.ts`
  - Billing schema/auth adaptation logic no longer duplicated across runtime and audit tooling.

Exit criteria:

- Shared router is authoritative (or near-authoritative) for endpoint identity.
- Drift between server registration and shared contracts is structurally harder to introduce.

Verification snapshot:

- `pnpm -C main/apps/server type-check` passes.
- `pnpm -C main/apps/server test -- routes/routes.test.ts` passes.
- `pnpm route:manifest` runs successfully.

---

## Phase 4: CI Governance Enforcement and Cleanup

(Completed)

Goal:

- Enforce standards continuously and prevent regression.

Scope:

- Enable strict audit commands in CI gates:
  - `pnpm audit:contract-sync:strict`
  - `pnpm audit:api-sync:strict`
  - `pnpm audit:api-governance:strict`
- Document exceptions/exclusions explicitly.
- Remove temporary workaround patterns used during migration.

Exit criteria:

- Strict governance checks are enabled in default CI pipeline.
- API contract/runtime/client sync regressions fail fast in CI.

Final status:

- Strict governance checks are wired into `ci:verify`.
- `pnpm audit:api-governance:strict` is green on current snapshot.

---

## Session Handoff (2026-02-13)

Current completion:

- Phase 1 completed.
- Phase 2 completed.
- Phase 3 completed.
- Phase 4 completed.
- Phase 5 completed.

Latest verified checks:

- `pnpm -C main/client/api type-check` passed.
- `pnpm -C main/client/api build` passed.
- `pnpm -C main/client/api test -- src/api/login-response.test.ts src/api/client.test.ts` passed.
- `pnpm -C main/apps/web type-check` passed.
- `pnpm -C main/apps/web exec vitest run src/features/auth/services/AuthService.test.ts --reporter=dot --silent=passed-only` passed.
- `pnpm -C main/apps/server type-check` passed.
- `pnpm -C main/server/core exec vitest run src/auth/handlers/login.test.ts src/auth/__tests__/handlers.test.ts --reporter=dot --silent=passed-only` passed.
- `pnpm -C main/apps/server test -- routes/routes.test.ts` passed.
- `pnpm route:manifest` passed.
- `pnpm audit:api-governance:strict` passed.

Notes for next session:

- Keep strict governance checks green while expanding audits to response-shape fidelity.
- Continue Phase 6 CSRF transport consistency work.

---

## Phase 5: Response Shape Normalization + Auth Contract Hardening (Completed)

Goal:

- Eliminate runtime response-shape drift and remove permissive client fallback behavior that hides server contract bugs.

Final status:

- Login is standardized to BFF-only canonical success shape (`{ user, ...optionalFlags }`).
- `AUTH_BFF_MODE` / `bffMode` toggles were removed.
- Server login handler now always returns user-only payload.
- Client login parser rejects legacy bearer-style login payloads (`token`/`accessToken`) and accepts canonical BFF + challenge responses only.
- Web auth service hydrates session via `refresh` + `users/me` after login.

Scope:

- Auth endpoints first (`/api/auth/login`, `/api/auth/refresh`, `/api/users/me`), then shared rollout.

Work items:

- [x] Decide canonical success response strategy and document it:
  - Canonical login success for web: BFF user-only payload.
- [x] Normalize auth contracts to canonical shape:
  - `main/shared/src/domain/auth/auth.contracts.ts`
  - `main/shared/src/domain/auth/auth.schemas.ts`
- [x] Normalize `users/me` contract to canonical raw shape:
  - `main/shared/src/domain/users/users.contracts.ts`
- [x] Normalize server auth handler runtime responses to canonical shape:
  - `main/server/core/src/auth/handlers/login.ts`
  - `main/server/core/src/auth/handlers/refresh.ts`
  - `main/server/core/src/users/handlers/profile.ts` (`users/me`)
- [x] Remove non-canonical client response fallbacks and synthetic user fabrication:
  - `main/client/api/src/api/login-response.ts`
  - `main/apps/web/src/features/auth/services/AuthService.ts`
- [x] Standardize on BFF-only auth contract behavior:
  - login may return user-only shape; refresh/`users/me` completes hydration.
- [x] Align OpenAPI route annotations with runtime fields (token vs accessToken):
  - `main/apps/server/src/routes/routes.ts`

Acceptance criteria:

- [x] No synthetic/fabricated user fields in login parsing paths.
- [x] Login success shape is deterministic and documented.
- [x] `Invalid login response shape (keys=user)` only appears for genuinely invalid payloads.
- [x] Auth tests assert exact response shape for login/refresh/me handlers and client parser behavior.

---

## Phase 6: Transport Consistency (CSRF) (Completed)

Goal:

- Ensure all API clients use one consistent auth + CSRF transport model.

Work items:

- [x] Unify `createApiClient` and `createCsrfRequestClient` usage patterns for mutating requests.
- [x] Ensure shared API client singleton config updates include security options needed for CSRF and retries.
- [x] Standardize `getApiClient({...})` initialization in app entry points to prevent stale singleton config drift.

Acceptance criteria:

- [x] No mutating route bypasses CSRF retry handling where required in `client/api`.
- [x] No stale API singleton config drift due to initialization order.

---

## Phase 7: Contract-Fidelity Governance Checks (Completed)

Goal:

- Expand governance from route/method coverage to response payload fidelity.

Work items:

- [x] Add governance audit for response-shape fidelity:
  - contract schema vs runtime handler response.
- [x] Add targeted checks for critical auth endpoints:
  - `/api/auth/login`
  - `/api/auth/refresh`
  - `/api/users/me`
- [x] Fail CI when canonical response shape drifts.

Acceptance criteria:

- [x] Governance fails fast on response-shape drift.
- [x] CI prevents reintroduction of permissive response parsing hacks.

---

## Phase 8: Rollout Cleanup + Deprecation Removal (Completed)

Goal:

- Remove temporary compatibility code once server + client are fully aligned.

Work items:

- [x] Remove transitional parser branches no longer needed after normalization.
- [x] Remove stale TODOs and compatibility comments around auth response drift.
- [x] Update runbooks with explicit troubleshooting for:
  - DB seed failures (must fail hard),
  - auth response mismatch diagnostics.

Acceptance criteria:

- [x] Minimal auth response parsing logic with no legacy compatibility shims.
- [x] Updated documentation reflects current canonical API behavior.
