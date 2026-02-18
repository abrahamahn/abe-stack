# Enterprise SaaS Boilerplate Checklist

> Comprehensive work tracker for BSLT. Each item maps to concrete files.
> Status: [x] done, [-] partial, [ ] not started.
> Last audited: 2026-02-11

---

## Progress Dashboard

| Domain             | DB Layer | Service Logic | HTTP Routes | Client UI | Unit Tests | Integration Tests | E2E (Playwright) | Overall |
| ------------------ | -------- | ------------- | ----------- | --------- | ---------- | ----------------- | ---------------- | ------- |
| **Authentication** | [x] 100% | [x] 100%      | [x] 100%    | [x] ~95%  | [-] ~50%   | [-] ~30%          | [ ] 0%           | ~95%    |
| **Sessions**       | [x] 100% | [x] 100%      | [x] 100%    | [-] ~80%  | [-] ~20%   | [-] ~20%          | [ ] 0%           | ~75%    |
| **Account Mgmt**   | [x] 100% | [x] 90%       | [x] 85%     | [-] ~70%  | [-] ~40%   | [ ] 0%            | [ ] 0%           | ~65%    |
| **Multi-Tenant**   | [x] 100% | [x] 90%       | [x] 90%     | [-] ~60%  | [-] ~40%   | [ ] 0%            | [ ] 0%           | ~70%    |
| **RBAC**           | [x] 100% | [x] 90%       | [x] 80%     | [-] ~60%  | [-] ~20%   | [ ] 0%            | [ ] 0%           | ~65%    |
| **2FA / TOTP**     | [x] 100% | [x] 100%      | [x] 100%    | [-] ~80%  | [-] ~20%   | [ ] 0%            | [ ] 0%           | ~85%    |
| **API Keys**       | [x] 100% | [-] 70%       | [-] 60%     | [ ] 0%    | [ ] 0%     | [ ] 0%            | [ ] 0%           | ~40%    |
| **Billing**        | [x] 100% | [-] 40%       | [-] 30%     | [-] ~40%  | [ ] 0%     | [ ] 0%            | [ ] 0%           | ~40%    |
| **Notifications**  | [x] 100% | [-] 40%       | [-] 20%     | [ ] 0%    | [ ] 0%     | [ ] 0%            | [ ] 0%           | ~30%    |
| **Audit & Events** | [x] 100% | [x] 80%       | [x] 70%     | [-] ~30%  | [ ] 0%     | [ ] 0%            | [ ] 0%           | ~65%    |
| **Compliance**     | [x] 100% | [-] 50%       | [-] 30%     | [-] ~30%  | [ ] 0%     | [ ] 0%            | [ ] 0%           | ~35%    |
| **Realtime**       | [x] 100% | [x] 100%      | [x] 100%    | [-] ~30%  | [-] ~50%   | [ ] 0%            | [ ] 0%           | ~80%    |
| **Media**          | [x] 100% | [x] 90%       | [-] ~20%    | [ ] 0%    | [-] ~60%   | [ ] 0%            | [ ] 0%           | ~50%    |
| **Client Engine**  | n/a      | [x] 90%       | n/a         | [x] 80%   | [-] ~40%   | [ ] 0%            | [ ] 0%           | ~85%    |
| **Infra / CI**     | n/a      | n/a           | n/a         | n/a       | [ ] 0%     | [ ] 0%            | [ ] 0%           | ~70%    |

---

## Next Priority Actions

> Ordered by Day 1 operational necessity, then security value / effort ratio.
> Items 1-6 are **ship blockers**. Items 7+ are post-launch.

| #   | Task                                       | Value             | Effort  | Section  | Status   |
| --- | ------------------------------------------ | ----------------- | ------- | -------- | -------- |
| 1   | ~~Wire session HTTP endpoints~~            | Ship blocker      | Low     | 2.3      | [x] Done |
| 2   | ~~Turnstile / CAPTCHA on public forms~~    | Ship blocker      | Low     | 11.1     | [x] Done |
| 3   | ~~Input normalization (trim + lowercase)~~ | Ship blocker      | Trivial | 1.11     | [x] Done |
| 4   | ~~"Was this you?" security emails~~        | Ship blocker      | Medium  | 11.2     | [x] Done |
| 5   | ~~ToS version gating middleware~~          | Ship blocker      | Low     | 11.3     | [x] Done |
| 6   | ~~Granular login failure logging~~         | Ship blocker      | Low     | 11.4     | [x] Done |
| 7   | ~~Session labeling (UA parsing)~~          | High (UX)         | Low     | 2.5      | [x] Done |
| 8   | ~~Sudo mode middleware~~                   | High (security)   | Low     | 3.1      | [x] Done |
| 9   | Soft delete + cleanup crons                | High (compliance) | Medium  | 9.1, 9.2 | [-]      |
| 10  | ~~Tenant module (CRUD + memberships)~~     | High (B2B)        | High    | 4.2-4.4  | [x] Done |
| 11  | Impersonation                              | High (support)    | Medium  | 7.4      | [ ]      |
| 12  | ~~Email change reversion flow~~            | High (security)   | Medium  | 1.9      | [x] Done |
| 13  | ~~Frontend auth gating~~                   | Medium            | Medium  | 5.3      | [x] Done |

---

## 1. Authentication

> Auth is the most complete domain. All core flows are wired end-to-end
> with HTTP routes, service logic, and client UI.

### 1.1 Registration — [x] Complete

- [x] `POST /api/auth/register` — email + password, validates uniqueness + strength
- [x] Username auto-generation from email (`core/auth/utils/username.ts`)
- [x] Password strength — NIST SP 800-63B (dictionary, personal-info, patterns)
- [x] Sends verification email; graceful fallback if email fails (`emailSendFailed: true`)
- [x] Client: `Register.tsx`, `RegisterForm.tsx`

### 1.2 Email Verification — [x] Complete

- [x] `POST /api/auth/verify-email` — atomic: mark verified + auto-login tokens
- [x] `POST /api/auth/resend-verification` — invalidates old tokens, creates new
- [x] 24-hour expiry, Argon2-hashed storage, anti-enumeration (silent success)
- [x] Client: `ConfirmEmailPage.tsx`

### 1.3 Login — [x] Complete

- [x] `POST /api/auth/login` — email or username (auto-detected via `@`)
- [x] Account lockout after N failures (`core/auth/security/lockout.ts`)
- [x] Progressive delays (1s, 2s, 4s...)
- [x] Timing-safe verification, auto password rehash (background, 3 retries)
- [x] Login attempt logging (IP, user agent, success/fail reason)
- [x] Rejects unverified emails; creates refresh token family
- [x] HttpOnly cookie (Secure, SameSite=Strict)
- [x] Client: `Login.tsx`, `LoginForm.tsx`

### 1.4 Token Refresh — [x] Complete

- [x] `POST /api/auth/refresh` — rotation with RFC 6819 family reuse detection
- [x] Grace period for clock skew (configurable, default 5s)
- [x] HS256 access tokens (userId, email, role)

### 1.5 Logout — [x] Complete

- [x] `POST /api/auth/logout` — deletes refresh token, clears cookie
- [x] `POST /api/auth/logout-all` (protected) — revokes all families

### 1.6 Password Reset — [x] Complete

- [x] `POST /api/auth/forgot-password` — token + email, anti-enumeration
- [x] `POST /api/auth/reset-password` — validates strength, atomic update
- [x] Invalidates old tokens before creating new
- [x] Client: `ResetPasswordPage.tsx`, `ForgotPasswordForm.tsx`, `ResetPasswordForm.tsx`
- [x] **"Forgot password" for logged-in users** — users who logged in via "Remember Me" on a new device may not know their current password; the reset flow should handle existing sessions without requiring logout

### 1.7 Magic Link (Passwordless) — [-] Partial (backend complete, frontend not wired)

- [x] `POST /api/auth/magic-link/request` — rate limited per email + IP
- [x] `POST /api/auth/magic-link/verify` — auto-creates user if new
- [x] Config-gated: `isStrategyEnabled(config, 'magic')`
- [x] `POST /api/auth/set-password` (protected) — lets passwordless users add a password
- [x] Security event logging for all magic link operations
- [ ] Client: magic link request page + verification page (not wired to login flow)

### 1.8 OAuth2 (Google, GitHub, Apple) — [x] Complete

- [x] `GET /api/auth/oauth/:provider` — authorization URL with CSRF state
- [x] `GET /api/auth/oauth/:provider/callback` — code exchange + user creation/login
- [x] `POST /api/auth/oauth/:provider/link` (protected) — link to existing account
- [x] `DELETE /api/auth/oauth/:provider` (protected) — unlink provider
- [x] `GET /api/auth/oauth/connections` (protected) — list connected providers
- [x] Auto-creates user on first OAuth login
- [x] Client: `OAuthButtons.tsx`, `ConnectedAccountsPage.tsx`

### 1.9 Email Change — [x] Complete

- [x] `POST /api/auth/change-email` (protected) — sends verification to NEW email
- [x] `POST /api/auth/change-email/confirm` — atomic email update + token consumption
- [x] **Email change reversion flow** — critical safety net against session hijack:
  1. Send "Verify" email to new address (B)
  2. Send "Notification + Revert Link" email to old address (A)
  3. If A clicks "This wasn't me" → revert email back to A, lock account, kill all sessions
- [x] **Client UI** — settings UI for email change

### 1.10 Two-Factor Authentication (TOTP) — [x] Complete

- [x] `POST /api/auth/totp/setup` (protected) — generate secret + provisioning URI
- [x] `POST /api/auth/totp/enable` (protected) — validates code before enabling
- [x] `POST /api/auth/totp/disable` (protected) — requires code to disable
- [x] `GET /api/auth/totp/status` (protected) — returns enabled/disabled
- [x] Backup codes: 10 single-use, Argon2-hashed
- [x] **TOTP challenge on login** — login returns `202` with `challengeToken` when `user.totpEnabled` (`login.ts:64-73`)
- [x] **Client UI** — settings page for 2FA setup/management
- [x] QR code during setup — `TotpQrCode.tsx` (`apps/web/src/features/settings/components/`)

### 1.11 Input Normalization & Email Canonicalization — [x] Complete

> 10% of support tickets are users typing `" email@gmail.com"` (leading space) and panicking.

- [x] `.trim()` + lowercase all email inputs on ingress (single utility, apply at boundary)
- [x] Gmail dot-insensitivity (`j.doe@gmail.com` = `jdoe@gmail.com`)
- [x] `+` alias stripping (`user+tag@domain.com` → `user@domain.com`) for duplicate detection
- [x] Store both canonical and display form (canonical for lookup, original for display)
- [x] Canonical uniqueness constraint in `users` table
- [x] Apply at all email-accepting endpoints (register, login, forgot-password, invite)

---

## 2. Sessions & Device Security

> Session handlers and HTTP routes are complete. Client UI wiring is the remaining gap.

### 2.1 Infrastructure — [x] Complete

- [x] `user_sessions` table — device_name, device_type, ip_address, user_agent, last_active_at, revoked_at
- [x] Session repository — full CRUD: create, findById, findActiveByUserId, revoke, revokeAll, delete
- [x] Domain schemas — `shared/domain/sessions/sessions.schemas.ts`, `sessions.logic.ts`
- [x] Refresh token family tracking (RFC 6819 reuse detection)

### 2.2 Service Logic — [x] Complete (wired)

All of these exist in `core/users/handlers/sessions.ts` and are registered in routes:

- [x] `listUserSessions()` — lists via refresh token families, marks current session
- [x] `revokeSession()` — validates ownership, prevents revoking current session
- [x] `revokeAllSessions()` — keeps current, revokes rest
- [x] `getSessionCount()` — for "X active sessions" display

### 2.3 HTTP Endpoints — [x] Wired

| Endpoint                                 | Handler    | Route     | Gap |
| ---------------------------------------- | ---------- | --------- | --- |
| `GET /api/users/me/sessions`             | [x] exists | [x] wired | —   |
| `DELETE /api/users/me/sessions/:id`      | [x] exists | [x] wired | —   |
| `POST /api/users/me/sessions/revoke-all` | [x] exists | [x] wired | —   |
| `GET /api/users/me/sessions/count`       | [x] exists | [x] wired | —   |

### 2.4 Security Features — [-] Partial

- [x] Token family reuse detection (RFC 6819)
- [x] Revoke all sessions on password change
- [x] Create `user_sessions` record on login (currently only creates token families)
- [x] Update `last_active_at` on token refresh
- [ ] Session idle timeout enforcement
- [ ] Max concurrent sessions limit

### 2.5 Session Labeling (User-Agent Parsing) — [x] Complete

> Raw User-Agent strings are useless to users. Parse into human-readable labels.

- [x] Parse UA string on login → human-readable format (e.g., "Chrome on macOS", "Safari on iPhone 13")
- [x] Store parsed label in `user_sessions.device_name` / `device_type` columns
- [x] Use lightweight UA parser (manual regex for top browsers)
- [x] Display parsed labels in active sessions list

### 2.6 Security Intelligence — [ ] Not Started

- [ ] **New device / new IP detection** — compare login IP + user agent against known sessions
- [ ] **Suspicious login email alert** — send email on login from unrecognized device or IP
- [ ] **Security event creation** — log `new_device_login` event type with device fingerprint
- [ ] **Geo-IP coarse lookup** — country-level check for impossible travel detection (optional)
- [ ] **Token version invalidation** — `token_version` column on `users` table; bump on password change / 2FA toggle / forced logout; JWT includes version; reject stale tokens without DB round-trip
- [ ] **Trusted device tracking** — user marks device as trusted; skip 2FA for N days
- [ ] **Concurrent session cap** — configurable max sessions per user; evict oldest on overflow

### 2.7 Client UI — [-] Partial

- [x] `SessionCard.tsx` — session card component (`apps/web/src/features/settings/components/`)
- [x] `SessionsList.tsx` — sessions list component with tests
- [x] `useSessions.ts` — sessions management hook
- [x] Wire to settings page navigation — routed in `SettingsPage.tsx`
- [x] Revoke session button per device — wired in `SessionCard.tsx`
- [x] "Log out all other devices" button — wired in `SessionsList.tsx`
- [x] Current session indicator ("This device") — marked in session listing
- [ ] "New login from unknown device" notification banner

---

## 3. Account Management (Self-Service)

> "Day 2" operations — the features users need after initial signup.
> These are quality-of-life flows that distinguish a polished product.

### 3.1 Sudo Mode — [x] Complete

> Re-authenticate before destructive or sensitive operations.

- [x] `POST /api/auth/sudo` — accepts password or TOTP code, returns short-lived sudo token (`core/auth/handlers/sudo.ts` + test)
- [x] Sudo middleware — Fastify preHandler that validates sudo token (`core/auth/security/sudo.ts`)
- [x] Operations requiring sudo: email change, password change, 2FA enable/disable, account delete, API key create/revoke
- [x] Client: re-auth modal — `SudoModal.tsx` + `useSudo.ts` (`apps/web/src/features/settings/`)
- [x] Configurable sudo TTL (default 5 min, max 15 min)
- [x] Security event logging for sudo elevation

### 3.2 Username Management — [x] Complete

- [x] Username auto-generated from email at registration (`core/auth/utils/username.ts`)
- [x] `PATCH /api/users/me/username` — allow user to change username (`core/users/handlers/username.ts`)
- [x] Uniqueness validation (case-insensitive) — `shared/domain/users/username.schemas.ts` + test
- [x] Username cooldown timer (1 change per 30 days) — migration 0020 tracks `last_username_change`
- [x] Username history table / `last_username_change` column — migration `0020_username_change_tracking.sql`
- [x] Reserved username blocklist (admin, system, support, etc.) — in username schemas
- [x] Client: username edit field in profile settings — `UsernameForm.tsx` + `useUsername.ts` (`apps/web/src/features/settings/`)

### 3.3 Avatar Workflow — [-] Partial

- [x] Avatar upload handler (`core/users/handlers/avatar.ts`)
- [x] Client: `AvatarUpload.tsx` + `useAvatarUpload.ts` (`apps/web/src/features/settings/`)
- [-] Upload → validate → resize → store to S3 (handler exists, full pipeline needs verification)
- [ ] `PUT /api/users/me/avatar` — upload endpoint with multipart/form-data (wiring to routes)
- [ ] `DELETE /api/users/me/avatar` — remove custom avatar
- [ ] Fallback chain: custom upload → Gravatar → generated initials
- [ ] CDN cache invalidation on avatar change (ETag or versioned URL)

### 3.4 Profile Management — [-] Partial

- [x] `GET /api/users/me` — returns current user profile
- [x] `ProfileForm.tsx` — profile edit form (`apps/web/src/features/settings/`)
- [x] `PATCH /api/users/me` — update display name, bio, city, state, country (`core/users/handlers/profile.ts` + test)
- [x] Profile completeness indicator — `ProfileCompleteness.tsx` + `useProfileCompleteness.ts` + handler (`core/users/handlers/profile-completeness.ts` + test)
- [x] Extended profile fields (migration 0017: city, state, country, bio)
- [x] Client: full profile edit page in settings (`SettingsPage.tsx`)

### 3.5 Phone / SMS 2FA — [ ] Not Started

- [ ] `POST /api/auth/phone/add` — add phone number, send SMS verification code
- [ ] `POST /api/auth/phone/verify` — verify SMS code, store phone number
- [ ] `DELETE /api/auth/phone` — remove phone 2FA
- [ ] SMS 2FA as fallback when TOTP unavailable
- [ ] (Optional) Phone login (SMS OTP) flow (separate from 2FA)
- [ ] Phone number table or column + SMS provider abstraction
- [ ] Rate limiting on SMS sends (cost control)
- [ ] Client: phone number input + verification code entry in security settings

### 3.6 Account Lifecycle — [-] Partial

- [x] Admin lock/unlock (`POST /api/admin/users/:id/lock`, `.../unlock`)
- [x] Suspended user login rejection (`isAccountLocked()` check)
- [x] `POST /api/users/me/deactivate` — self-service pause (reversible) (`core/users/handlers/lifecycle.ts` + test)
- [x] `POST /api/users/me/delete` — self-service deletion request (requires sudo) (`core/users/handlers/lifecycle.ts` + test)
- [x] Deletion grace period (configurable, default 30 days) + confirmation email — domain logic in `shared/domain/users/lifecycle.logic.ts` + test, migration `0022_account_lifecycle.sql`
- [x] `POST /api/users/me/reactivate` — cancel pending deletion during grace period (`core/users/handlers/lifecycle.ts`)
- [ ] Background job: hard-delete + data anonymization after grace period
- [ ] Data anonymization: replace PII with hashed placeholders, preserve audit trail structure
- [x] Client: account danger zone in settings — `DangerZone.tsx` + `useAccountLifecycle.ts` (`apps/web/src/features/settings/`)

---

## 4. Multi-Tenant / Workspaces

> Database layer is 100% complete. Service + handler + route layer built in Sprint 2.
> Client workspace feature exists. Integration tests and E2E remaining.

### 4.1 Infrastructure — [x] Complete

- [x] `tenants` table — id, name, slug (unique), owner_id, logo_url, is_active, metadata (JSONB)
- [x] `memberships` table — tenant_id, user_id, role (owner/admin/member/viewer), unique(tenant_id, user_id)
- [x] `invitations` table — tenant_id, email, role, status, token_hash, expires_at, unique(tenant_id, email)
- [x] `tenant_settings` table — per-tenant configuration (JSONB)
- [x] All repositories with full CRUD
- [x] Domain schemas + logic (`shared/domain/tenant/`, `shared/domain/membership/`)

### 4.2 Tenant CRUD — [x] Complete

| Endpoint                                      | Status | Notes                                           |
| --------------------------------------------- | ------ | ----------------------------------------------- |
| `POST /api/tenants` — create workspace        | [x]    | `core/tenants/handlers/tenant-crud.ts` + routes |
| `GET /api/tenants` — list user's workspaces   | [x]    | Handler + route wired                           |
| `GET /api/tenants/:id` — get workspace        | [x]    | Handler + route wired                           |
| `PATCH /api/tenants/:id` — update workspace   | [x]    | Handler + route wired                           |
| `DELETE /api/tenants/:id` — delete workspace  | [x]    | Handler + route wired                           |
| Auto-create default workspace on registration | [ ]    | Not yet integrated with auth register flow      |

Client: `CreateWorkspaceDialog.tsx`, `WorkspaceList.tsx`, `WorkspaceSettingsForm.tsx`, `WorkspaceDetailPage.tsx`, `WorkspaceListPage.tsx` (`apps/web/src/features/workspace/`)

### 4.3 Membership Management — [x] Complete

| Endpoint                                                  | Status | Notes                                                     |
| --------------------------------------------------------- | ------ | --------------------------------------------------------- |
| `GET /api/tenants/:id/members` — list members             | [x]    | `core/tenants/handlers/members.ts` + route                |
| `POST /api/tenants/:id/members` — add member              | [x]    | Handler + route wired                                     |
| `PATCH /api/tenants/:id/members/:userId` — change role    | [x]    | Handler + route wired                                     |
| `DELETE /api/tenants/:id/members/:userId` — remove member | [x]    | Handler + route wired                                     |
| Owner cannot be removed                                   | [x]    | Enforced in membership logic                              |
| Minimum one owner per tenant                              | [x]    | Orphan prevention in `core/tenants/handlers/ownership.ts` |

Service: `core/tenants/membership-service.ts` + test. Client: `MembersList.tsx` (`apps/web/src/features/workspace/`)

### 4.4 Invitation Flow — [-] Partial

| Endpoint                                                | Status | Notes                                           |
| ------------------------------------------------------- | ------ | ----------------------------------------------- |
| `POST /api/tenants/:id/invitations` — create invite     | [x]    | `core/tenants/handlers/invitations.ts` + route  |
| `POST /api/invitations/:token/accept` — accept invite   | [x]    | Handler + route wired                           |
| `POST /api/tenants/:id/invitations/:id/resend` — resend | [x]    | Handler + route wired                           |
| `DELETE /api/tenants/:id/invitations/:id` — revoke      | [x]    | Handler + route wired                           |
| `GET /api/tenants/:id/invitations` — list pending       | [x]    | Handler + route wired                           |
| Send invitation email                                   | [ ]    | No email template content yet                   |
| Accept invite creates membership                        | [x]    | Service logic in `invitation-service.ts` + test |

Service: `core/tenants/invitation-service.ts` + test. Client: `InviteMemberDialog.tsx`, `InvitationsList.tsx`, `AcceptInvitationPage.tsx` (`apps/web/src/features/workspace/`)

### 4.5 Orphan Prevention & Ownership Rules — [x] Complete

> Critical for data integrity: a tenant must always have at least one owner.

- [x] **Block owner removal** — reject `DELETE /api/tenants/:id/members/:userId` if target is last owner
- [x] **Block owner self-leave** — reject if user is sole owner; must transfer ownership first
- [x] **Ownership transfer** — `POST /api/tenants/:id/transfer-ownership` — `core/tenants/handlers/ownership.ts`
- [x] **Cascade on user deletion** — if deleted user is sole owner, transfer to next admin or flag for support
- [x] Domain logic in `shared/domain/membership/membership.logic.ts` + test (`membership.logic.test.ts`)

### 4.6 Role Hierarchy Protection — [x] Complete

> Prevents privilege escalation: users can only assign roles at or below their own level.

| Actor Role | Can Assign                   | Can Remove            | Can Invite As  |
| ---------- | ---------------------------- | --------------------- | -------------- |
| **owner**  | owner, admin, member, viewer | admin, member, viewer | any            |
| **admin**  | member, viewer               | member, viewer        | member, viewer |
| **member** | —                            | —                     | —              |
| **viewer** | —                            | —                     | —              |

- [x] `canAssignRole(actorRole, targetRole): boolean` — in `shared/domain/membership/membership.logic.ts`
- [x] `canRemoveMember(actorRole, targetRole): boolean` — prevent removing higher-ranked users
- [x] Enforce in membership PATCH / DELETE handlers
- [x] Enforce in invitation create handler (cannot invite as higher role)
- [x] Tests for every cell in the matrix above (`membership.logic.test.ts`)

### 4.7 Domain Restrictions — [-] Partial

- [x] `allowed_email_domains` column on `tenants` table — migration `0021_tenant_domain_restrictions.sql`
- [x] Validate invitation email domain against tenant's allowed domains — `shared/domain/tenant/domain-restrictions.ts` + test
- [x] Validate on membership creation (if user email domain changed)
- [x] Admin override: system admins bypass domain restrictions
- [ ] Client: domain allowlist editor in workspace settings

### 4.8 Invitation Lifecycle — [ ] Not Started

- [ ] `expires_at` enforcement — reject acceptance of expired invitations (column exists)
- [ ] Auto-expire cron job — mark expired invitations as `expired` status
- [ ] **Regenerate invitation** — `POST /api/tenants/:id/invitations/:id/regenerate` — new token + new expiry
- [ ] Prevent duplicate invitations — DB unique constraint on `(tenant_id, email)` (exists)
- [ ] Invitation reminder email — configurable N days before expiry
- [ ] Max pending invitations per tenant (configurable limit)

### 4.9 Tenant Scoping & Request Context — [-] Partial

**Exists (shared utilities):**

- [x] `WORKSPACE_ID_HEADER` / `WORKSPACE_ROLE_HEADER` constants
- [x] `getWorkspaceContext()` — reads workspace context from headers
- [x] `assertWorkspaceScope()` — throws if not in workspace scope

**Server integration:**

- [x] Fastify middleware to extract tenant from `x-workspace-id` header — `core/tenants/middleware/workspace-scope.ts` + test
- [x] Validate membership before attaching tenant to request context
- [ ] `tenant_id` auto-filtering on tenant-scoped queries
- [ ] Default tenant selection on login

**Client:**

- [x] Tenant switcher UI component — `TenantSwitcher.tsx` (`apps/web/src/features/workspace/`)
- [x] Workspace context hook — `useWorkspaceContext.ts`

---

## 5. RBAC & Authorization

> Role definitions and route-level guards are complete.
> Per-operation enforcement and frontend gating built in Sprint 2.
> Remaining: conditional menu rendering by role, resource ownership validation.

### 5.1 Definitions — [x] Complete

- [x] System roles: `user`, `admin`, `moderator` (`shared/domain/users/users.roles.ts`)
- [x] Tenant roles: `owner`, `admin`, `member`, `viewer` (`shared/domain/membership/`)
- [x] Permission strings: `canUser()`, `isOwner()`, `isAdmin()` (`shared/domain/users/users.permissions.ts`)
- [x] Policy evaluation engine (`shared/core/policy.ts`)

### 5.2 Backend Enforcement — [-] Partial

- [x] Route-level auth guard — `protectedRoute()` / `publicRoute()` helpers
- [x] Route-level role check — `createRequireRole()`, checks JWT role
- [x] Admin routes enforce `admin` role — `adminProtectedRoute()` wrapper
- [x] Permission checker (row-level) — `server-engine/security/permissions/checker.ts`
- [x] Per-operation permission enforcement in handlers — role hierarchy enforced in tenant membership/invitation handlers
- [x] Per-tenant role enforcement middleware — workspace-scope middleware validates membership (`core/tenants/middleware/workspace-scope.ts`)
- [ ] Resource ownership validation ("is this in the user's tenant?")

### 5.3 Frontend Authorization — [-] Partial

- [x] `ProtectedRoute.tsx` — route-level auth gating component (`client/ui/layouts/layers/` + test)
- [x] `<Can permission="...">` fine-grained gating component — `Can.tsx` + test (`apps/web/src/features/workspace/`)
- [x] `usePermissions()` hook — `usePermissions.ts` + test (`apps/web/src/features/workspace/hooks/`)
- [x] `RequireWorkspaceRole` — role-based route guard component + test (`apps/web/src/features/workspace/`)
- [ ] Conditional menu rendering by role
- [ ] Hide/disable actions by permission

---

## 6. Supporting Modules

### 6.1 API Keys & Programmatic Access

- [x] `api_keys` table + repository (key_hash, scopes, tenant_id, expires_at, revoked_at)
- [x] Repo: findByKeyHash, findByUserId, findByTenantId, create, revoke, updateLastUsedAt
- [x] Service: `core/api-keys/service.ts` — create (hash + store), list (masked), revoke + key generation
- [x] HTTP endpoints: `POST/GET /api/users/me/api-keys`, `DELETE /api/users/me/api-keys/:id` (requires sudo)
- [ ] `Authorization: Bearer <key>` authentication middleware
- [ ] Scope parsing + enforcement on requests
- [ ] Client UI for key management (create with name + scopes, copy once, revoke)

### 6.2 Billing & Subscriptions

- [x] DB: 6 billing tables (plans, subscriptions, invoices, payment_methods, billing_events, customer_mappings)
- [x] Admin plan CRUD (list, create, get, update, deactivate, sync-to-stripe)
- [x] Billing routes conditionally registered on `config.billing.enabled`
- [x] Webhook routes: Stripe (`stripe-webhook.ts`) + PayPal (`paypal-webhook.ts`)
- [x] Provider factory pattern: `billing/factory.ts` → `stripe-provider.ts`, `paypal-provider.ts`
- [-] Entitlements domain logic exists (`shared/domain/billing/billing.entitlements.ts`), service integration pending
- [-] Client UI exists: `BillingSettingsPage.tsx`, `PricingPage.tsx`, `CheckoutSuccessPage.tsx`, `CheckoutCancelPage.tsx` + 5 billing components in `client/ui/` (`InvoiceRow`, `PaymentMethodCard`, `PlanCard`, `PricingTable`, `SubscriptionStatus`)
- [-] Client API layer: `client/api/src/billing/client.ts`, `admin.ts`, `hooks.ts`
- [ ] Subscription lifecycle states end-to-end (trialing/active/past_due/canceled)
- [ ] Stripe checkout session creation + customer portal redirect
- [ ] Usage / seat metering

### 6.3 Audit & Security Events

- [x] Security events table (18+ event types with severity levels)
- [x] Event logging: login, OAuth, lockout, TOTP (`core/auth/security/audit.ts`, `events.ts`)
- [x] Admin API: list, detail, metrics, export (`/api/admin/security/*`)
- [x] General audit log table + repo (`audit_events`)
- [-] Admin UI exists: `SecurityEventsPage.tsx`, `SecurityEventDetailPage.tsx`, `SecurityEventsTable.tsx`, `SecurityEventsFilters.tsx`, `SecurityMetricsCard.tsx`, `SecurityEventCard.tsx`, `ExportDialog.tsx` + hooks (`useSecurityEvents`, `useSecurityMetrics`, `useSecurityEvent`, `useExportEvents`)
- [x] Audit log retention: configurable retention period (default 90 days) + daily cleanup cron
- [ ] Workspace-level audit viewer

### 6.4 Communication & Notifications

- [x] `notifications` table + routes wired
- [x] `email_templates` + `email_log` tables + repos
- [x] Mailer module (`server-engine/mailer/`): client abstraction, SMTP transport, console provider (dev), template renderer
- [ ] SMTP configuration docs + sanity check (dev/prod) so emails can be sent end-to-end
- [x] Notification service + handlers (`core/notifications/service.ts`, `handlers.ts`)
- [x] Push provider factory: FCM provider (`fcm-provider.ts`) + factory pattern
- [-] Push subscriptions, notification preferences (DB done, provider exists, service integration pending)
- [-] Client API layer: `client/api/src/notifications/client.ts`, `hooks.ts`
- [ ] Transactional email templates (Welcome, Verify, Reset, Invite) — template system exists, templates need content
- [ ] Preference center UI
- [ ] In-app notification bell / dropdown
- [ ] Email bounce + unsubscribe handling

### 6.5 File Storage

- [x] `files` table + repository
- [x] S3 storage provider (`server-engine/storage/providers/s3.ts`)
- [x] Media processing pipeline (`server/media/`)
- [-] Avatar upload handler (exists, wiring unclear)
- [ ] File upload/download/delete HTTP endpoints

### 6.6 Activity Tracking

- [x] `activities` table + repository
- [x] Service: `core/activities/service.ts` — log activity, query feed (filtered, paginated)
- [x] Routes: `GET /api/activities` (user feed), `GET /api/tenants/:id/activities` (tenant-scoped feed)
- [ ] Activity logging integration with key handlers (CRUD, membership, billing events)
- [ ] Activity feed UI (timeline component + page/sidebar widget)

### 6.7 Feature Flags & Usage Metering

- [x] `feature_flags` + `tenant_feature_overrides` tables + repos
- [x] `usage_metrics` + `usage_snapshots` tables + repos
- [x] Flag evaluation service: `evaluateFlag(flagKey, tenantId?)` — checks flag value with tenant override
- [x] Admin CRUD routes: `GET/POST/PATCH/DELETE /api/admin/feature-flags`, `PUT /api/admin/tenants/:id/feature-overrides/:flagId`
- [ ] Feature flag evaluation middleware (Fastify preHandler for route gating)
- [ ] Admin UI for flag management
- [ ] Metering counters / hooks

### 6.8 Compliance & Data Privacy

- [x] `legal_documents`, `user_agreements`, `consent_logs` tables + repos
- [x] `data_export_requests` table + repo
- [x] Deletion domain logic + schemas (`shared/domain/compliance/deletion.logic.ts`, `deletion.schemas.ts`)
- [x] ToS version gating middleware — `core/auth/middleware.ts` blocks stale users (see 11.3)
- [x] Account lifecycle handlers — deactivate, delete, reactivate (`core/users/handlers/lifecycle.ts` + test, see 3.6)
- [x] Lifecycle domain logic — `shared/domain/users/lifecycle.logic.ts` + test, `lifecycle.schemas.ts`
- [ ] Data export endpoint (GDPR)
- [ ] Hard delete cron + PII anonymization — domain logic exists, background job needed
- [ ] Consent tracking UI
- [ ] Right to be forgotten implementation

### 6.9 Realtime Engine — [x] Complete (server), [-] Partial (client)

> Entire server module is tested and routes are registered. Client hooks exist.

- [x] Subscription handler (`realtime/handlers/subscribe.ts` + test)
- [x] Sync handler (`realtime/handlers/sync.ts` + test)
- [x] Realtime service (`realtime/service.ts` + test)
- [x] Realtime routes registered in `apps/server/src/routes/routes.ts`
- [x] Domain schemas (`shared/domain/realtime/realtime.schemas.ts`)
- [x] PubSub infrastructure (`shared/utils/pubsub/` — helpers, postgres-pubsub, subscription-manager)
- [x] Client: `RealtimeContext.tsx`, `SubscriptionCache.ts`, `WebsocketPubsubClient.ts`, realtime hooks
- [ ] Client-side reconnection + offline queue integration
- [ ] E2E test: subscribe → publish → receive

### 6.10 WebSocket Transport — [x] Complete

- [x] Connection lifecycle management (`websocket/lifecycle.ts` + test)
- [x] Connection statistics (`websocket/stats.ts` + test)
- [x] Type definitions (`websocket/types.ts`)

### 6.11 Media Processing — [x] Complete (server), [ ] Not Started (HTTP)

> Full tested module. 13+ files with tests. Mentioned only in passing under File Storage.

- [x] Core processor + facade (`media/processor.ts`, `facade.ts` + tests)
- [x] Specialized processors: image, audio, video (each with tests)
- [x] FFmpeg wrapper (`ffmpeg-wrapper.ts` + test)
- [x] Image processing (`image-processing.ts` + test) — resize, crop, format conversion
- [x] Audio metadata extraction (`audio-metadata.ts` + test)
- [x] File type detection + validation (`file-type.ts`, `validation.ts`, `security.ts` + tests)
- [x] Media processing queue with retry (`media/queue/` — jobs, queue, retry + tests)
- [x] Streaming utilities (`media/utils/streaming.ts` + test)
- [x] Media database operations (`media/database.ts` + test)
- [ ] HTTP endpoints for media upload/download/processing
- [ ] Client integration (upload component → media processing pipeline)

---

## 7. Admin & Support Surfaces

### 7.1 User Settings (self-service)

- [x] Profile (name, avatar, bio, city/state/country) — `ProfileForm.tsx`, `AvatarUpload.tsx`, `ProfileCompleteness.tsx` + hooks
- [x] Username — `UsernameForm.tsx` + `useUsername.ts`
- [-] Account (email change — backend done, `EmailChangeForm.tsx` exists)
- [x] Security: `PasswordChangeForm.tsx`, `TotpManagement.tsx`, `TotpQrCode.tsx`, `SudoModal.tsx` + hooks
- [x] Sessions: `SessionsList.tsx`, `SessionCard.tsx`, `useSessions.ts`
- [x] Connected accounts: `OAuthConnectionsList.tsx`
- [x] Danger zone: `DangerZone.tsx` + `useAccountLifecycle.ts` (deactivate / delete)
- [ ] Preferences (theme, locale/timezone, notifications)
- [ ] API key management

### 7.2 Workspace Admin (tenant-level)

- [x] Members list + invite / resend / revoke — `MembersList.tsx`, `InviteMemberDialog.tsx`, `InvitationsList.tsx` (`apps/web/src/features/workspace/`)
- [x] Role management + permission gating — `RequireWorkspaceRole.tsx`, `Can.tsx`, `usePermissions.ts`
- [x] Workspace settings (name / logo / slug / defaults) — `WorkspaceSettingsForm.tsx`
- [ ] Billing page (plan + invoices + portal)
- [ ] Audit log viewer
- [ ] Tenant-level feature flag overrides
- [ ] Domain restrictions editor (allowed email domains)

### 7.3 System Admin (internal)

- [x] User list with filtering + pagination (`UserTable`, `UserFilters`, `UserListPage`)
- [x] User detail view + update (`UserDetailCard`, `UserDetailPage`, `UserActionsMenu`)
- [x] Lock/unlock user accounts
- [x] Security events — full UI: `SecurityEventsPage`, `SecurityEventDetailPage`, `SecurityEventsTable`, `SecurityEventsFilters`, `SecurityMetricsCard`, `SecurityEventCard`, `ExportDialog` + hooks
- [x] Job monitor — UI: `JobsTable`, `JobDetailsPanel`, `JobStatusBadge`, `JobActionsMenu`, `QueueStatsCard` + hooks (`useJobsList`, `useJobDetails`, `useJobActions`, `useQueueStats`)
- [x] Billing plan management (`PlanManagementPage`)
- [x] Admin layout wrapper (`AdminLayout.tsx`)
- [x] Admin API service layer (`adminApi.ts`)
- [x] Role badge component (`RoleBadge.tsx`)
- [x] Route manifest — `GET /api/admin/routes` + admin UI page (`RouteManifestPage.tsx` + `useRouteManifest.ts`)
- [ ] **User search by "everything"** — email, name, `user_id` (UUID), `stripe_customer_id`
- [ ] Tenant search + suspend + plan override
- [ ] Webhook monitor + replay — domain logic exists (`shared/domain/webhooks/` — schemas, logic + tests), DB tables exist (`webhooks`, `webhook_deliveries`), admin UI needed
- [ ] Feature flag management
- [ ] System health dashboard

### 7.4 Impersonation / Shadow Login — [ ] Not Started

> Allows support/admin staff to see the app as a specific user without knowing their password.

- [ ] `POST /api/admin/impersonate/:userId` — generates scoped impersonation token
- [ ] Impersonation token includes: `impersonator_id`, `target_user_id`, short TTL (30 min)
- [ ] Impersonated requests carry original admin identity in audit trail
- [ ] Security event logged: `admin_impersonation_start`, `admin_impersonation_end`
- [ ] Impersonation banner in UI ("You are viewing as user@example.com — End Session")
- [ ] Cannot impersonate other admins (safety guard)
- [ ] All actions during impersonation tagged in audit log with `impersonated_by`
- [ ] Rate limit: max N impersonations per admin per hour

### 7.5 Soft Ban vs Hard Ban — [-] Partial

> Two levels of account restriction for different severity levels.

**Soft Ban (account lock — exists):**

- [x] `POST /api/admin/users/:id/lock` — blocks login, preserves data
- [x] `POST /api/admin/users/:id/unlock` — restores access
- [x] `isAccountLocked()` check on login
- [ ] Lock reason stored and displayed to user ("Your account has been suspended. Reason: ...")
- [ ] Configurable lock duration (permanent or timed auto-unlock)
- [ ] Notification email on lock/unlock

**Hard Ban (data deletion — not started):**

- [ ] `POST /api/admin/users/:id/hard-ban` — schedules data deletion
- [ ] Grace period before hard delete (configurable, default 7 days)
- [ ] Revoke all sessions + tokens immediately
- [ ] Cancel active subscriptions
- [ ] Remove from all tenant memberships (respecting orphan prevention)
- [ ] Background job: anonymize PII after grace period
- [ ] Admin confirmation required (re-enter password or 2FA)

---

## 8. Architecture & Infrastructure

### Backend

**Core Infrastructure:**

- [x] Shared Zod schemas (`@bslt/shared`) + domain contracts (`*.contracts.ts` across auth, billing, users, jobs, audit-log, admin)
- [x] Shared config module (`shared/config/` — env.schema, env.parsers, auth-helpers + config types: auth, infra, notification, services — all tested)
- [x] Request/response validation at boundary
- [x] Module layout: contracts → routes → service → repo → tests
- [x] Route maps: auth, billing, users, admin, realtime, notifications all registered
- [x] Postgres connection + pooling, raw `postgres` driver, type-safe SQL builder (`db/builder/` — conditions, CTE, select, insert, update, delete, window)
- [x] Migrations 0000-0017 all written
- [x] Seed scripts + bootstrap admin
- [x] DB utilities: optimistic locking, transaction management, factory pattern, PubSub (`db/pubsub/postgres-pubsub.ts`)

**Server Engine Adapters:**

- [x] Cache layer (`server-engine/cache/` — config, errors, factory, LRU, memory provider + tests)
- [x] Mailer (`server-engine/mailer/` — client abstraction, SMTP transport, console provider, template renderer)
- [x] Storage (`server-engine/storage/` — S3 provider, local provider, presigned URLs, HTTP server, config, factory)
- [x] Queue + jobs: write service, client, types, memory store + admin management routes
- [x] Search: SQL provider, factory, query builder, types (+ Elasticsearch adapter stub)
- [x] Config loader (`server-engine/config/env.loader.ts`)
- [x] Logger (`server-engine/logger.ts`)
- [x] Routing (`server-engine/routing/routing.ts` — generic Fastify registration with Zod + native validation)

**Security:**

- [x] Rate limiting — token-bucket with role-based presets
- [x] JWT — native HS256, timing-safe, secret rotation (`security/crypto/jwt-rotation.ts`)
- [x] CSRF token management
- [x] Argon2id password hashing with auto-rehash
- [x] Permissions: types, batch checker, Fastify preHandler middleware
- [x] CORS, security headers, structured logging (Pino), correlation IDs

**Server App Middleware (`apps/server/`):**

- [x] Cookie parsing, CSRF protection, correlation IDs, proxy validation, request info, security headers, static files, validation
- [x] Plugin registration (`http/plugins.ts`)
- [x] Server config factory (auth, billing, cache, database, email, notifications, queue, search, server, storage)

**Gaps:**

- [x] Job idempotency keys, retries + backoff + dead-letter
- [ ] Scheduled cleanup jobs (expired tokens, stale sessions)
- [ ] IP allowlisting for admin routes
- [ ] Request signing for webhook delivery
- [ ] Generated API client package
- [ ] Module scaffold CLI

### Frontend

**Core UI (`client/ui/`, `client/react/`):**

- [x] Shared component library, accessibility defaults (LiveRegion), theme system (colors, motion, radius, spacing, typography)
- [x] Sidebar + topbar layout, error boundaries, global toasts
- [x] Custom router (`client/react/router/` — BrowserRouter, MemoryRouter, Link, Route, Switch, hooks)
- [x] State management: `createStore.ts` (useSyncExternalStore), toastStore, undoRedoStore
- [x] Form utilities: `useFormState.ts`, `createFormHandler.ts`, Zod form resolver
- [x] UI hooks: `useVirtualScroll`, `usePaginatedQuery`, `useSidePeek`, `useKeyboardShortcuts`, `useUndoRedoShortcuts`
- [x] `ProtectedRoute.tsx` — route-level auth gating component
- [x] Billing UI components: `InvoiceRow`, `PaymentMethodCard`, `PlanCard`, `PricingTable`, `SubscriptionStatus`

**Client Engine (`client/engine/`):**

- [x] Query system: `useQuery`, `useMutation`, `useInfiniteQuery`, `QueryCache`, `QueryCacheProvider`, `queryKeys`
- [x] Record cache + loader cache (`RecordCache.ts`, `LoaderCache.ts`)
- [x] Offline-first: `TransactionQueue.ts`, `mutationQueue.ts` (IndexedDB persistence)
- [x] Storage layer: `RecordStorage.ts`, `idb.ts` (IndexedDB), `queryPersister.ts`
- [x] Realtime: `RealtimeContext.tsx`, `SubscriptionCache.ts`, `WebsocketPubsubClient.ts`, hooks
- [x] Search: client-side `query-builder.ts`, `serialization.ts`, hooks
- [x] Undo/redo: `UndoRedoStack.ts`

**Client API (`client/api/`):**

- [x] Core API client: `client.ts` (fetch wrapper, interceptors, auth headers), `instance.ts`, `types.ts`
- [x] Billing API: `billing/client.ts`, `admin.ts`, `hooks.ts`
- [x] Notifications API: `notifications/client.ts`, `hooks.ts`
- [x] OAuth hooks: `oauth/hooks.ts`
- [x] Error handling: `errors.ts`

**PWA Support:**

- [x] Service worker (`public/sw.js`)
- [x] Web manifest (`public/manifest.json`)
- [x] Service worker registration (`utils/registerServiceWorker.ts`)

**Web App Features (`apps/web/src/features/`):**

- [x] `auth/` — Login, Register, ConfirmEmail, ForgotPassword, ResetPassword pages + forms + TurnstileWidget + TosAcceptanceModal
- [x] `settings/` — SettingsPage, ProfileForm, UsernameForm, PasswordChangeForm, AvatarUpload, SessionsList, SessionCard, OAuthConnectionsList, TotpManagement, TotpQrCode, SudoModal, ProfileCompleteness, DangerZone + hooks + API layer (all with tests)
- [x] `admin/` — UserListPage, UserDetailPage, PlanManagementPage, SecurityEventsPage, SecurityEventDetailPage, RouteManifestPage + 15 components + 12 hooks + AdminLayout + adminApi
- [x] `workspace/` — WorkspaceListPage, WorkspaceDetailPage, AcceptInvitationPage, MembersList, InviteMemberDialog, InvitationsList, CreateWorkspaceDialog, WorkspaceSettingsForm, TenantSwitcher, Can, RequireWorkspaceRole + hooks (useWorkspace, useMembers, useInvitations, usePermissions, useWorkspaceContext) + workspaceApi
- [x] `billing/` — BillingSettingsPage, PricingPage, CheckoutSuccessPage, CheckoutCancelPage
- [x] `dashboard/` — Dashboard page (with test)
- [x] `home/` — HomePage, DocViewer, NavList, TopBar, BottomBar, MainLayout + hooks (useDocContent, useHomeKeyboard) — all with tests
- [x] `ui-library/` — Interactive component catalog: UILibraryPage, SidePeekUILibraryPage, ComponentList, PreviewArea, DocContent + 8 components — all with tests

**Gaps:**

- [x] Tenant switcher component — `TenantSwitcher.tsx` (`apps/web/src/features/workspace/`)
- [ ] Command palette (optional)

---

## 9. Data Hygiene

> The "invisible" work that prevents DB bloat and ensures compliance.

### 9.1 Soft Deletion vs Hard Deletion

- [x] Domain logic + schemas exist (`shared/domain/compliance/deletion.logic.ts`, `deletion.schemas.ts`)
- [ ] User "Delete Account" → sets `deleted_at` timestamp (soft delete) — handler/route needed
- [ ] Soft-deleted users: block login, hide from search, preserve audit trail
- [ ] Cron job (daily) → permanently wipe PII for users where `deleted_at > 30 days`
- [ ] Hard delete: anonymize PII (replace with hashed placeholders), preserve audit log structure
- [ ] Foreign key safety: audit logs, invoices, activity history must not break on hard delete

### 9.2 Unverified User Cleanup

- [ ] Cron job → hard-delete users who registered > 7 days ago but never verified email
- [ ] Prevents DB bloat from spam bots and abandoned registrations
- [ ] Exclude OAuth-only users (they verify via provider)
- [ ] Log cleanup counts to metrics/audit

---

## 10. Operational Quality

- [-] Health endpoints — `server-engine/system/health.ts` (tested) + `shared/utils/monitor/health.ts` exist; wiring to `/health` + `/ready` routes needs verification
- [x] Request correlation IDs (`correlationId.ts` middleware)
- [ ] Error reporting (Sentry)
- [ ] Metrics (request count/latency, job success/fail)
- [x] OpenAPI / Swagger generation — `@fastify/swagger` + `@fastify/swagger-ui` registered at `/api/docs` with BSLT theme (`swagger-theme.ts`)
- [ ] Auth-protected docs in non-dev envs

---

## 11. Operational Blind Spots (Day 1 Required)

> These are NOT features. These are operational necessities that prevent
> support tickets, spam bills, legal issues, and debugging nightmares on Day 1.
> Add these, then **stop building**.

### 11.1 Anti-Abuse Layer (Public Endpoint Protection) — [x] Complete

> `POST /register`, `/login`, `/forgot-password` are public. Without bot protection,
> script kiddies will flood your DB with fake accounts or burn your email budget.

- [x] **Bot protection (CAPTCHA)** — Cloudflare Turnstile (invisible, free)
  - Applied to: `POST /auth/register`, `POST /auth/login`, `POST /auth/forgot-password`
  - Server-side token verification (`core/auth/security/captcha.test.ts`)
  - Config-gated: `config.security.captcha.enabled` + `config.security.captcha.siteKey`
  - Client: `TurnstileWidget.tsx` on public forms (`apps/web/src/features/auth/components/`)
- [x] **Input normalization** — `.trim()` + lowercase all emails at ingress (done — see 1.11)
- [x] **Email canonicalization** — prevent duplicate accounts via `+` aliases (done — see 1.11)

### 11.2 "Was This You?" Security Notifications — [x] Complete

> Users need to be notified _actively_ when sensitive things happen so they can
> react to a compromised account. This is the only way to recover from hijacking.

- [x] Trigger transactional email on:
  - Password changed
  - 2FA disabled
  - New API key generated
  - New device login (see 2.6)
- [x] **Email change reversion** (critical — the only hijack recovery path):
  - When email changes from A → B: send "Revert this change" link to **old** email (A)
  - Link valid for 24 hours
  - Clicking "This wasn't me" → reverts email to A, locks account, kills all sessions
  - (See also 1.9)
- [-] Email templates for each notification type — template system exists, content for some templates pending (see 6.4)

### 11.3 Legal Gatekeeper Middleware (ToS Version Gating) — [x] Complete

> You have `legal_documents` and `user_agreements` tables (migration 0008).
> Enforcement logic wired end-to-end.

- [x] Fastify preHandler middleware: `if (user.latest_tos_version < system.current_tos_version)` — `core/auth/middleware.ts`
- [x] When stale: block ALL API calls except `/auth/logout` and `/api/agreements`
- [x] Return `403` with body `{ code: 'TOS_ACCEPTANCE_REQUIRED', currentVersion: '...' }`
- [x] Client: intercept 403 → `TosAcceptanceModal.tsx` + `tosHandler.ts` (`apps/web/src/`)
- [x] `POST /api/agreements/accept` — records acceptance + unblocks the user
- [ ] Admin: ability to publish new ToS version (updates `legal_documents` row)

### 11.4 Granular Login Failure Logging (Internal Only) — [x] Complete

> API returns generic `401 Invalid Credentials` to users (security best practice).
> Internal logs record the specific reason so support can diagnose in 5 seconds.

- [x] Login attempt logging exists (IP, user agent, success/fail)
- [x] Internal log includes specific failure reason enum:
  - `USER_NOT_FOUND` — email/username not in DB
  - `PASSWORD_MISMATCH` — user exists, wrong password
  - `UNVERIFIED_EMAIL` — correct credentials but email not verified
  - `ACCOUNT_LOCKED` — correct credentials but account suspended
  - `TOTP_REQUIRED` — correct credentials but 2FA challenge needed
  - `TOTP_INVALID` — wrong TOTP code
  - `CAPTCHA_FAILED` — bot protection check failed
- [x] Failure reason stored in `login_attempts` table — verified in `login-failure.integration.test.ts`
- [x] Admin can filter login attempts by failure reason in security events UI
- [x] **Never expose** specific reason to the client (anti-enumeration)

---

## 12. Desktop App — [x] Scaffold Complete

- [x] Electron main process (`desktop/src/electron/main.ts`)
- [x] Preload script + context bridge (`desktop/src/electron/preload.ts`)
- [x] IPC message handlers + types (`desktop/src/electron/ipc/`)
- [x] React entry point (`desktop/src/main.tsx`)
- [ ] Auto-updater integration
- [ ] Native menu + system tray
- [ ] Deep link handling

### Storybook — [ ] Empty Scaffold

- [ ] `main/apps/storybook/` directory exists but contains no stories or config
- [ ] Component stories for `client/ui` design system
- [ ] Interactive documentation for reusable components

---

## 13. Infrastructure & CI/CD — [-] Partial

### 13.1 Containerization

- [x] `Dockerfile` + `Dockerfile.web` — multi-stage production images
- [x] `docker-compose.dev.yml` — development environment (Postgres, Redis, etc.)
- [x] `docker-compose.prod.yml` — production composition
- [x] `nginx.conf` — reverse proxy configuration
- [x] Caddy configs (`Caddyfile`, `Caddyfile.dev`)

### 13.2 Cloud Deployment

- [x] DigitalOcean Terraform (`infra/cloud/digitalocean/` — main, variables, outputs, user-data)
- [x] GCP Terraform (`infra/cloud/gcp/` — main, variables, outputs, startup-script)
- [x] Provider abstraction (`infra/cloud/main.tf`, `providers.tf`, `variables.tf`)
- [x] Deployment docs (`docs/deploy/` — 9 guides: DigitalOcean, GCP, env, migrations, reverse proxy, Postgres, release checklist, secrets, trusted proxy)

### 13.3 CI/CD Pipelines

- [x] `ci.yml` — main CI pipeline (lint, type-check, test)
- [x] `deploy.yml` — deployment workflow
- [x] `security.yml` — security scanning
- [x] `audit.yml` — dependency audit
- [x] `rollback.yml` — rollback workflow
- [x] `infra-deploy.yml`, `infra-destroy.yml`, `infra-test.yml` — infrastructure management
- [ ] Staging environment workflow
- [ ] Preview deployments for PRs

### 13.4 Dev Tooling (`main/tools/`)

- [x] Audit scripts: `build-optimizer.ts`, `bundle-monitor.ts`, `bundle-size.ts`, `dependency-audit.ts`, `health-check.ts`, `security-audit.ts`
- [x] DB tools: `bootstrap-admin.ts`, `push.ts`, `migrate.ts`, `seed.ts` (all tested)
- [x] Dev automation: `bootstrap.ts`, `dev.ts`, `run-tests.ts`, `setup.ts`
- [x] Git hooks: `pre-commit.ts`, `pre-push.ts`
- [x] Sync tools: `sync-css-theme.ts`, `sync-file-headers.ts`, `sync-ts-references.ts`
- [x] Path tools: barrel generation, alias management, path listing
- [x] Export tools: code export utilities for context sharing

---

## Do Not Build (Over-Engineering Traps)

> If you find yourself thinking about these, you are procrastinating. Stop.

1. **Complex Password Rotation** — "Change password every 90 days." NIST now advises _against_ this. Don't build it.
2. **IP Geolocation Blocking** — Let Cloudflare or your WAF handle this. Don't pollute app code with IP databases.
3. **Active-Active Session Replication** — Storing sessions in Postgres is fine. Don't replicate across regions unless >100k DAU.
4. **Shadow Banning** — Just lock the account. Shadow banning is complex, confuses support, and creates legal gray areas.
5. **Custom Email Rendering Engine** — Use a template library (MJML/React Email). Don't build your own responsive email renderer.
6. **Multi-Region Tenant Routing** — Single region is fine until you have paying customers who demand it.

---

## Definition of Done

The boilerplate is "enterprise-ready" when you can:

- [-] Create user → create tenant → invite teammate → enforce RBAC
- [ ] Run checkout → process webhooks idempotently → activate tenant plan
- [-] View audit logs + security events
- [-] Operate jobs / webhooks via ops console
- [-] Debug issues via correlated logs + error tracking
- [ ] Add a new module using a documented template

**Ship Criteria (minimum viable launch):**

- [x] Auth lifecycle complete (register → verify → login → refresh → logout → reset)
- [x] Session endpoints wired + UA labeling
- [ ] Turnstile on public forms (register, login, forgot-password)
- [ ] "Was this you?" email on password change + email change reversion
- [ ] ToS gating middleware active
- [ ] Granular login failure reasons in internal logs

---

## 14. Test Coverage Pipeline

> Every business domain needs three layers of test coverage:
>
> - **Unit tests**: Pure logic in isolation (handlers, validators, domain logic) — Vitest
> - **Integration tests**: Service + DB + HTTP round-trips against a real (test) database — Vitest + Fastify inject
> - **E2E tests**: Full browser flows verifying user-facing behavior — Playwright

### 14.1 Authentication Tests

#### Unit Tests

- [ ] Registration handler: validates input, rejects weak passwords, rejects duplicate emails
- [ ] Login handler: correct credentials succeed, wrong password fails, unverified email rejected, locked account rejected
- [ ] Token refresh: rotation works, reuse detection triggers family revocation, grace period honored
- [ ] Password reset: token creation, token validation, token expiry, password strength enforcement
- [ ] Magic link: token creation, rate limiting logic, auto-create user logic
- [ ] OAuth: state generation, callback code exchange, link/unlink logic
- [ ] Email change: token creation, confirmation logic, reversion logic
- [ ] TOTP: setup secret generation, code validation, backup code single-use enforcement
- [ ] Email canonicalization: trim, lowercase, Gmail dot-insensitivity, `+` alias stripping
- [ ] Lockout logic: progressive delays, threshold enforcement, reset after success

#### Integration Tests

- [ ] `POST /api/auth/register` → creates user in DB, sends verification email, returns expected shape
- [ ] `POST /api/auth/login` → returns tokens, sets HttpOnly cookie, creates session record
- [ ] `POST /api/auth/refresh` → rotates token, old token rejected on reuse
- [ ] `POST /api/auth/logout` → clears cookie, revokes token in DB
- [ ] `POST /api/auth/logout-all` → revokes all families except current
- [ ] `POST /api/auth/forgot-password` → creates token in DB, generic response (anti-enumeration)
- [ ] `POST /api/auth/reset-password` → updates password hash, invalidates old tokens
- [ ] `POST /api/auth/verify-email` → marks user verified, auto-login tokens returned
- [ ] `POST /api/auth/magic-link/request` → creates token, rate limited
- [ ] `POST /api/auth/magic-link/verify` → logs in user, creates new user if needed
- [ ] `GET /api/auth/oauth/:provider` → returns valid authorization URL
- [ ] `GET /api/auth/oauth/:provider/callback` → exchanges code, creates/logs in user
- [ ] `POST /api/auth/change-email` + `/confirm` → full atomic email update flow
- [ ] `POST /api/auth/totp/setup` → `/enable` → `/disable` lifecycle against DB
- [ ] Protected routes reject unauthenticated requests with 401

#### E2E Tests (Playwright)

- [ ] Register → receive verification email → verify → auto-login → see dashboard
- [ ] Login with email + password → see dashboard → logout → redirected to login
- [ ] Login with username → see dashboard
- [ ] Forgot password → reset password → login with new password
- [ ] Login attempt lockout after N failures → wait → retry succeeds
- [ ] Login with 2FA enabled → TOTP challenge → enter code → see dashboard
- [ ] OAuth login flow (mock provider) → see dashboard
- [ ] Magic link request → click link → see dashboard (if enabled)
- [ ] Email change → confirm via link → old email shows in notification
- [ ] Register with duplicate email → see error message

### 14.2 Sessions & Device Security Tests

#### Unit Tests

- [ ] `listUserSessions()`: returns sessions, marks current session correctly
- [ ] `revokeSession()`: validates ownership, prevents revoking current session
- [ ] `revokeAllSessions()`: keeps current, revokes rest
- [ ] `getSessionCount()`: returns correct count
- [ ] UA parsing: Chrome/Firefox/Safari/Edge/mobile variants produce human-readable labels

#### Integration Tests

- [ ] `GET /api/users/me/sessions` → returns session list with current marker
- [ ] `DELETE /api/users/me/sessions/:id` → revokes target session, rejects current session revocation
- [ ] `POST /api/users/me/sessions/revoke-all` → all sessions revoked except current
- [ ] `GET /api/users/me/sessions/count` → matches active session count
- [ ] Login creates `user_sessions` record with parsed UA fields

#### E2E Tests (Playwright)

- [ ] Login → navigate to settings → see active sessions list with "This device" indicator
- [ ] Login from two sessions → revoke one → verify revoked session is logged out
- [ ] "Log out all other devices" → only current session remains active
- [ ] Session shows human-readable device label (not raw UA string)

### 14.3 Account Management Tests

#### Unit Tests

- [ ] Username validation: uniqueness (case-insensitive), reserved names, cooldown
- [ ] Avatar processing: validate file type, resize dimensions
- [ ] Profile update: field validation, completeness calculation
- [ ] Account deactivation/deletion: grace period logic, reactivation logic

#### Integration Tests

- [ ] `PATCH /api/users/me/username` → updates username, rejects duplicates
- [ ] `PUT /api/users/me/avatar` → processes and stores image
- [ ] `PATCH /api/users/me` → updates profile fields
- [ ] `POST /api/users/me/delete` → sets `deleted_at`, blocks login after
- [ ] `POST /api/users/me/reactivate` → cancels pending deletion within grace period
- [ ] `POST /api/auth/sudo` → returns sudo token; subsequent sensitive ops require it

#### E2E Tests (Playwright)

- [ ] Change username in settings → see updated username across the app
- [ ] Upload avatar → see avatar in profile and header
- [ ] Update profile fields → save → refresh → see persisted changes
- [ ] Delete account → confirm → see logout; re-login attempt blocked
- [ ] Sudo mode: attempt sensitive action → prompted for password → re-auth → action succeeds

### 14.4 Multi-Tenant / Workspace Tests

#### Unit Tests

- [ ] `canAssignRole()`: enforces role hierarchy (owner > admin > member > viewer)
- [ ] `canRemoveMember()`: prevents removing higher-ranked users
- [ ] Orphan prevention: block removal of last owner, require ownership transfer
- [ ] Invitation logic: domain restriction validation, expiry enforcement
- [ ] Tenant scoping: `assertWorkspaceScope()` throws when context missing

#### Integration Tests

- [ ] `POST /api/tenants` → creates tenant + owner membership in transaction
- [ ] `GET /api/tenants` → returns only user's workspaces
- [ ] `POST /api/tenants/:id/invitations` → creates invite, sends email
- [ ] `POST /api/invitations/:token/accept` → creates membership, consumes token
- [ ] `PATCH /api/tenants/:id/members/:userId` → changes role, enforces hierarchy
- [ ] `DELETE /api/tenants/:id/members/:userId` → removes member, blocks last owner removal
- [ ] Tenant-scoped queries only return data for the active workspace
- [ ] Expired invitation rejection

#### E2E Tests (Playwright)

- [ ] Create workspace → see it in workspace list → switch to it
- [ ] Invite teammate by email → teammate accepts → appears in member list
- [ ] Change member role → member sees updated permissions
- [ ] Remove member → member loses access to workspace
- [ ] Tenant switcher: switch between workspaces → see different data in each
- [ ] Accept expired invitation → see error message

### 14.5 RBAC & Authorization Tests

#### Unit Tests

- [ ] `canUser()` / `isOwner()` / `isAdmin()` permission checks for all role combinations
- [ ] Policy engine: evaluation with multiple rules, deny overrides allow
- [ ] Route-level role check: correct roles pass, others rejected

#### Integration Tests

- [ ] Protected routes reject unauthenticated requests (401)
- [ ] Admin routes reject non-admin users (403)
- [ ] Per-tenant role enforcement: viewer cannot write, member cannot manage
- [ ] Resource ownership validation: user A cannot access user B's resources

#### E2E Tests (Playwright)

- [ ] Admin user: can access admin dashboard, manage users
- [ ] Regular user: admin routes return 403 / redirect to dashboard
- [ ] Workspace viewer: cannot create/edit resources; sees read-only UI
- [ ] Workspace admin: can manage members but cannot transfer ownership

### 14.6 Billing & Subscriptions Tests

#### Unit Tests

- [ ] Entitlements resolver: `resolveEntitlements(subscription, role)` returns correct flags/limits
- [ ] Plan validation: required fields, price constraints
- [ ] Webhook signature verification: Stripe + PayPal
- [ ] Subscription state transitions: trialing → active → past_due → canceled

#### Integration Tests

- [ ] Admin: `POST /api/admin/billing/plans` → creates plan
- [ ] Stripe webhook → updates subscription state in DB
- [ ] PayPal webhook → updates subscription state in DB
- [ ] Checkout session creation → returns redirect URL
- [ ] Entitlement enforcement: free plan user blocked from premium features

#### E2E Tests (Playwright)

- [ ] View pricing page → select plan → complete checkout → see active subscription
- [ ] Upgrade plan → see updated entitlements immediately
- [ ] Downgrade plan → see reduced entitlements at next billing cycle
- [ ] View billing settings → see current plan, invoices, payment method
- [ ] Cancel subscription → see confirmation → plan remains active until period end

### 14.7 Notifications Tests

#### Unit Tests

- [ ] Notification service: create, mark read, mark all read, delete
- [ ] Push provider (FCM): payload formatting, error handling
- [ ] Email template rendering: variable substitution, fallback values
- [ ] Preference evaluation: channel enabled/disabled per notification type

#### Integration Tests

- [ ] `POST /api/notifications` → creates notification in DB
- [ ] `PATCH /api/notifications/:id/read` → marks as read
- [ ] `POST /api/notifications/read-all` → marks all as read
- [ ] Email send: SMTP transport delivers (dev: console provider logs)
- [ ] Push subscription: register → send → receive (mock FCM)

#### E2E Tests (Playwright)

- [ ] Trigger action → notification appears in bell dropdown
- [ ] Click notification → navigates to relevant page
- [ ] Mark notification as read → visual indicator updates
- [ ] Notification preferences: toggle channel off → no longer receive that type
- [ ] Transactional email received (verify via test mailbox or interceptor)

### 14.8 Audit & Security Events Tests

#### Unit Tests

- [ ] Security event creation: all 18+ event types with correct severity
- [ ] Audit event creation: typed events with actor/action/target/metadata
- [ ] Event metrics aggregation logic

#### Integration Tests

- [ ] Security events written to DB on login/logout/lockout/OAuth/TOTP actions
- [ ] `GET /api/admin/security/events` → returns paginated events with filters
- [ ] `GET /api/admin/security/events/:id` → returns event detail
- [ ] `GET /api/admin/security/metrics` → returns aggregated metrics
- [ ] `POST /api/admin/security/events/export` → returns CSV/JSON export

#### E2E Tests (Playwright)

- [ ] Admin: navigate to security events → see events list with filters
- [ ] Filter by event type → results update
- [ ] Click event → see detail view with all metadata
- [ ] Export events → file downloads successfully
- [ ] Trigger login failure → see new security event appear in list

### 14.9 Compliance & Data Privacy Tests

#### Unit Tests

- [ ] Deletion logic: soft delete scheduling, grace period calculation, PII anonymization rules
- [ ] Data export: user data aggregation from all tables
- [ ] Consent tracking: version comparison, acceptance recording

#### Integration Tests

- [ ] `POST /api/users/me/export` → creates data export request, background job queued
- [ ] `POST /api/users/me/delete` → sets `deleted_at`, blocks login
- [ ] ToS gating middleware: stale version → 403 with `TOS_ACCEPTANCE_REQUIRED`
- [ ] `POST /api/agreements/accept` → records acceptance, unblocks user
- [ ] Hard delete cron: anonymizes PII after grace period, preserves audit trail

#### E2E Tests (Playwright)

- [ ] Request data export → receive download link (email or in-app)
- [ ] Delete account → confirm → logged out → cannot log back in during grace period
- [ ] New ToS published → user forced to accept before continuing
- [ ] Accept ToS → normal access restored
- [ ] Consent preferences: toggle cookie consent → see updated state

### 14.10 Realtime & WebSocket Tests

#### Unit Tests

- [ ] Subscription handler: subscribe/unsubscribe to channels
- [ ] Sync handler: delta sync logic
- [ ] PubSub: message routing, channel filtering
- [ ] Connection lifecycle: connect, heartbeat, disconnect, reconnect

#### Integration Tests

- [ ] WebSocket connect → authenticate → subscribe to channel → receive published message
- [ ] Unauthorized subscription attempt rejected
- [ ] Connection stats updated on connect/disconnect
- [ ] Multiple subscribers on same channel all receive message

#### E2E Tests (Playwright)

- [ ] Open two browser tabs → action in tab A → real-time update appears in tab B
- [ ] Disconnect network → reconnect → missed messages synced
- [ ] Subscribe to workspace-scoped channel → only see events for that workspace

### 14.11 Media Processing Tests

#### Unit Tests

- [ ] Image processor: resize, crop, format conversion
- [ ] Audio metadata extraction: duration, sample rate, channels
- [ ] Video processor: thumbnail generation, format conversion
- [ ] File type detection: correct MIME types for common formats
- [ ] File validation: size limits, type restrictions, security scanning
- [ ] Queue: job creation, retry logic, dead-letter handling

#### Integration Tests

- [ ] Upload image → processed and stored in S3 (or local)
- [ ] Upload invalid file type → rejected with clear error
- [ ] Upload oversized file → rejected with size limit error
- [ ] Queue: job submitted → processed → result stored in DB
- [ ] Presigned URL generation for direct upload/download

#### E2E Tests (Playwright)

- [ ] Upload avatar image → see processed/cropped version displayed
- [ ] Upload document → see it in file list → download it
- [ ] Drag-and-drop file upload → progress indicator → success confirmation
- [ ] Upload invalid file → see user-friendly error message

### 14.12 API Keys & Programmatic Access Tests

#### Unit Tests

- [ ] Key generation: hash storage, scope parsing, expiry validation
- [ ] Key authentication: timing-safe comparison, scope enforcement
- [ ] Key revocation: immediate invalidation

#### Integration Tests

- [ ] Create API key → use it to authenticate a request → success
- [ ] Revoked key → 401 on subsequent requests
- [ ] Expired key → 401 on subsequent requests
- [ ] Scope enforcement: key with `read` scope cannot `write`
- [ ] `GET /api/users/me/api-keys` → lists keys (hash not exposed)

#### E2E Tests (Playwright)

- [ ] Settings → API keys → create key → copy value (shown once) → see it in list
- [ ] Revoke key → removed from list → API calls with that key fail
- [ ] Create key with limited scopes → verify scope labels displayed

### 14.13 Admin & Support Tests

#### Unit Tests

- [ ] Impersonation token: scoped TTL, target user validation, admin-only
- [ ] User search: multi-field matching (email, name, UUID, stripe ID)
- [ ] Ban logic: soft ban vs hard ban cascade rules

#### Integration Tests

- [ ] `POST /api/admin/impersonate/:userId` → returns scoped token + audit event
- [ ] Admin user list with pagination and filters
- [ ] Admin lock/unlock user → login behavior changes accordingly
- [ ] Hard ban: revokes sessions, cancels subscriptions, schedules PII deletion
- [ ] Cannot impersonate another admin (safety guard)

#### E2E Tests (Playwright)

- [ ] Admin: search for user → view detail → lock account → user cannot log in
- [ ] Admin: impersonate user → see banner "Viewing as ..." → end session → return to admin
- [ ] Admin: manage billing plans → create/edit/deactivate plan
- [ ] Admin: view security events dashboard → filter → export

---

## Appendix A: Database Schema Reference

> All 20 migrations complete (0000-0019). ~45 tables. 100% schema + repo coverage.

<details>
<summary>Module 1: Identity (5 tables)</summary>

| Table           | Schema               | Migration                                                                                                                                 | Repository               | Domain               |
| --------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | -------------------- |
| `users`         | `schema/users.ts`    | `0000_init.sql`, `0009_auth_extensions.sql`, `0012_user_profile.sql`, `0017_user_profile_extended.sql`, `0018_email_canonicalization.sql` | `repositories/users/`    | `domain/users/`      |
| `tenants`       | `schema/tenant.ts`   | `0001_tenant.sql`                                                                                                                         | `repositories/tenant/`   | `domain/tenant/`     |
| `memberships`   | `schema/tenant.ts`   | `0001_tenant.sql`                                                                                                                         | `repositories/tenant/`   | `domain/membership/` |
| `invitations`   | `schema/tenant.ts`   | `0001_tenant.sql`                                                                                                                         | `repositories/tenant/`   | `domain/membership/` |
| `user_sessions` | `schema/sessions.ts` | `0002_sessions.sql`, `0019_user_sessions_device_fields.sql`                                                                               | `repositories/sessions/` | `domain/sessions/`   |

</details>

<details>
<summary>Module 2: Auth & Security (12 tables)</summary>

| Table                        | Schema                 | Migration                         | Repository                 | Domain             |
| ---------------------------- | ---------------------- | --------------------------------- | -------------------------- | ------------------ |
| `refresh_tokens`             | `schema/users.ts`      | `0000_init.sql`                   | `repositories/auth/`       | `domain/auth/`     |
| `refresh_token_families`     | `schema/auth.ts`       | `0000_init.sql`                   | `repositories/auth/`       | `domain/auth/`     |
| `login_attempts`             | `schema/auth.ts`       | `0000_init.sql`                   | `repositories/auth/`       | `domain/auth/`     |
| `password_reset_tokens`      | `schema/auth.ts`       | `0000_init.sql`                   | `repositories/auth/`       | `domain/auth/`     |
| `email_verification_tokens`  | `schema/auth.ts`       | `0000_init.sql`                   | `repositories/auth/`       | `domain/auth/`     |
| `security_events`            | `schema/auth.ts`       | `0000_init.sql`                   | `repositories/auth/`       | `domain/auth/`     |
| `magic_link_tokens`          | `schema/magic-link.ts` | `0002_sessions.sql`               | `repositories/magic-link/` | `domain/auth/`     |
| `oauth_connections`          | `schema/oauth.ts`      | `0002_sessions.sql`               | `repositories/oauth/`      | `domain/auth/`     |
| `totp_backup_codes`          | `schema/auth.ts`       | `0009_auth_extensions.sql`        | `repositories/auth/`       | `domain/auth/`     |
| `email_change_tokens`        | `schema/auth.ts`       | `0009_auth_extensions.sql`        | `repositories/auth/`       | `domain/auth/`     |
| `email_change_revert_tokens` | `schema/auth.ts`       | `0018_email_canonicalization.sql` | `repositories/auth/`       | `domain/auth/`     |
| `api_keys`                   | `schema/api-keys.ts`   | `0010_api_keys.sql`               | `repositories/api-keys/`   | `domain/api-keys/` |

</details>

<details>
<summary>Module 3: Billing (6 tables)</summary>

| Table               | Schema              | Migration          | Repository              | Domain            |
| ------------------- | ------------------- | ------------------ | ----------------------- | ----------------- |
| `plans`             | `schema/billing.ts` | `0003_billing.sql` | `repositories/billing/` | `domain/billing/` |
| `subscriptions`     | `schema/billing.ts` | `0003_billing.sql` | `repositories/billing/` | `domain/billing/` |
| `customer_mappings` | `schema/billing.ts` | `0003_billing.sql` | `repositories/billing/` | `domain/billing/` |
| `invoices`          | `schema/billing.ts` | `0003_billing.sql` | `repositories/billing/` | `domain/billing/` |
| `payment_methods`   | `schema/billing.ts` | `0003_billing.sql` | `repositories/billing/` | `domain/billing/` |
| `billing_events`    | `schema/billing.ts` | `0003_billing.sql` | `repositories/billing/` | `domain/billing/` |

</details>

<details>
<summary>Modules 4-9: Notifications, System, Features, Metering, Compliance, Extended</summary>

| Table                      | Migration                  | Notes                       |
| -------------------------- | -------------------------- | --------------------------- |
| `notifications`            | `0004_notifications.sql`   | In-app notification records |
| `push_subscriptions`       | `0004_notifications.sql`   | Web Push endpoints          |
| `notification_preferences` | `0004_notifications.sql`   | Per-user channel toggles    |
| `jobs`                     | `0005_system.sql`          | Background job queue        |
| `audit_events`             | `0005_system.sql`          | General audit log           |
| `webhooks`                 | `0005_system.sql`          | Registered endpoints        |
| `webhook_deliveries`       | `0005_system.sql`          | Delivery log + replay       |
| `feature_flags`            | `0006_features.sql`        | Global toggles              |
| `tenant_feature_overrides` | `0006_features.sql`        | Per-tenant overrides        |
| `usage_metrics`            | `0007_metering.sql`        | Metric definitions          |
| `usage_snapshots`          | `0007_metering.sql`        | Recorded usage data         |
| `legal_documents`          | `0008_compliance.sql`      | ToS, Privacy Policy         |
| `user_agreements`          | `0008_compliance.sql`      | User acceptance records     |
| `consent_logs`             | `0008_compliance.sql`      | GDPR consent trail          |
| `data_export_requests`     | `0011_data_exports.sql`    | GDPR export workflow        |
| `files`                    | `0013_files.sql`           | File metadata               |
| `email_templates`          | `0014_email.sql`           | Email template system       |
| `email_log`                | `0014_email.sql`           | Delivery log                |
| `tenant_settings`          | `0015_tenant_settings.sql` | Per-tenant config           |
| `activities`               | `0016_activities.sql`      | Activity feed               |

</details>

---

## Appendix B: Migration Timeline

```
[x] 0000_init.sql           — users, auth tables (7 tables)
[x] 0001_tenant.sql         — tenants, memberships, invitations
[x] 0002_sessions.sql       — user_sessions, magic_link, oauth
[x] 0003_billing.sql        — 6 billing tables
[x] 0004_notifications.sql  — notifications, push, preferences
[x] 0005_system.sql         — jobs, audit, webhooks
[x] 0006_features.sql       — feature flags
[x] 0007_metering.sql       — usage metering
[x] 0008_compliance.sql     — legal, consent
[x] 0009_auth_extensions    — TOTP backup codes, email change tokens
[x] 0010_api_keys.sql       — API keys with scopes
[x] 0011_data_exports.sql   — GDPR data export requests
[x] 0012_user_profile.sql   — username, first/last name, phone
[x] 0013_files.sql          — file storage metadata
[x] 0014_email.sql          — email templates + delivery log
[x] 0015_tenant_settings    — per-tenant configuration
[x] 0016_activities.sql     — user activity feed
[x] 0017_user_profile_extended.sql — city, state, country, bio, etc.
[x] 0018_email_canonicalization.sql — canonical_email + email change revert tokens
[x] 0019_user_sessions_device_fields.sql — user_sessions device labeling fields
```

---

## Appendix C: Engine Module Status

> `server/engine/` — infrastructure adapters. Core modules complete, scheduled jobs pending.

<details>
<summary>Queue / Job System (5/9 files ready)</summary>

| Item                               | Ready | Notes                           |
| ---------------------------------- | ----- | ------------------------------- |
| `types.ts`                         | [x]   | Merged queue + write types      |
| `client.ts` (QueueServer)          | [x]   | Tested                          |
| `writer.ts` (WriteService)         | [x]   | Tested                          |
| `memory-store.ts`                  | [x]   | In-memory store for dev/test    |
| `index.ts` barrel                  | [x]   | Explicit named exports          |
| Scheduled: `login-cleanup.ts`      | [ ]   | Purge expired login attempts    |
| Scheduled: `magic-link-cleanup.ts` | [ ]   | Purge expired magic link tokens |
| Scheduled: `oauth-refresh.ts`      | [ ]   | Refresh expiring OAuth tokens   |
| Scheduled: `push-cleanup.ts`       | [ ]   | Purge stale push subscriptions  |

</details>

<details>
<summary>Security modules (all complete)</summary>

**Permissions** (`security/permissions/`): types, checker (batch), middleware (Fastify preHandler) — all tested.

**Rate Limiting** (`security/rate-limit/`): token-bucket algorithm, LRU store, role-based presets — tested.

**JWT** (`security/jwt.ts`): native HS256, timing-safe, secret rotation — tested.

**CSRF** (`security/token.ts`): token generation, signing, encryption — complete.

</details>

<details>
<summary>Search (5/5 files ready)</summary>

| Item               | Ready | Notes                                   |
| ------------------ | ----- | --------------------------------------- |
| `types.ts`         | [x]   | Provider interfaces                     |
| `query-builder.ts` | [x]   | Test missing                            |
| `sql-provider.ts`  | [x]   | Postgres full-text search, tested       |
| `factory.ts`       | [x]   | SearchProviderFactory singleton, tested |
| `index.ts` barrel  | [x]   | Explicit named exports                  |

</details>

<details>
<summary>Routing (complete)</summary>

`routing.ts` — Generic Fastify route registration with Zod + native validation support, public/protected/role-based routes.

</details>

---

## Appendix D: Essential Features Audit (Verify vs Add)

- [ ] Multi-tenant workspaces + membership roles + invites
  - [ ] Memberships (role per workspace)
  - [ ] Invites (email invite → accept)
  - [ ] Request context has `workspaceId` (scoping)
- [ ] Entitlements service + assert helper
  - [ ] `resolveEntitlements(subscription, role) -> { flags/limits }`
  - [ ] Helper: `assertEntitled("feature_x")`
  - [ ] Limit checks: basic counters (e.g., max projects, max seats)
- [ ] Subscription lifecycle states wired end-to-end
  - [ ] States: `trialing`/`active`/`past_due`/`canceled`
  - [ ] Webhook handling that updates state reliably
  - [ ] Access rules tied to state (via entitlements)
- [ ] General audit log (separate from security events)
  - [ ] `audit_log` table
  - [ ] `audit.record({ actor, action, target, metadata })`
  - [ ] Admin viewer (minimal)
- [ ] Data export + deletion workflows
  - [ ] Soft delete + background job for hard delete
  - [ ] Cascading cleanup rules (storage objects, sessions, tokens, etc.)
- [ ] Baseline observability (metrics + error reporting hooks)
- [ ] Idempotent webhooks + replay safety
  - [ ] Store event IDs, ignore duplicates
  - [ ] Safe handling for "out of order" events
- [ ] Tenant scoping is enforced everywhere
  - [ ] Every query scoped by `workspaceId` (repository helpers require it in signatures)
- [ ] Baseline security defaults
  - [ ] Secure cookies, CSRF strategy, sensible CORS, rate limit presets
  - [ ] One canonical request context + correlation id logging
- [ ] Deployment sanity
  - [ ] migrations + seed + "bootstrap admin" is smooth
  - [ ] Env validation fails fast with good messages

---

## Appendix E: SaaS Expectations

### 1) SaaS "core loops" people expect

- **Subscription lifecycle completeness**
  - Trials: trial start/end, "trialing → active" transitions
  - Seat-based billing support (minimum): quantity + proration handling rules
  - Plan changes: upgrade/downgrade scheduling, proration previews
  - Dunning / failed payment flow: retries, "past_due" states, user messaging
- **Entitlements**: single place that answers what a user/team can do right now
  - Minimum: `entitlements` service resolving features from subscription + role

### 2) Multi-tenant & team support (big one)

- Organizations/Workspaces
- Memberships (roles per org)
- Invites (email invite accept flow)
- Role/permission model per org (not just global roles)
- Minimum: orgs table, memberships, invites, roles (owner/admin/member), per-org scoping in DB + request context

### 3) Auditability & compliance-lite

- Audit log (general) separate from security events
  e.g., "billing plan changed", "user role changed", "project deleted"
- Data export (GDPR-ish): export user/org data
- Data deletion: soft delete + retention windows, hard delete jobs
- Minimum: audit log table + `audit.record(event)` helper with typed events

### 4) Observability & operations

- Minimal metrics: request count/latency, job success/fail counts
- Tracing hook points or structured timing logs
- Error reporting integration (Sentry-like) as optional provider
- Operational dashboards (job monitor + security metrics already exist)
- Minimum: monitoring interface in kernel + infra/observability provider(s)

### 5) Rate limits, abuse, and platform safety

- Per-route presets (auth stricter than others)
- IP reputation / allowlist / blocklist hooks (optional)
- Feature gating for high-risk actions (export, delete, billing)
- Minimum: policy config per route/module

### 6) Developer experience features

- Local dev + preview environments
- docker-compose for db/cache/email dev
- One-command setup: `pnpm dev` starts server + web + workers
- Reset dev DB path
- CLI/scaffolding: create-module, migration scaffolding
- Env validation output ("you're missing X vars")
- Storybook/UI catalog (UI library catalog at `/ui-library` already covers this)

### 7) Security essentials that might still be missing

- Session/device management (list sessions, revoke one/all)
- Password breach checks or strong policy hooks
- File upload validation + scanning hooks
- Secret rotation guidelines (docs + env patterns)

### 8) "SaaS product" surface area (UI)

- Onboarding flow
- Create workspace
- Invite teammate
- Pick plan
- First success moment ("project created")
- Usage/limits UI ("you're on free plan; 80% of X used")
