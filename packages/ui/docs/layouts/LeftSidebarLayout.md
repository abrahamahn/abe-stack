# LeftSidebarLayout

## Overview

A left sidebar component with header, content, and footer sections. The footer is pushed to the bottom using flexbox. Used as the sidebar slot in AppShell or standalone.

## Import

```tsx
import { LeftSidebarLayout } from '@abe-stack/ui';
```

## Props

| Prop      | Type               | Default      | Description                                     |
| --------- | ------------------ | ------------ | ----------------------------------------------- |
| children  | `ReactNode`        | -            | Fallback content (used when slots not provided) |
| header    | `ReactNode`        | -            | Header section (navigation icons)               |
| content   | `ReactNode`        | -            | Main scrollable content                         |
| footer    | `ReactNode`        | -            | Footer section (pushed to bottom)               |
| width     | `string \| number` | `'3.125rem'` | Width of the sidebar                            |
| bordered  | `boolean`          | `true`       | Show right border                               |
| className | `string`           | `''`         | Additional CSS classes                          |
| style     | `CSSProperties`    | -            | Additional inline styles                        |

## Usage

### Basic Example with Slots

```tsx
<LeftSidebarLayout header={<CategoryIcons />} content={<MenuItems />} footer={<SettingsButton />} />
```

### Icon Navigation Sidebar

```tsx
<LeftSidebarLayout width="3.125rem" bordered>
  <div className="flex flex-col gap-2 p-2">
    <Button variant="primary" className="sidebar-btn">
      H
    </Button>
    <Button variant="secondary" className="sidebar-btn">
      S
    </Button>
    <Button variant="secondary" className="sidebar-btn">
      P
    </Button>
  </div>
</LeftSidebarLayout>
```

### Inside AppShell

```tsx
<AppShell
  sidebar={
    <LeftSidebarLayout
      header={
        <>
          {categories.map((cat) => (
            <Button key={cat} onClick={() => selectCategory(cat)}>
              {cat.charAt(0).toUpperCase()}
            </Button>
          ))}
        </>
      }
      footer={
        <>
          <Button onClick={togglePanel}>T</Button>
          <Button onClick={resetLayout}>R</Button>
        </>
      }
    />
  }
  sidebarWidth="3.125rem"
>
  <MainContent />
</AppShell>
```

### Wider Navigation Sidebar

```tsx
<LeftSidebarLayout width="200px" bordered>
  <nav className="flex flex-col gap-2 p-4">
    <a href="/">Dashboard</a>
    <a href="/settings">Settings</a>
    <a href="/profile">Profile</a>
  </nav>
</LeftSidebarLayout>
```

## CSS Custom Properties

LeftSidebarLayout uses CSS variables for styling:

```css
--left-sidebar-width: 3.125rem; /* or provided value */
--left-sidebar-width-mobile: 2.625rem; /* mobile width */
```

## Responsive Behavior

On mobile (< 768px), the sidebar becomes narrower and uses less padding.

## Accessibility

- Renders as `<aside>` element for semantic HTML
- Footer section is visually separated from main content
- Consider adding ARIA labels for navigation

## Do's and Don'ts

### Do

- Use for icon-based navigation sidebars
- Keep width narrow for icon sidebars (3-4rem)
- Use footer for settings and secondary actions
- Compose with AppShell for full layouts

### Don't

- Use for primary content
- Make too wide for icon-only navigation
- Forget to handle collapsed state

## Related Components

- [RightSidebarLayout](./RightSidebarLayout.md) - Right panel component
- [AppShell](./AppShell.md) - Complete application shell
- [TopbarLayout](./TopbarLayout.md) - Top navigation bar

## References

- [Source Code](../../src/layouts/shells/LeftSidebarLayout.tsx)
