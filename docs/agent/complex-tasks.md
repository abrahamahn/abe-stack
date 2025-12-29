# Complex Task Decomposition Guide

**Purpose:** Strategies for breaking down complex tasks into manageable checkpoints.

**When to read:** When `CLAUDE.md` classifies your task as MEDIUM or COMPLEX.

**Related docs:**

- agent-prompts.md - Actual templates to use
- agent-self-check.md - Verification procedures

---

## The Checkpoint Concept

**Core principle:** Never write more than 100 lines without verification.

**What is a checkpoint?**

- A complete, testable unit of work
- ~100 lines OR ~20 minutes OR 1 logical component
- Independently verifiable (tests pass, types check)
- Committable to git

**Checkpoint structure** (details in agent-self-check.md):

```
Implement → Create/Update Tests → Verify (format, lint, type-check, test) → Commit → Report
```

---

## Persistence Strategy

Use checkpoints to preserve progress and enable recovery.

- After each checkpoint, confirm recent commits: `git log --oneline -n 5`
- If the same check fails twice, compare against the last good checkpoint before proceeding.
- If drift is detected, roll back to the last good checkpoint and report the diff.

---

## Decomposition Strategy 1: Vertical Slicing

**Break by complete features, not by technical layer.**

### Why Vertical Slicing?

❌ **Horizontal (by layer):**

```
Phase 1: All database schemas
Phase 2: All API routes
Phase 3: All frontend components
Phase 4: Wire everything together ← Often fails here
```

✅ **Vertical (by feature):**

```
Phase 1: User registration (DB → API → UI) ← Complete feature
Phase 2: User login (DB → API → UI) ← Complete feature
Phase 3: Profile view (DB → API → UI) ← Complete feature
```

**Benefits:**

- Each slice is independently testable
- Can demo to users after each slice
- Reduces integration risk
- Clear progress metrics

### Vertical Slice Template

```markdown
Feature: [Entity] Management

Slice 1: Read-Only Display
├─ Checkpoint 1: Types & Validation
│ Files: packages/shared/{types,validation}
│ Verify: pnpm type-check
│
├─ Checkpoint 2: Database Schema
│ Files: packages/db/{schema,migrations}
│ Verify: pnpm test packages/db
│
├─ Checkpoint 3: API GET Routes
│ Files: packages/shared/contracts, apps/server/routes
│ Verify: pnpm test apps/server
│
├─ Checkpoint 4: API Client
│ Files: packages/api-client
│ Verify: pnpm test packages/api-client
│
└─ Checkpoint 5: UI Display
Files: apps/web/components, apps/web/pages
Verify: Manual test + pnpm test

Human Review: Verify read slice works end-to-end

Slice 2: Create Operation
├─ Checkpoint 6: API POST Route
└─ Checkpoint 7: UI Form

Slice 3: Update Operation
Slice 4: Delete Operation
```

---

## Decomposition Strategy 2: Dependency-First

**Work from leaf nodes (no dependencies) upward.**

### Dependency Graph Example

```
Entity Feature Dependencies:

User Types (no dependencies)
    ↓
User Validation (depends on: Types)
    ↓
Database Schema (depends on: Types)
    ↓
Database Queries (depends on: Schema)
    ↓
API Contract (depends on: Types, Validation)
    ↓
API Routes (depends on: Contract, Queries)
    ↓
API Client (depends on: Contract)
    ↓
React Hooks (depends on: API Client)
    ↓
UI Components (depends on: Hooks, Types)
```

### Dependency-First Template

```markdown
Phase 1: Foundation (No Dependencies)
├─ Checkpoint 1: Types (packages/shared/types)
└─ Checkpoint 2: Validation (packages/shared/validation)

Phase 2: Persistence (Depends: Types)
├─ Checkpoint 3: DB Schema (packages/db/schema)
└─ Checkpoint 4: DB Queries (packages/db/queries)

Phase 3: API Layer (Depends: Types, Validation, Queries)
├─ Checkpoint 5: Contract (packages/shared/contracts)
└─ Checkpoint 6: Routes (apps/server/routes)

Phase 4: Client Layer (Depends: Contract)
├─ Checkpoint 7: API Client (packages/api-client)
└─ Checkpoint 8: React Hooks (packages/api-client/react-query)

Phase 5: Presentation (Depends: Hooks, Types)
├─ Checkpoint 9: Components (apps/web/components)
└─ Checkpoint 10: Pages (apps/web/pages)
```

**Key insight:** If Checkpoint N fails, only checkpoints N+1 onwards are blocked. Checkpoints 1 to N-1 remain valid.

---

## Decomposition Strategy 3: Strangler Fig (Refactoring)

**Gradually replace old pattern with new, maintaining both during migration.**

### Why Strangler Fig?

❌ **Big Bang Rewrite:**

```
1. Change 50 files at once
2. Hope it works
3. Spend hours debugging
4. Maybe give up
```

✅ **Strangler Fig:**

```
1. Add new pattern alongside old
2. Migrate low-risk files one at a time
3. Build confidence
4. Migrate high-risk files with care
5. Remove old pattern only when 100% migrated
```

### Strangler Fig Template

```markdown
Refactoring: [Old Pattern] → [New Pattern]

Phase 1: Create New Pattern (No Breaking Changes)
└─ Checkpoint 1: Implement new pattern alongside old

- Keep old pattern working
- Export both versions
- Tests for new version
- Documentation for migration

Phase 2: Migrate Low-Risk Files (One at a Time)
├─ Checkpoint 2: Migrate [low-risk-file-1]
├─ Checkpoint 3: Migrate [low-risk-file-2]
└─ Checkpoint N: Migrate [low-risk-file-N]

Human Review: Verify migrations before proceeding

Phase 3: Migrate High-Risk Files (With Extra Care)
├─ Checkpoint N+1: Migrate [critical-file-1]
│ - Comprehensive testing
│ - Manual verification
│ - Human approval required
│
└─ Checkpoint N+2: Migrate [critical-file-2]

Phase 4: Cleanup (Only After 100% Migration)
└─ Checkpoint Final: Remove old pattern

- Verify no usage: grep -r "oldPattern"
- Delete old code
- Update documentation
```

### Migration Progress Tracking

```bash
# Before each checkpoint - verify old pattern usage
grep -r "oldPattern" apps/ packages/ | wc -l

# Track progress
echo "Files remaining: $(grep -r 'oldPattern' . | wc -l)"
```

---

## Decomposition Strategy 4: Test-Driven (TDD)

**Write tests first, implement in small testable chunks.**

### TDD Cycle

```
Write Failing Test → Implement Minimal Code → Test Passes → Refactor → Repeat
```

### TDD Template

```markdown
Feature: [Description]

Phase 1: Define Tests (No Implementation)
└─ Checkpoint 1: Write all failing tests

- Unit tests for business logic
- Contract tests for API
- Integration tests for DB
- Commit: "test: add failing tests for [feature]"

Phase 2: Implement Until Tests Pass
├─ Checkpoint 2: Implement business logic
│ Verify: Unit tests pass
│
├─ Checkpoint 3: Implement database layer
│ Verify: Integration tests pass
│
├─ Checkpoint 4: Implement API routes
│ Verify: Contract tests pass
│
└─ Checkpoint 5: Implement UI
Verify: All tests pass
```

---

## Complexity Classification Examples

### Simple Task Example

```
Task: Add email validation to user signup

Analysis:
- Files: 2 (validation schema, tests)
- Lines: ~50
- Pattern: Existing (copy from password validation)
- Dependencies: None

Classification: SIMPLE
Approach: Direct execution
Duration: 10 minutes
```

### Medium Task Example

```
Task: Add project management feature (CRUD)

Analysis:
- Files: ~12 (types, schema, routes, client, UI)
- Lines: ~600
- Pattern: Standard CRUD
- Dependencies: Users (already exists)

Classification: MEDIUM
Approach: Vertical slicing with checkpoints
Duration: 2-3 hours
Template: agent-prompts.md Template 2
```

### Complex Task Example

```
Task: Migrate auth from JWT to sessions

Analysis:
- Files: ~30 (all auth-related files)
- Lines: ~1500
- Pattern: Architectural change
- Dependencies: Entire auth system
- Risk: High (breaks auth if wrong)

Classification: COMPLEX
Approach: Strangler Fig with human supervision
Duration: 8-12 hours over multiple sessions
Template: agent-prompts.md Template 5
```

---

## Choosing the Right Strategy

| Task Type          | Best Strategy    | Why                       |
| ------------------ | ---------------- | ------------------------- |
| New feature (CRUD) | Vertical Slicing | Each slice delivers value |
| Refactoring        | Strangler Fig    | Maintains working system  |
| Bug fix            | Test-Driven      | Prevents regressions      |
| Complex feature    | Dependency-First | Manages complexity        |
| API development    | Dependency-First | Clear layer boundaries    |

---

## Estimation Guidelines

**How to estimate checkpoints:**

```
1. List all files that need changes
2. Estimate lines per file
3. Group into ~100 line chunks
4. Add verification time (~5 min per checkpoint)

Example:
- 5 files × 100 lines = 500 lines
- 500 ÷ 100 = 5 checkpoints
- 5 checkpoints × 25 minutes each = ~2 hours
```

**Buffer for unknowns:**

- Add 30% for simple tasks
- Add 50% for medium tasks
- Add 100% for complex tasks

---

## Real-World Example: User Profile Feature

### Initial Analysis

```
Feature: User Profile Management
Files affected: 15
Estimated lines: 800
Pattern: Standard CRUD
Complexity: MEDIUM
```

### Decomposition Plan (Vertical Slicing)

```markdown
Vertical Slice 1: View Profile (Read-Only)
├─ Checkpoint 1: Types & Validation [20 min]
│ ✅ Add User type
│ ✅ Add userSchema
│ ✅ Verify: type-check
│
├─ Checkpoint 2: Database [25 min]
│ ✅ Add users table schema
│ ✅ Generate migration
│ ✅ Add getUserById query
│ ✅ Verify: DB tests pass
│
├─ Checkpoint 3: API GET Route [30 min]
│ ✅ Define GET /users/:id contract
│ ✅ Implement route handler
│ ✅ Verify: Contract tests pass
│
├─ Checkpoint 4: API Client [20 min]
│ ✅ Add client.users.get()
│ ✅ Add useUser() hook
│ ✅ Verify: Client tests pass
│
└─ Checkpoint 5: UI Display [30 min]
✅ Create UserProfile component
✅ Create /profile/:id page
✅ Verify: Manual test in browser

Human Review ✅ (Slice 1 complete)

Vertical Slice 2: Edit Profile
├─ Checkpoint 6: Add UpdateUserInput type [15 min]
├─ Checkpoint 7: Add PUT route [25 min]
├─ Checkpoint 8: Add client.users.update() [20 min]
└─ Checkpoint 9: Add edit form UI [40 min]

Human Review ✅ (Slice 2 complete)

Total: 9 checkpoints, ~4 hours estimated
```

---

## When to Stop and Ask for Help

**Automatic stop conditions:**

1. **Repeated failures:** Same verification fails 3 times
2. **Scope explosion:** Touches 2x more files than estimated
3. **Uncertainty:** Don't know which file to modify next
4. **Breaking changes:** Would break existing functionality
5. **Security concerns:** Touching auth/payment/sensitive data
6. **Context loss:** Can't remember original task goal

**When stopped, report:**

```markdown
✅ STOP - Need Guidance

Checkpoint: [N] of [Total]
Last good checkpoint: [commit hash]
Problem: [specific issue]
What I tried: [3 attempts]
Question: [specific question]
Rollback: `git reset --hard [hash]`
```

---

## Summary: Decomposition Decision Tree

```
Complex Task
    │
    ▼
┌─────────────────────┐
│ What type of work?  │
└─────────────────────┘
    │
    ├─ New feature → Vertical Slicing
    │  └─ Each slice: DB → API → UI
    │
    ├─ Refactoring → Strangler Fig
    │  └─ New pattern → Migrate gradually → Remove old
    │
    ├─ Bug fix → Test-Driven
    │  └─ Failing test → Fix → Prevent regression
    │
    ├─ Migration/Overhaul → Dependency-First + Human Supervision
    │  └─ Prep → Core swap (layer by layer) → Polish (tests/docs)
    │
    └─ Complex feature → Dependency-First
       └─ Build from leaves (no deps) upward
```

**Remember:**

- Checkpoint every 100 lines or 20 minutes
- Verify before proceeding (see agent-self-check.md)
- Stop after 3 failures
- Cap at 5 checkpoints per session; hand off with a state summary if exceeded
- Report progress after each checkpoint

---

_Last Updated: 2025-12-29_
_See also: agent-prompts.md (templates), agent-self-check.md (verification)_
