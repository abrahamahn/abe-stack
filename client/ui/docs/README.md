# @abe-stack/ui — A Design System That Gets Out of Your Way

**A complete React component library with Tailwind-like utilities, design tokens, and zero runtime CSS-in-JS.**

I wanted a UI system that felt like Tailwind — fast composition with utility classes — but with the consistency of a proper design system. No runtime style calculations, no CSS-in-JS overhead, just CSS custom properties that work everywhere.

So I built this: a library where TypeScript defines the design contract, CSS does the styling, and React components are thin wrappers that compose predictably.

---

## The Philosophy

Most component libraries force you into one of two camps:

1. **CSS-in-JS** — Runtime overhead, bundle bloat, and style conflicts in SSR
2. **Utility-first** — Great for speed, but tokens scatter across your codebase with no single source of truth

This library takes a third path:

- **TypeScript as the source of truth** — All design tokens (colors, spacing, typography) live in `.ts` files
- **CSS custom properties as the runtime** — Generated once at build time, consumed everywhere
- **Tailwind-like utilities for composition** — Familiar class names, but backed by your design tokens
- **Semantic component classes** — Components use meaningful names like `.btn-primary`, not `bg-blue-500`

---

## How Styling Works

### The Theme Contract

Everything starts in `shared/ui/src/theme/`. These TypeScript files define your entire design system:

```
theme/
├── colors.ts      # Light/dark color palettes
├── spacing.ts     # Gap scale (xs → 3xl)
├── typography.ts  # Font families, sizes, weights
├── radius.ts      # Border radius tokens
├── motion.ts      # Durations and easing curves
└── buildThemeCss.ts  # Transforms tokens → CSS
```

Each file exports typed constants:

```typescript
// spacing.ts
export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '0.75rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  '3xl': '3rem',
} as const;
```

### buildThemeCss: The Bridge

`buildThemeCss.ts` is the magic glue. It reads your TypeScript tokens and generates CSS custom properties:

```typescript
// What buildThemeCss does:
// TypeScript tokens → CSS custom properties

// Input (spacing.ts):
spacing.lg = '1rem'

// Output (theme.css):
:root {
  --ui-gap-lg: 1rem;
}
```

When you run `pnpm dev`, the `sync-css-theme` watcher automatically regenerates `theme.css` whenever you change any token file. Change a color in TypeScript, and every component using that token updates instantly.

**Why this matters:**

- Single source of truth in TypeScript (with full type safety)
- Zero runtime cost (it's just CSS)
- Works with SSR, RSC, any framework
- Dark mode via `prefers-color-scheme` media query — no JS required

### The Generated CSS

The build produces `shared/ui/src/styles/theme.css`:

```css
:root {
  /* Spacing */
  --ui-gap-xs: 0.25rem;
  --ui-gap-sm: 0.5rem;
  --ui-gap-lg: 1rem;

  /* Colors */
  --ui-color-primary: #2563eb;
  --ui-color-bg: #ffffff;
  --ui-color-text: #0f172a;

  /* Typography */
  --ui-font-size-sm: 0.875rem;
  --ui-font-weight-medium: 500;

  /* Motion */
  --ui-motion-duration-base: 150ms;
  --ui-motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}

@media (prefers-color-scheme: dark) {
  :root {
    --ui-color-primary: #3b82f6;
    --ui-color-bg: #0b1220;
    --ui-color-text: #f8fafc;
  }
}
```

---

## Tailwind-Like Utilities

`utilities.css` provides Tailwind-inspired classes that consume your design tokens:

```tsx
// Compose layouts with familiar syntax
<div className="flex-col gap-4 p-4">
  <header className="flex-between border-b">
    <h1 className="text-lg font-bold">Title</h1>
  </header>
  <main className="flex-1 overflow-auto">{children}</main>
</div>
```

**Key difference from Tailwind:** These utilities use your CSS custom properties, not hardcoded values:

```css
/* utilities.css */
.gap-4 {
  gap: var(--ui-gap-lg); /* Uses your token, not "1rem" */
}

.text-lg {
  font-size: var(--ui-font-size-lg); /* Uses your token */
}
```

Change the token once, and every `.gap-4` in your app updates.

### Available Utility Categories

| Category       | Examples                                                  | Description              |
| -------------- | --------------------------------------------------------- | ------------------------ |
| **Display**    | `flex`, `grid`, `hidden`                                  | Display modes            |
| **Flexbox**    | `flex-col`, `flex-center`, `flex-between`, `items-center` | Flex layouts             |
| **Gap**        | `gap-1` → `gap-8`                                         | Spacing between children |
| **Padding**    | `p-1` → `p-12`, `px-*`, `py-*`                            | Internal spacing         |
| **Margin**     | `m-auto`, `mt-4`, `mb-6`                                  | External spacing         |
| **Typography** | `text-sm`, `text-lg`, `font-bold`                         | Text styles              |
| **Colors**     | `text-muted`, `text-danger`, `bg-surface`                 | Semantic colors          |
| **Border**     | `border`, `border-b`, `rounded-lg`                        | Borders and radius       |
| **Layout**     | `panel`, `bar`, `sidebar`                                 | Pre-composed patterns    |

---

## Component Architecture

Components are organized by complexity and purpose:

### Elements — The Primitives

Low-level building blocks with minimal logic. These are your atoms.

```tsx
import { Button, Input, Text, Badge } from '@abe-stack/ui';

<Button variant="primary" size="medium">Submit</Button>
<Input placeholder="Enter email..." />
<Text tone="muted">Helper text</Text>
<Badge variant="success">Active</Badge>
```

**25 Elements:**
`Alert`, `Avatar`, `Badge`, `Box`, `Button`, `Checkbox`, `CloseButton`, `Divider`, `EnvironmentBadge`, `Heading`, `Input`, `Kbd`, `MenuItem`, `PasswordInput`, `Progress`, `Skeleton`, `Spinner`, `Switch`, `Table`, `Text`, `TextArea`, `Toaster`, `Tooltip`, `VersionBadge`, `VisuallyHidden`

Elements use semantic CSS classes from `elements.css`:

```tsx
// Button.tsx
<button className={`btn btn-${variant} btn-${size}`}>{children}</button>
```

### Components — Stateful Multi-Part

Complex components with internal state, compound patterns, or multi-part APIs.

```tsx
import { Tabs, Dialog, Select, Accordion } from '@abe-stack/ui';

<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Trigger value="tab1">First</Tabs.Trigger>
    <Tabs.Trigger value="tab2">Second</Tabs.Trigger>
  </Tabs.List>
  <Tabs.Content value="tab1">Content 1</Tabs.Content>
  <Tabs.Content value="tab2">Content 2</Tabs.Content>
</Tabs>;
```

**16 Components:**
`Accordion`, `Card`, `Dialog`, `Dropdown`, `FocusTrap`, `FormField`, `Image`, `LoadingContainer`, `Pagination`, `Popover`, `Radio`, `RadioGroup`, `Select`, `Slider`, `Tabs`, `Toast`

### Layouts — Page Structure

Layouts handle the structural composition of your app. Three categories:

#### Shells — App-Level Structure

Full-page layouts with sidebars, topbars, and resizable panels.

```tsx
import { AppShell, TopbarLayout, LeftSidebarLayout } from '@abe-stack/ui';

<AppShell>
  <TopbarLayout height={48}>
    <NavBar />
  </TopbarLayout>
  <LeftSidebarLayout width={240} minWidth={180}>
    <Sidebar />
  </LeftSidebarLayout>
  <main>{children}</main>
</AppShell>;
```

`AppShell`, `TopbarLayout`, `BottombarLayout`, `LeftSidebarLayout`, `RightSidebarLayout`, `ResizablePanel`

#### Containers — Content Wrappers

Spacing, width constraints, and content organization.

```tsx
import { PageContainer, Container, AuthLayout } from '@abe-stack/ui';

<PageContainer>
  <Container maxWidth="md">{content}</Container>
</PageContainer>;
```

`AuthLayout`, `Container`, `PageContainer`, `StackedLayout`

#### Layers — Overlays and Positioning

Modals, overlays, and route protection.

```tsx
import { Modal, Overlay, ProtectedRoute } from '@abe-stack/ui';

<ProtectedRoute>
  <Modal isOpen={open} onClose={close}>
    <Modal.Header>Title</Modal.Header>
    <Modal.Body>{content}</Modal.Body>
  </Modal>
</ProtectedRoute>;
```

`Modal`, `Overlay`, `ProtectedRoute`, `ScrollArea`

---

## Hooks

React hooks for common UI patterns. No external dependencies.

| Hook                   | Purpose                                            |
| ---------------------- | -------------------------------------------------- |
| `useDisclosure`        | Open/close state for modals, dropdowns, accordions |
| `useClickOutside`      | Detect clicks outside a ref element                |
| `useKeyboardShortcuts` | Register global keyboard shortcuts                 |
| `useLocalStorage`      | Persist state to localStorage with SSR safety      |
| `useMediaQuery`        | Reactive media query matching                      |
| `useDebounce`          | Debounce rapidly changing values                   |
| `useCopyToClipboard`   | Copy text with success feedback                    |
| `useControllableState` | Support both controlled and uncontrolled patterns  |
| `useWindowSize`        | Track window dimensions                            |
| `useOnScreen`          | Intersection observer for lazy loading             |
| `useThemeMode`         | Light/dark/system theme switching                  |
| `usePanelConfig`       | Resizable panel state management                   |
| `usePaginatedQuery`    | Infinite scroll with cursor pagination             |
| `useHistoryNav`        | Browser history navigation helpers                 |

```tsx
import { useDisclosure, useKeyboardShortcuts } from '@abe-stack/ui';

function MyComponent() {
  const { isOpen, open, close, toggle } = useDisclosure();

  useKeyboardShortcuts({
    'mod+k': () => open(),
    escape: () => close(),
  });

  return (
    <Dialog isOpen={isOpen} onClose={close}>
      ...
    </Dialog>
  );
}
```

---

## CSS File Structure

```
shared/ui/src/styles/
├── theme.css       # Generated design tokens (don't edit directly)
├── elements.css    # Element/primitive styles (.btn, .input, .badge)
├── components.css  # Component styles (.card, .dialog, .tabs)
├── layouts.css     # Layout styles (.app-shell, .modal)
└── utilities.css   # Tailwind-like utilities (.flex-col, .gap-4)
```

**Import hierarchy:**

```
theme.css (base tokens)
    ↓
elements.css → components.css → layouts.css
    ↓
utilities.css (composition layer)
```

---

## Quick Start

```bash
pnpm add @abe-stack/ui @abe-stack/core
```

```tsx
import { Button, Card, Input, ThemeProvider } from '@abe-stack/ui';
import '@abe-stack/ui/styles'; // Import all styles

function App() {
  return (
    <ThemeProvider>
      <Card className="p-4 flex-col gap-3">
        <Input placeholder="Enter something..." />
        <Button variant="primary">Submit</Button>
      </Card>
    </ThemeProvider>
  );
}
```

---

## Modifying the Design System

### Change a token

1. Edit the TypeScript source:

   ```typescript
   // theme/spacing.ts
   export const spacing = {
     lg: '1.25rem', // Was 1rem
   };
   ```

2. The `sync-css-theme` watcher regenerates `theme.css` automatically

3. Every component using `--ui-gap-lg` or `.gap-4` updates

### Add a new token

1. Add to the appropriate theme file
2. Update `buildThemeCss.ts` to include it in the generated CSS
3. Optionally add utility classes in `utilities.css`

### Create a new component

1. Create the component in the appropriate folder (`elements/`, `components/`, `layouts/`)
2. Import the relevant CSS file (`../styles/elements.css`)
3. Use semantic class names that reference your design tokens
4. Export from the package index

---

## Why Not Just Use Tailwind?

You could. Tailwind is great. But this approach gives you:

- **Type-safe tokens** — TypeScript catches typos and provides autocomplete
- **Single source of truth** — Change once, update everywhere
- **Zero runtime** — No JIT compilation, no purging config, just CSS
- **Semantic components** — `.btn-primary` is more readable than `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md`
- **Framework agnostic** — The CSS works anywhere, not just with Tailwind's toolchain

The best part? You get the composition speed of utilities with the maintainability of a design system.

---

## License

MIT — See [LICENSE](../../../LICENSE) for details.
