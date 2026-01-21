# @abe-stack/ui

This is where we keep all our shared React components. The ones that look the same whether you are browsing on the web or running the desktop app. We call it "write once, use everywhere" and in practice we get around 80-90% code reuse across platforms.

## Table of Contents

- [Why a Shared UI Package](#why-a-shared-ui-package)
- [The Anatomy of Our Component Library](#the-anatomy-of-our-component-library)
- [How We Handle Styling](#how-we-handle-styling)
- [Creating Components: A Walkthrough](#creating-components-a-walkthrough)
- [The Decision Process](#the-decision-process)
- [Trade-offs We Accepted](#trade-offs-we-accepted)
- [Working with the Package](#working-with-the-package)

---

## Why a Shared UI Package

When we started building abe-stack, we faced the classic multi-platform question: how much code can we realistically share between web and desktop? We tried a few approaches before landing on this one.

The first instinct was to keep everything separate. Web components in `apps/web`, desktop components in `apps/desktop`. Clean boundaries. But after the third time we fixed the same button hover state in two places, we knew something had to change.

The second approach was to share everything. One codebase, conditional rendering for platform differences. That worked until we needed to access the file system on desktop while the web version needed browser APIs. The conditionals got ugly fast.

So we settled on this middle ground: a shared UI package that contains everything that looks and behaves the same across platforms, while the apps themselves hold onto their platform-specific bits. The `packages/ui` directory is that shared middle ground.

Here is what this looks like in practice:

```
┌──────────────┐  ┌──────────────┐
│  apps/web    │  │apps/desktop  │
│              │  │              │
│  Web-only    │  │Desktop-only  │
│  features    │  │features      │
│  (10-20%)    │  │(10-20%)      │
└──────┬───────┘  └──────┬───────┘
       │                 │
       └────────┬────────┘
                │
                ▼
      ┌──────────────────────┐
      │  packages/ui         │
      │                      │
      │  SHARED UI (80-90%)  │
      │                      │
      │  Button, Card, Modal │
      │  Tabs, Dialog, Forms │
      │  Layouts, Hooks      │
      └──────────────────────┘
```

The web app adds its service workers, analytics, and SEO handling. The desktop app adds file system access, system tray integration, and native menus. Everything else comes from this package.

---

## The Anatomy of Our Component Library

We organize components by what they do, not by how they look. After trying several taxonomies, we found this one makes the most sense when you are actually building features:

```
packages/ui/src/
├── elements/        # Atomic building blocks
├── components/      # Composed multi-part components
├── layouts/         # Page structure and overlays
│   ├── containers/  # Content wrappers
│   ├── layers/      # Modals, overlays, scroll areas
│   └── shells/      # App-level structure
├── hooks/           # React hooks for common patterns
├── theme/           # Design tokens and theming
├── styles/          # CSS architecture
└── utils/           # Helper functions
```

**Elements** are the atoms. Button, Input, Badge, Spinner. They do one thing, they do it well, they compose into larger pieces. We have about 25 of these.

**Components** are the molecules. Accordion, Dialog, Tabs, Select. They combine multiple elements and manage their own state. About 16 of these currently.

**Layouts** handle page structure. This is where AppShell lives (the main app container with topbar, sidebar, and content area), along with Modal, Overlay, and our resizable panel system.

**Hooks** provide reusable behavior. `useDisclosure` for open/close state, `useClickOutside` for closing dropdowns, `usePaginatedQuery` for list pagination. Around 20 hooks at last count.

When you import from this package, you get clean access to everything:

```typescript
import { Button, Card, Dialog, AppShell, useDisclosure } from '@abe-stack/ui';
```

---

## How We Handle Styling

We went back and forth on CSS strategy more than we care to admit. CSS-in-JS? Tailwind? CSS Modules? Each has advocates who swear by it.

We landed on plain CSS with CSS custom properties (variables). Here is why:

1. **No runtime cost.** CSS-in-JS libraries add JavaScript overhead. When you have 60+ components, that adds up.

2. **Browser-native dark mode.** Using `prefers-color-scheme` media queries means the browser handles theme switching before React even hydrates.

3. **Predictable specificity.** With BEM-like class naming, we always know which styles win without fighting the cascade.

4. **Easy to inspect.** Open DevTools, see the actual styles. No generated class names to decode.

The CSS lives in four files under `src/styles/`:

```
styles/
├── theme.css       # Design tokens as CSS variables
├── elements.css    # Styles for atomic elements
├── components.css  # Styles for composed components
├── layouts.css     # Styles for layout components
└── utilities.css   # Helper classes
```

The `theme.css` file defines everything as CSS custom properties:

```css
:root {
  --ui-color-primary: #2563eb;
  --ui-color-bg: #ffffff;
  --ui-radius-md: 0.625rem;
  --ui-gap-md: 0.75rem;
  /* ... and so on */
}

@media (prefers-color-scheme: dark) {
  :root {
    --ui-color-primary: #3b82f6;
    --ui-color-bg: #0b1220;
    /* Dark theme overrides */
  }
}
```

Components reference these variables instead of hardcoding values:

```css
.btn-primary {
  background: var(--ui-color-primary);
  border-radius: var(--ui-radius-md);
  padding: var(--ui-gap-sm) var(--ui-gap-md);
}
```

For TypeScript access to theme values (when you need them in JavaScript), we export the same tokens from `src/theme/`:

```typescript
import { colors, spacing, radius } from '@abe-stack/ui';
```

This dual approach means CSS gets the variables it needs and JavaScript gets typed constants when doing calculations or passing styles as props.

---

## Creating Components: A Walkthrough

Let us walk through adding a new component from scratch. Say we need a `Tag` element for displaying labels.

**Step 1: Create the component file**

```typescript
// packages/ui/src/elements/Tag.tsx
import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import '../styles/elements.css';

type TagProps = ComponentPropsWithoutRef<'span'> & {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'small' | 'medium';
};

const Tag = forwardRef<HTMLSpanElement, TagProps>((props, ref) => {
  const { variant = 'default', size = 'medium', className = '', ...rest } = props;

  return (
    <span
      ref={ref}
      className={`tag tag-${variant} tag-${size} ${className}`}
      {...rest}
    />
  );
});

Tag.displayName = 'Tag';

export { Tag };
export type { TagProps };
```

Notice a few patterns here:

- We use `forwardRef` so parent components can access the DOM node
- Props extend the native element's props (`ComponentPropsWithoutRef<'span'>`)
- Variants map to CSS class names, keeping styling logic in CSS
- We spread remaining props, allowing `data-*` attributes, `aria-*` labels, etc.

**Step 2: Add the styles**

```css
/* In src/styles/elements.css */
.tag {
  display: inline-flex;
  align-items: center;
  border-radius: var(--ui-radius-full);
  font-size: var(--ui-font-size-xs);
  font-weight: var(--ui-font-weight-medium);
}

.tag-small {
  padding: 0.125rem 0.5rem;
}
.tag-medium {
  padding: 0.25rem 0.75rem;
}

.tag-default {
  background: var(--ui-badge-neutral-bg);
  border: 1px solid var(--ui-badge-neutral-border);
}

.tag-primary {
  background: var(--ui-badge-primary-bg);
  border: 1px solid var(--ui-badge-primary-border);
}

/* ...and so on for other variants */
```

**Step 3: Export from the barrel file**

```typescript
// packages/ui/src/elements/index.ts
export { Tag } from './Tag';
export type { TagProps } from './Tag';
```

**Step 4: Write a test**

```typescript
// packages/ui/src/elements/__tests__/Tag.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tag } from '../Tag';

describe('Tag', () => {
  it('renders with default variant', () => {
    render(<Tag>Label</Tag>);
    expect(screen.getByText('Label')).toHaveClass('tag-default');
  });

  it('applies custom className', () => {
    render(<Tag className="custom">Label</Tag>);
    expect(screen.getByText('Label')).toHaveClass('custom');
  });
});
```

**Step 5: Use it anywhere**

```typescript
// In any app
import { Tag } from '@abe-stack/ui';

function StatusList() {
  return (
    <div>
      <Tag variant="success">Active</Tag>
      <Tag variant="warning">Pending</Tag>
    </div>
  );
}
```

That is the whole process. The component is now available in both web and desktop apps with no additional configuration.

---

## The Decision Process

When building a new feature, we ask three questions to figure out where code belongs:

**1. Will this render the same way on web and desktop?**

If yes, it goes in `packages/ui`. A Button is a Button everywhere. A Dialog opens the same way regardless of platform.

**2. Does it need platform-specific APIs?**

File system access, system tray, native notifications? Those go in the platform app. The shared package stays framework-agnostic.

**3. Is it UI or business logic?**

Pure presentation goes in `packages/ui`. Validation rules, data transformations, and business rules go in `packages/core`. The UI package imports from core, never the other way around.

Here is the flow:

```
New feature needed?
        │
        ▼
  Same on web + desktop?
        │
   YES ─┼─ NO
   │        │
   ▼        ▼
packages/ui   apps/{platform}/
        │
        ▼
  Uses platform APIs?
        │
   NO ──┼─ YES
   │        │
   ▼        ▼
packages/ui   apps/{platform}/
```

Sometimes the answer is "split it." A music player component might live in `packages/ui` while the desktop app wraps it with native media key support. The shared component handles rendering; the app handles platform integration.

---

## Trade-offs We Accepted

This architecture is not perfect. We made deliberate choices and accepted their costs.

**We chose CSS variables over CSS-in-JS.**

The benefit: zero runtime overhead, browser-native theming, easy debugging. The cost: no dynamic styling based on props without inline styles or additional class generation. We are okay with this because most of our styling is predetermined by our design system.

**We chose explicit exports over barrel re-exports.**

Every export is named explicitly in `index.ts`. No `export * from './Button'`. This means more maintenance when adding components, but it also means we always know exactly what we are shipping. Tree-shaking works reliably.

**We chose composition over configuration.**

Our components are relatively simple. A Dialog does not have 50 props for every possible configuration. Instead, we export the pieces (DialogHeader, DialogBody, DialogFooter) and let you compose them. More flexible, but requires more knowledge of the available pieces.

**We chose platform-agnostic over platform-optimized.**

Components work identically on web and desktop. We do not have special desktop-only styling or web-only features in this package. That means we cannot take full advantage of platform-specific capabilities here, but it also means we never have to debug "it works on web but not desktop" issues in shared code.

**We accepted the discipline requirement.**

This architecture only works if everyone follows the rules. Put shared code in packages, platform code in apps. It requires constant vigilance to avoid drift. We have linting rules to catch cross-boundary imports, but culture matters more than tooling.

---

## Working with the Package

**Installing dependencies**

```bash
pnpm install
```

**Building**

```bash
pnpm --filter @abe-stack/ui build
```

**Running tests**

```bash
pnpm --filter @abe-stack/ui test
```

**Type checking**

```bash
pnpm --filter @abe-stack/ui type-check
```

**Using in your app**

```typescript
import { Button, Card, Input, useDisclosure } from '@abe-stack/ui';
```

The package exposes everything through its main entry point. No need for deep imports.

---

## What is in the Box

At last count, we have:

- **25 Elements**: Alert, Avatar, Badge, Box, Button, Checkbox, CloseButton, Divider, Heading, Input, Kbd, MenuItem, PasswordInput, Progress, Skeleton, Spinner, Switch, Table, Text, TextArea, Toaster, Tooltip, VisuallyHidden, and more
- **16 Components**: Accordion, Card, Dialog, Dropdown, FocusTrap, FormField, Image, LoadingContainer, Pagination, Popover, Radio, RadioGroup, Select, Slider, Tabs, Toast
- **14 Layouts**: AppShell, AuthLayout, Container, Modal, Overlay, PageContainer, ProtectedRoute, ResizablePanel, ScrollArea, and the sidebar/topbar variants
- **20+ Hooks**: useClickOutside, useControllableState, useDebounce, useDisclosure, useFormState, useKeyboardShortcuts, useLocalStorage, useMediaQuery, usePaginatedQuery, useThemeMode, useVirtualScroll, and more

Full documentation with props tables and usage examples lives in the `./docs/` directory.

---

## The Philosophy

Write it once. Test it once. Fix it once. Use it everywhere.

That is the whole point of this package. When we add a new button variant, both apps get it. When we fix an accessibility issue in the Dialog, both apps benefit. When we optimize a hook, every feature using it gets faster.

The extra discipline this requires is worth it. We spend less time duplicating work and more time building features that matter.

---

_Last Updated: 2026-01-21_
