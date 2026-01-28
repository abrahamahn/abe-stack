# Testing Strategy

Testing workflows have been migrated to the `test-writer` agent.

## Quick Reference

Use `/agent test-writer` for test creation tasks.

## The Hybrid Model (Gold Standard)

In a professional architecture, we treat Unit Tests and Integration Tests differently.

### A. Unit Tests: Colocate (Adjacent)

Put your `.test.ts` or `.spec.ts` files right next to the code they verify.

Example:

```
apps/server/src/config/core/database.ts
apps/server/src/config/core/database.test.ts
```

Why?

- Visibility: Missing tests are obvious.
- Simpler imports: `import { ... } from './database'`
- Refactoring safety: Tests move with the code.

### B. Integration & E2E Tests: Centralize

Keep these in a dedicated folder because they test the relationship between modules.

Recommended paths:

- `apps/server/src/__tests__/integration/`
- `apps/server/test/`

Why?

- Integration tests often need databases, queues, or other infra.
- They should treat the app as a black box using main entry points.

### Boilerplate Example

```
apps/server/src/config/
├── core/
│   ├── database.ts
│   ├── database.test.ts
│   ├── server.ts
│   └── server.test.ts
├── services/
│   ├── billing.ts
│   ├── billing.test.ts
│   └── email.ts
└── __tests__/
    ├── integration/
    │   └── auth-flow.test.ts
    └── mocks/
        └── env.mock.ts
```

### Comparison

| Feature         | Colocated (Adjacent) | Dedicated Folder (`__tests__`) |
| --------------- | -------------------- | ------------------------------ |
| Discoverability | High                 | Low                            |
| Path resilience | High                 | Low                            |
| Clutter         | Medium               | Low                            |
| Marketability   | Modern/Pro           | Classic/Legacy                 |

**Recommendation:** Colocate unit tests. Centralize integration and E2E tests.

## Test Pyramid

| Layer       | Tool         | Scope                | Speed  |
| ----------- | ------------ | -------------------- | ------ |
| Unit        | Vitest       | Functions, hooks     | ~1ms   |
| Component   | Vitest + RTL | React components     | ~10ms  |
| Integration | Vitest       | API routes, services | ~100ms |
| E2E         | Playwright   | Full user flows      | ~1-5s  |

**Distribution:** 70% Component/Integration, 20% Unit, 10% E2E

## TDD Cycle

1. **Red:** Write failing test
2. **Green:** Minimal fix to pass
3. **Refactor:** Clean up, keep tests green

## Commands

```bash
# Targeted (during edits)
pnpm test -- --run path/to/file.test.tsx
pnpm --filter @abe-stack/ui test

# Full suite (before completion)
pnpm test
pnpm test:coverage
```

## Required Edge Cases

Per component:

- Happy path
- Missing/invalid props (null, undefined)
- Boundary conditions (0, negative, max)
- Empty content
- Keyboard interactions (Tab, Enter, Escape)
- Accessibility (ARIA, semantic HTML)

## Best Practices

```typescript
// Use userEvent, not fireEvent
const user = userEvent.setup();
await user.click(button);

// Test behavior, not implementation
expect(screen.getByRole('dialog')).toBeInTheDocument();

// Query priority: getByRole > getByLabelText > getByText > getByTestId
```

## See Also

- `/agent test-writer` - Full test workflow
- `CLAUDE.md` - Project conventions
