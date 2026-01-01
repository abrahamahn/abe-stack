# Testing Setup & Configuration

## Overview

The ABE Stack testing infrastructure is configured with modern tools and best practices for React testing:

- **Vitest** - Fast unit test runner with native ESM support
- **React Testing Library** - User-centric component testing
- **@testing-library/user-event** - Realistic user interaction simulation
- **MSW (Mock Service Worker)** - Network request mocking
- **Playwright** - End-to-end testing
- **vitest-axe** - Accessibility testing

---

## Installation

All testing dependencies are installed at the workspace root:

```bash
# Core testing libraries (already installed)
@testing-library/react
@testing-library/jest-dom
@testing-library/user-event

# Test runner and utilities
vitest
@vitest/coverage-v8
@vitest/ui
jsdom

# Network mocking
msw

# E2E testing
@playwright/test

# Accessibility testing
vitest-axe
```

---

## Configuration Files

### Vitest Configuration

Each package has its own `vitest.config.ts`:

**Example: packages/ui/vitest.config.ts**

```typescript
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

### Test Setup File

**packages/ui/src/test/setup.ts** - Configures testing environment:

```typescript
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './mocks/server';

// MSW Server Lifecycle
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
});
afterAll(() => server.close());

// Export axe for accessibility testing
export { axe } from 'vitest-axe';
```

### MSW Configuration

**packages/ui/src/test/mocks/handlers.ts** - Define mock API handlers:

```typescript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'John Doe' });
  }),
];
```

**packages/ui/src/test/mocks/server.ts** - Setup MSW server:

```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

---

## Usage Examples

### Basic Component Test

```typescript
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Button } from '../Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

### User Interaction Test

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../Button';

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();

    render(<Button onClick={handleClick}>Click me</Button>);

    await user.click(screen.getByText('Click me'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Network Mocking with MSW

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { server } from '@/test/mocks/server';
import { UserProfile } from '../UserProfile';

describe('UserProfile', () => {
  it('displays user data from API', async () => {
    server.use(
      http.get('/api/user/123', () => {
        return HttpResponse.json({ id: '123', name: 'Alice' });
      }),
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    server.use(
      http.get('/api/user/123', () => {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }),
    );

    render(<UserProfile userId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
```

### Accessibility Testing

```typescript
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe';

import { axe } from '@/test/setup';
import { LoginForm } from '../LoginForm';

// Extend matchers
expect.extend(toHaveNoViolations);

describe('LoginForm - Accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<LoginForm />);

    const results = await axe(container);

    expect(results).toHaveNoViolations();
  });
});
```

---

## Running Tests

### Fast Loop (During Development)

```bash
# Run tests for specific package
pnpm test --filter abeahn-ui

# Watch mode
pnpm test --filter abeahn-ui -- --watch

# Run specific test file
pnpm test --filter abeahn-ui -- Button.test.tsx
```

### Full Suite (Before Completion)

```bash
# Run all tests across all packages
pnpm test

# Run with coverage
pnpm test -- --coverage
```

### Interactive UI

```bash
# Open Vitest UI
pnpm test --filter abeahn-ui -- --ui
```

---

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ❌ Bad - Testing implementation details
expect(component.state.isOpen).toBe(true);

// ✅ Good - Testing user-visible behavior
expect(screen.getByRole('dialog')).toBeInTheDocument();
```

### 2. Use Proper Query Priorities

**Priority order:**

1. `getByRole` - Best for semantic elements
2. `getByLabelText` - Best for form fields
3. `getByPlaceholderText` - For inputs without labels
4. `getByText` - For non-interactive text
5. `getByTestId` - Last resort only

```typescript
// ✅ Good - Semantic queries
const button = screen.getByRole('button', { name: /submit/i });
const input = screen.getByLabelText('Email');

// ❌ Avoid - Brittle queries
const button = container.querySelector('.submit-btn');
```

### 3. Async Testing

Always use `waitFor` or `findBy*` for async operations:

```typescript
// ✅ Good - Wait for async updates
await waitFor(() => {
  expect(screen.getByText('Loaded!')).toBeInTheDocument();
});

// OR
expect(await screen.findByText('Loaded!')).toBeInTheDocument();

// ❌ Bad - May cause flaky tests
expect(screen.getByText('Loaded!')).toBeInTheDocument();
```

### 4. User Event over fireEvent

```typescript
import userEvent from '@testing-library/user-event';

// ✅ Good - Realistic interactions
const user = userEvent.setup();
await user.click(button);
await user.type(input, 'hello');

// ❌ Avoid - Low-level events
fireEvent.click(button);
fireEvent.change(input, { target: { value: 'hello' } });
```

---

## Troubleshooting

### Tests Not Finding Setup File

Ensure `vitest.config.ts` has correct path to setup file:

```typescript
setupFiles: ['./src/test/setup.ts'];
```

### MSW Warnings About Unhandled Requests

Add handlers for all network requests or update server config:

```typescript
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn', // or 'bypass' to ignore
  });
});
```

### Accessibility Test False Positives

Some components may have known violations. Document and suppress:

```typescript
const results = await axe(container, {
  rules: {
    'color-contrast': { enabled: false }, // Known issue
  },
});
```

---

## See Also

- `./index.md` - Testing overview and strategy
- `./best-practices.md` - Modern React testing best practices
- `./edge-cases.md` - Edge case testing guide
- `./examples.md` - More test examples
