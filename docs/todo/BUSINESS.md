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
- [ ] **Magic Link Login**: Passwordless login via email link.
- [ ] **Social Login**: Login with Google, GitHub, or Apple.
- [ ] **Session Management**: Users can view and revoke active sessions (devices).
- [ ] **Multifactor Authentication (MFA)**: Additional layer of security (future).

## 2. Team & Workspace Management (Tenancy)

_B2B features for organizations and collaboration._

- [x] **Workspace Creation**: Users can create new organizations/tenants.
- [ ] **Member Invitations**: Invite colleagues via email.
- [ ] **Member Management**: List, remove, or update member access.
- [x] **Role-Based Access Control (RBAC)**: Define Owner, Admin, and Member roles.
- [ ] **Permission Gating**: Restrict access to features based on roles.

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
- [ ] **Email Notifications**: Transactional emails (Welcome, Reset Password).
- [ ] **Notification Preferences**: Users can toggle specific alert channels.

## 5. System Operations & Reliability

_Background machinery that keeps the business running._

- [x] **Audit Logging**: Record critical actions for security and compliance reviews.
- [ ] **Background Jobs**: Asynchronous processing for heavy tasks (emails, reports).
- [ ] **Webhook System**: Notify external systems of events (e.g., "User Created").
- [ ] **Feature Flags**: Safely roll out new features to specific users/tenants.
- [ ] **Usage Metering**: Track consumption of resources for billing/analytics.

## 6. Compliance & Legal

_Regulatory requirements and data governance._

- [ ] **Terms of Service**: Versioned tracking of legal agreements.
- [ ] **Consent Management**: GDPR/cookie consent tracking.
- [ ] **Data Export**: Allow users to download their data (Right to Portability).
- [ ] **Account Deletion**: "Right to be Forgotten" workflows.

---

## 7. Business Admin Console

_Internal tools for our support and success teams._

- [ ] **User Support**: proper search, view, and impersonation of users to debug issues.
- [ ] **Tenant Management**: View, suspend, or override plans for workspaces.
- [ ] **System Health**: Monitor job queues and failure rates.
