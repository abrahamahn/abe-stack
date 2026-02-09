# Development Log

**Last Updated: February 8, 2026**

Weekly changelog files for the ABE Stack project. This replaces the previous monolithic `CHANGELOG.md`.

---

## 2026

| Week                 | Dates     | Highlights                                                                             |
| -------------------- | --------- | -------------------------------------------------------------------------------------- |
| [W06](./2026-W06.md) | Feb 2-8   | Monorepo restructure, shared/db audits, server-engine + media refactors                |
| [W05](./2026-W05.md) | Jan 26-31 | Hexagonal package extraction (18 packages), BaseContext contract, server decomposition |
| [W04](./2026-W04.md) | Jan 20-25 | Billing (Stripe/PayPal), admin center, 73% bundle reduction, IaC, 7,517 tests          |
| [W03](./2026-W03.md) | Jan 13-19 | Pagination system, domain architecture, RecordCache, TransactionQueue                  |
| [W02](./2026-W02.md) | Jan 6-12  | Build tooling, codebase simplification                                                 |
| [W01](./2026-W01.md) | Jan 1-5   | File reorganization, initial setup                                                     |

---

## Recent Changes (This Week)

### 2026-02-08

- **Sessions**: HTTP endpoints wired, session security updates, user-agent labeling stored in `user_sessions`
- **Auth**: Session revocation on password change/reset; refresh token metadata updates; UA parser added
- **DB**: Migration for session device fields; `@abe-stack/db` exports aligned for sessions
- **Dev UX**: Env strategy split (`.env.development` for Docker, `.env.local` for local Postgres), `ENV_FILE` override added to db scripts, README updated

### 2026-01-31

- **Contracts**: Shared `BaseContext` contract in `infra/contracts` — eliminates 5+ duplicate Logger/context definitions
- **Architecture**: Server decomposition complete — all feature modules extracted to packages with hexagonal boundaries
- **Cleanup**: Dead code removal (-69 source files, -22 test files) from `apps/server` post-migration

### 2026-01-30

- **Packages**: Extracted `modules/auth`, `infra/users`, `infra/realtime`, `infra/notifications` (Phase 2-3)
- **Infrastructure**: Extracted `infra/http`, `infra/email`, `infra/security`, `infra/jobs` (Phase 1)
- **Media**: Full media infrastructure migrated to `infra/media` (287 tests)
- **Server**: Phase 4 import rewiring — server imports from `@abe-stack/*` packages instead of local infrastructure

### 2026-01-28

- **Testing**: Comprehensive test creation across all packages (3,000+ new tests)
- **Config**: TypeScript module resolution fixes, file naming standardization, barrel export cleanup

See [Week 5 log](./2026-W05.md) for full details.

---

[Back to main docs](../README.md)
