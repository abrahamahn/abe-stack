<!-- CHANGELOG.md — API Changelog

  Maintainer instructions:
  1. Add entries under the [Unreleased] section as changes land on main.
  2. When cutting a release, rename [Unreleased] to the new version with a
     date (e.g. ## [1.1.0] - 2026-03-01) and create a fresh [Unreleased] section.
  3. Each entry belongs under one of the six change-type headings:
       Added      — new features or endpoints
       Changed    — changes to existing functionality
       Deprecated — features scheduled for removal
       Removed    — features removed in this release
       Fixed      — bug fixes
       Security   — vulnerability patches or hardening
  4. Entries should be concise, written in imperative mood
     (e.g. "Add user search endpoint", not "Added user search endpoint").
  5. Reference the PR or issue number where possible.
  6. Keep versions in reverse-chronological order (newest first).

  Format follows Keep a Changelog: https://keepachangelog.com/en/1.1.0/
  This project adheres to Semantic Versioning: https://semver.org/spec/v2.0.0.html
-->

# Changelog

All notable changes to the BSLT API will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [1.0.0] - 2026-02-20

### Added

- REST API with versioned routing (`/api/v1/`) and automatic version redirect.
- Authentication system with email/password, OAuth, magic links, passkeys, and MFA.
- Multi-tenant architecture with tenant isolation and per-tenant configuration.
- User management endpoints (CRUD, profile, roles, sessions).
- Activity feed with real-time updates via WebSocket.
- Background job queue with in-memory and Redis-backed stores.
- File upload and storage system with S3-compatible backend.
- Notification system (email, in-app, webhooks).
- Feature flag service with per-tenant overrides.
- API key management for programmatic access.
- Audit logging for security-sensitive operations.
- Admin dashboard endpoints for system monitoring and user management.
- Billing integration with subscription and usage tracking.
- Compliance module with data export and retention policies.
- Health check and readiness endpoints.
- Swagger/OpenAPI documentation served at `/api/docs`.
- TypeScript monorepo with Turborepo build orchestration.
- Comprehensive test suite (unit, integration, E2E with Playwright).

### Security

- Rate limiting on authentication endpoints.
- CSRF protection and secure cookie configuration.
- Input validation via Zod schemas on all API contracts.
- Trusted proxy configuration for production deployments.

[unreleased]: https://github.com/bslt/bslt/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/bslt/bslt/releases/tag/v1.0.0
