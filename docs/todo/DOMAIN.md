# Domain Reference — `main/shared/src/`

> Complete registry of all 36 modules in the shared package.
> 11 core business domains + 25 engine infrastructure modules.
> 16 of 36 modules have API contracts (183 endpoints total).
> Last audited: 2026-02-18

---

## Quick Reference

### Modules with API Contracts (16)

| # | Module | Layer | Contract | Endpoints | Status |
|---|--------|-------|----------|-----------|--------|
| 1 | [Auth](#1-auth) | core | contract.auth.ts | 53 | Complete |
| 2 | [Users](#2-users) | core | contract.users.ts | 15 | Complete |
| 3 | [Tenant](#3-tenant) | core | contract.tenant.ts | 17 | Complete |
| 4 | [Billing](#4-billing) | core | contract.billing.ts | 15 | Complete |
| 5 | [Notifications](#5-notifications) | core | contract.notifications.ts | 11 | Complete |
| 6 | [Compliance](#6-compliance) | core | contract.compliance.ts | 7 | Complete |
| 7 | [Activities](#7-activities) | core | contract.activities.ts | 2 | Complete |
| 8 | [Admin](#8-admin) | core | contract.admin.ts | 30 | Complete |
| 9 | [Audit Log](#9-audit-log) | core | contract.audit.log.ts | 2 | Complete |
| 10 | [API Keys](#10-api-keys) | engine | contract.api.keys.ts | 4 | Complete |
| 11 | [Webhooks](#11-webhooks) | engine | contract.webhooks.ts | 6 | Complete |
| 12 | [Jobs](#12-jobs) | engine | contract.jobs.ts | 5 | Complete |
| 13 | [Feature Flags](#13-feature-flags) | engine | contract.feature.flags.ts | 7 | Complete |
| 14 | [Files](#14-files) | engine | contract.files.ts | 4 | Complete |
| 15 | [Health](#15-health) | engine | contract.health.ts | 3 | Complete |
| 16 | [Realtime](#16-realtime) | engine | contract.realtime.ts | 2 | Complete |

### Modules without API Contracts (20)

| # | Module | Layer | Purpose |
|---|--------|-------|---------|
| 17 | [Usage Metering](#17-usage-metering) | engine | Consumed via `billingContract.getUsage` |
| 18 | [Email](#18-email) | engine | Email templates & delivery logging |
| 19 | [Media](#19-media) | engine | File type detection, processing types |
| 20 | [Core Constants](#20-core-constants) | core | Domain-level constants |
| 21 | [Transactions](#21-transactions) | core | Undo/redo operation types |
| 22 | [HTTP](#22-http) | engine | Response envelopes, routes, cookies, CSRF |
| 23 | [Errors](#23-errors) | engine | All error classes + HTTP mapper |
| 24 | [Pagination](#24-pagination) | engine | Cursor + offset pagination |
| 25 | [Search](#25-search) | engine | Search DSL, filtering, facets, serialization |
| 26 | [Cache](#26-cache) | engine | LRU cache, memoize, cache types |
| 27 | [Security](#27-security) | engine | Input sanitization, injection detection, rate limiting |
| 28 | [Crypto](#28-crypto) | engine | JWT, token store, secure random |
| 29 | [Logger](#29-logger) | engine | Structured logging, correlation IDs |
| 30 | [PubSub](#30-pubsub) | engine | WebSocket subscription management |
| 31 | [Ports](#31-ports) | engine | Infrastructure service interfaces |
| 32 | [Context](#32-context) | engine | DI context types |
| 33 | [Env](#33-env) | engine | Environment validation |
| 34 | [DI](#34-di) | engine | Module registration |
| 35 | [Native](#35-native) | engine | Electron/React Native bridge |
| 36 | [Engine Constants](#36-engine-constants) | engine | Platform-level constants |

---

## Architecture

### Internal DAG

```
primitives  →  engine  →  core  →  contracts  →  api
```

Lower layers cannot import higher. All modules follow this dependency flow.

### Layer Responsibilities

| Layer | Purpose |
|-------|---------|
| **primitives** | Zero-dependency vocabulary: `Schema<T>`, branded IDs, `Result<T,E>`, helpers |
| **engine** | Infrastructure contracts and platform-agnostic utilities |
| **core** | Business logic: entity schemas, validation, domain functions |
| **contracts** | API endpoint definitions (`satisfies Contract`) |

### Key Relationships

- **Tenant (incl. Membership):** Workspace CRUD + settings + membership (members, invitations, roles). Membership was merged into tenant/ because all membership endpoints nest under `/tenants/:tenantId/` and the server layer already treats them as one domain.
- **Billing vs Usage Metering:** Usage metering provides the schemas and aggregation logic. Billing exposes the API at `GET /billing/usage` using `usageSummaryResponseSchema` from usage metering.
- **Email vs Notifications:** Email is infrastructure (template storage, delivery logging). Notifications is a business domain (in-app notifications, push, preferences).
- **Files vs Media:** Files handles metadata, upload/download records. Media provides file type detection and processing type definitions.
- **Admin consolidates:** Admin contract aggregates cross-cutting admin operations (user management, tenant suspension, security events, billing plans, impersonation, system stats).

---

## Core Business Domains (11)

### 1. Auth

> All authentication flows: registration, login, password reset, magic link, OAuth, TOTP/MFA, WebAuthn, email change, sessions, sudo mode, ToS acceptance.

**Location:** `core/auth/` (18 files + passwords/ subdirectory)

**Schema Files:**

| File | Concern | Key Exports |
|------|---------|-------------|
| `auth.core.schemas.ts` | Login, register, refresh, logout, reset, sudo | `loginRequestSchema`, `registerRequestSchema`, `authResponseSchema`, `sudoRequestSchema` |
| `auth.email.schemas.ts` | Email verification, change, reversion | `changeEmailRequestSchema`, `confirmEmailChangeRequestSchema`, `revertEmailChangeRequestSchema` |
| `auth.mfa.schemas.ts` | TOTP, SMS 2FA, phone, session invalidation | `totpSetupResponseSchema`, `totpVerifyRequestSchema`, `smsChallengeRequestSchema` |
| `auth.oauth.schemas.ts` | OAuth initiate, callback, link/unlink | `oauthCallbackQuerySchema`, `oauthConnectionSchema`, `oauthProviderSchema` |
| `auth.magic.link.schemas.ts` | Magic link request/verify | `magicLinkRequestSchema`, `magicLinkVerifyRequestSchema` |
| `auth.devices.schemas.ts` | Device list, trust | `deviceItemSchema`, `deviceListResponseSchema`, `trustDeviceResponseSchema` |
| `auth.passkey.schemas.ts` | Passkey list, rename | `passkeyListResponseSchema`, `renamePasskeyRequestSchema` |
| `auth.webauth.schemas.ts` | WebAuthn register/login | `webauthnOptionsResponseSchema`, `webauthnRegisterVerifyRequestSchema` |
| `auth.tos.schemas.ts` | Terms of Service status/accept | `tosStatusResponseSchema`, `acceptTosRequestSchema` |
| `auth.sessions.schemas.ts` | Session entity CRUD | `userSessionSchema`, `createUserSessionSchema` |
| `auth.sessions.logic.ts` | Session utilities | `isSessionActive()`, `isSessionRevoked()`, `getSessionAge()` |
| `auth.helpers.schemas.ts` | Cookie config, strategy check | `getRefreshCookieOptions()`, `isStrategyEnabled()` |
| `roles.ts` | Role & permission enums | `appRoleSchema`, `tenantRoleSchema`, `permissionSchema` |
| `auth.policy.ts` | Policy evaluation | `can()`, `hasPermission()` |
| `passwords/auth.password.ts` | Validation | `validatePassword()`, `defaultPasswordConfig` |
| `passwords/auth.password.strength.ts` | Strength estimation | `estimatePasswordStrength()` |
| `passwords/auth.password.scoring.ts` | Entropy, crack time | `calculateEntropy()`, `calculateScore()`, `estimateCrackTime()` |
| `passwords/auth.password.patterns.ts` | Pattern detection | `isCommonPassword()`, `hasKeyboardPattern()`, `hasSequentialChars()` |

**Contract:** `contract.auth.ts` — 53 endpoints

| Group | Count | Path Prefix | Examples |
|-------|-------|-------------|---------|
| Core auth | 10 | `/auth/` | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout` |
| Email | 6 | `/auth/` | `POST /auth/verify-email`, `POST /auth/change-email`, `POST /auth/change-email/confirm` |
| Password | 4 | `/auth/` | `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/set-password` |
| Magic link | 2 | `/auth/magic-link/` | `POST /auth/magic-link/request`, `POST /auth/magic-link/verify` |
| OAuth | 7 | `/auth/oauth/` | `GET /auth/oauth/:provider`, `GET /auth/oauth/:provider/callback`, `POST /auth/oauth/:provider/link` |
| TOTP | 4 | `/auth/totp/` | `POST /auth/totp/setup`, `POST /auth/totp/enable`, `POST /auth/totp/disable` |
| WebAuthn | 5 | `/auth/webauthn/` | `POST /auth/webauthn/register/options`, `POST /auth/webauthn/login/verify` |
| SMS/Phone | 5 | `/auth/` | `POST /auth/phone/add`, `POST /auth/phone/verify`, `POST /auth/sms/challenge` |
| Devices | 3 | `/auth/devices/` | `GET /auth/devices`, `DELETE /auth/devices/:id`, `POST /auth/devices/:id/trust` |
| ToS | 3 | `/auth/tos/` | `GET /auth/tos/status`, `POST /auth/tos/accept` |
| Sudo | 1 | `/auth/` | `POST /auth/sudo` |
| Sessions | 3 | `/auth/` | `POST /auth/logout-all`, `GET /auth/sessions` |

**Errors (from `engine/errors/`):** `InvalidCredentialsError`, `UserNotFoundError`, `EmailAlreadyExistsError`, `WeakPasswordError`, `InvalidTokenError`, `TokenReuseError`, `TotpRequiredError`, `TotpInvalidError`, `EmailNotVerifiedError`, `EmailSendError`, `AccountLockedError`, `OAuthError`, `OAuthStateMismatchError`

---

### 2. Users

> User profile management, sessions, avatar, username, lifecycle (deactivation/deletion), roles.

**Location:** `core/users/` (6 files)

**Schema Files:**

| File | Key Exports |
|------|-------------|
| `users.schemas.ts` | `userSchema`, `sessionSchema`, `updateProfileRequestSchema`, `changePasswordRequestSchema`, `avatarUploadRequestSchema`, `sessionsListResponseSchema`, `usersListResponseSchema` |
| `username.schemas.ts` | `updateUsernameRequestSchema`, `RESERVED_USERNAMES`, `isUsernameChangeCooldownActive()` |
| `lifecycle.schemas.ts` | `deactivateAccountRequestSchema`, `deleteAccountRequestSchema`, `accountLifecycleResponseSchema` |
| `lifecycle.logic.ts` | `getAccountStatus()`, `canDeactivate()`, `canReactivate()`, `canRequestDeletion()`, `isWithinDeletionGracePeriod()` |
| `users.permissions.ts` | `canUser()`, `hasRole()`, `isOwner()` |
| `users.roles.ts` | `isAdmin()`, `isModerator()`, `getAllRoles()`, `getRoleDisplayName()` |

**Contract:** `contract.users.ts` — 15 endpoints

| Group | Path Prefix | Endpoints |
|-------|-------------|-----------|
| Profile | `/users/me` | `GET /users/me`, `PATCH /users/me`, `GET /users/:id` |
| Username | `/users/me` | `PATCH /users/me/username` |
| Password | `/users/me` | `POST /users/me/password` |
| Avatar | `/users/me` | `PUT /users/me/avatar`, `DELETE /users/me/avatar` |
| Sessions | `/users/me/sessions` | `GET`, `DELETE /:id`, `POST /revoke-all`, `GET /count` |
| Lifecycle | `/users/me` | `POST /deactivate`, `POST /delete`, `POST /reactivate` |
| Completeness | `/users/me` | `GET /completeness` |

---

### 3. Tenant (incl. Membership)

> Workspace/organization CRUD, settings, ownership transfer, domain restrictions, members, invitations, role hierarchy, orphan prevention.

**Location:** `core/tenant/` (8 files)

**Schema Files:**

| File | Key Exports |
|------|-------------|
| `tenant.schemas.ts` | `tenantSchema`, `createTenantSchema`, `updateTenantSchema`, `transferOwnershipSchema`, `tenantListResponseSchema`, `tenantActionResponseSchema` |
| `tenant.settings.schemas.ts` | `tenantSettingSchema`, `createTenantSettingSchema`, `updateTenantSettingSchema` |
| `tenant.logic.ts` | `getWorkspaceContext()`, `hasRequiredWorkspaceRole()`, `WORKSPACE_ID_HEADER`, `WORKSPACE_ROLE_HEADER` |
| `tenant.workspace.ts` | `assertWorkspaceScope()`, `createWorkspaceContext()`, `isWorkspaceScoped()` |
| `domain.restrictions.ts` | `extractEmailDomain()`, `isEmailDomainAllowed()` |
| `membership.schemas.ts` | `membershipSchema`, `invitationSchema`, `createInvitationSchema`, `acceptInvitationSchema`, `addMemberSchema`, `updateMembershipRoleSchema`, `membersListResponseSchema`, `invitationsListResponseSchema`, `membershipActionResponseSchema` |
| `membership.logic.ts` | `canAssignRole()`, `canRemoveMember()`, `canLeave()`, `canChangeRole()`, `canAcceptInvite()`, `canRevokeInvite()`, `isSoleOwner()`, `getNextOwnerCandidate()`, `isInviteExpired()`, `hasAtLeastRole()`, `getRoleLevel()` |
| `membership.display.ts` | `getTenantRoleTone()`, `getInvitationStatusTone()` |

**Contract:** `contract.tenant.ts` — 17 endpoints

| Group | Endpoint | Description |
|-------|----------|-------------|
| Workspace | `POST /tenants` | Create workspace |
| Workspace | `GET /tenants` | List user's workspaces |
| Workspace | `GET /tenants/:id` | Get workspace details |
| Workspace | `POST /tenants/:id/update` | Update workspace |
| Workspace | `DELETE /tenants/:id` | Delete workspace |
| Workspace | `POST /tenants/:id/transfer` | Transfer ownership |
| Settings | `GET /tenants/:id/settings/:key` | Get workspace setting |
| Settings | `POST /tenants/:id/settings/:key` | Update workspace setting |
| Membership | `GET /tenants/:tenantId/members` | List workspace members |
| Membership | `DELETE /tenants/:tenantId/members/:userId` | Remove member |
| Membership | `POST /tenants/:tenantId/members/:userId/role` | Update member role |
| Membership | `POST /tenants/:tenantId/invitations` | Send invitation |
| Membership | `GET /tenants/:tenantId/invitations` | List invitations |
| Membership | `POST /invitations/accept` | Accept invitation (no tenant scope) |
| Membership | `DELETE /tenants/:tenantId/invitations/:invitationId` | Revoke invitation |
| Membership | `POST /tenants/:tenantId/invitations/:invitationId/resend` | Resend invitation |
| Membership | `POST /tenants/:tenantId/leave` | Leave workspace |

**Role Hierarchy:** `owner > admin > member > viewer` (enforced via `ROLE_LEVELS` and `canAssignRole`)

---

### 4. Billing

> Plans, subscriptions, checkout, invoices, payment methods, entitlements, admin plan management.

**Location:** `core/billing/` (7 files)

**Schema Files:**

| File | Key Exports |
|------|-------------|
| `billing.schemas.ts` | `planSchema`, `subscriptionSchema`, `invoiceSchema`, `paymentMethodSchema`, `checkoutRequestSchema`, `checkoutResponseSchema`, `cancelSubscriptionRequestSchema`, `updateSubscriptionRequestSchema`, `addPaymentMethodRequestSchema`, `portalSessionRequestSchema`, `setupIntentResponseSchema` + list responses |
| `billing.admin.schemas.ts` | `adminPlanSchema`, `adminPlanResponseSchema`, `createPlanRequestSchema`, `updatePlanRequestSchema`, `adminBillingStatsSchema`, `syncStripeResponseSchema` |
| `billing.entitlements.ts` | `resolveEntitlements()`, `assertEntitled()`, `assertWithinLimit()`, `isEntitled()`, `hasActiveSubscription()` |
| `billing.logic.ts` | `calculateProration()`, `PLAN_FEES` |
| `billing.display.ts` | `formatPrice()`, `formatPriceWithInterval()`, `getSubscriptionStatusLabel()`, `getInvoiceStatusLabel()`, `getCardBrandLabel()` |
| `billing.errors.ts` | 12 error classes: `PlanNotFoundError`, `BillingSubscriptionNotFoundError`, `CheckoutSessionError`, etc. |
| `billing.service.types.ts` | `BillingService`, `CheckoutParams`, `NormalizedWebhookEvent`, `ProviderSubscription` |

**Contract:** `contract.billing.ts` — 15 endpoints

| Group | Path Prefix | Endpoints |
|-------|-------------|-----------|
| Plans | `/billing/plans` | `GET` — list active plans (public) |
| Subscriptions | `/billing/` | `GET /subscription`, `POST /checkout`, `POST /portal`, `POST /subscription/cancel`, `POST /subscription/resume`, `POST /subscription/update` |
| Invoices | `/billing/invoices` | `GET`, `GET /:id` |
| Usage | `/billing/usage` | `GET` — uses `usageSummaryResponseSchema` from engine/usage-metering |
| Payment Methods | `/billing/payment-methods` | `POST /setup-intent`, `GET`, `POST /add`, `DELETE /:id`, `POST /:id/default` |

---

### 5. Notifications

> In-app notifications, push (FCM), preferences, quiet hours, rate limiting.

**Location:** `core/notifications/` (6 files)

**Schema Files:**

| File | Key Exports |
|------|-------------|
| `notifications.schemas.ts` | `notificationSchema`, `notificationPreferencesSchema`, `notificationsListRequestSchema`, `notificationsListResponseSchema`, `markReadResponseSchema`, `deleteNotificationResponseSchema` |
| `notifications.push.schemas.ts` | `subscribeRequestSchema`, `sendNotificationRequestSchema`, `updatePreferencesRequestSchema`, `vapidKeyResponseSchema` |
| `notifications.types.ts` | `DEFAULT_NOTIFICATION_PREFERENCES`, `NotificationPreferences`, `NotificationMessage`, `NotificationPayload`, `PushSubscription` |
| `notifications.logic.ts` | `shouldSendNotification()` |
| `notifications.errors.ts` | 12 errors: `NotificationSendError`, `PushProviderNotConfiguredError`, `QuietHoursActiveError`, etc. |
| `notifications.display.ts` | `getNotificationLevelTone()` |

**Contract:** `contract.notifications.ts` — 11 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /notifications` | List notifications |
| `PATCH /notifications/:id/read` | Mark as read |
| `POST /notifications/read-all` | Mark all as read |
| `DELETE /notifications/:id` | Delete notification |
| `POST /notifications/send` | Send notification |
| `POST /push/subscribe` | Subscribe to push |
| `DELETE /push/unsubscribe` | Unsubscribe from push |
| `GET /push/vapid-key` | Get VAPID public key |
| `GET /notifications/preferences` | Get preferences |
| `PUT /notifications/preferences` | Update preferences |
| `GET /notifications/preferences/:type` | Get preference by type |

---

### 6. Compliance

> GDPR compliance: legal documents, consent management, data export, account deletion.

**Location:** `core/compliance/` (4 files)

**Schema Files:**

| File | Key Exports |
|------|-------------|
| `compliance.schemas.ts` | `legalDocumentSchema`, `userAgreementSchema`, `consentLogSchema`, `dataExportRequestSchema`, `updateConsentPreferencesRequestSchema`, `consentPreferencesResponseSchema`, `dataExportRequestedResponseSchema`, `complianceActionResponseSchema` |
| `deletion.schemas.ts` | `deletionRequestSchema`, `DEFAULT_DELETION_CONFIG`, `DELETION_STATES` |
| `compliance.logic.ts` | `getEffectiveConsent()`, `isConsentGranted()`, `needsReacceptance()` |
| `deletion.logic.ts` | `calculateHardDeleteDate()`, `isSoftDeleted()`, `isWithinGracePeriod()` |

**Contract:** `contract.compliance.ts` — 7 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /compliance/documents/:type` | Get legal document |
| `GET /compliance/consent` | Get consent preferences |
| `POST /compliance/consent` | Update consent preferences |
| `POST /compliance/data-export` | Request data export |
| `GET /compliance/data-export/:requestId` | Get export status |
| `POST /compliance/account-deletion` | Request account deletion |
| `POST /compliance/account-deletion/cancel` | Cancel deletion request |

---

### 7. Activities

> User and workspace activity feed with cursor pagination. Endpoints are scoped: workspace activities at `/tenants/:tenantId/activities`, personal feed at `/users/me/activities`.

**Location:** `core/activities/` (2 files)

**Schemas:** `activitySchema`, `createActivitySchema`, `actorTypeSchema`, `activitiesListFiltersSchema`

**Display:** `getActorTypeTone()`

**Contract:** `contract.activities.ts` — 2 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /tenants/:tenantId/activities` | Workspace activity feed (cursor-paginated) |
| `GET /users/me/activities` | Personal activity feed (cursor-paginated) |

---

### 8. Admin

> System admin console: user management, tenant management, impersonation, security events, billing plans, system stats, webhooks. All endpoints require admin role.

**Location:** `core/admin/` (3 files)

**Schema Files:**

| File | Key Exports |
|------|-------------|
| `admin.schemas.ts` | `adminUserSchema`, `adminTenantSchema`, `adminUserListFiltersSchema`, `adminUserListResponseSchema`, `adminTenantsListResponseSchema`, `impersonationResponseSchema`, `endImpersonationResponseSchema`, `systemStatsResponseSchema`, `routeManifestResponseSchema`, `adminHardBanRequestSchema`, `adminSuspendTenantRequestSchema`, `adminActionResponseSchema` |
| `admin.security.schemas.ts` | `securityEventSchema`, `securityEventsListRequestSchema`, `securityEventsListResponseSchema`, `securityEventDetailResponseSchema`, `securityEventsExportRequestSchema`, `securityMetricsResponseSchema`, `securityMetricsSchema` |
| `admin.display.ts` | `getUserStatusLabel()`, `getUserStatusTone()`, `getAppRoleLabel()`, `getAppRoleTone()`, `getSecuritySeverityTone()`, `formatSecurityEventType()` |

**Contract:** `contract.admin.ts` — 30 endpoints

| Group | Count | Path Prefix | Examples |
|-------|-------|-------------|---------|
| Users | 8 | `/admin/users` | list, get, update, lock, unlock (x2), search, hard-ban |
| Security | 4 | `/admin/security` | list events, get event, metrics, export |
| Tenants | 4 | `/admin/tenants` | list, get, suspend, unsuspend |
| Impersonation | 2 | `/admin/impersonate` | start, end |
| Webhooks | 3 | `/admin/webhooks` | list, deliveries, replay |
| Billing Plans | 6 | `/admin/billing` | list plans, get, create, update, sync-stripe, deactivate |
| System | 3 | `/admin/` | metrics, health, route manifest |

---

### 9. Audit Log

> General audit event recording, filtering, and display.

**Location:** `core/audit-log/` (3 files)

**Schemas:** `auditEventSchema`, `createAuditEventSchema`, `auditLogFilterSchema`, `auditLogListResponseSchema`

**Logic:** `buildAuditEvent()`, `sanitizeMetadata()`

**Display:** `getAuditActionTone()`, `getAuditSeverityTone()`

**Contract:** `contract.audit.log.ts` — 2 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /audit-log` | List audit events (filtered, paginated) |
| `GET /audit-log/:id` | Get audit event details |

---

### 10. API Keys

> Programmatic access: key creation, listing, revocation.

**Location:** `engine/api-keys/` (1 file)

**Schemas:** `apiKeySchema`, `apiKeyItemSchema`, `createApiKeySchema`, `createApiKeyRequestSchema`, `createApiKeyResponseSchema`, `updateApiKeySchema`, `deleteApiKeyResponseSchema`, `listApiKeysResponseSchema`, `revokeApiKeyResponseSchema`

**Contract:** `contract.api.keys.ts` — 4 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /users/me/api-keys` | List API keys |
| `POST /users/me/api-keys` | Create API key |
| `DELETE /users/me/api-keys/:id` | Delete API key |
| `POST /users/me/api-keys/:id/revoke` | Revoke API key |

---

### 11. Webhooks

> Webhook registration, delivery tracking, retry logic, event filtering.

**Location:** `engine/webhooks/` (1 file)

**Schemas:** `webhookSchema`, `createWebhookSchema`, `updateWebhookSchema`, `webhookDeliverySchema`, `createWebhookDeliverySchema`, `webhookListResponseSchema`, `webhookMutationResponseSchema`, `webhookDeleteResponseSchema`, `webhookWithDeliveriesSchema`, `rotateSecretResponseSchema`

**Logic:** `calculateRetryDelay()`, `shouldRetryDelivery()`, `isDeliveryTerminal()`, `matchesEventFilter()`

**Contract:** `contract.webhooks.ts` — 6 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /webhooks` | List webhooks |
| `POST /webhooks` | Create webhook |
| `GET /webhooks/:id` | Get webhook with deliveries |
| `PATCH /webhooks/:id` | Update webhook |
| `DELETE /webhooks/:id` | Delete webhook |
| `POST /webhooks/:id/rotate-secret` | Rotate webhook secret |

---

### 12. Jobs

> Background job queue, retry/backoff, dead-letter, admin management.

**Location:** `engine/jobs/` (1 file)

**Schemas:** `jobSchema`, `createJobSchema`, `updateJobSchema`, `jobDetailsSchema`, `jobListQuerySchema`, `jobListResponseSchema`, `jobActionResponseSchema`, `queueStatsSchema`

**Logic:** `isTerminalStatus()`, `canRetry()`, `shouldProcess()`, `calculateBackoff()`

**Display:** `getJobStatusLabel()`, `getJobStatusTone()`

**Contract:** `contract.jobs.ts` — 5 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /admin/jobs` | List jobs (admin) |
| `GET /admin/jobs/:id` | Get job details |
| `POST /admin/jobs/:id/retry` | Retry failed job |
| `POST /admin/jobs/:id/cancel` | Cancel job |
| `GET /admin/jobs/stats` | Queue statistics |

---

### 13. Feature Flags

> Feature flag CRUD, tenant overrides, evaluation logic. Admin-only endpoints.

**Location:** `engine/feature-flags/` (1 file)

**Schemas:** `featureFlagSchema`, `createFeatureFlagRequestSchema`, `updateFeatureFlagRequestSchema`, `tenantFeatureOverrideSchema`, `setTenantFeatureOverrideRequestSchema`, `featureFlagsListResponseSchema`, `featureFlagActionResponseSchema`

**Logic:** `evaluateFlag(flagKey, tenantId?)` — checks global flag with tenant override

**Contract:** `contract.feature.flags.ts` — 7 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /admin/feature-flags` | List all flags |
| `GET /admin/feature-flags/:key` | Get flag by key |
| `POST /admin/feature-flags` | Create flag |
| `POST /admin/feature-flags/:key` | Update flag |
| `DELETE /admin/feature-flags/:key` | Delete flag |
| `POST /admin/feature-flags/:key/tenants/:tenantId` | Set tenant override |
| `DELETE /admin/feature-flags/:key/tenants/:tenantId` | Delete tenant override |

---

### 14. Files

> File metadata, upload/download, storage provider abstraction.

**Location:** `engine/files/` (1 file)

**Schemas:** `fileRecordSchema`, `createFileRecordSchema`, `updateFileRecordSchema`, `fileUploadRequestSchema`, `fileUploadResponseSchema`, `filesListResponseSchema`, `fileDeleteResponseSchema`, `storageProviderSchema`, `filePurposeSchema`

**Utilities:** `validateFileType()`, `generateUniqueFilename()`, `normalizeStoragePath()`, `joinStoragePath()`

**Contract:** `contract.files.ts` — 4 endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /files` | Upload file |
| `GET /files` | List files |
| `GET /files/:id` | Get file metadata |
| `DELETE /files/:id` | Delete file |

**Constants:** `STORAGE_PROVIDERS`, `FILE_PURPOSES`, `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_SIZE`, `MAX_LOGO_SIZE`

---

### 15. Health

> Health, readiness, and liveness probes for infrastructure tooling. Responses are NOT wrapped in `successResponseSchema` — consumed by load balancers and orchestrators.

**Location:** `engine/health/` (1 file)

**Schemas:** `detailedHealthResponseSchema`, `readyResponseSchema`, `liveResponseSchema`

**Logic:** `buildDetailedHealthResponse()`, `determineOverallStatus()`, `checkDatabase()`, `checkCache()`, `checkEmail()`, `checkPubSub()`, `checkQueue()`, `checkRateLimit()`, `checkSchema()`, `checkStorage()`, `checkWebSocket()`

**Contract:** `contract.health.ts` — 3 endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Detailed health check with service statuses |
| `GET /ready` | Readiness probe for load balancer |
| `GET /live` | Liveness probe for orchestrator |

---

### 16. Realtime

> Operational transformation, version conflict resolution, record sync.

**Location:** `engine/realtime/` (1 file)

**Schemas:** `recordSchema`, `operationSchema`, `setOperationSchema`, `listInsertOperationSchema`, `listRemoveOperationSchema`, `setNowOperationSchema`, `transactionSchema`, `recordPointerSchema`, `recordMapSchema`, `getRecordsRequestSchema`, `getRecordsResponseSchema`, `writeResponseSchema`, `conflictResponseSchema`, `listPositionSchema`

**Logic:** `applyOperation()`, `applyOperations()`, `checkVersionConflicts()`, `getOperationPointers()`, `isFieldMutable()`, `setPath()`

**Contract:** `contract.realtime.ts` — 2 endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /realtime/records` | Get records by pointers |
| `POST /realtime/write` | Write operations with conflict detection |

---

## Modules Without API Contracts (20)

These modules provide schemas, types, logic, and utilities consumed by other modules or by server-side code. They do not define user-facing HTTP endpoints.

---

### 17. Usage Metering

> Resource consumption tracking for billing. No dedicated API contract — consumed via `billingContract.getUsage`.

**Location:** `engine/usage-metering/` (1 file)

**Schemas:** `usageMetricSchema`, `usageSnapshotSchema`, `usageMetricSummarySchema`, `usageSummaryResponseSchema`

**Logic:** `aggregateSnapshots()`, `aggregateValues()`, `isOverQuota()`

**Types:** `UsageMetric`, `UsageSnapshot`, `UsageMetricSummary`, `UsageSummaryResponse`, `AggregationType`

**Consumed by:** `contract.billing.ts` at `GET /billing/usage`

---

### 18. Email

> Email template management and delivery logging. No dedicated API contract — email is infrastructure, not a user-facing API. Server handlers use these schemas to store templates and log deliveries.

**Location:** `engine/email/` (1 file)

**Schemas:** `emailTemplateSchema`, `createEmailTemplateSchema`, `updateEmailTemplateSchema`, `emailLogEntrySchema`, `createEmailLogEntrySchema`, `emailProviderSchema`, `emailStatusSchema`

**Types:** `EmailTemplate`, `CreateEmailTemplate`, `UpdateEmailTemplate`, `EmailLogEntry`, `CreateEmailLogEntry`, `EmailProvider`, `EmailStatus`

---

### 19. Media

> File type detection, processing types, upload validation. No dedicated API contract — media processing is server-side, file serving uses `filesContract`.

**Location:** `engine/media/` (1 file)

**Functions:** `detectFileType()`, `detectFileTypeFromPath()`, `generateFileId()`, `isAllowedFileType()`, `parseAudioMetadataFromBuffer()`, `sanitizeFilename()`, `validateUploadConfig()`

**Types:** `FileTypeResult`, `MediaMetadata`, `AudioMetadata`, `ImageProcessingOptions`, `VideoProcessingOptions`, `AudioProcessingOptions`, `MediaProcessingOptions`, `ProcessingResult`, `SecurityScanResult`, `ContentModerationResult`, `UploadConfig`

---

### 20. Core Constants

> All domain-level constants organized by business area.

**Location:** `core/constants/` (9 files)

| File | Key Exports |
|------|-------------|
| `auth` | `APP_ROLES`, `AUTH_EXPIRY`, `COMMON_PASSWORDS`, `defaultPasswordConfig`, `KEYBOARD_PATTERNS`, `LOGIN_FAILURE_REASON`, `OAUTH_PROVIDERS` |
| `billing` | `BILLING_EVENT_TYPES`, `BILLING_PROVIDERS`, `CENTS_PER_DOLLAR`, `FEATURE_KEYS`, `INVOICE_STATUSES`, `LIMIT_FEATURE_KEYS`, `PAYMENT_METHOD_TYPES`, `PLAN_FEES`, `PLAN_INTERVALS`, `SUBSCRIPTION_STATUSES`, `TOGGLE_FEATURE_KEYS` |
| `compliance` | `ACCOUNT_DELETION_GRACE_PERIOD_DAYS`, `CONSENT_TYPES`, `DATA_EXPORT_STATUSES`, `DATA_EXPORT_TYPES`, `DEFAULT_GRACE_PERIOD_DAYS`, `DELETION_STATES`, `DOCUMENT_TYPES`, `RETENTION_PERIODS`, `USERNAME_CHANGE_COOLDOWN_DAYS` |
| `i18n` | `CURRENCIES`, `LOCALES`, `Currency`, `Locale` |
| `iam` | `ACTOR_TYPES`, `INVITATION_STATUSES`, `PERMISSIONS`, `RESERVED_USERNAMES`, `ROLE_LEVELS`, `TENANT_ROLES`, `USER_STATUSES` |
| `notifications` | `AUDIT_CATEGORIES`, `AUDIT_SEVERITIES`, `NOTIFICATION_CHANNELS`, `NOTIFICATION_ENV_PROVIDERS`, `NOTIFICATION_LEVELS`, `NOTIFICATION_PRIORITIES`, `NOTIFICATION_SCHEMA_PROVIDERS`, `NOTIFICATION_TYPES` |
| `policy` | `PROTECTED_FIELDS` |
| `product` | `ALL_MEDIA_EXTENSIONS`, `ALLOWED_IMAGE_MIME_TYPES`, `ALLOWED_MEDIA_MIME_TYPES`, `AUDIO_EXTENSIONS`, `EXT_TO_MIME`, `FILE_PURPOSES`, `IMAGE_EXTENSIONS`, `MAGIC_NUMBERS`, `MIME_TO_EXT`, `STORAGE_PROVIDERS`, `VIDEO_EXTENSIONS` |
| `ui.defaults` | `DEFAULT_CONTRAST_MODE`, `DEFAULT_DENSITY`, `DEFAULT_THEME` |

---

### 21. Transactions

> Undo/redo operation types and utilities for offline-first editing.

**Location:** `core/transactions/` (2 files)

**Operation Creators:** `createSetOperation()`, `createListInsertOperation()`, `createListRemoveOperation()`, `createTransaction()`

**Utilities:** `invertOperation()`, `invertTransaction()`, `mergeTransactions()`

**Type Guards:** `isSetOperation()`, `isListInsertOperation()`, `isListRemoveOperation()`

**Types:** `Operation`, `SetOperation`, `ListInsertOperation`, `ListRemoveOperation`, `Transaction`

---

### 22. HTTP

> Framework-agnostic HTTP utilities: response envelopes, route definitions, cookie handling, proxy validation, CSRF, multipart parsing, bearer token extraction.

**Location:** `engine/http/` (8 files)

| File | Key Exports |
|------|-------------|
| `response.ts` | `successResponseSchema()`, `errorResponseSchema`, `emptyBodySchema`, `apiResultSchema`, `simpleErrorResponseSchema`, `envelopeErrorResponseSchema`, `createErrorCodeSchema()` |
| `routes.ts` | `publicRoute()`, `protectedRoute()`, `createRouteMap()` |
| `cookies.ts` | `parseCookies()`, `serializeCookie()` |
| `proxy.ts` | `getValidatedClientIp()`, `ipMatchesCidr()`, `isFromTrustedProxy()`, `isValidIp()`, `parseXForwardedFor()`, `parseCidr()`, `validateCidrList()` |
| `multipart.ts` | `parseMultipartFile()` |
| `request.ts` | `extractIpAddress()`, `extractUserAgent()`, `getRequesterId()` |
| `csrf.ts` | `extractCsrfToken()` |
| `auth.ts` | `extractBearerToken()` |
| `http.ts` | Types: `BaseRouteDefinition`, `HandlerContext`, `HttpMethod`, `RequestInfo`, `RouteHandler`, `RouteMap`, `RouteResult`, `ValidationSchema` |

---

### 23. Errors

> All error classes (HTTP + auth) and the error-to-HTTP-response mapper.

**Location:** `engine/errors/` (2 files)

**HTTP Errors:** `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError`, `ValidationError`, `UnprocessableError`, `TooManyRequestsError`, `InternalServerError`, `ResourceNotFoundError`, `ConfigurationError`, `InternalError`

**Auth Errors:** `InvalidCredentialsError`, `UserNotFoundError`, `EmailAlreadyExistsError`, `WeakPasswordError`, `InvalidTokenError`, `TokenReuseError`, `TotpRequiredError`, `TotpInvalidError`, `EmailNotVerifiedError`, `EmailSendError`, `AccountLockedError`, `OAuthError`, `OAuthStateMismatchError`

**Base Classes:** `BaseError`, `AppError`

**Utilities:** `isAppError()`, `toAppError()`, `formatValidationErrors()`, `getErrorStatusCode()`, `getSafeErrorMessage()`

**Mapper:** `mapErrorToHttpResponse()`, `isKnownAuthError()`

---

### 24. Pagination

> Cursor-based and offset-based pagination for database queries and in-memory arrays.

**Location:** `engine/pagination/` (5 files)

| File | Key Exports |
|------|-------------|
| `pagination.ts` | `paginatedResultSchema()`, `cursorPaginatedResultSchema()`, `paginationOptionsSchema`, `cursorPaginationOptionsSchema`, `createPaginatedResult()`, `createCursorPaginatedResult()`, `calculateOffsetPaginationMetadata()`, `PaginationError` |
| `cursor.ts` | `encodeCursor()`, `decodeCursor()`, `createCursorForItem()`, `getSortableValue()`, `isCursorValue()` |
| `helpers.ts` | `buildCursorPaginationQuery()`, `calculateCursorPaginationMetadata()`, `paginateArrayWithCursor()`, `paginateLargeArrayWithCursor()` |
| `http.ts` | `DEFAULT_PAGINATION_PARAMS`, `getQueryParam()`, `parseLimitParam()`, `parsePageParam()`, `parseSortByParam()`, `parseSortOrderParam()` |

**Constants:** `DEFAULT_PAGE_LIMIT`, `DEFAULT_SORT_BY`, `DEFAULT_SORT_ORDER`, `PAGINATION_ERROR_TYPES`

**Types:** `PaginatedResult`, `CursorPaginatedResult`, `PaginationOptions`, `CursorPaginationOptions`, `CursorData`

---

### 25. Search

> Full search DSL: query building, filtering, faceted search, sort, serialization to URL params/JSON/hash.

**Location:** `engine/search/` (5 files)

| File | Key Exports |
|------|-------------|
| `schemas.ts` | `searchQuerySchema`, `filterConditionSchema`, `compoundFilterSchema`, `filterSchema`, `facetedSearchQuerySchema`, `searchResultSchema`, `cursorSearchResultSchema`, `facetedSearchResultSchema`, `urlSearchParamsSchema`, 20+ schemas |
| `query.builder.ts` | `SearchQueryBuilder`, `createSearchQuery()`, `fromSearchQuery()`, `eq()`, `neq()`, `gt()`, `lt()`, `contains()`, `inArray()` |
| `operators.ts` | `evaluateFilter()`, `evaluateCondition()`, `evaluateCompoundFilter()`, `filterArray()`, `sortArray()`, `paginateArray()` |
| `serialization.ts` | `serializeToURLParams()`, `deserializeFromURLParams()`, `serializeToJSON()`, `deserializeFromJSON()`, `serializeToHash()`, `deserializeFromHash()`, `buildURLWithQuery()`, `extractQueryFromURL()`, `mergeSearchParamsIntoURL()` |
| `errors.ts` | `SearchError`, `InvalidQueryError`, `InvalidFilterError`, `InvalidOperatorError`, `InvalidFieldError`, `InvalidSortError`, `InvalidPaginationError`, `InvalidCursorError`, `QueryTooComplexError`, `SearchProviderError`, `SearchProviderUnavailableError`, `SearchTimeoutError`, `UnsupportedOperatorError` |

**Types:** `SearchQuery`, `SearchResult`, `FilterCondition`, `CompoundFilter`, `FacetConfig`, `FacetResult`, `SearchCapabilities`, `SearchProvider`, `SortConfig`, `HighlightedField`

---

### 26. Cache

> LRU cache, memoize utility, cache provider types, and error hierarchy.

**Location:** `engine/cache/` (5 files)

**Classes:** `LRUCache`

**Functions:** `memoize()`

**Errors:** `CacheError`, `CacheConnectionError`, `CacheTimeoutError`, `CacheSerializationError`, `CacheDeserializationError`, `CacheInvalidKeyError`, `CacheMemoryLimitError`, `CacheCapacityError`, `CacheNotInitializedError`, `CacheProviderNotFoundError`

**Error Guards:** `isCacheError()`, `isCacheConnectionError()`, `isCacheTimeoutError()`, `toCacheError()`

**Types:** `CacheProvider`, `CacheConfig`, `CacheEntry`, `CacheEntryMetadata`, `CacheStats`, `CacheGetOptions`, `CacheSetOptions`, `CacheDeleteOptions`, `MemoryCacheConfig`, `RedisCacheConfig`, `BaseCacheConfig`

---

### 27. Security

> Input sanitization, injection detection, prototype pollution prevention, rate limiting.

**Location:** `engine/security/` (4 files)

| File | Key Exports |
|------|-------------|
| `input.ts` | `sanitizeString()`, `detectSQLInjection()`, `detectNoSQLInjection()`, `isValidInputKeyName()` |
| `prototype.ts` | `hasDangerousKeys()`, `sanitizePrototype()` |
| `rate.limit.ts` | `createRateLimiter()` |

**Types:** `SQLInjectionDetectionOptions`, `RateLimitInfo`

---

### 28. Crypto

> JWT implementation, token store, secure random generation, constant-time comparison.

**Location:** `engine/crypto/` (2 files + re-exports from primitives)

| Source | Key Exports |
|--------|-------------|
| `jwt.ts` | `jwtSign()`, `jwtVerify()`, `jwtDecode()`, `sign()`, `verify()`, `decode()`, `signWithRotation()`, `verifyWithRotation()`, `createJwtRotationHandler()`, `checkTokenSecret()`, `JwtError` |
| `token.ts` | `createTokenStore()`, `tokenStore`, `addAuthHeader()` |
| Re-exported from primitives | `generateSecureId()`, `generateToken()`, `generateUUID()`, `constantTimeCompare()` |

**Types:** `JwtPayload`, `JwtHeader`, `JwtErrorCode`, `JwtRotationConfig`, `SignOptions`, `TokenStore`

---

### 29. Logger

> Structured logging, correlation IDs, console logger, request logging.

**Location:** `engine/logger/` (4 files)

| File | Key Exports |
|------|-------------|
| `base.logger.ts` | `createLogger()`, `createRequestLogger()`, `createJobLogger()`, `createJobCorrelationId()` |
| `correlation.ts` | `generateCorrelationId()`, `getOrCreateCorrelationId()`, `isValidCorrelationId()`, `createRequestContext()` |
| `levels.ts` | `shouldLog()` |
| `console.ts` | `createConsoleLogger()`, `CONSOLE_LOG_LEVELS` |

**Types:** `Logger`, `BaseLogger`, `LoggerConfig`, `LogLevel`, `LogData`, `RequestContext`, `ConsoleLoggerConfig`, `ConsoleLogLevel`

---

### 30. PubSub

> WebSocket-based subscription management for real-time updates. Browser-safe core with server-only PostgresPubSub.

**Location:** `engine/pubsub/` (3 files)

| File | Key Exports |
|------|-------------|
| `types.ts` | `SubKeys`, `parseRecordKey()` |
| `subscription.manager.ts` | `SubscriptionManager` |
| `helpers.ts` | `publishAfterWrite()` |
| `postgres.pubsub.ts` | Type-only: `PostgresPubSub`, `PostgresPubSubOptions`, `PubSubMessage` |

**Types:** `ClientMessage`, `ServerMessage`, `SubscriptionKey`, `RecordKey`, `ListKey`, `ParsedRecordKey`, `WebSocket`, `SubscriptionManagerOptions`

---

### 31. Ports

> Infrastructure service interfaces (hexagonal architecture). Defines contracts that server-side adapters implement.

**Location:** `engine/ports/` (1 file — all type exports)

**Interfaces:**

| Interface | Purpose |
|-----------|---------|
| `StorageClient` | File upload/download/delete |
| `StorageService` | Higher-level storage operations |
| `EmailService` | Send email with attachments |
| `CacheService` | Get/set/delete cache entries |
| `JobQueueService` | Enqueue/process background jobs |
| `AuditService` | Record and query audit entries |
| `MetricsService` | Record and query metrics |
| `NotificationService` | Send notifications |
| `DeletionService` | Handle data deletion |
| `ConfigService` | Read configuration |
| `InfrastructureService` | Composite service container |

**Types:** `Job`, `JobHandler`, `JobOptions`, `EmailOptions`, `Attachment`, `SendResult`, `AuditEntry`, `AuditQuery`, `AuditResponse`, `RecordAuditRequest`, `HealthCheckResult`, `StorageConfig`, `BaseStorageConfig`, `LocalStorageConfig`, `S3StorageConfig`, `StorageProvider`, `ReadableStreamLike`

---

### 32. Context

> Dependency injection context types for request handling.

**Location:** `engine/context/` (1 file — all type exports)

**Types:**

| Type | Purpose |
|------|---------|
| `BaseContext` | Logger, config, error tracker |
| `RequestContext` | BaseContext + request info |
| `AuthenticatedUser` | User identity in request |
| `ReplyContext` | Response utilities |
| `RequestInfo` | IP, user agent, headers |
| `HasEmail` | Context with email service |
| `HasStorage` | Context with storage service |
| `HasCache` | Context with cache service |
| `HasQueue` | Context with job queue |
| `HasBilling` | Context with billing service |
| `HasNotifications` | Context with notification service |
| `HasPubSub` | Context with pubsub service |

---

### 33. Env

> Environment variable validation at startup.

**Location:** `engine/env/` (1 file)

**Exports:** `baseEnvSchema`, `validateEnv()`, `getRawEnv()`

**Types:** `BaseEnv`

---

### 34. DI

> Module registration contracts for dependency injection.

**Location:** `engine/di/` (1 file — all type exports)

**Types:** `ModuleDeps`, `ModuleRegistrationOptions`

---

### 35. Native

> Bridge interface for Electron and React Native platforms.

**Location:** `engine/native/` (1 file — type export only)

**Types:** `NativeBridge`

---

### 36. Engine Constants

> Platform-level constants organized by concern.

**Location:** `engine/constants/` (4 files)

| File | Key Exports |
|------|-------------|
| `limits` | `LIMITS`, `QUOTAS`, `MAX_UPLOAD_FILE_SIZE`, `MAX_CHUNK_SIZE`, `MAX_FILENAME_LENGTH`, `MAX_DELIVERY_ATTEMPTS`, `RETRY_DELAYS_MINUTES`, `SMS_LIMITS`, `NOTIFICATION_PAYLOAD_MAX_SIZE`, `SEARCH_DEFAULTS`, `DEFAULT_PAGINATION`, `FILTER_OPERATORS`, `LOGICAL_OPERATORS`, `PAGINATION_ERROR_TYPES`, `SEARCH_ERROR_TYPES`, `AGGREGATION_TYPES` |
| `platform` | `HTTP_STATUS`, `ERROR_CODES`, `ERROR_MESSAGES`, `HTTP_ERROR_MESSAGES`, `AUTH_CONSTANTS`, `AUTH_ERROR_MESSAGES`, `AUTH_ERROR_NAMES`, `AUTH_SUCCESS_MESSAGES`, `CORS_CONFIG`, `CSRF_EXEMPT_PATHS`, `CACHE_TTL`, `LOG_LEVELS`, `CONSOLE_LOG_LEVELS`, `RATE_LIMIT_WINDOWS`, `JOB_STATUSES`, `JOB_PRIORITIES`, `WEBHOOK_EVENT_TYPES`, `WEBHOOK_DELIVERY_STATUSES`, `TERMINAL_STATUSES`, `HEALTH_STATUS`, `EMAIL_PROVIDERS`, `EMAIL_STATUSES`, `DEVICE_TYPES`, `PLATFORM_TYPES`, `API_PREFIX`, `API_VERSIONS`, `STANDARD_HEADERS`, `SAFE_METHODS`, `CRYPTO`, `ANSI` |
| `security` | `SENSITIVE_KEYS` |
| `audit` | `AUDIT_CATEGORIES`, `AUDIT_SEVERITIES` |

**Types:** `ErrorCode`, `HttpStatusCode`

---

## Appendix: File Inventory

### Contract Files (16)

```
contracts/
  contract.activities.ts      —  2 endpoints
  contract.admin.ts           — 30 endpoints
  contract.api.keys.ts        —  4 endpoints
  contract.audit.log.ts       —  2 endpoints
  contract.auth.ts            — 53 endpoints
  contract.billing.ts         — 15 endpoints
  contract.compliance.ts      —  7 endpoints
  contract.feature.flags.ts   —  7 endpoints
  contract.files.ts           —  4 endpoints
  contract.health.ts          —  3 endpoints
  contract.jobs.ts            —  5 endpoints
  contract.notifications.ts   — 11 endpoints
  contract.realtime.ts        —  2 endpoints
  contract.tenant.ts          — 17 endpoints (incl. membership)
  contract.users.ts           — 15 endpoints
  contract.webhooks.ts        —  6 endpoints
  index.ts                    — barrel
```

### Core Modules (11)

```
core/
  activities/     — 2 schema files, 2 test files
  admin/          — 3 schema files, 2 test files
  audit-log/      — 3 files (schemas, logic, display), 3 test files
  auth/           — 18 files + passwords/ (4 files), 4 test files
  billing/        — 7 files (schemas, admin, logic, display, errors, entitlements, service types), 6 test files
  compliance/     — 4 files (schemas, deletion, logic x2), 3 test files
  constants/      — 9 constant files
  notifications/  — 6 files (schemas, push, types, logic, errors, display), 5 test files
  tenant/         — 8 files (schemas, settings, logic, workspace, domain-restrictions, membership x3), 8 test files
  transactions/   — 2 files (types, operations), 2 test files
  users/          — 6 files (schemas, username, lifecycle x2, permissions, roles), 5 test files
  schemas.ts      — field validation schemas
  index.ts        — barrel
```

### Engine Modules (25)

```
engine/
  api-keys/       — 1 schema file, 1 test file
  cache/          — 5 files, 3 test files
  constants/      — 4 files
  context/        — 1 file
  crypto/         — 2 files, 2 test files
  di/             — 1 file
  email/          — 1 schema file, 1 test file
  env/            — 1 file, 1 test file
  errors/         — 2 files (errors, mapper), 1 test file
  feature-flags/  — 1 file, 1 test file
  files/          — 1 file, 1 test file
  health/         — 1 file, 1 test file
  http/           — 8 files, 3 test files
  jobs/           — 1 file, 2 test files
  logger/         — 4 files, 4 test files
  media/          — 1 file
  native/         — 1 file
  pagination/     — 5 files, 3 test files
  ports/          — 1 file
  pubsub/         — 3 files, 3 test files
  realtime/       — 1 file, 1 test file
  search/         — 5 files, 5 test files
  security/       — 4 files, 3 test files
  usage-metering/ — 1 file, 1 test file
  webhooks/       — 1 file, 1 test file
  index.ts        — barrel
```
