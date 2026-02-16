# API Contract Matrix (Phase 1 Baseline)

Snapshot date: 2026-02-12

## Scope

This inventory covers:

- Server HTTP routes wired from `main/apps/server/src/routes/routes.ts` and `main/apps/server/src/routes/system.routes.ts`
- Frontend/API consumer surface in `main/client/api/src/*`
- Shared contracts and schemas in `main/shared/src/domain/*`
- Handler/service wiring for core domains

## Classification Legend

- `FULLY_WIRED`: Shared contract exists, shared runtime schema exists, server route enforces runtime schema, and client validates request/response at runtime.
- `PARTIAL_RUNTIME`: Shared runtime schema exists, but only one side (client or server) enforces, or enforcement is incomplete.
- `TYPE_ONLY`: TypeScript types/interfaces are shared, but runtime request/response validation is missing.
- `UNMANAGED`: Endpoint exists but has no shared contract and no shared runtime schema binding.

## A) Client -> Server Route Matrix

Primary focus: endpoints used by `main/client/api/src/*`.

| Endpoint Pattern                                                    | Client Module                      | Server Route Present            | Shared Contract Entry                                                        | Shared Runtime Schema Usage                                           | Classification    | Notes                                                                     |
| ------------------------------------------------------------------- | ---------------------------------- | ------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| `/auth/register`                                                    | `api/client.ts`                    | Yes (`auth/routes.ts`)          | Yes (`authContract.register`)                                                | Server request schema yes, client request parse no, response parse no | `PARTIAL_RUNTIME` | Client uses TS type only for request/response.                            |
| `/auth/login`                                                       | `api/client.ts`                    | Yes                             | Yes (`authContract.login`)                                                   | Server request schema yes, client request parse no, response parse no | `PARTIAL_RUNTIME` | Same pattern across core auth client methods.                             |
| `/auth/refresh`                                                     | `api/client.ts`                    | Yes                             | Yes (`authContract.refresh`)                                                 | Empty body, no schema bind in route                                   | `TYPE_ONLY`       | Contract exists but route uses `undefined` schema.                        |
| `/auth/logout`                                                      | `api/client.ts`                    | Yes                             | Yes (`authContract.logout`)                                                  | Empty body, no schema bind in route                                   | `TYPE_ONLY`       | Same as refresh.                                                          |
| `/auth/forgot-password`                                             | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/reset-password`                                              | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/verify-email`                                                | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/resend-verification`                                         | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/totp/*` (`setup`,`enable`,`disable`,`status`,`verify-login`) | `api/client.ts`                    | Yes                             | Yes                                                                          | Mixed: verify endpoints have schema, setup/status do not              | `PARTIAL_RUNTIME` | No client response parsing.                                               |
| `/auth/magic-link/request`                                          | `api/client.ts`                    | Yes (`magic-link/routes.ts`)    | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/magic-link/verify`                                           | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/change-email`                                                | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/change-email/confirm`                                        | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/change-email/revert`                                         | `api/client.ts`                    | Yes                             | Yes                                                                          | Server request schema yes, client request parse no                    | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/oauth/providers`                                             | `api/client.ts`                    | Yes (`oauth/routes.ts`)         | Yes                                                                          | No request schema (GET), no runtime response parse                    | `TYPE_ONLY`       |                                                                           |
| `/auth/oauth/connections`                                           | `api/client.ts`                    | Yes                             | Yes                                                                          | No response runtime parse                                             | `TYPE_ONLY`       |                                                                           |
| `/auth/oauth/:provider/unlink`                                      | `api/client.ts`                    | Yes                             | Yes                                                                          | No response runtime parse                                             | `TYPE_ONLY`       |                                                                           |
| `/auth/webauthn/register/options`                                   | `api/client.ts`                    | Yes (`webauthn/routes.ts`)      | No explicit contract entry                                                   | No route schema                                                       | `TYPE_ONLY`       | Uses ad-hoc `{ options: Record<string, unknown> }`.                       |
| `/auth/webauthn/register/verify`                                    | `api/client.ts`                    | Yes                             | No explicit contract entry                                                   | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/auth/webauthn/login/options`                                      | `api/client.ts`                    | Yes                             | No explicit contract entry                                                   | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/auth/webauthn/login/verify`                                       | `api/client.ts`                    | Yes                             | No explicit contract entry                                                   | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/users/me`                                                         | `api/client.ts`                    | Yes (`users/routes.ts`)         | Yes (`usersContract.me`)                                                     | No response runtime parse                                             | `TYPE_ONLY`       |                                                                           |
| `/users/me/passkeys`                                                | `api/client.ts`                    | Yes (`webauthn/routes.ts`)      | No explicit users/auth contract entry                                        | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/users/me/passkeys/:id`                                            | `api/client.ts`                    | Yes                             | No explicit contract entry                                                   | Request schema yes (rename), response parse no                        | `PARTIAL_RUNTIME` | Only this passkey route has server request schema.                        |
| `/users/me/passkeys/:id/delete`                                     | `api/client.ts`                    | Yes                             | No explicit contract entry                                                   | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/billing/plans`                                                    | `billing/client.ts`                | Yes (`billing/routes.ts`)       | Yes (`billingContract.listPlans`)                                            | No route schema, no client response parse                             | `TYPE_ONLY`       |                                                                           |
| `/billing/subscription`                                             | `billing/client.ts`                | Yes                             | Yes                                                                          | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/billing/checkout`                                                 | `billing/client.ts`                | Yes                             | Yes                                                                          | Client request parse yes, server route schema no                      | `PARTIAL_RUNTIME` |                                                                           |
| `/billing/subscription/cancel`                                      | `billing/client.ts`                | Yes                             | Yes                                                                          | Client request parse yes, server route schema no                      | `PARTIAL_RUNTIME` |                                                                           |
| `/billing/subscription/resume`                                      | `billing/client.ts`                | Yes                             | Yes                                                                          | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/billing/subscription/update`                                      | `billing/client.ts`                | Yes                             | Yes                                                                          | Client request parse yes, server route schema no                      | `PARTIAL_RUNTIME` |                                                                           |
| `/billing/invoices`                                                 | `billing/client.ts`                | Yes                             | Yes                                                                          | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/billing/payment-methods`                                          | `billing/client.ts`                | Yes                             | Yes                                                                          | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/billing/payment-methods/add`                                      | `billing/client.ts`                | Yes                             | **Contract path mismatch** (`billingContract` expects `/payment-methods`)    | Client request parse yes, server route schema no                      | `PARTIAL_RUNTIME` | Contract and route/path drift.                                            |
| `/billing/payment-methods/:id`                                      | `billing/client.ts`                | Yes                             | Yes                                                                          | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/billing/payment-methods/:id/default`                              | `billing/client.ts`                | Yes                             | Yes                                                                          | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/billing/setup-intent`                                             | `billing/client.ts`                | Yes                             | **Contract path mismatch** (`billingContract` uses `/payment-methods/setup`) | No route schema                                                       | `TYPE_ONLY`       | Contract and route/path drift.                                            |
| `/admin/billing/plans`                                              | `billing/admin.ts`                 | Yes (`admin/routes.ts`)         | No dedicated admin billing contract                                          | No response parse                                                     | `TYPE_ONLY`       | Uses shared admin billing schemas for request only on create/update.      |
| `/admin/billing/plans/create`                                       | `billing/admin.ts`                 | Yes                             | No dedicated contract                                                        | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` | Best aligned path in admin billing subset.                                |
| `/admin/billing/plans/:id`                                          | `billing/admin.ts`                 | Yes                             | No dedicated contract                                                        | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/admin/billing/plans/:id/update`                                   | `billing/admin.ts`                 | Yes                             | No dedicated contract                                                        | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` |                                                                           |
| `/admin/billing/plans/:id/sync-stripe`                              | `billing/admin.ts`                 | Yes                             | No dedicated contract                                                        | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/admin/billing/plans/:id/deactivate`                               | `billing/admin.ts`                 | Yes                             | No dedicated contract                                                        | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/notifications/vapid-key`                                          | `notifications/client.ts`          | Yes (`notifications/routes.ts`) | No notifications contract file                                               | No response parse                                                     | `TYPE_ONLY`       |                                                                           |
| `/notifications/subscribe`                                          | `notifications/client.ts`          | Yes                             | No contract file                                                             | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` |                                                                           |
| `/notifications/unsubscribe`                                        | `notifications/client.ts`          | Yes                             | No contract file                                                             | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` |                                                                           |
| `/notifications/preferences`                                        | `notifications/client.ts`          | Yes                             | No contract file                                                             | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/notifications/preferences/update`                                 | `notifications/client.ts`          | Yes                             | No contract file                                                             | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` |                                                                           |
| `/notifications/test`                                               | `notifications/client.ts`          | Yes                             | No contract file                                                             | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/notifications/send`                                               | `notifications/client.ts`          | Yes                             | No contract file                                                             | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` |                                                                           |
| `/users/me/phone`                                                   | `phone/client.ts`                  | Yes (`auth/routes.ts`)          | No explicit auth contract entry                                              | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` | DELETE variant has no request body schema need.                           |
| `/users/me/phone/verify`                                            | `phone/client.ts`                  | Yes                             | No explicit auth contract entry                                              | Client request parse yes, server request schema yes                   | `PARTIAL_RUNTIME` |                                                                           |
| `/auth/sms/send`                                                    | `phone/client.ts`, `api/client.ts` | Yes                             | No explicit auth contract entry                                              | Phone client parse yes; main api client parse no; server schema yes   | `PARTIAL_RUNTIME` | Inconsistent validation between two clients.                              |
| `/auth/sms/verify`                                                  | `phone/client.ts`, `api/client.ts` | Yes                             | No explicit auth contract entry                                              | Phone client parse yes; main api client parse no; server schema yes   | `PARTIAL_RUNTIME` |                                                                           |
| `/users/me/devices`                                                 | `devices/client.ts`                | Yes (`auth/routes.ts`)          | No contract entry                                                            | No route schema (GET)                                                 | `TYPE_ONLY`       |                                                                           |
| `/users/me/devices/:id/trust`                                       | `devices/client.ts`                | Yes                             | No contract entry                                                            | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/users/me/devices/:id`                                             | `devices/client.ts`                | Yes                             | No contract entry                                                            | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/auth/invalidate-sessions`                                         | `devices/client.ts`                | Yes                             | No contract entry                                                            | No route schema                                                       | `TYPE_ONLY`       |                                                                           |
| `/users/me/api-keys`                                                | `api-keys/client.ts`               | Yes (`api-keys/routes.ts`)      | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       | Handler does ad-hoc parsing.                                              |
| `/users/me/api-keys/create`                                         | `api-keys/client.ts`               | Yes                             | No contract entry                                                            | No shared schema in route; handler manual validation                  | `UNMANAGED`       |                                                                           |
| `/users/me/api-keys/:id/revoke`                                     | `api-keys/client.ts`               | Yes                             | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       |                                                                           |
| `/users/me/api-keys/:id`                                            | `api-keys/client.ts`               | Yes                             | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       |                                                                           |
| `/webhooks`                                                         | `webhooks/client.ts`               | Yes (`webhooks/routes.ts`)      | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       | Shared has webhook domain schemas, but not wired to HTTP contract/routes. |
| `/webhooks/list`                                                    | `webhooks/client.ts`               | Yes                             | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       |                                                                           |
| `/webhooks/:id`                                                     | `webhooks/client.ts`               | Yes                             | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       |                                                                           |
| `/webhooks/:id/update`                                              | `webhooks/client.ts`               | Yes                             | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       |                                                                           |
| `/webhooks/:id/delete`                                              | `webhooks/client.ts`               | Yes                             | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       |                                                                           |
| `/webhooks/:id/rotate-secret`                                       | `webhooks/client.ts`               | Yes                             | No contract entry                                                            | No route schema                                                       | `UNMANAGED`       |                                                                           |

## B) Server Routes Not Represented in `client/api`

These are wired on server but absent from the current frontend API package:

- `system` probes: `/health`, `/health/ready`, `/health/live`, `/health/detailed`
- `realtime`: `/api/realtime/write`, `/api/realtime/getRecords`
- Admin operations beyond billing (users, security, jobs, tenants, route manifest, webhook monitor)
- Notifications in-app operations: `/api/notifications/list`, `/api/notifications/mark-read`, `/api/notifications/mark-all-read`, `/api/notifications/delete`
- Additional users/features routes (consent, export, agreements, tenant features) not exposed in `client/api`

## C) Shared Contract/Schema Coverage Snapshot

Current shared contract files with HTTP `path` entries:

- `auth.contracts.ts`
- `billing.contracts.ts`
- `users.contracts.ts`
- `admin.contracts.ts`
- `jobs.contracts.ts`
- `audit-log.contracts.ts`

Observed gaps:

- No dedicated HTTP contract files for `notifications`, `webhooks`, `api-keys`, `devices`, `phone`, `passkeys` routes.
- Several contract-to-route drifts already present (billing and users path/method mismatches).
- Shared contracts are exported, but not used as the route registration source of truth.

## D) Handler -> Service Wiring Map (Current)

| Domain        | Route File(s)                                                                                                                                                                        | Handler Layer                                                                                                                             | Service Layer                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Auth          | `main/server/core/src/auth/routes.ts`, `main/server/core/src/auth/oauth/routes.ts`, `main/server/core/src/auth/magic-link/routes.ts`, `main/server/core/src/auth/webauthn/routes.ts` | `main/server/core/src/auth/handlers/*`, `main/server/core/src/auth/oauth/handlers.ts`, `main/server/core/src/auth/magic-link/handlers.ts` | `main/server/core/src/auth/service.ts`, oauth/magic-link/webauthn services |
| Users         | `main/server/core/src/users/routes.ts`                                                                                                                                               | `main/server/core/src/users/handlers/*`                                                                                                   | `main/server/core/src/users/service.ts`                                    |
| Billing       | `main/server/core/src/billing/routes.ts`, admin billing in `main/server/core/src/admin/routes.ts`                                                                                    | `main/server/core/src/billing/handlers.ts`, admin handlers in `main/server/core/src/admin/handlers.ts`                                    | `main/server/core/src/billing/service.ts`                                  |
| Notifications | `main/server/core/src/notifications/routes.ts`                                                                                                                                       | `main/server/core/src/notifications/handlers.ts`                                                                                          | `main/server/core/src/notifications/service.ts`                            |
| API Keys      | `main/server/core/src/api-keys/routes.ts`                                                                                                                                            | `main/server/core/src/api-keys/handlers.ts`                                                                                               | `main/server/core/src/api-keys/service.ts`                                 |
| Webhooks      | `main/server/core/src/webhooks/routes.ts`                                                                                                                                            | `main/server/core/src/webhooks/handlers.ts`                                                                                               | `main/server/core/src/webhooks/service.ts`                                 |
| Realtime      | `main/server/realtime/src/routes.ts`                                                                                                                                                 | `main/server/realtime/src/handlers/*`                                                                                                     | `main/server/realtime/src/service.ts` (+ shared pure ops)                  |

## E) Baseline Findings for Standardization Work

1. Route registration is centralized, but contract authority is not.
2. Shared runtime schemas exist and are good quality, but applied inconsistently across domains.
3. `client/api` mixes three patterns:
   - type-only calls
   - request-validated calls (parse before send)
   - ad-hoc interface-only calls with no shared runtime schema
4. Contract drift exists now (billing and users contract path/method mismatch vs live routes).
5. Some handlers still do manual request validation/casting (`api-keys`, `webhooks`) instead of shared schemas.

## F) Immediate Backlog Created by Phase 1

- Add missing contract modules for: notifications, webhooks, api-keys, devices/phone/passkeys.
- Fix existing contract drift:
  - billing setup-intent/payment-methods paths
  - users profile/avatar method/path mismatches
- Define a single endpoint identity format (domain key + method + normalized path).
- Add CI checks:
  - every server route must map to a shared contract key
  - every `client/api` endpoint must map to shared contract key
  - forbid raw `/api/...` endpoint strings outside contract/adapters

## G) Progress Update (Post-Phase 1)

Completed after this baseline was captured:

- Added shared contracts for:
  - `notifications`
  - `webhooks`
  - `api-keys`
- Added these contract groups to centralized `apiRouter`.
- Expanded `authContract` coverage to include:
  - devices
  - phone + SMS challenge
  - session invalidation
  - webauthn + passkeys
- Fixed known contract drift:
  - billing contract paths now match live routes (`/billing/setup-intent`, `/billing/payment-methods/add`)
  - users contract method/path now match live routes (`/users/me/update`, avatar routes)
- Added server route-level runtime validation for API key create/revoke routes via shared schemas.
- Expanded server route-level runtime validation using shared schemas for:
  - WebAuthn routes (register/login request schemas + empty-body enforcement where applicable)
  - Auth core no-body operations (`refresh`, `logout`, `logout-all`, `totp/setup`, `invalidate-sessions`, device trust/revoke, phone delete)
  - OAuth callback query parsing with shared `oauthCallbackQuerySchema`
  - OAuth link/unlink no-body endpoints via `emptyBodySchema`
  - Notifications no-body operations (`test`, `mark-all-read`)
  - API key delete endpoint no-body enforcement
  - Users no-body operations (`avatar/delete`, `sessions/:id` revoke, `sessions/revoke-all`, `reactivate`)
  - Files delete operation (`files/:id/delete`) no-body enforcement
  - Tenants no-body operations (`delete`, member `remove`, invitation `accept`/`revoke`/`resend`/`regenerate`)
  - Admin no-body operations (`impersonate/:userId`, jobs `retry`/`cancel`, webhook delivery `replay`, tenant `unsuspend`, billing `sync-stripe`/`deactivate`)
  - Consent update route now validates request payload via shared schema
  - Data export request route now enforces empty-body schema
  - Legal publish route now validates payload via shared `createLegalDocumentSchema`
  - Feature flags routes now validate create/update/set-override payloads via shared schemas
  - Tenant transfer ownership route now validates request payload via shared schema
  - Client runtime response validation rollout across `main/client/api`:
    - Shared `apiRequest` now supports schema-based response parsing
    - Billing client (+ admin billing), notifications, phone, devices, API keys, and webhooks now parse runtime responses with shared schemas
    - Main auth/user client (`api/client.ts`) now validates core auth, OAuth, TOTP/SMS, magic-link, and passkey response shapes at runtime
  - Added route/contract/client drift tooling with strict failure modes:
    - `pnpm audit:contract-sync` + `pnpm audit:contract-sync:strict`
    - `pnpm audit:api-sync` + `pnpm audit:api-sync:strict`
    - `pnpm audit:api-governance` + `pnpm audit:api-governance:strict`
    - Route audits now auto-generate manifest in-memory when `route-manifest.json` is absent.
  - Fixed route-map collision for phone management:
    - `DELETE /api/users/me/phone/delete` is now registered separately from `POST /api/users/me/phone`.
    - Contract + `client/api` were aligned to the distinct delete endpoint.
  - Added missing billing payment-method dynamic routes:
    - `DELETE /api/billing/payment-methods/:id`
    - `POST /api/billing/payment-methods/:id/default`
  - Audit status (latest run):
    - Contract drift: `contract-only = 0`, `route-only = 0`
    - Client coverage drift: `uncovered routes = 0`, `method mismatches = 0`

Still pending:

- Client-side response validation rollout.
- Server registration directly from `apiRouter` (current registration is still route-map driven).
- Wire strict drift gates into CI default pipeline once current drift backlog is reduced.
