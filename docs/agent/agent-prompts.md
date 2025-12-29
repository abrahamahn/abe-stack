# Agent Task Templates (Optimized)

**Purpose:** Copy-paste templates for giving structured tasks to AI agents.

**When to use:** When `CLAUDE.md` classifies task as MEDIUM or COMPLEX.

**Related docs:**

- complex-tasks.md - Decomposition strategies
- agent-self-check.md - Detailed verification procedures
- INDEX.md - Start here to find the smallest relevant modules

**Loading guidance:** Open `INDEX.md` first and pull only the modules you need.

---

## Shared Verification Procedures

**All templates use these standard verification steps:**

### After Every Checkpoint

````bash
# 1. Code Quality (automated - ALL must pass)
pnpm format && pnpm lint && pnpm type-check && pnpm test [relevant-tests]

# 2. Self-Assessment (manual - see agent-self-check.md Level 2)
# 3. Commit
git commit -m "checkpoint: [description]"

# 4. Report
"✅ Checkpoint N: [description] - [commit-hash]"

If checks fail due to pre-existing/unrelated issues, do not fix automatically. Report them and proceed only with requested scope.

### State Summary (Required After Each Checkpoint)

Append this to every checkpoint report:

```markdown
State Summary:
- Goal: [one sentence]
- Progress: [completed checkpoints + outcomes]
- Next: [immediate next step]
- Risks: [open risks or blockers]
````

````

### Stop Conditions (Immediate halt if triggered)

- Same verification fails 3 times
- Scope exceeds estimate by 2x
- Uncertain about next step
- Need architectural decision
- Touching critical systems (auth, payment, data)

### When Stopped

```markdown
✅ EMERGENCY STOP
Trigger: [which condition]
Last good checkpoint: [commit-hash]
Problem: [description]
Rollback: `git reset --hard [hash]`
Question: [specific question]
````

---

## Template Selection Guide

| Complexity | Template                 | Duration  | Files | Use When                   |
| ---------- | ------------------------ | --------- | ----- | -------------------------- |
| Simple     | (Use `CLAUDE.md`)        | 5-10 min  | 1-2   | Known pattern, <100 lines  |
| Medium     | Template 1: Feature      | 30-60 min | 3-8   | Standard CRUD              |
| Medium     | Template 2: Refactoring  | 1-2 hours | 5-20  | Pattern changes            |
| Medium     | Template 3: Bug Fix      | 15-30 min | 2-5   | Reproducible issue         |
| Complex    | Template 4: Architecture | 2+ hours  | 10+   | Major changes, supervision |

---

## Template 1: Feature Task (Medium Complexity)

**Use for:** Standard CRUD features with known patterns

**Strategy:** Vertical slicing (complex-tasks.md Strategy 1)

```markdown
Task: [Feature Name]

## Pre-Task Analysis

Files affected: [estimated count]
Lines of code: [estimated]
Complexity: MEDIUM
Strategy: Vertical Slicing
Duration: [estimated hours]

## Vertical Slice 1: Read-Only Display

### Checkpoint 1: Types & Validation [~20 min]

Files: packages/shared/{types,validation}/[entity].ts
Actions:

- [ ] Define [Entity] type
- [ ] Define [entity]Schema (Zod)
- [ ] Export from index.ts
      Verification: pnpm type-check
      Commit: "checkpoint: add [entity] types and validation"

### Checkpoint 2: Database Schema [~25 min]

Files: packages/db/schema/[entity].ts, migrations/
Actions:

- [ ] Add [entities] table schema
- [ ] Run: pnpm db:generate
- [ ] Run: pnpm db:migrate
- [ ] Add read queries to packages/db/queries/[entity].ts
      Verification: pnpm --filter @abe-stack/db test
      Commit: "checkpoint: add [entity] database schema"

### Checkpoint 3: API GET Routes [~30 min]

Files: packages/shared/contracts/[entity].ts, apps/server/routes/[entity].ts
Actions:

- [ ] Define GET /api/[entities] contract
- [ ] Define GET /api/[entities]/:id contract
- [ ] Implement route handlers
- [ ] Write contract tests
      Verification: pnpm --filter @abe-stack/server test
      Commit: "checkpoint: add [entity] GET endpoints"

### Checkpoint 4: API Client [~20 min]

Files: packages/api-client/src/[entity].ts, react-query/[entity].ts
Actions:

- [ ] Add apiClient.[entities].get()
- [ ] Add use[Entities]() hook
- [ ] Add use[Entity](id) hook
- [ ] Write tests
      Verification: pnpm --filter @abe-stack/api-client test
      Commit: "checkpoint: add [entity] API client"

### Checkpoint 5: UI Display [~30 min]

Files: apps/web/components/[Entity]List.tsx, pages/[entities]/index.tsx
Actions:

- [ ] Create [Entity]Card component
- [ ] Create [Entity]List component
- [ ] Create [entities] page
- [ ] Add routing
      Verification: Manual test in browser + pnpm test
      Commit: "checkpoint: add [entity] display UI"

✅ HUMAN REVIEW: Verify read slice works end-to-end

## Vertical Slice 2: Create Operation

### Checkpoint 6: Create Route [~25 min]

Files: apps/server/routes/[entity].ts
Actions:

- [ ] Define POST /api/[entities] contract
- [ ] Implement create handler
- [ ] Write tests
      Verification: pnpm --filter @abe-stack/server test
      Commit: "checkpoint: add [entity] create endpoint"

### Checkpoint 7: Create UI [~40 min]

Files: apps/web/components/[Entity]Form.tsx
Actions:

- [ ] Create form component
- [ ] Add useCreate[Entity]() hook
- [ ] Wire to UI
      Verification: Manual test + pnpm test
      Commit: "checkpoint: add [entity] create UI"

✅ HUMAN REVIEW: Verify create flow works

## Vertical Slice 3: Update Operation

[Repeat pattern for update]

## Vertical Slice 4: Delete Operation

[Repeat pattern for delete]

## Final Verification

- [ ] All CRUD operations work end-to-end
- [ ] pnpm test (all pass)
- [ ] pnpm type-check (no errors)
- [ ] pnpm lint (no errors)
- [ ] log/log.md updated

## Completion Report

[Use template from agent-self-check.md]
```

---

## Template 2: Refactoring Task (Medium-Complex)

**Use for:** Changing patterns across multiple files

**Strategy:** Strangler Fig (complex-tasks.md Strategy 3)

````markdown
Task: Refactor [Old Pattern] → [New Pattern]

## Pre-Task Analysis REQUIRED

Run these commands and report findings:

```bash
# Find all uses of old pattern
grep -r "[old-pattern]" apps/ packages/

# Count occurrences
grep -r "[old-pattern]" apps/ packages/ | wc -l
```
````

Report:

- Total files affected: [number]
- High-risk files (auth, payment, critical): [list]
- Low-risk files (admin, settings, peripheral): [list]
- Estimated lines: [number]
- Complexity: [MEDIUM | COMPLEX]

✅ HUMAN APPROVAL REQUIRED before proceeding

## Phase 1: Create New Pattern (No Breaking Changes)

### Checkpoint 1: Implement New Pattern [~30 min]

Files: [where new pattern lives]
Actions:

- [ ] Implement new pattern
- [ ] Keep old pattern (backward compatibility)
- [ ] Write tests for new pattern
- [ ] Document migration path in comments
      Verification: pnpm test
      Commit: "refactor: add new [pattern] (old still supported)"

## Phase 2: Migrate Low-Risk Files (One at a Time)

For each low-risk file:

### Checkpoint N: Migrate [filename] [~20 min each]

Files: [specific file]
Actions:

- [ ] Update to new pattern
- [ ] Update tests
- [ ] Verify no breaking changes
      Verification: pnpm test
      Commit: "refactor: migrate [filename] to new [pattern]"

List of low-risk files to migrate:

1. [file-1] - Checkpoint 2
2. [file-2] - Checkpoint 3
3. [file-3] - Checkpoint 4
   [continue for all low-risk files]

✅ HUMAN CHECKPOINT: Review low-risk migrations before critical files

## Phase 3: Migrate High-Risk Files (Extra Care Required)

For each high-risk file:

### Checkpoint N: Migrate [critical-filename] [~40 min each]

Files: [specific critical file]
Actions:

- [ ] Update to new pattern
- [ ] Comprehensive testing
- [ ] Manual verification in dev
- [ ] Document changes
      Verification: pnpm test + manual testing
      Commit: "refactor: migrate [critical-file] to new [pattern]"

✅ HUMAN APPROVAL REQUIRED before each critical file

## Phase 4: Remove Old Pattern (Only After 100% Migration)

### Checkpoint Final: Cleanup [~30 min]

Actions:

- [ ] Verify no old pattern usage: `grep -r "[old-pattern]" .`
- [ ] Delete old pattern code
- [ ] Update documentation
- [ ] Remove from exports
      Verification: pnpm test && pnpm type-check
      Commit: "refactor: remove deprecated [old-pattern]"

## Migration Progress

- [ ] Phase 1: New pattern created
- [ ] Phase 2: Low-risk migrated ([X] of [Y])
- [ ] Phase 3: High-risk migrated ([X] of [Y])
- [ ] Phase 4: Old pattern removed

## Completion Report

[Use template from agent-self-check.md]

````

---

## Template 3: Bug Fix Task (Test-Driven)

**Use for:** Reproducible bugs with clear symptoms

**Strategy:** Test-Driven (complex-tasks.md Strategy 4)

```markdown
Task: Fix [Bug Description]

## Bug Details
Symptom: [what user sees]
Expected: [what should happen]
Actual: [what happens]
Steps to reproduce:
1. [step 1]
2. [step 2]
3. [observe error]

Error message: [if applicable]
Affected area: [which layer/file]

## Phase 1: Reproduce (MANDATORY)

### Checkpoint 1: Write Failing Test [~15 min]
Files: [appropriate test file]
Actions:
- [ ] Write test that reproduces bug
- [ ] Verify test FAILS (proves we reproduced bug)
- [ ] Document expected vs actual in test
Verification: Test should FAIL
Commit: "test: reproduce [bug]"

## Phase 2: Investigate Root Cause

Analysis (document before fixing):
- Root cause: [technical explanation]
- Affected code: [file and lines]
- Why it happens: [detailed reasoning]

## Phase 3: Fix

### Checkpoint 2: Implement Fix [~20 min]
Files: [file to fix]
Actions:
- [ ] Implement minimal fix at root cause
- [ ] Keep changes focused
- [ ] Verify original test passes
- [ ] Verify no regressions
Verification: pnpm test (all must pass)
Commit: "fix: [bug description]

Root cause: [brief explanation]
Changes: [what changed]"

## Phase 4: Prevent Regression

### Checkpoint 3: Add Edge Case Tests [~15 min]
Files: [test file]
Actions:
- [ ] Add tests for related edge cases
- [ ] Add tests for similar scenarios
- [ ] Document why these tests matter
Verification: pnpm test
Commit: "test: add regression tests for [bug area]"

## Final Verification
- [ ] Original bug test passes
- [ ] All tests pass
- [ ] No type errors
- [ ] No lint errors
- [ ] Manual verification
- [ ] Bug logged in log/log.md with root cause

## Completion Report
Root cause: [technical explanation]
Files changed: [list]
Tests added: [count]
Verified: ✅ [how you verified]
````

---

## Template 4: Architecture Change (Complex)

**Use for:** Major architectural changes requiring supervision

**Strategy:** Multi-phase with human approval at each stage

````markdown
Task: [Architecture Change Description]

⚠️ WARNING: COMPLEX task requiring human supervision

## Pre-Task Assessment (REQUIRED)

Answer these questions:

1. Why is this change necessary?
   [answer]

2. Current architecture?
   [brief description]

3. Proposed architecture?
   [brief description]

4. Files affected?
   [estimated number]

5. Risks?
   [list risks]

6. Rollback plan?
   [how to undo]

7. Can be done incrementally?
   [yes/no and how]

✅ HUMAN APPROVAL REQUIRED to proceed

## Phase 1: Design & Planning

Deliverable: Create architecture-change-proposal.md with:

- Current architecture diagram
- Proposed architecture diagram
- Migration strategy
- Affected components list
- Risk mitigation plan
- Testing strategy
- Rollback procedure

✅ HUMAN APPROVAL REQUIRED for design

## Phase 2: Preparation (No Breaking Changes)

### Checkpoint 1: Add New Infrastructure [~60 min]

Actions:

- [ ] Add new [component/layer/pattern]
- [ ] Keep old infrastructure running
- [ ] Both systems work in parallel
- [ ] Tests for new infrastructure
      Verification: Both old and new work
      Commit: "arch: add new [component] (parallel to old)"

✅ HUMAN REVIEW before migration

## Phase 3: Gradual Migration

For each component:

### Checkpoint N: Migrate [component] [~45 min each]

Pre-migration:

- [ ] Backup/snapshot current state
- [ ] Write comprehensive tests
- [ ] Prepare rollback script

Migration:

- [ ] Update component
- [ ] Verify both paths work
- [ ] Monitor for issues

Verification: All tests + manual smoke test + performance check
Commit: "arch: migrate [component] to new architecture"

✅ HUMAN APPROVAL before EACH component

## Phase 4: Cleanup (After 100% Migration)

### Checkpoint Final: Remove Old Architecture [~45 min]

Pre-cleanup:

- [ ] All components migrated
- [ ] All tests pass with new arch only
- [ ] Documentation updated
- [ ] Team trained

Actions:

- [ ] Remove old infrastructure
- [ ] Clean up dead code
- [ ] Remove deprecated exports

Verification: pnpm test && pnpm type-check && grep checks
Commit: "arch: remove old [architecture]"

✅ HUMAN FINAL REVIEW

## Success Criteria

- [ ] New architecture fully implemented
- [ ] Old architecture removed
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Performance metrics met
- [ ] Security review passed (if applicable)

## Emergency Rollback

If anything goes wrong:

```bash
git revert [commit-range]
# OR
git reset --hard [commit-before-change]
```
````

## Completion Report

[Use template from agent-self-check.md]

````

---

## Prompt Engineering Best Practices

### Force Explicit Planning

Always include at the start:
```markdown
Before implementing, create a plan:
- [ ] List all affected files
- [ ] Identify dependencies
- [ ] Estimate complexity
- [ ] Choose appropriate template

Share plan for approval before proceeding.
````

### Build in Verification

Every checkpoint includes:

```markdown
Verification after this checkpoint:

1. pnpm format && pnpm lint
2. pnpm type-check
3. pnpm test [specific-tests]
4. Manual test: [specific action]

If ANY fail: fix before proceeding to next checkpoint
```

### Make Rollback Explicit

Always include:

```markdown
Rollback plan:

- Last good state: [commit-hash]
- Command: `git reset --hard [hash]`
- Alternative: [if known]
```

---

## Anti-Pattern Prompts (Don't Use These)

❌ **Vague:** "Add user authentication"
✅ **Good:** Use Template 1 with specific entity details

❌ **Implicit:** "Refactor the auth system"
✅ **Good:** Use Template 2 with explicit analysis

❌ **No verification:** "Fix the login bug"
✅ **Good:** Use Template 3 with test-driven approach

---

## Quick Checklist: Before Giving Task to Agent

- [ ] Task classified (Simple/Medium/Complex)
- [ ] Appropriate template selected
- [ ] Template filled with specifics
- [ ] Verification steps included
- [ ] Stop conditions defined
- [ ] Rollback plan documented
- [ ] Human approval points marked (if complex)
- [ ] Example of similar code provided (if available)

---

## Resume Mode (All Templates)

Use when continuing a task across sessions:

```markdown
Resume Mode:

1. Review previous State Summary from last response.
2. Confirm alignment with current task goal.
3. Note any drift or changes since last checkpoint.
4. Proceed only if aligned; otherwise ask for clarification.
```

---

_Last Updated: 2025-12-29_
_See also: complex-tasks.md (strategies), agent-self-check.md (verification)_
