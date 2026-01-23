# @abe-stack/ui

> Write once, use everywhere.

Shared React components for web and desktop. 80-90% code reuse across platforms. Plain CSS with CSS variables - zero runtime overhead, browser-native dark mode.

## Features

- 26 elements (Button, Input, Badge, Table...) 🧱
- 16 components (Dialog, Tabs, Select, FormField...) 🔲
- 15 layouts (AppShell, Modal, Sidebar, ResizablePanel...) 📐
- 23+ hooks (useDisclosure, useClickOutside, useVirtualScroll...) 🪝
- Custom router (~150 lines, replaces react-router) 🛣️
- Optimized providers (memoized contexts) ⚡
- CSS variables theming 🎨
- Dark mode (prefers-color-scheme) 🌙
- ~1400 tests passing ✅

## Installation

```bash
pnpm add @abe-stack/ui
```

## Usage

```typescript
import { Button, Card, Dialog, AppShell, useDisclosure, Router, Routes, Route } from '@abe-stack/ui';

function MyComponent() {
  const { isOpen, open, close } = useDisclosure();

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <>
            <Button onClick={open}>Open Dialog</Button>
            <Dialog open={isOpen} onClose={close}>
              <Dialog.Header>Title</Dialog.Header>
              <Dialog.Body>Content</Dialog.Body>
            </Dialog>
          </>
        } />
      </Routes>
    </Router>
  );
}
```

## Architecture

```
┌──────────────┐  ┌──────────────┐
│  apps/web    │  │apps/desktop  │
│  (10-20%)    │  │  (10-20%)    │
└──────┬───────┘  └──────┬───────┘
       └────────┬────────┘
                ▼
      ┌──────────────────┐
      │  packages/ui     │
      │  (80-90%)        │
      │                  │
      │  Button, Card,   │
      │  Dialog, Tabs... │
      └──────────────────┘
```

Platform-specific code stays in apps. Everything else lives here.

## Elements

Atomic building blocks (26 total).

```typescript
import {
  Alert, Avatar, Badge, Box, Button, Checkbox, CloseButton,
  Divider, EnvironmentBadge, Heading, Input, Kbd, MenuItem,
  PasswordInput, Progress, Skeleton, Spinner, Switch,
  Table, Text, TextArea, Toaster, Tooltip,
  VersionBadge, VisuallyHidden
} from '@abe-stack/ui';

// Table has composable parts
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Data</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

## Components

Composed multi-part components (16 total).

```typescript
import {
  Accordion, Card, Dialog, Dropdown, FocusTrap, FormField,
  Image, LoadingContainer, Pagination, Popover,
  Radio, RadioGroup, Select, Slider, Tabs, Toast
} from '@abe-stack/ui';

// Composable parts
<Card>
  <Card.Header>Title</Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// Form fields with labels and errors
<FormField label="Email" error={errors.email}>
  <Input type="email" {...register('email')} />
</FormField>
```

## Layouts

Page structure and overlays (15 total).

```typescript
// Containers (4)
import { AuthLayout, Container, PageContainer, StackedLayout } from '@abe-stack/ui';

// Layers (4)
import { Modal, Overlay, ProtectedRoute, ScrollArea } from '@abe-stack/ui';

// Shells (7)
import {
  AppShell, BottombarLayout, LeftSidebarLayout,
  ResizablePanel, ResizablePanelGroup, ResizableSeparator,
  RightSidebarLayout, TopbarLayout
} from '@abe-stack/ui';

// AppShell for complex layouts
<AppShell>
  <AppShell.Topbar>...</AppShell.Topbar>
  <AppShell.Sidebar>...</AppShell.Sidebar>
  <AppShell.Main>...</AppShell.Main>
</AppShell>

// Or use specialized layouts
<LeftSidebarLayout sidebar={<Nav />}>
  <PageContainer>Content</PageContainer>
</LeftSidebarLayout>

// Resizable panels
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={30}>Sidebar</ResizablePanel>
  <ResizableSeparator />
  <ResizablePanel defaultSize={70}>Main</ResizablePanel>
</ResizablePanelGroup>
```

## Hooks

Reusable behavior patterns (23+ hooks).

```typescript
import {
  // State management
  useDisclosure, // open/close state
  useControllableState, // controlled/uncontrolled state
  useFormState, // form field state
  useLocalStorage, // persistent state

  // UI interactions
  useClickOutside, // detect clicks outside element
  useDebounce, // debounced values
  useCopyToClipboard, // copy text to clipboard
  useResendCooldown, // resend button cooldown

  // Navigation
  useHistoryNav, // browser history navigation
  useAuthModeNavigation, // auth mode switching

  // Keyboard
  useKeyboardShortcut, // single shortcut
  useKeyboardShortcuts, // multiple shortcuts
  useUndoRedoShortcuts, // undo/redo with platform detection

  // Responsive
  useMediaQuery, // responsive breakpoints
  useWindowSize, // window dimensions
  useOnScreen, // intersection observer

  // Theming
  useThemeMode, // light/dark mode
  useDensity, // spacing density
  useContrast, // contrast mode
  usePanelConfig, // panel configuration

  // Performance
  useVirtualScroll, // virtual scrolling for large lists
  usePaginatedQuery, // cursor/offset pagination
  useOptimizedMemo, // deep/shallow memoization utilities
  useExpensiveComputation, // memoized expensive calculations
  useTTLCache, // time-based cache
  useLRUCache, // LRU cache
} from '@abe-stack/ui';
```

## Router

Custom router implementation (~150 lines) that replaces react-router-dom.

```typescript
import {
  Router, Routes, Route, Link, Navigate,
  useNavigate, useLocation, useParams, useSearchParams,
  useNavigationType, useHistory
} from '@abe-stack/ui';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/users/:id" element={<UserPage />} />
        <Route path="/old" element={<Navigate to="/new" />} />
      </Routes>
    </Router>
  );
}

function Nav() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigationType = useNavigationType(); // 'PUSH' | 'POP' | 'REPLACE'

  return (
    <>
      <Link to="/home">Home</Link>
      <button onClick={() => navigate('/dashboard')}>Dashboard</button>
    </>
  );
}
```

**Features:**

- Path params (`:id`), query strings, wildcards (`*`)
- Nested routes with `<Outlet>`
- `MemoryRouter` for testing
- `NavigationType` tracking (PUSH/POP/REPLACE)
- History abstraction (`push`, `replace`, `go`, `back`, `forward`)
- Scroll restoration (save on navigate, restore on back/forward)

**Benchmark (100 navigations with render cycles):**

| Router           | Time    | Per Navigation |
| ---------------- | ------- | -------------- |
| Custom           | ~920ms  | ~9.2ms         |
| react-router-dom | ~1000ms | ~10.0ms        |

**~10% faster** with a fraction of the code. Direct `useSyncExternalStore` integration with no extra abstraction layers.

## Providers

Optimized context providers for performance-critical apps.

```typescript
import {
  createMemoizedContext,      // memoized context
  createSelectiveContext,      // selective re-renders
  createReducerContext,        // reducer pattern
  createLazyContext,           // lazy initialization
  createSubscriptionContext,   // subscription-based
  Memoized,                    // memoized wrapper component
  SelectiveMemo,               // selective memo wrapper
  useRenderPerformance,        // performance monitoring
} from '@abe-stack/ui';

// Create optimized context
const { Provider, useContext } = createMemoizedContext<UserState>();

// Wrap expensive components
<Memoized deps={[user.id]}>
  <ExpensiveComponent user={user} />
</Memoized>
```

## Utils

Utility functions for common patterns.

````typescript
import {
  cn,                  // className merge utility
  createFormHandler,   // form submission handler
  parseMarkdown,       // markdown to React
  Markdown,            // markdown component
  SyntaxHighlighter,   // code syntax highlighting
  highlightCode,       // highlight code string
} from '@abe-stack/ui';

// Merge classNames conditionally
const className = cn('base-class', {
  'active': isActive,
  'disabled': isDisabled
});

// Parse markdown with syntax highlighting
<Markdown content="# Hello\n```ts\nconst x = 1;\n```" />
````

## Theming

CSS variables for zero-runtime theming.

```css
/* theme.css */
:root {
  --ui-color-primary: #2563eb;
  --ui-color-bg: #ffffff;
  --ui-radius-md: 0.625rem;
}

@media (prefers-color-scheme: dark) {
  :root {
    --ui-color-primary: #3b82f6;
    --ui-color-bg: #0b1220;
  }
}
```

TypeScript access:

```typescript
import {
  // Design tokens
  colors, darkColors, lightColors, spacing, radius, typography, motion,

  // Theme utilities
  ThemeProvider, useTheme,
  getContrastCssVariables, getDensityCssVariables,

  // Density & contrast
  useDensity, useContrast, DEFAULT_DENSITY, DEFAULT_CONTRAST_MODE,
} from '@abe-stack/ui';

// Wrap app with theme provider
<ThemeProvider defaultMode="dark" defaultDensity="comfortable">
  <App />
</ThemeProvider>
```

## Project Structure

```
packages/ui/src/
├── elements/        # 26 atomic components (Button, Input, Badge...)
├── components/      # 16 composed components (Dialog, Tabs, Select...)
├── layouts/
│   ├── containers/  # 4 containers (Container, PageContainer, AuthLayout, StackedLayout)
│   ├── layers/      # 4 layers (Modal, Overlay, ProtectedRoute, ScrollArea)
│   └── shells/      # 7 shells (AppShell, ResizablePanel, *SidebarLayout...)
├── hooks/           # 23+ hooks (useDisclosure, useVirtualScroll, usePaginatedQuery...)
├── router/          # Custom router (~150 lines)
├── providers/       # Optimized context providers
├── theme/           # Design tokens (colors, spacing, radius, typography, motion, density, contrast)
├── utils/           # Utilities (cn, markdown, syntax highlighting, form handlers)
└── styles/          # CSS files
    ├── theme.css
    ├── elements.css
    ├── components.css
    ├── layouts.css
    └── utilities.css
```

## Commands

```sh
pnpm --filter @abe-stack/ui build      # build
pnpm --filter @abe-stack/ui test       # run tests
pnpm --filter @abe-stack/ui type-check # check types
```

## Creating Components

```typescript
// 1. Create component
// packages/ui/src/elements/Tag.tsx
const Tag = forwardRef<HTMLSpanElement, TagProps>((props, ref) => {
  const { variant = 'default', className = '', ...rest } = props;
  return <span ref={ref} className={`tag tag-${variant} ${className}`} {...rest} />;
});

// 2. Add styles to elements.css
// 3. Export from elements/index.ts
// 4. Write tests
// 5. Use anywhere
import { Tag } from '@abe-stack/ui';
```

## Trade-offs

**CSS variables over CSS-in-JS:** Zero runtime, browser-native theming. No dynamic prop-based styles.

**Explicit exports:** More maintenance, but reliable tree-shaking.

**Composition over configuration:** Simple components, compose the pieces yourself.

**Platform-agnostic:** No platform-specific optimizations in shared code.

---

[Read the detailed docs](../../docs) for architecture decisions, development workflows, and contribution guidelines.
