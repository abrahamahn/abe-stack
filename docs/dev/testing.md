# Testing

## Overview

- **Runner:** Vitest v4 with turbo orchestration
- **Browser env:** jsdom (for React component tests)
- **React testing:** `@testing-library/react` + `@testing-library/user-event`
- **Assertions:** `@testing-library/jest-dom/vitest` matchers

## Test File Placement

| Test type         | Location               | Example                                       |
| ----------------- | ---------------------- | --------------------------------------------- |
| Unit tests        | Colocated with source  | `service.ts` + `service.test.ts`              |
| Handler tests     | Colocated with handler | `login.ts` + `login.test.ts`                  |
| Integration tests | Central folder         | `main/apps/server/src/__tests__/integration/` |
| E2E tests         | Playwright config      | `config/playwright.config.ts`                 |

## Running Tests

```bash
pnpm test                          # All tests (turbo cached, errors-only)
pnpm test:verbose                  # All tests with full output
pnpm test -- --run path/to/file    # Single test file

# Package-scoped
pnpm --filter @bslt/web test
pnpm --filter @bslt/server test
pnpm --filter @bslt/ui test
```

## Configuration

### Base Config (Root)

The root `vitest.config.ts` exports a `baseConfig` that all packages extend:

```typescript
export const baseConfig = defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/backup/**', '**/*.spec.ts'],
    testTimeout: 10000,
    clearMocks: true,
    restoreMocks: true,
  },
});
```

### Web App Config

`main/apps/web/vitest.config.ts` extends the base with:

- `environment: 'jsdom'` for browser API simulation
- `setupFiles: ['./src/__tests__/setup.ts']` for global mocks
- `pool: 'threads'` with `maxConcurrency: 4` for memory management
- Custom `resolveWorkspaceToSource` plugin to resolve `@bslt/*` to source files

## Test Setup (Golden Standard)

The reference setup file is `main/apps/web/src/__tests__/setup.ts`. Every web test file inherits this setup.

### Required Browser API Mocks

```typescript
// matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }),
});

// ResizeObserver, IntersectionObserver
vi.stubGlobal('ResizeObserver', MockResizeObserver);
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);

// scrollTo, window.scroll
vi.stubGlobal('scrollTo', vi.fn());
Object.defineProperty(window, 'scroll', { writable: true, value: vi.fn() });
```

### Fetch Mock

The setup provides a default fetch mock that rejects with a helpful error. Individual tests override it:

```typescript
vi.stubGlobal(
  'fetch',
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ data: 'test' }),
  }),
);
```

### Lifecycle Hooks

```typescript
afterEach(() => {
  cleanup(); // RTL DOM cleanup
  vi.clearAllMocks(); // Prevent mock state leakage
  vi.useRealTimers(); // Reset fake timers
});
```

## Common Pitfalls

### Fake Timers + waitFor

`waitFor` polls via `setTimeout`. If `vi.useFakeTimers()` is active, the timeout never fires and the test hangs indefinitely.

**Fix:** Use synchronous timer advancement:

```typescript
// WRONG - hangs forever
vi.useFakeTimers();
await waitFor(() => expect(element).toBeVisible());

// CORRECT - advance timers synchronously
vi.useFakeTimers();
act(() => vi.advanceTimersByTime(1000));
expect(element).toBeVisible();
```

### MemoryRouter initialEntries

`MemoryRouter` captures `initialEntries` on mount via a ref. Passing a new array reference on re-render causes infinite loops because `useMemo` recomputes, triggers `useEffect`, which calls `setState`.

**Fix:** Use a stable reference or add a `key` prop to force remount:

```typescript
// WRONG - new array each render
<MemoryRouter initialEntries={['/dashboard']}>

// CORRECT - stable reference with key for different routes
<MemoryRouter key="/dashboard" initialEntries={['/dashboard']}>
```

### Running Tests from Package Directory

Tests must be run from the package directory (not root) for jsdom environment to load correctly:

```bash
# CORRECT
pnpm --filter @bslt/web test

# ALSO CORRECT
cd main/apps/web && pnpm test
```

## Writing Tests

### Component Test Pattern

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

describe('MyComponent', () => {
  it('handles click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);

    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
```

### Service/Handler Test Pattern

```typescript
import { describe, expect, it, vi } from 'vitest';

describe('myService', () => {
  it('returns data for valid input', async () => {
    const mockRepo = { findById: vi.fn().mockResolvedValue({ id: '1', name: 'Test' }) };
    const result = await myService({ repos: mockRepo });
    expect(result).toEqual({ id: '1', name: 'Test' });
  });
});
```

### vi.spyOn Exception

Namespace imports (`import * as module`) are allowed in test files where `vi.spyOn` requires them:

```typescript
import * as authService from '../service';
vi.spyOn(authService, 'authenticateUser').mockResolvedValue(mockResult);
```

This is the only exception to the "no namespace imports" rule.
