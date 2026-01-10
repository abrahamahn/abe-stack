# Testing Guide

_Last Updated: January 10, 2026_

Testing strategy, setup, and patterns for ABE Stack.

---

## Overview

ABE Stack uses a multi-layer testing approach:

| Layer       | Tool         | Scope                       | Speed           |
| ----------- | ------------ | --------------------------- | --------------- |
| Unit        | Vitest       | Functions, hooks, utilities | Fast (~1ms)     |
| Component   | Vitest + RTL | React components            | Fast (~10ms)    |
| Integration | Vitest + MSW | API routes, services        | Medium (~100ms) |
| E2E         | Playwright   | Full user flows             | Slow (~1-5s)    |

---

## Test Stack

### Core Tools

- **Vitest** - Test runner (Jest-compatible, Vite-native)
- **@testing-library/react** - Component testing utilities
- **@testing-library/user-event** - Realistic user interactions
- **MSW (Mock Service Worker)** - Network mocking at fetch level
- **vitest-axe** - Accessibility testing
- **Playwright** - End-to-end browser testing

### Installation

```bash
pnpm add -D vitest @testing-library/react @testing-library/user-event msw vitest-axe
pnpm add -D @playwright/test
```

---

## Test Organization

### File Structure

```
packages/ui/src/
├── components/
│   ├── Button.tsx
│   └── __tests__/
│       └── Button.test.tsx
├── hooks/
│   ├── useDebounce.ts
│   └── __tests__/
│       └── useDebounce.test.ts
└── test/
    ├── setup.ts          # Global test setup
    └── mocks/
        ├── handlers.ts   # MSW request handlers
        └── server.ts     # MSW server configuration
```

### Naming Conventions

- Test files: `*.test.ts` or `*.test.tsx`
- Test utilities: `*.test-utils.ts`
- Fixtures: `*.fixtures.ts`

---

## Running Tests

### Commands

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run specific package tests
pnpm --filter @abeahn/ui test

# Run specific test file
pnpm vitest run packages/ui/src/components/__tests__/Button.test.tsx

# Run E2E tests
pnpm test:e2e
```

### Coverage Requirements

| Package         | Target |
| --------------- | ------ |
| packages/ui     | 80%+   |
| packages/shared | 90%+   |
| apps/server     | 70%+   |

---

## Testing Patterns

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByRole('button', { name: 'Click me' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);

    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCounter } from '../useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter());

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### API Tests with MSW

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../test/mocks/server';

describe('UserService', () => {
  it('fetches user data', async () => {
    server.use(
      http.get('/api/users/:id', () => {
        return HttpResponse.json({ id: '1', name: 'Test User' });
      }),
    );

    const user = await fetchUser('1');

    expect(user.name).toBe('Test User');
  });
});
```

### Accessibility Tests

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'vitest-axe';

expect.extend(toHaveNoViolations);

describe('Form', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Form />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
```

---

## Best Practices

### Do

- Test behavior, not implementation
- Use `userEvent` over `fireEvent` for interactions
- Use `getByRole` as primary query (accessibility-first)
- Mock at network boundary (MSW), not module level
- Write descriptive test names ("renders error message when validation fails")

### Don't

- Test implementation details (internal state, private methods)
- Use `getByTestId` as primary query
- Mock everything - real dependencies are better
- Write tests that pass without the code being correct
- Couple tests to DOM structure

### Query Priority

```typescript
// ✅ Preferred - accessible queries
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');
screen.getByPlaceholderText('Search...');

// ⚠️ Fallback - text content
screen.getByText('Welcome');

// ❌ Last resort - test IDs
screen.getByTestId('submit-button');
```

---

## Test Configuration

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['**/*.test.*', '**/test/**'],
    },
  },
});
```

### Test Setup

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## Current Test Coverage

As of January 2026:

| Package         | Tests | Coverage |
| --------------- | ----- | -------- |
| packages/ui     | 724+  | ~85%     |
| packages/shared | 9+    | ~70%     |
| apps/web        | 337+  | ~60%     |
| apps/server     | WIP   | ~40%     |

---

## Related Documentation

- [Workflows](./workflows.md) - CI/CD integration
- [Architecture](../architecture/index.md) - Code organization
- [Roadmap](../ROADMAP.md) - Testing milestones
