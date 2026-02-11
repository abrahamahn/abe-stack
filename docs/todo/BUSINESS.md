# Business Features & Infrastructure Checklist

> **Purpose:** Track the completion of high-level business capabilities and infrastructure components from a product perspective.
> **Status Legend:** [x] Done, [-] In Progress, [ ] Not Started

---

## 1. Identity & Access Management (IAM)

_Core user authentication and security._

- [x] **User Registration**: Users can sign up with email and password.
- [x] **Secure Login**: Users can log in safely.
- [x] **Email Verification**: Ensure users own their email addresses.
- [x] **Password Recovery**: Users can reset forgotten passwords.
- [-] **Magic Link Login**: Passwordless login via email link. _(Backend done; frontend not wired)_
- [x] **Social Login**: Login with Google, GitHub, or Apple.
- [x] **Session Management**: Users can view and revoke active sessions (devices).
- [x] **Multifactor Authentication (MFA)**: TOTP-based 2FA with setup, verification, and management UI.

## 2. Team & Workspace Management (Tenancy)

_B2B features for organizations and collaboration._

- [x] **Workspace Creation**: Users can create new organizations/tenants.
- [-] **Member Invitations**: Invite colleagues via email. _(Invitation handlers + UI built; invitation email template content not yet created)_
- [x] **Member Management**: List, remove, or update member access.
- [x] **Role-Based Access Control (RBAC)**: Define Owner, Admin, and Member roles.
- [-] **Permission Gating**: Restrict access to features based on roles. _(Can, RequireWorkspaceRole, usePermissions built; conditional menu rendering + resource ownership validation pending)_

## 3. Billing & Monetization

_Revenue operations and subscription management._

- [x] **Plan Definitions**: Define Free, Pro, and Enterprise tiers.
- [ ] **Subscription Checkout**: Secure storage of payment methods and initial charge.
- [ ] **Recurring Billing**: Automated monthly/yearly renewal processing.
- [ ] **Invoicing**: Generate and view past invoices.
- [ ] **Upgrade/Downgrade**: specific workflows for changing plans.
- [ ] **Usage Limits**: Enforce plan limits (e.g., max users, storage).

## 4. Communication & Engagement

_System to user notifications._

- [ ] **In-App Notifications**: Real-time alerts within the dashboard.
- [ ] **Push Notifications**: Browser/device push alerts.
- [-] **Email Notifications**: Transactional emails (Welcome, Reset Password). _(SMTP client + templates exist; no notification preference UI)_
- [ ] **Notification Preferences**: Users can toggle specific alert channels.

## 5. System Operations & Reliability

_Background machinery that keeps the business running._

- [x] **Audit Logging**: Record critical actions for security and compliance reviews.
- [-] **Background Jobs**: Asynchronous processing for heavy tasks (emails, reports). _(Job queue + admin monitor UI exist)_
- [ ] **Webhook System**: Notify external systems of events (e.g., "User Created").
- [-] **Feature Flags**: Safely roll out new features to specific users/tenants. _(Evaluation service + admin CRUD routes exist; admin UI + middleware gating pending)_
- [ ] **Usage Metering**: Track consumption of resources for billing/analytics.

## 6. Compliance & Legal

_Regulatory requirements and data governance._

- [x] **Terms of Service**: Versioned tracking of legal agreements. _(Backend middleware + TosAcceptanceModal + tosHandler wired)_
- [ ] **Consent Management**: GDPR/cookie consent tracking.
- [ ] **Data Export**: Allow users to download their data (Right to Portability).
- [-] **Account Deletion**: "Right to be Forgotten" workflows. _(Backend lifecycle handlers + DangerZone UI done; hard delete cron + PII anonymization pending)_

---

## 7. Business Admin Console

_Internal tools for our support and success teams._

- [-] **User Support**: proper search, view, and impersonation of users to debug issues. _(User list, detail, actions UI built)_
- [-] **Tenant Management**: View, suspend, or override plans for workspaces. _(Workspace admin UI: members list, invitations, role management, settings form built; suspend/plan override pending)_
- [-] **System Health**: Monitor job queues and failure rates. _(Job monitor page + queue stats card built)_

---

## 8. Test Coverage (Per Business Pipeline)

> Every business pipeline requires three test layers:
>
> - **Unit tests** (Vitest, colocated): Pure logic in isolation — handlers, validators, domain logic
> - **Integration tests** (Vitest + Fastify inject): Service + DB + HTTP round-trips against a test database
> - **E2E tests** (Playwright): Full browser flows verifying user-facing behavior end-to-end

### 8.1 IAM Test Pipeline

- [-] **Unit**: Registration validation, login logic, lockout, token rotation, password strength, email canonicalization, TOTP code verification, OAuth state/callback logic _(All handlers tested: login, password, refresh, totp, register, oauth, magic-link, middleware, service, response utils, sudo)_
- [-] **Integration**: All auth HTTP endpoints with real DB — register, login, refresh, logout, reset, verify, magic link, OAuth, TOTP lifecycle, email change _(auth, captcha, login-failure, sessions, tos integration tests exist and pass)_
- [-] **E2E**: Register → verify → login → dashboard; forgot password → reset → login; 2FA challenge flow; OAuth login; lockout after N failures _(auth-forms.e2e.ts + auth-pages.e2e.ts scaffolded, not running)_

### 8.2 Team & Workspace Test Pipeline

- [-] **Unit**: Role hierarchy enforcement (`canAssignRole`, `canRemoveMember`), orphan prevention, invitation domain restrictions, tenant scoping assertions _(membership.logic.test.ts, Can.test.tsx, RequireWorkspaceRole.test.tsx, service/invitation/membership tests, domain-restrictions.test.ts, workspace-scope.test.ts exist)_
- [-] **Integration**: Tenant CRUD endpoints, invitation create/accept/expire, membership management, role changes, tenant-scoped query isolation _(handlers + routes wired, integration test scaffolding needed)_
- [ ] **E2E**: Create workspace → invite member → accept invite → see member list; switch workspace context; role-based UI gating

### 8.3 Billing Test Pipeline

- [ ] **Unit**: Entitlements resolution, plan validation, webhook signature verification, subscription state machine transitions
- [ ] **Integration**: Plan CRUD, Stripe/PayPal webhook processing, checkout session creation, entitlement enforcement on protected resources
- [ ] **E2E**: View pricing → select plan → checkout → active subscription; upgrade/downgrade; view invoices; cancel subscription

### 8.4 Communication Test Pipeline

- [ ] **Unit**: Notification service logic, email template rendering, push payload formatting, preference evaluation
- [ ] **Integration**: Notification CRUD endpoints, email delivery (console provider), push subscription lifecycle, mark read/unread
- [ ] **E2E**: Trigger action → notification bell shows alert → click → navigate; toggle notification preferences; transactional email delivery

### 8.5 System Operations Test Pipeline

- [-] **Unit**: Audit event creation (typed events), security event severity mapping, job retry/backoff logic, webhook signature generation _(Security event + audit handler tests exist; webhook signature + job retry tests pending)_
- [ ] **Integration**: Security events written on auth actions, admin event listing/filtering/export, background job queue processing, webhook delivery + retry
- [ ] **E2E**: Admin security events dashboard → filter → export; job monitor shows queue status; trigger event → see it in audit log

### 8.6 Compliance Test Pipeline

- [-] **Unit**: Soft/hard deletion logic, PII anonymization rules, data export aggregation, consent version comparison, ToS gating evaluation _(lifecycle.logic.test.ts, deletion logic tests exist; PII anonymization + consent comparison pending)_
- [-] **Integration**: Data export request endpoint, deletion request + grace period, ToS middleware blocking + acceptance unblocking, consent recording _(tos.integration.test.ts exists and passes; data export + deletion grace period tests pending)_
- [ ] **E2E**: Request data export → receive download; delete account → confirm → blocked from login; new ToS → forced acceptance → normal access

### 8.7 Admin Console Test Pipeline

- [ ] **Unit**: Impersonation token scoping, user search multi-field matching, ban cascade rules
- [ ] **Integration**: Admin user CRUD, lock/unlock, impersonation token generation + audit trail, admin-only route enforcement
- [ ] **E2E**: Admin searches user → views detail → locks account → user blocked; admin impersonates user → sees banner → ends session
