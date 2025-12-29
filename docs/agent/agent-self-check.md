# Agent Self-Verification System

This file defines mandatory self-checks that AI agents must perform during task execution to prevent half-completed work.

---

## When to Run Self-Checks

**Required:** After EVERY checkpoint (typically every 100 lines or 20 minutes)

**Optional but Recommended:**

- Before starting a new phase
- When feeling "stuck" or uncertain
- After encountering an error
- Before asking human for help

---

## Self-Check Protocol

### Level 1: Code Quality Checks (Automated)

**Run these commands in sequence. ALL must pass.**

```bash
# 1. Format check
pnpm format
# Expected: "All files formatted âś…"

# 2. Lint check
pnpm lint
# Expected: "No errors âś…" or specific fixable warnings

# 3. Type check
pnpm type-check
# Expected: "No TypeScript errors âś…"

# 4. Test check (focused)
pnpm test [relevant-test-file]
# Expected: "All tests passing âś…"
```

**If ANY fail:**

```markdown
âŒ Quality check failed at: [which check]

Error output:
```

[paste error]

```

Attempt 1: [what I'll try to fix it]
[implement fix]
[re-run checks]

[If the failure is pre-existing/unrelated]
âŒ Do not fix automatically. Report it clearly and proceed only with requested scope.

[If still failing after attempt 3]
âś… STOP - Requesting human help
```

---

### Level 2: Task Progress Checks (Manual)

**Answer these questions honestly after each checkpoint:**

```markdown
## Checkpoint [N] Self-Assessment

1. **Scope adherence:**
   - [ ] I only changed what was planned for this checkpoint
   - [ ] I did NOT add scope creep features
   - [ ] Changes are focused and minimal

2. **Code location:**
   - [ ] Code is in the correct layer (React/Server/Shared/DB)
   - [ ] No business logic leaked into React components
   - [ ] No cross-app imports

3. **Pattern consistency:**
   - [ ] I followed existing patterns (not inventing new ones)
   - [ ] I checked for similar code before implementing
   - [ ] Changes match the codebase style

4. **Testing:**
   - [ ] Tests exist for new functionality
   - [ ] Tests actually verify the behavior (not just "renders")
   - [ ] Tests pass locally

5. **Dependencies:**
   - [ ] Dependencies are satisfied (nothing broken by my changes)
   - [ ] No circular dependencies introduced
   - [ ] Import order is correct (external → internal → relative → styles)

6. **Documentation:**
   - [ ] Complex decisions have comments explaining "why"
   - [ ] Type definitions are clear
   - [ ] Public APIs have JSDoc if complex

7. **Completeness:**
   - [ ] This checkpoint is genuinely complete
   - [ ] No TODO comments left for later
   - [ ] No "works on my machine" hacks

**If ANY checkbox is unchecked:**

- Fix it NOW before proceeding
- Do NOT continue to next checkpoint
- Do NOT mark task as complete
```

---

### Level 3: Context Retention Checks

**Verify you remember critical context (prevents context drift):**

```markdown
Current State Summary:

- Goal: [restated in one sentence]
- Progress: [completed checkpoints + outcomes]
- Next: [immediate next step]
- Risks: [open risks or blockers]

## Context Retention Check

1. **Task goal:**
   Can you state the original task in one sentence?
   Answer: [your answer]

2. **Current progress:**
   Which checkpoint are you on? [N] of [Total]

3. **Next steps:**
   What are the next 2 checkpoints?
   - Next: [description]
   - After that: [description]

4. **Success criteria:**
   What needs to be true when task is complete?
   - [ ] [criterion 1]
   - [ ] [criterion 2]
   - [ ] [criterion 3]

5. **Constraints:**
   What must you NOT do?
   - [constraint 1]
   - [constraint 2]

**If you can't answer any of these clearly:**

- Re-read the original task prompt
- Review completed checkpoints
- Verify you're not context-drifting
```

---

### Level 4: Tool-Assisted Validation

**Optional for MEDIUM tasks, REQUIRED for COMPLEX tasks.**

```markdown
Tool-Assisted Validation:

1. git status (clean or expected changes only)
2. git log --oneline -n 5 (verify recent checkpoints)
3. If drift detected: compare against last checkpoint and reassess plan
```

If context is lost, reload `INDEX.md` and only the needed modules.

---

### Level 5: Risk Assessment

**Before proceeding to next checkpoint, assess risks:**

```markdown
## Risk Assessment for Next Checkpoint

1. **Blast radius:**
   How many files will next checkpoint touch?
   - [ ] 1 file (low risk)
   - [ ] 2-3 files (medium risk)
   - [ ] 4+ files (high risk - consider breaking down further)

2. **Critical systems:**
   Will next checkpoint touch:
   - [ ] Authentication/authorization code
   - [ ] Payment processing
   - [ ] Database migrations
   - [ ] Critical user paths

   If YES to any: Requires extra care and potentially human review

3. **Reversibility:**
   Can next checkpoint be easily rolled back?
   - [ ] Yes - simple code changes only
   - [ ] Partial - includes DB changes (need migration rollback)
   - [ ] Difficult - architectural changes

   If Partial or Difficult: Document rollback plan before proceeding

4. **Dependencies:**
   Are there other systems/people depending on what you're changing?
   - [ ] No - isolated change
   - [ ] Yes - [list dependencies]

   If Yes: Consider coordinating before making changes

5. **Confidence level:**
   How confident are you in your approach for next checkpoint?
   - [ ] High - clear pattern, done this before
   - [ ] Medium - somewhat familiar, need to reference examples
   - [ ] Low - uncertain, might need guidance

   If Low: Ask human before proceeding
```

---

### Level 6: Anti-Pattern Detection

**Check for common mistakes (run before committing checkpoint):**

```markdown
## Anti-Pattern Scan

Search your changes for these red flags:

1. **Business logic in components:**
   Search: `function.*{.*=>.*reduce|map|filter` in .tsx files
   - [ ] No business logic found in React components âś…
   - [ ] Found logic - extract to shared package âŒ

2. **Using `any` type:**
   Search: `: any` in your changed files
   - [ ] No `any` types âś…
   - [ ] Found `any` - replace with proper types âŒ

3. **Disabled linting:**
   Search: `eslint-disable` in your changed files
   - [ ] No lint disabling âś…
   - [ ] Found disables - fix the issue instead âŒ

4. **Duplicate code:**
   Did you copy-paste any code blocks?
   - [ ] No duplication âś…
   - [ ] Yes - extract to shared function âŒ

5. **Missing error handling:**
   Search: `async` functions without `try/catch`
   - [ ] All async code has error handling âś…
   - [ ] Missing error handling âŒ

6. **Hardcoded values:**
   Search: strings/numbers that should be constants
   - [ ] No magic numbers/strings âś…
   - [ ] Found hardcoded values - extract to constants âŒ

7. **Console logs:**
   Search: `console.log` in your changed files
   - [ ] No console logs âś…
   - [ ] Found logs - remove or use proper logger âŒ

8. **Commented out code:**
   Search: large blocks of `//` or `/* */` commented code
   - [ ] No commented code âś…
   - [ ] Found commented code - delete it âŒ

**For each âŒ found:**
Fix immediately before committing. If unsure how to fix, ask for guidance.
```

---

## Emergency Stop Protocol

**Trigger emergency stop if ANY of these conditions occur:**

```markdown
## Stop Conditions

âś… Immediately STOP and report to human if:

1. **Repeated failures:**
   - Same verification failed 3 times in a row
   - You're in a "fix A breaks B, fix B breaks A" loop
   - Tests are flaky and passing/failing randomly

2. **Scope explosion:**
   - Original task estimated 3 files, now touching 10+ files
   - Original task estimated 200 lines, now at 500+ lines
   - New requirements discovered that weren't in original task

3. **Uncertain path:**
   - You don't know which file to modify next
   - Multiple valid approaches exist
   - You're making architectural decisions not specified in task

4. **Breaking changes:**
   - Your changes will break existing functionality
   - Backward compatibility cannot be maintained
   - Database migration will lose data

5. **External dependencies:**
   - Need to add new npm package
   - Need to change infrastructure (Redis, DB schema fundamentally)
   - Need to coordinate with other services/teams

6. **Security concerns:**
   - Touching authentication/authorization code
   - Handling sensitive data (PII, passwords, tokens)
   - Changing permission checks

7. **Context loss:**
   - You forgot what the original task was
   - You can't remember previous checkpoints
   - You're unsure why you're making current changes

**When stopped, report:**
```

âś… EMERGENCY STOP

Trigger: [which condition above]

Current state:

- Checkpoint: [N] of [Total]
- Last successful checkpoint: [commit hash]
- Files modified since last checkpoint: [list]

Problem:
[Detailed description of what went wrong]

What I tried:

1. [attempt 1]
2. [attempt 2]
3. [attempt 3]

Question for human:
[Specific question that will unblock you]

Rollback available:
`git reset --hard [commit-hash]`

```

```

---

## Completion Verification

**Before marking task as COMPLETE, verify ALL items:**

```markdown
## Task Completion Checklist

### Code Quality

- [ ] pnpm format - passed
- [ ] pnpm lint - no errors
- [ ] pnpm type-check - no errors
- [ ] pnpm test - all tests pass
- [ ] pnpm build - builds successfully (for production changes)

### Functional Verification

- [ ] Manual smoke test completed
- [ ] Feature works as specified in original task
- [ ] No regressions introduced (tested old functionality)
- [ ] Edge cases handled
- [ ] Error states handled gracefully

### Code Standards

- [ ] Follows ABE Stack patterns (checked CLAUDE.md)
- [ ] Code in correct layers (React/Server/Shared/DB)
- [ ] No anti-patterns detected (ran anti-pattern scan)
- [ ] Dependencies flow correctly (apps → packages → shared)
- [ ] No cross-app imports

### Testing

- [ ] Business logic has unit tests
- [ ] API endpoints have contract tests
- [ ] Database changes have integration tests
- [ ] Tests are meaningful (not just "it renders")
- [ ] Test coverage meets expectations

### Documentation

- [ ] log/log.md updated with changes
- [ ] Complex decisions have comments
- [ ] Breaking changes documented
- [ ] TODO.md updated (tasks added/removed)

### Git Hygiene

- [ ] All checkpoints committed with clear messages
- [ ] No WIP commits remaining
- [ ] Commit messages follow convention
- [ ] No merge conflicts

### Cleanup

- [ ] No console.log statements
- [ ] No commented-out code
- [ ] No TODOs left in code
- [ ] No temporary files

### Handoff

- [ ] Summary report prepared (see template below)
- [ ] Known issues/limitations documented
- [ ] Next steps identified (if any)

**If ANY checkbox unchecked:**

- Task is NOT complete
- Fix the issue
- Re-run completion checklist
```

---

## Completion Report Template

**When task is genuinely complete, provide this report:**

```markdown
## Task Completion Report

**Task:** [original task description]

**Status:** âś… COMPLETE

**Summary:**
[2-3 sentence summary of what was accomplished]

**Checkpoints Completed:**

1. âś… [Checkpoint 1 description] - [commit hash]
2. âś… [Checkpoint 2 description] - [commit hash]
3. âś… [Checkpoint 3 description] - [commit hash]
   [... all checkpoints]

**Files Changed:**
Added:

- [file 1]
- [file 2]

Modified:

- [file 3]
- [file 4]

Deleted:

- [file 5]

**Statistics:**

- Lines added: [number]
- Lines deleted: [number]
- Files touched: [number]
- Tests added: [number]
- Duration: [time spent]

**Testing:**

- Unit tests: [X passed, Y added]
- Integration tests: [X passed, Y added]
- Manual testing: [what was tested]

**Verification:**

- âś… pnpm format
- âś… pnpm lint
- âś… pnpm type-check
- âś… pnpm test
- âś… Manual smoke test

**Documentation Updated:**

- [x] log/log.md - [commit hash]
- [x] TODO.md - [commit hash]
- [ ] Other: [specify]

**Known Issues/Limitations:**
[None | List any known issues]

**Next Steps:**
[None | List recommended follow-up tasks]

**Notes:**
[Any additional context or decisions made during implementation]
```

---

## Daily Self-Audit (For Long-Running Tasks)

**If task spans multiple sessions, run this audit at start of each session:**

```markdown
## Daily Self-Audit

**Date:** [today's date]
**Session:** [N]

1. **Reorient:**
   - [ ] Read original task description
   - [ ] Review completed checkpoints
   - [ ] Understand where I left off

2. **Verify continuity:**
   - [ ] All previous checkpoints still pass quality checks
   - [ ] No merge conflicts from others' changes
   - [ ] Dependencies still satisfied

3. **Plan today:**
   - Checkpoints to complete today: [list]
   - Estimated time: [hours]
   - Blockers: [none | list]

4. **Check for staleness:**
   - [ ] Code patterns still current
   - [ ] No new guidelines in CLAUDE.md since last session
   - [ ] No conflicting changes by others

5. **Refocus:**
   Main goal for today: [specific, measurable goal]

**If anything looks wrong:**

- Don't proceed
- Ask human for status update
- May need to rebase or adjust approach
```

---

## Autonomous Work Self-Limits

**When working autonomously (agent mode), enforce these limits:**

```markdown
## Autonomous Mode Limits

I am working autonomously and will STOP if I hit any of these limits:

**Time limits:**

- [ ] Single checkpoint: 20 minutes max
- [ ] Total session: 2 hours max
- [ ] If exceeded: STOP and report progress

**Scope limits:**

- [ ] Single checkpoint: 100 lines max
- [ ] Single checkpoint: 3 files max
- [ ] Total task: 500 lines max (beyond this needs supervision)
- [ ] If exceeded: STOP and decompose further

**Iteration limits:**

- [ ] Fix attempts per issue: 3 max
- [ ] Checkpoint attempts: 5 max before stopping
- [ ] If exceeded: STOP and ask for help

**Uncertainty limits:**

- [ ] If I'm unsure about approach: STOP and ask
- [ ] If multiple valid solutions exist: STOP and ask which to use
- [ ] If breaking changes required: STOP and get approval

**Quality limits:**

- [ ] If tests fail after 3 attempts: STOP
- [ ] If type errors persist after 3 attempts: STOP
- [ ] If lint errors can't be fixed: STOP

**Current counters:**

- Checkpoint attempts: [N]
- Fix attempts on current issue: [N]
- Session duration: [X minutes]
- Total lines changed: [N]

**When any limit hit:**
Report status, document current state, wait for guidance.
```

---

## Summary: The Self-Check Cycle

**After EVERY checkpoint (20-30 minutes):**

```
1. Code Quality Checks (automated) ✅
   â†' format, lint, type-check, test

2. Task Progress Checks (manual) ✅
   â†' scope, location, patterns, tests, docs

3. Context Retention Checks ✅
   â†' remember goal, progress, next steps

4. Risk Assessment ✅
   â†' evaluate next checkpoint risks

5. Anti-Pattern Detection ✅
   â†' scan for common mistakes

If ALL pass âś… → Commit checkpoint, proceed
If ANY fail âŒ → Fix immediately, do NOT proceed

If stuck after 3 attempts → STOP, report to human
```

**Philosophy:** Prevention (through self-checks) beats remediation (fixing broken code).

---

_Last Updated: 2025-12-29_
_See also: complex-tasks.md, agent-prompts.md, CLAUDE.md_
