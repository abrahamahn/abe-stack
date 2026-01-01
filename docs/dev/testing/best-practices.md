# React UI Testing Best Practices

## Philosophy

**Test behavior the way a user experiences it.**

Modern React testing focuses on:

- ✅ **Stable tests** - Not coupled to implementation details
- ✅ **User-centric** - Test what users see and do
- ✅ **High-value integration** - Small set of critical flows
- ✅ **Minimal E2E** - Only for critical paths

---

## What to Test (Thorough, Not Wasteful)

### 1. Component Behavior (Your "Bread and Butter")

**Aim to cover:**

#### Rendering States

```tsx
it('renders default state', () => {
  render(<UserProfile user={mockUser} />);
  expect(screen.getByText(mockUser.name)).toBeInTheDocument();
});

it('renders loading state', () => {
  render(<UserProfile user={null} loading={true} />);
  expect(screen.getByRole('status')).toBeInTheDocument();
  expect(screen.getByText(/loading/i)).toBeInTheDocument();
});

it('renders empty state', () => {
  render(<UserProfile user={null} />);
  expect(screen.getByText(/no user found/i)).toBeInTheDocument();
});

it('renders error state', () => {
  render(<UserProfile error="Failed to load" />);
  expect(screen.getByRole('alert')).toBeInTheDocument();
  expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
});
```

#### User Interactions

```tsx
it('handles click interactions', async () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Click me</Button>);

  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});

it('handles typing', async () => {
  const handleChange = vi.fn();
  render(<Input onChange={handleChange} />);

  await userEvent.type(screen.getByRole('textbox'), 'Hello');
  expect(handleChange).toHaveBeenCalledTimes(5); // Once per character
  expect(screen.getByRole('textbox')).toHaveValue('Hello');
});

it('handles keyboard navigation', async () => {
  render(<Menu items={['Home', 'About', 'Contact']} />);

  const firstItem = screen.getByText('Home');
  await userEvent.tab();
  expect(firstItem).toHaveFocus();

  await userEvent.keyboard('{ArrowDown}');
  expect(screen.getByText('About')).toHaveFocus();
});

it('handles focus and blur', async () => {
  const handleFocus = vi.fn();
  const handleBlur = vi.fn();
  render(<Input onFocus={handleFocus} onBlur={handleBlur} />);

  const input = screen.getByRole('textbox');
  await userEvent.click(input);
  expect(handleFocus).toHaveBeenCalled();

  await userEvent.tab();
  expect(handleBlur).toHaveBeenCalled();
});
```

#### Conditional UI

```tsx
it('shows admin panel when user has admin role', () => {
  render(<Dashboard user={{ role: 'admin' }} />);
  expect(screen.getByText(/admin panel/i)).toBeInTheDocument();
});

it('hides admin panel for regular users', () => {
  render(<Dashboard user={{ role: 'user' }} />);
  expect(screen.queryByText(/admin panel/i)).not.toBeInTheDocument();
});

it('shows feature when feature flag is enabled', () => {
  render(<App features={{ newFeature: true }} />);
  expect(screen.getByText(/new feature/i)).toBeInTheDocument();
});

it('adapts to mobile viewport', () => {
  global.innerWidth = 375;
  render(<Navigation />);
  expect(screen.getByLabelText('Menu')).toBeInTheDocument(); // Hamburger menu
});
```

#### Accessibility Expectations

```tsx
it('has proper ARIA roles', () => {
  render(<Dialog title="Confirm" />);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

it('has accessible labels', () => {
  render(<Input label="Email" />);
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
});

it('maintains focus order', async () => {
  render(
    <Form>
      <Input label="Name" />
      <Input label="Email" />
      <Button>Submit</Button>
    </Form>,
  );

  await userEvent.tab();
  expect(screen.getByLabelText('Name')).toHaveFocus();

  await userEvent.tab();
  expect(screen.getByLabelText('Email')).toHaveFocus();

  await userEvent.tab();
  expect(screen.getByRole('button')).toHaveFocus();
});

it('has proper aria attributes', () => {
  render(<Button aria-label="Close dialog">×</Button>);
  expect(screen.getByLabelText('Close dialog')).toBeInTheDocument();
});
```

#### Edge Cases

```tsx
it('handles long text without breaking layout', () => {
  const longText = 'A'.repeat(1000);
  render(<Card title={longText} />);
  expect(screen.getByText(longText)).toBeInTheDocument();
});

it('handles missing optional props gracefully', () => {
  expect(() => {
    render(<UserCard user={null} />);
  }).not.toThrow();
});

it('respects disabled state', async () => {
  const handleClick = vi.fn();
  render(
    <Button onClick={handleClick} disabled>
      Click
    </Button>,
  );

  await userEvent.click(screen.getByRole('button'));
  expect(handleClick).not.toHaveBeenCalled();
});

it('handles empty arrays', () => {
  render(<List items={[]} />);
  expect(screen.getByText(/no items/i)).toBeInTheDocument();
});
```

#### Contracts

```tsx
it('fires callback with correct values', async () => {
  const handleSubmit = vi.fn();
  render(<Form onSubmit={handleSubmit} />);

  await userEvent.type(screen.getByLabelText('Name'), 'John');
  await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    name: 'John',
    email: 'john@example.com',
  });
});

it('validates form properly', async () => {
  render(<Form />);

  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  expect(screen.getByText(/email is required/i)).toBeInTheDocument();
});
```

**Rule of thumb:** If a bug could hit a user, it deserves a test. If it's just "implementation detail" (state shape, internal function calls), skip it.

---

### 2. Integration Tests Across a Small "Slice"

Instead of testing every component in isolation, pick critical flows and test them as a composed tree.

#### Form with Validation + Submit

```tsx
it('validates and submits form with multiple fields', async () => {
  const handleSubmit = vi.fn();
  render(<UserRegistrationForm onSubmit={handleSubmit} />);

  // Fill out form
  await userEvent.type(screen.getByLabelText('Username'), 'johndoe');
  await userEvent.type(screen.getByLabelText('Email'), 'invalid-email');
  await userEvent.type(screen.getByLabelText('Password'), '123');

  // Try to submit with invalid data
  await userEvent.click(screen.getByRole('button', { name: /register/i }));

  // Check validation errors
  expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
  expect(screen.getByText(/password too short/i)).toBeInTheDocument();
  expect(handleSubmit).not.toHaveBeenCalled();

  // Fix errors
  await userEvent.clear(screen.getByLabelText('Email'));
  await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'SecurePass123!');

  // Submit successfully
  await userEvent.click(screen.getByRole('button', { name: /register/i }));

  expect(handleSubmit).toHaveBeenCalledWith({
    username: 'johndoe',
    email: 'john@example.com',
    password: 'SecurePass123!',
  });
});
```

#### Modal Open/Close Flow + Focus Trap

```tsx
it('opens modal, traps focus, and restores focus on close', async () => {
  render(
    <div>
      <Button id="trigger">Open Modal</Button>
      <Modal />
    </div>,
  );

  const trigger = screen.getByRole('button', { name: /open modal/i });

  // Open modal
  await userEvent.click(trigger);

  const dialog = screen.getByRole('dialog');
  expect(dialog).toBeInTheDocument();

  // Focus should be trapped inside modal
  const closeButton = within(dialog).getByRole('button', { name: /close/i });
  expect(closeButton).toHaveFocus();

  // Tab should stay within modal
  await userEvent.tab();
  const okButton = within(dialog).getByRole('button', { name: /ok/i });
  expect(okButton).toHaveFocus();

  await userEvent.tab();
  expect(closeButton).toHaveFocus(); // Cycles back

  // Close modal
  await userEvent.keyboard('{Escape}');
  expect(dialog).not.toBeInTheDocument();

  // Focus restored to trigger
  expect(trigger).toHaveFocus();
});
```

#### List + Filters + Pagination

```tsx
it('filters and paginates list correctly', async () => {
  render(<UserList users={mockUsers} />);

  // Initial state
  expect(screen.getAllByRole('listitem')).toHaveLength(10); // First page

  // Apply filter
  await userEvent.type(screen.getByPlaceholderText('Search'), 'john');
  expect(screen.getAllByRole('listitem')).toHaveLength(3);

  // Clear filter
  await userEvent.clear(screen.getByPlaceholderText('Search'));
  expect(screen.getAllByRole('listitem')).toHaveLength(10);

  // Navigate pagination
  await userEvent.click(screen.getByRole('button', { name: /next page/i }));
  expect(screen.getByText(/page 2/i)).toBeInTheDocument();
  expect(screen.getAllByRole('listitem')).toHaveLength(10);
});
```

#### Auth-Gated UI + Route Transition

```tsx
it('redirects unauthenticated users to login', async () => {
  const { history } = renderWithRouter(<App />, { route: '/dashboard' });

  // Should redirect to login
  expect(history.location.pathname).toBe('/login');
  expect(screen.getByText(/please log in/i)).toBeInTheDocument();
});

it('allows authenticated users to access protected routes', async () => {
  const { history } = renderWithRouter(<App />, {
    route: '/dashboard',
    user: { id: 1, name: 'John' },
  });

  expect(history.location.pathname).toBe('/dashboard');
  expect(screen.getByText(/welcome, john/i)).toBeInTheDocument();
});
```

**These find the "real" bugs** - wiring, timing, state sync - with fewer brittle tests.

---

### 3. Visual Regressions (Optional but Powerful)

If your UI is design-sensitive, add visual snapshot testing.

#### Using Playwright Screenshots

```tsx
test('homepage visual regression', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});

test('button variants visual regression', async ({ page }) => {
  await page.goto('/components/button');
  await expect(page.locator('.button-showcase')).toHaveScreenshot('buttons.png');
});
```

#### Using Chromatic (Storybook-based)

```tsx
// .storybook/main.js - Chromatic auto-captures all stories
export default {
  stories: ['../src/**/*.stories.tsx'],
  addons: ['@chromatic-com/storybook'],
};
```

**Catches CSS/layout regressions that functional tests won't.**

---

### 4. E2E (Small Number, High Value)

Keep E2E tests to critical user journeys only.

#### Login Flow

```tsx
test('user can log in and see dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.fill('input[name="email"]', 'user@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard');
  await expect(page.locator('h1')).toContainText('Dashboard');
});
```

#### CRUD Operations

```tsx
test('user can create, edit, and delete item', async ({ page }) => {
  await page.goto('/items');

  // Create
  await page.click('button:has-text("New Item")');
  await page.fill('input[name="title"]', 'My Item');
  await page.click('button:has-text("Save")');
  await expect(page.locator('text=My Item')).toBeVisible();

  // Edit
  await page.click('button[aria-label="Edit My Item"]');
  await page.fill('input[name="title"]', 'Updated Item');
  await page.click('button:has-text("Save")');
  await expect(page.locator('text=Updated Item')).toBeVisible();

  // Delete
  await page.click('button[aria-label="Delete Updated Item"]');
  await page.click('button:has-text("Confirm")');
  await expect(page.locator('text=Updated Item')).not.toBeVisible();
});
```

#### Critical Purchase Flow

```tsx
test('user can complete checkout flow', async ({ page }) => {
  await page.goto('/products');

  // Add to cart
  await page.click('button:has-text("Add to Cart")');
  await expect(page.locator('.cart-count')).toContainText('1');

  // Checkout
  await page.click('a:has-text("Cart")');
  await page.click('button:has-text("Checkout")');

  // Fill payment
  await page.fill('input[name="cardNumber"]', '4242424242424242');
  await page.fill('input[name="expiry"]', '12/25');
  await page.fill('input[name="cvc"]', '123');

  // Complete
  await page.click('button:has-text("Pay")');
  await expect(page.locator('text=Order confirmed')).toBeVisible();
});
```

**Keep E2E small** - it's slower and requires more maintenance.

---

## Testing Pyramid for Frontend TDD

A practical split that works well:

```
      /\
     /  \  ~10% E2E (critical paths only)
    /____\
   /      \
  / ~20%   \  Unit tests (pure utils, reducers, validators)
 /__________\
/            \
/   ~70%     \  Component/Integration tests (fast, stable)
/______________\
```

**Distribution:**

- **~70%:** React component/integration tests (fast, stable)
- **~20%:** Unit tests (pure utils, reducers, validators)
- **~10%:** E2E (critical paths only)

---

## Best Libraries/Frameworks (React)

### ✅ The Modern Default

**Vitest + React Testing Library + @testing-library/user-event**

```bash
pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom
```

**Why:**

- Fast (especially in Vite projects)
- Encourages testing user behavior over internals
- Great TypeScript support

**Setup:**

```tsx
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
  },
});

// test/setup.ts
import '@testing-library/jest-dom';
```

**Usage:**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';

it('handles user interactions', async () => {
  render(<Button>Click me</Button>);
  await userEvent.click(screen.getByRole('button'));
  expect(screen.getByText('Clicked!')).toBeInTheDocument();
});
```

**Note:** If you're not on Vite, **Jest + RTL** is still totally fine.

---

### ✅ For Network Mocking

**MSW (Mock Service Worker)**

```bash
pnpm add -D msw
```

**Why:**

- Best practice for realistic API mocking
- Intercepts fetch/XHR at the network level
- Works for both component tests and E2E

**Setup:**

```tsx
// test/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ]);
  }),

  http.post('/api/users', async ({ request }) => {
    const newUser = await request.json();
    return HttpResponse.json({ id: 3, ...newUser }, { status: 201 });
  }),
];

// test/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// test/setup.ts
import { server } from './mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Usage:**

```tsx
it('fetches and displays users', async () => {
  render(<UserList />);

  expect(await screen.findByText('John')).toBeInTheDocument();
  expect(screen.getByText('Jane')).toBeInTheDocument();
});

it('handles API errors', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.error();
    }),
  );

  render(<UserList />);
  expect(await screen.findByText(/error loading users/i)).toBeInTheDocument();
});
```

---

### ✅ For E2E

**Playwright**

```bash
pnpm add -D @playwright/test
```

**Why:**

- Very strong for modern web apps
- Great tooling and debugging
- Stable selectors
- Good CI story
- Built-in visual regression testing

**Setup:**

```tsx
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
  },
});
```

---

### ✅ For Visual Regression

**Chromatic (Storybook-based)** or **Playwright screenshots** (DIY approach)

**Chromatic:**

```bash
pnpm add -D chromatic
```

**Playwright:**

```tsx
await expect(page).toHaveScreenshot('homepage.png');
```

---

### 🏆 Best Overall Stack Today

**Vitest + RTL + user-event + MSW + Playwright**

---

## TDD Workflow That Actually Works for UI

The trick is to **write tests at the interaction boundary**, not internal state.

### Red → Green → Refactor (Example)

#### 1. Red - Write the test first

```tsx
it('shows success message after form submission', async () => {
  render(<ContactForm />);

  await userEvent.type(screen.getByLabelText('Name'), 'John Doe');
  await userEvent.type(screen.getByLabelText('Email'), 'john@example.com');
  await userEvent.click(screen.getByRole('button', { name: /submit/i }));

  expect(await screen.findByText(/thank you/i)).toBeInTheDocument();
});
```

**Run test → It fails (red)**

#### 2. Green - Implement minimal logic

```tsx
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return <div>Thank you for your message!</div>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input type="text" />
      </label>
      <label>
        Email
        <input type="email" />
      </label>
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Run test → It passes (green)**

#### 3. Refactor - Improve internals

```tsx
// Extract form state management
const { register, handleSubmit, formState } = useForm();

// Extract success component
const SuccessMessage = () => <div>Thank you for your message!</div>;

// Refactor freely - tests stay stable!
```

### Write Tests That Answer:

✅ **"What does the user see?"**

```tsx
expect(screen.getByText('Welcome')).toBeInTheDocument();
```

✅ **"What does the user do?"**

```tsx
await userEvent.click(screen.getByRole('button', { name: /submit/i }));
```

✅ **"What changes on screen?"**

```tsx
expect(await screen.findByText('Success!')).toBeInTheDocument();
```

### Avoid:

❌ **Testing useState values directly**

```tsx
// BAD
expect(component.state.count).toBe(5);

// GOOD
expect(screen.getByText('Count: 5')).toBeInTheDocument();
```

❌ **Asserting classnames unless they matter**

```tsx
// BAD
expect(button).toHaveClass('btn-primary');

// GOOD (only test if visual state matters)
expect(button).toHaveAttribute('aria-pressed', 'true');
```

❌ **Snapshotting entire DOM trees (brittle)**

```tsx
// BAD
expect(container).toMatchSnapshot();

// GOOD (test specific behavior)
expect(screen.getByRole('navigation')).toBeInTheDocument();
```

---

## Best Practices to Keep Tests Stable and Thorough

### 1. Use Good Selectors (Priority Order)

```tsx
// ✅ BEST - getByRole with name
screen.getByRole('button', { name: /submit/i });
screen.getByRole('textbox', { name: /email/i });
screen.getByRole('heading', { name: /welcome/i });

// ✅ GOOD - getByLabelText
screen.getByLabelText('Email');
screen.getByLabelText(/password/i);

// ✅ OK - getByPlaceholderText
screen.getByPlaceholderText('Enter your email');

// ⚠️ LAST RESORT - getByTestId (only when needed)
screen.getByTestId('custom-widget');
```

**Why this order?**

- `getByRole` tests accessibility AND functionality
- Closer to how users and screen readers interact
- Most resilient to refactoring

---

### 2. Test Async Correctly

```tsx
// ✅ GOOD - Use findBy for async updates
expect(await screen.findByText('Loaded!')).toBeInTheDocument();

// ✅ GOOD - waitFor for complex conditions
await waitFor(() => {
  expect(screen.getByText('Data')).toBeInTheDocument();
  expect(screen.queryByText('Loading')).not.toBeInTheDocument();
});

// ❌ BAD - setTimeout in tests
setTimeout(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
}, 1000);

// ❌ BAD - Manual promise mocking
jest.spyOn(global, 'fetch').mockResolvedValue(...); // Use MSW instead
```

---

### 3. Don't Over-Mock React

**Mock network and time, not React internals**

```tsx
// ✅ GOOD - Mock external APIs
server.use(http.get('/api/data', () => HttpResponse.json({ ... })));

// ✅ GOOD - Mock timers if needed
vi.useFakeTimers();

// ⚠️ CAREFUL - Only mock heavy child components if necessary
vi.mock('./HeavyChart', () => ({
  HeavyChart: () => <div>Chart Placeholder</div>,
}));

// ❌ BAD - Don't mock component internals
vi.mock('./useMyHook'); // This breaks the test's purpose
```

**If a child is tested elsewhere and it's noisy, you can stub it, but do it intentionally.**

---

### 4. Add A11y Checks Cheaply

```bash
pnpm add -D vitest-axe
```

```tsx
import { axe } from 'vitest-axe';

it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  expect(await axe(container)).toHaveNoViolations();
});
```

**Catches obvious accessibility regressions automatically.**

---

## Quick Test Checklist for a UI Component

For a typical component, you'll usually want:

- [ ] **Renders with required props**

  ```tsx
  it('renders with required props', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  ```

- [ ] **Disabled/loading states**

  ```tsx
  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  ```

- [ ] **Click/typing interaction works**

  ```tsx
  it('handles clicks', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
  ```

- [ ] **Keyboard interaction works (Enter/Escape/Tab where relevant)**

  ```tsx
  it('closes on Escape', async () => {
    render(<Dialog open>Content</Dialog>);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  ```

- [ ] **Error message shows when invalid**

  ```tsx
  it('shows validation error', async () => {
    render(<Input required />);
    await userEvent.click(screen.getByRole('textbox'));
    await userEvent.tab();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
  ```

- [ ] **Callback fires with correct payload**

  ```tsx
  it('calls onChange with value', async () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    await userEvent.type(screen.getByRole('textbox'), 'test');
    expect(handleChange).toHaveBeenCalledWith('test');
  });
  ```

- [ ] **A11y basics (role/name, focus behavior)**

  ```tsx
  it('has accessible label', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('manages focus correctly', async () => {
    render(<Dialog open>Content</Dialog>);
    expect(screen.getByRole('dialog')).toHaveFocus();
  });
  ```

---

## Summary

**Modern React testing is about:**

1. **Test user behavior, not implementation**
2. **70% component/integration, 20% unit, 10% E2E**
3. **Use the right tools:** Vitest + RTL + MSW + Playwright
4. **Keep tests stable** with good selectors (getByRole first)
5. **Add integration tests** for critical flows
6. **Supplement with visual regression** if design-sensitive
7. **Keep E2E minimal** and focused on critical paths

**The goal:** Tests that give you confidence to refactor freely while catching real bugs users would experience.

---

## See Also

- `./edge-cases.md` - Comprehensive edge case testing
- `./examples.md` - More test examples
- `./index.md` - Testing overview
- `../principles/index.md` - Core principles
