# Agent Reference

Agent instructions are stored in `~/.claude/settings.json`.

## Available Agents

| Agent                   | Command                        | Purpose                              |
| ----------------------- | ------------------------------ | ------------------------------------ |
| `feature-builder`       | `/agent feature-builder`       | Build features with vertical slicing |
| `bug-fixer`             | `/agent bug-fixer`             | TDD bug fixes                        |
| `refactorer`            | `/agent refactorer`            | Safe migrations (strangler fig)      |
| `test-writer`           | `/agent test-writer`           | Comprehensive test coverage          |
| `code-explorer`         | `/agent code-explorer`         | Navigate/understand code             |
| `performance-optimizer` | `/agent performance-optimizer` | Fix bottlenecks                      |
| `security-reviewer`     | `/agent security-reviewer`     | Security audits                      |
| `docs-updater`          | `/agent docs-updater`          | Update documentation                 |
| `api-builder`           | `/agent api-builder`           | Build API endpoints                  |
| `ui-builder`            | `/agent ui-builder`            | Build React components               |
| `lint-fixer`            | `/agent lint-fixer`            | Fix lint/type/test errors            |

## Agent Selection

| Use Case           | Agent                   |
| ------------------ | ----------------------- |
| New feature        | `feature-builder`       |
| Bug fix            | `bug-fixer`             |
| Refactoring        | `refactorer`            |
| Test coverage      | `test-writer`           |
| Code understanding | `code-explorer`         |
| Performance        | `performance-optimizer` |
| Security review    | `security-reviewer`     |
| API development    | `api-builder`           |
| UI components      | `ui-builder`            |
| Fix errors         | `lint-fixer`            |

## Strategy Quick Reference

| Work Type   | Strategy                                                    |
| ----------- | ----------------------------------------------------------- |
| New feature | Vertical slicing: types → DB → routes → hooks → UI          |
| Bug fix     | TDD: repro test → fix → regression                          |
| Refactor    | Strangler fig: add new → migrate → remove old               |
| Cross-layer | Dependency-first: types → validation → DB → routes → client |

## Checkpoint Rules

- **Size:** ~100 lines OR ~20 minutes
- **Loop:** Implement → Tests → Checks → Commit → Report
- **Stop if:** same check fails 3x, scope doubles, unclear next step

## Verification Commands

```bash
# Per checkpoint
npx prettier --config config/.prettierrc --write <files>
npx eslint <files>
pnpm --filter <package> type-check
pnpm test -- --run <test-file>
git commit -m "checkpoint: <summary>"
```

## End of Session Checklist (MANDATORY)

Before ending ANY session, complete all:

1. **Tests** - New/changed files have tests, all pass
2. **Weekly Log** - Add entry to `docs/log/2026-W##.md`
3. **Documentation** - Update `docs/dev/*.md` if patterns changed
4. **Code Artifacts** - JSDoc synced, barrels updated, no TODOs

```bash
# Final verification
pnpm build
```

**Temporary files** (plans, scratch notes) → create in `.tmp/` directory.

## Example Prompts

**Code exploration:**

```
Where is authentication implemented?
Trace the flow from login to dashboard.
```

**Feature building:**

```
Add a new /api/projects endpoint with CRUD operations.
Create a UserProfile component with edit functionality.
```

**Bug fixing:**

```
Fix the login error when email has uppercase letters.
The checkout fails when cart is empty - add validation.
```

## See Also

- `CLAUDE.md` - Project conventions
- `testing.md` - Test strategy reference
- `security.md` - Security architecture
