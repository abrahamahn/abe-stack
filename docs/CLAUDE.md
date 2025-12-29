# Claude Code Guide - ABE Stack (Optimized)

> **This is your primary reference. Always loaded. Start here.**

## Project Overview

**ABE Stack** - Production-ready TypeScript monorepo with hexagonal architecture.

**Stack:** Turbo monorepo • pnpm • Vite • React • Fastify • Drizzle • TypeScript • Zod

**Apps:** `web` (Vite+React) • `server` (Fastify API) • `desktop` (Electron) • `mobile` (React Native)

**Packages:** `shared` (business logic) • `ui` (components) • `api-client` (type-safe API) • `db` (Drizzle ORM)

---

## Task Classification & Routing (START HERE)

**Before ANY task, use this decision tree:**

```
┌─────────────────────────────────────────────────┐
│ STEP 1: Classify Task Complexity               │
└─────────────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────┐
        │ Count affected files &  │
        │ estimate lines of code  │
        └─────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌──────────────┐          ┌──────────────────┐
│ 1 file       │          │ 2+ files         │
│ <100 lines   │          │ OR 100+ lines    │
│ Known pattern│          │ OR new pattern   │
└──────────────┘          └──────────────────┘
        │                           │
        ▼                           ▼
   SIMPLE TASK            ┌─────────────────┐
   âœ… Execute directly     │ Further classify│
   Use standard workflow  └─────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
          ┌──────────────────┐           ┌──────────────────┐
          │ 2-5 files        │           │ 5+ files         │
          │ 100-300 lines    │           │ OR 300+ lines    │
          │ Standard CRUD    │           │ OR architectural │
          └──────────────────┘           └──────────────────┘
                    │                               │
                    ▼                               ▼
              MEDIUM TASK                    COMPLEX TASK
              Read: agent/complex-tasks.md         Read: agent/complex-tasks.md
              Use: Template 1 (Feature)                Use: Template 4 (Architecture)
              Checkpointed execution         Multi-phase + Human supervision

┌─────────────────────────────────────────────────┐
│ STEP 2: Select Documentation & Template        │
└─────────────────────────────────────────────────┘

SIMPLE → Continue with this file (CLAUDE.md)
MEDIUM → Read agent/complex-tasks.md → Use agent/agent-prompts.md Template 1
COMPLEX → Read agent/complex-tasks.md → Use agent/agent-prompts.md Template 4
                                      → Use agent/agent-self-check.md
```

---

## Critical Principles (Never Violate)

### 1. DRY - Never Duplicate Code

Extract shared code to packages:

- Business logic → `packages/shared`
- React components → `packages/ui` (if reusable)
- API client → `packages/api-client`
- Database → `packages/db`

### 2. Layer Separation

```
React (render only) → React Query (state) → API Client (network)
→ Server (routes) → Business Logic (shared) → Database (persistence)
```

### 3. Framework-Agnostic Core

Keep `packages/shared` independent of React/frameworks.

### 4. Dependency Flow (Never Reverse)

```
apps → packages/ui → packages/shared
apps → packages/api-client → packages/shared
apps → packages/db → packages/shared
```

---

## Pre-Completion Checklist (MANDATORY)

**Before marking ANY task complete, ALL must pass:**

```bash
pnpm format      # Format code
pnpm lint:fix    # Fix auto-fixable issues
pnpm lint        # Check for errors
pnpm type-check  # TypeScript validation
pnpm test        # Run all tests
```

**If ANY fail:**

- ❌ DO NOT mark complete
- ❌ DO NOT commit
- ✅ If the failure is caused by your changes, FIX immediately and re-run all checks
- ✅ If the failure is pre-existing/unrelated, DO NOT fix automatically; report it clearly and proceed only with requested scope

---

## Simple Task Workflow (Direct Execution)

**For tasks classified as SIMPLE:**

### Quick Template

```markdown
Task: [One sentence description]

Files: [max 2 files]
Pattern: [point to similar code]

Requirements:

1. [specific requirement]
2. [specific requirement]

Success:

- [ ] Functionality works
- [ ] Tests pass
- [ ] Quality checks pass

Work autonomously. Report with commit hash.
```

### Execution Steps

1. **Implement:** Make the change following existing patterns
2. **Test:** Write/update tests
3. **Verify:** Run quality checks
4. **Commit:** Clear message

**Example:**

```markdown
Task: Add formatPhoneNumber utility

Files:

- packages/shared/src/utils/format.ts
- packages/shared/src/utils/**tests**/format.test.ts

Pattern: Follow formatCurrency in same file (lines 15-25)

Requirements:

1. Format US phone as (XXX) XXX-XXXX
2. Handle 10-digit strings/numbers
3. Return original if invalid

Success:

- [ ] formatPhoneNumber('1234567890') === '(123) 456-7890'
- [ ] pnpm test passes
- [ ] pnpm type-check passes
```

---

## Medium/Complex Task Workflow (Checkpointed)

**For tasks classified as MEDIUM or COMPLEX:**

### STEP 1: Read Documentation

```bash
# MANDATORY - Read these in order:
1. agent/complex-tasks.md - Understanding decomposition
2. agent/agent-prompts.md - Select appropriate template
3. agent/agent-self-check.md - Verification protocol
```

### STEP 2: Create Decomposition Plan

**Use appropriate template from agent/agent-prompts.md:**

- Template 1: Feature Task (CRUD operations)
- Template 2: Refactoring Task (pattern changes)
- Template 3: Bug Fix Task (test-driven)
- Template 4: Architecture Change (requires supervision)

### STEP 3: Execute with Checkpoints

**Checkpoint = 100 lines OR 20 minutes OR 1 complete unit**

After EVERY checkpoint:

```bash
# 1. Code Quality (automated)
pnpm format && pnpm lint && pnpm type-check && pnpm test

# 2. Self-Assessment (manual - see agent/agent-self-check.md)
- Scope adherence
- Pattern consistency
- Testing completeness

# 3. Commit
git commit -m "checkpoint: [what this achieves]"

# 4. Report Progress
"✅ Checkpoint N: [description] - [commit hash]"
```

### STEP 4: Stop Conditions

**STOP immediately if:**

- Same check fails 3 times
- Scope grows beyond estimate
- Uncertain about approach
- Need architectural decision

**When stopped:**

```markdown
✅ EMERGENCY STOP

Problem: [description]
Last good checkpoint: [commit hash]
Rollback: `git reset --hard [hash]`
Question: [specific question for human]
```

---

## Common Patterns (Quick Reference)

### API Client Pattern

```typescript
// packages/api-client/src/client.ts (framework-agnostic)
export const apiClient = initClient(contract, { baseUrl: ... });

// packages/api-client/src/react-query.ts (React-specific)
export const useUser = (id: string) => useQuery({ ... });
```

### Form Validation Pattern

```typescript
// packages/shared/src/validation/user.ts
export const createUserSchema = z.object({ ... });

// Component validates before submit
const result = createUserSchema.safeParse(formData);
```

**→ For all patterns with examples, see `dev/patterns/index.md`**

---

## Anti-Patterns (Never Do This)

❌ Business logic in React components → Extract to `packages/shared`
❌ Duplicate types across files → Single source in `packages/shared/types`
❌ Cross-app imports → Use `packages/shared`
❌ Using `any` type → Proper types with Zod validation

**→ For all anti-patterns with fixes, see `dev/anti-patterns/index.md`**

---

## Quick Decision Guide

**Adding new code?**

1. Right layer? (React = render only, logic = shared)
2. Already exists? (Search before creating)
3. Framework-agnostic? (Keep shared independent)
4. Minimum deps? (Implement in <50 lines?)

**Before completing:**

```bash
pnpm format && pnpm lint && pnpm type-check && pnpm test
```

**All must pass. No exceptions.**

---

## Documentation Structure

**Core Reference (always loaded):**

- `CLAUDE.md` (this file) - Quick reference & routing

**Read When Needed:**

| Doc                           | When to Read            | Purpose                     |
| ----------------------------- | ----------------------- | --------------------------- |
| agent/complex-tasks.md        | Medium/Complex tasks    | Decomposition strategies    |
| agent/agent-prompts.md        | Medium/Complex tasks    | Task templates              |
| agent/agent-self-check.md     | Every checkpoint        | Verification protocol       |
| dev/architecture/index.md     | Understanding structure | Layer details               |
| dev/principles/index.md       | Understanding "why"     | Design rationale            |
| dev/workflows/index.md        | Step-by-step processes  | Development flows           |
| dev/coding-standards/index.md | Code style questions    | TypeScript, naming, imports |
| dev/patterns/index.md         | Implementation help     | Full code examples          |
| dev/anti-patterns/index.md    | Avoiding mistakes       | What not to do              |
| dev/testing/index.md          | Writing tests           | Test strategies             |
| dev/performance/index.md      | Optimization            | Performance techniques      |
| dev/use-cases/index.md        | Example prompts         | Common scenarios            |

---

## Emergency Quick Reference

**Lost context?**

1. Re-read original task
2. Check last checkpoint commit
3. Run: `git log --oneline --grep="checkpoint:"`

**Quality checks failing?**

1. Read error carefully
2. Fix issue
3. Re-run checks
4. If fails 3 times → STOP and ask

**Scope growing?**

1. STOP immediately
2. Document current state
3. Ask for decomposition help

**Uncertain path?**

1. Check for similar code
2. Read relevant docs
3. If still uncertain → Ask before proceeding

---

## Memory Aid: The Three Rules

**1. Classify FIRST** (Simple/Medium/Complex)
**2. Checkpoint OFTEN** (Every 100 lines or 20 min)
**3. Verify ALWAYS** (Format, lint, type-check, test)

---

_Last Updated: 2025-12-29_
_Philosophy: DRY • Typed • Tested • Framework-agnostic • Lean & production-ready_
