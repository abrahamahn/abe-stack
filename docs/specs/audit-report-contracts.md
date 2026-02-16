# Audit Report: Final Architectural Review

> **Standard:** [contract-registry.md](file:///docs/specs/contract-registry.md)
> **Requirements:** [BUSINESS.md](file:///docs/todo/BUSINESS.md) | [CHECKLIST.md](file:///docs/todo/CHECKLIST.md)

## 1. Executive Summary

The audit confirms that while the **Infrastructure Domains** (Auth, Audit, API Keys, Admin) are stable and contract-hardened, the **Business Domains** (Workspaces, Membership, Sessions) are currently "Shadow Domains"—they have logic and database presence but lack the required Zod-Contract boundaries. We also have significant layer-violations where utility logic (Media) and UI constants (Theme) are polluting the domain layer.

## 2. Comprehensive Feature-to-Contract Mapping

| Feature Area (BUSINESS.md) | Implemented? | Shared Contract?             | Status            |
| :------------------------- | :----------- | :--------------------------- | :---------------- |
| **Auth & MFA**             | [x] Yes      | [x] `auth.contracts.ts`      | ✅ Hardened       |
| **Workspace CRUD**         | [x] Yes      | [ ] MISSING                  | 🚧 Shadow Ingress |
| **Team Membership**        | [x] Yes      | [ ] MISSING                  | 🚧 Shadow Ingress |
| **Session Mgmt**           | [x] Yes      | [ ] MISSING                  | 🚧 Shadow Ingress |
| **Audit Logging**          | [x] Yes      | [x] `audit-log.contracts.ts` | ✅ Hardened       |
| **Webhook Delivery**       | [x] Yes      | [x] `webhooks.contracts.ts`  | ✅ Hardened       |
| **Feature Flags**          | [x] Yes      | [ ] MISSING                  | ⚠️ Schema Only    |
| **Usage Metering**         | [x] Yes      | [ ] MISSING                  | ⚠️ Schema Only    |
| **GDPR Export**            | [ ] No       | [ ] MISSING                  | ❌ High Risk      |
| **Soft Delete**            | [x] Yes      | [ ] MISSING                  | ⚠️ Logic Only     |

## 3. Redundancy & Bloat Audit (Purge List)

| Item                         | Recommendation | Justification                                                          |
| :--------------------------- | :------------- | :--------------------------------------------------------------------- |
| **`domain/activities`**      | **DELETE**     | 100% redundant with `audit-log`. Use Polymorphic Audit Events instead. |
| **`domain/media`**           | **MOVE**       | Utility logic (FFmpeg, Metadata) belongs in `shared/utils/media`.      |
| **`domain/theme`**           | **MOVE**       | UI Constants belong in `client/ui/theme`.                              |
| **`domain/tenant-settings`** | **MERGE**      | Single schema overhead; merge into `tenant.schemas.ts`.                |

## 4. Standard Compliance Scorecard (The 7 Pillars)

| Standard Pillar            | Implementation Status                  |
| :------------------------- | :------------------------------------- |
| **1. Soft Delete / Purge** | ❌ 0% (Missing fields in schemas)      |
| **2. Isomorphic RLS**      | ❌ 0% (Missing `StandardFilter`)       |
| **3. Deprecation Header**  | ❌ 0% (Missing protocol)               |
| **4. Traceable Responses** | ⚠️ 5% (Partial `correlationId` only)   |
| **5. Clocks (ISO8601)**    | ❌ 0% (Using raw strings)              |
| **6. Polymorphic Actor**   | ❌ 0% (Missing `Actor` interface)      |
| **7. PATCH Invariants**    | ❌ 0% (Partial body updates unchecked) |

## 5. Ship Blocker: Export & Barrel Debt

- **The "Death Star" index files** (`shared/domain/index.ts` and `shared/src/index.ts`) have resulted in manual export drift.
- **Example:** `apiKeysContract` is incorrectly exported under the `// Webhooks` comment in the main index.

## 7. Architectural Blurriness: The "Core" Junk Drawer

The current `shared/src/core` folder acts as a "Junk Drawer" for three conflicting concepts, spiking cognitive load and compromising boundaries.

### The 3 Violations

1.  **The Cross-Cutting Leak**: `logger/` and `core/observability.ts` are separate, despite tracking the same telemetry layer.
2.  **The Business Rule Leak**: RBAC (`policy.ts`) and guards (`guard.ts`) live in `core/` instead of `domain/`.
3.  **The Flat Core Problem**: DB transactions, DI context, Validation, and RPC definitions sit flat next to each other.

### The "Crisp Boundary" Target

| Layer           | Duty                     | Snap-to-Focus Destination                                |
| :-------------- | :----------------------- | :------------------------------------------------------- |
| **Telemetry**   | Tracking Production      | `shared/src/telemetry/` (Merge Logger + Observability)   |
| **Domain**      | Business Features/Rules  | `shared/src/domain/authorization/` (Eviction from Core)  |
| **Core Engine** | Infrastructural Plumbing | `shared/src/core/{rpc, di, env, validation, primitives}` |

## 8. Final Action Plan (Forensic Roadmap)

1.  **Explode the Barrels**: Delete `shared/domain/index.ts` and move to direct imports.
2.  **Reorganize Core (Snap-to-Focus)**: Evict Business Rules to Domain and consolidate Telemetry.
3.  **Compartmentalize Core Engine**: Categorize `core/` by duty (RPC, DI, Env, Validation).
4.  **Generate Core Engine Primitives**: Implement `Actor`, `BaseResponse`, `StandardFilter`, and `ISO8601`.
5.  **Formalize Workspaces**: Create `tenant.contracts.ts`, `membership.contracts.ts`, and `invitation.contracts.ts`.
6.  **Harden IDs**: Implement branded `usr_` and `org_` prefixing in `types/ids.ts`.
7.  **Purge Legacy**: Move `media`, `theme`, and `activities` out of the domain layer.
