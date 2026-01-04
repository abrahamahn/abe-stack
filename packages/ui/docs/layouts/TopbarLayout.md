# TopbarLayout

## Overview

A top navigation bar component with left, center, and right sections. Used as the header slot in AppShell or standalone for simpler layouts.

## Import

```tsx
import { TopbarLayout } from '@abe-stack/ui';
```

## Props

| Prop      | Type               | Default  | Description                                     |
| --------- | ------------------ | -------- | ----------------------------------------------- |
| children  | `ReactNode`        | -        | Fallback content (used when slots not provided) |
| left      | `ReactNode`        | -        | Left section content (logo, back button)        |
| center    | `ReactNode`        | -        | Center section content (title, search)          |
| right     | `ReactNode`        | -        | Right section content (actions, user menu)      |
| height    | `string \| number` | `'3rem'` | Height of the bar                               |
| bordered  | `boolean`          | `true`   | Show bottom border                              |
| className | `string`           | `''`     | Additional CSS classes                          |
| style     | `CSSProperties`    | -        | Additional inline styles                        |

## Usage

### Basic Example with Slots

```tsx
<TopbarLayout
  left={<Button variant="text">← Back</Button>}
  center={
    <Heading as="h1" size="lg">
      Page Title
    </Heading>
  }
  right={<Button>Settings</Button>}
/>
```

### Simple Children Fallback

```tsx
<TopbarLayout>
  <div className="flex justify-between w-full">
    <Logo />
    <NavLinks />
  </div>
</TopbarLayout>
```

### Inside AppShell

```tsx
<AppShell
  header={<TopbarLayout left={<Logo />} center={<SearchBar />} right={<UserMenu />} bordered />}
>
  <MainContent />
</AppShell>
```

### Without Border

```tsx
<TopbarLayout bordered={false} height="4rem">
  <CustomHeader />
</TopbarLayout>
```

### Custom Height

```tsx
<TopbarLayout height={64} left={<Logo />} right={<Actions />} />
```

## CSS Custom Properties

TopbarLayout uses CSS variables for styling:

```css
--topbar-height: 3rem; /* or provided value */
```

## Accessibility

- Renders as `<header>` element for semantic HTML
- Sections are flex containers for proper alignment
- Left/right sections have minimum width for balance

## Do's and Don'ts

### Do

- Use for application headers and navigation bars
- Include logo/branding in left section
- Put primary actions in right section
- Keep center section for titles or search

### Don't

- Overcrowd with too many items
- Use excessive height that reduces content area
- Forget to test on mobile viewports

## Related Components

- [BottombarLayout](./BottombarLayout.md) - Bottom status/action bar
- [AppShell](./AppShell.md) - Complete application shell
- [LeftSidebarLayout](./LeftSidebarLayout.md) - Left sidebar component

## References

- [Source Code](../../src/layouts/shells/TopbarLayout.tsx)
- [Tests](../../src/layouts/shells/__tests__/TopbarLayout.test.tsx)
