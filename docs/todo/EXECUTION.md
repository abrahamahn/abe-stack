# Execution Standard (Hybrid Hexagonal)

This repo is in **Factory Worker** mode: ship end-to-end vertical slices without destabilizing the architecture.

Recommendation: **keep the current hybrid approach** (horizontal infrastructure + vertical feature logic). Avoid a “fully vertical” refactor (moving DB schemas/repositories into per-feature folders) during execution.

Last updated: 2026-02-09

---

## Why Not “Fully Vertical” Right Now

In a TypeScript/Node monorepo with a shared relational DB schema, pushing schemas/repos into feature folders tends to create:

- Circular dependencies between feature modules (especially around `users`, `tenants`, `billing`, `sessions`).
- Hard-to-reason-about shared state and import boundaries.
- Friction when multiple features need the same “kernel” concepts.

Users and tenants are not “features” in a SaaS. They are shared infrastructure that almost everything touches.

---

## Rule Of Law: Infrastructure Is Global, Logic Is Local

Use this as the default placement rule. If you’re about to create a new folder structure, stop and apply this table.

| Layer                           | Horizontal or Vertical? | Where (in this repo)                                         | Why                                          |
| ------------------------------- | ----------------------- | ------------------------------------------------------------ | -------------------------------------------- |
| Database migrations             | Horizontal              | `src/server/db/migrations/*.sql`                             | Single DB source of truth                    |
| DB schema constants/types       | Horizontal              | `src/server/db/src/schema/**`                                | Avoid circular feature imports               |
| Repositories (DB access)        | Horizontal              | `src/server/db/src/repositories/**`                          | Consistent query patterns; easy to test/mock |
| Shared domain contracts/schemas | Horizontal              | `src/shared/src/domain/**` and `src/shared/src/core/**`      | Shared language across server + client       |
| Service logic (business rules)  | Vertical                | `src/server/core/src/<domain>/**`                            | Feature-specific behavior                    |
| HTTP routes/handlers wiring     | Vertical                | `src/apps/server/src/**` + `src/server/core/src/<domain>/**` | Adapter layer; permissions/guards            |
| Client API + hooks              | Vertical                | `src/client/api/src/**`                                      | Feature-specific client integration          |
| UI pages/components             | Vertical                | `src/apps/web/src/features/**` (and desktop equivalents)     | Feature-specific UX                          |

---

## Feature Module Pattern (Vertical Slices Without Spaghetti)

Keep feature logic cohesive by exposing a small public surface and keeping internals private.

Example structure (conceptual):

```text
src/server/core/src/billing/
  index.ts            # public exports only
  handlers/           # business handlers (pure-ish, no Fastify instance)
  service.ts          # core business logic
  *.test.ts           # unit tests
  utils.ts            # billing-only helpers
```

Rules:

- Repositories are injected/passed in: feature logic should depend on repo interfaces/functions, not reach into DB schema internals.
- Cross-feature calls go through public entry points:
  - Prefer importing from `src/server/core/src/<domain>/index.ts` (or whatever the domain exposes).
  - Do not import other domains’ “internal” helpers directly.
- “Schema exception”: importing table constants/types from `src/server/db/src/schema/**` is allowed when needed for typing or SQL construction, but don’t make schema the center of feature orchestration.

---

## Execution Reminder

You’re shipping. Don’t reorganize the skeleton while you’re building muscles.

Mantra:

> The database is the skeleton (horizontal). Features are the muscles (vertical).
