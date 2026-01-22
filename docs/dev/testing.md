# Testing Strategy

Testing workflows have been migrated to the `test-writer` agent.

## Quick Reference

Use `/agent test-writer` for test creation tasks.

## Test Pyramid

| Layer | Tool | Scope | Speed |
|-------|------|-------|-------|
| Unit | Vitest | Functions, hooks | ~1ms |
| Component | Vitest + RTL | React components | ~10ms |
| Integration | Vitest | API routes, services | ~100ms |
| E2E | Playwright | Full user flows | ~1-5s |

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
