# API Contract Standard (Phase 2)

Snapshot date: 2026-02-12

## Goal

Define one contract format and one centralized router so server registration and client calls can converge on a shared source of truth.

## Standard Contract Shape

Each endpoint contract must define:

- `method`: HTTP method
- `path`: canonical API path (server-facing, with `/api` prefix)
- `body`: request schema (if applicable)
- `query`: query schema (if applicable)
- `responses`: status-code keyed response schemas
- `summary`: short description

Reference types:

- `EndpointDef` and `Contract` from `main/shared/src/core/api.ts`
- Common envelope schemas from `main/shared/src/core/schemas.ts`

## Central Router

Central registry is now:

- `main/shared/src/api/router.ts`
- exported as `apiRouter`
- package entrypoint: `@abe-stack/shared/api`

Current domains included:

- `admin`
- `apiKeys`
- `auditLog`
- `auth`
- `billing`
- `jobs`
- `notifications`
- `users`
- `webhooks`

## Rules Going Forward

1. New HTTP endpoints must be added to a domain contract first, then wired in server/client.
2. Runtime request validation must use shared schema at server route boundary.
3. Client request payloads must be parsed with shared request schemas before send.
4. Client response payloads should be parsed with shared response schemas before return.
5. Route path strings should be derived from contract constants, not duplicated in handlers/clients.

## Known Gaps (to close next)

- Missing contract modules for:
  - none for current route set in scope; remaining work is adoption/wiring
- Contract drift found in baseline matrix:
  - billing path mismatches
  - users method/path mismatches
