# Layout

## Overview

A flexible grid-based layout component with slots for top, bottom, left, right, and main content areas. Automatically adapts column structure based on which slots are provided.

## Import

```tsx
import { Layout } from 'abeahn-ui/components';
```

## Props

| Prop          | Type            | Default              | Description                     |
| ------------- | --------------- | -------------------- | ------------------------------- |
| top           | `ReactNode`     | -                    | Header content                  |
| bottom        | `ReactNode`     | -                    | Footer content                  |
| left          | `ReactNode`     | -                    | Left sidebar content            |
| right         | `ReactNode`     | -                    | Right sidebar content           |
| children      | `ReactNode`     | -                    | Main content area               |
| gap           | `string`        | `'var(--ui-gap-lg)'` | Gap between grid areas          |
| minLeftWidth  | `string`        | `'220px'`            | Minimum width for left sidebar  |
| minRightWidth | `string`        | `'260px'`            | Minimum width for right sidebar |
| style         | `CSSProperties` | -                    | Additional inline styles        |
| className     | `string`        | -                    | CSS class name                  |

## Usage

### Basic Three-Column Layout

```tsx
<Layout left={<Sidebar />} right={<Aside />}>
  <MainContent />
</Layout>
```

### With Header and Footer

```tsx
<Layout top={<Header />} bottom={<Footer />} left={<Nav />}>
  <Main />
</Layout>
```

### Full Application Layout

```tsx
<Layout
  top={
    <header>
      <h1>My App</h1>
      <nav>Navigation</nav>
    </header>
  }
  left={
    <aside>
      <ul>
        <li>Menu Item 1</li>
        <li>Menu Item 2</li>
      </ul>
    </aside>
  }
  right={
    <aside>
      <h3>Info Panel</h3>
      <p>Additional information</p>
    </aside>
  }
  bottom={
    <footer>
      <p>&copy; 2024 Company</p>
    </footer>
  }
>
  <main>
    <h2>Page Title</h2>
    <p>Main content area</p>
  </main>
</Layout>
```

### Two-Column (Left Sidebar)

```tsx
<Layout left={<Sidebar />}>
  <MainContent />
</Layout>
```

### Two-Column (Right Sidebar)

```tsx
<Layout right={<InfoPanel />}>
  <MainContent />
</Layout>
```

### Custom Gap and Widths

```tsx
<Layout left={<Sidebar />} gap="24px" minLeftWidth="300px" minRightWidth="350px">
  <Main />
</Layout>
```

### Dashboard Layout

```tsx
<Layout
  top={
    <header style={{ display: 'flex', justifyContent: 'space-between', padding: '16px' }}>
      <h1>Dashboard</h1>
      <UserMenu />
    </header>
  }
  left={<DashboardNav />}
  right={<ActivityFeed />}
>
  <div style={{ padding: '24px' }}>
    <Metrics />
    <Charts />
  </div>
</Layout>
```

## Grid Structure

The component uses CSS Grid with automatic column configuration:

- **Left only**: `minmax(220px, 1fr) minmax(0, 2fr)`
- **Right only**: `minmax(0, 2fr) minmax(260px, 1fr)`
- **Both sidebars**: `minmax(220px, 1fr) minmax(0, 2fr) minmax(260px, 1fr)`
- **Neither**: `minmax(0, 2fr)`

Rows:

- **Top** (if provided): `auto`
- **Main row** (always): `minmax(0, 1fr)`
- **Bottom** (if provided): `auto`

## Accessibility

- Uses semantic HTML (`<header>`, `<main>`, `<aside>`, `<footer>`)
- Main content in `<main>` element for skip links
- Sidebars use `<aside>` for proper landmark roles
- Consider adding `aria-label` to sidebars for clarity

### Example with ARIA

```tsx
<Layout
  top={<header role="banner">Header</header>}
  left={<aside aria-label="Main navigation">Nav</aside>}
  right={<aside aria-label="Related content">Info</aside>}
>
  <main role="main">Content</main>
</Layout>
```

## Do's and Don'ts

### Do

- Use for application shells
- Provide semantic content in slots
- Test responsive behavior
- Use appropriate `minWidth` values
- Consider mobile layouts (collapse sidebars)

### Don't

- Don't use for simple page layouts (use Container)
- Don't make sidebars too wide
- Don't forget mobile responsiveness
- Don't nest Layout components
- Don't put non-semantic content in slots

## Related Components

- [AppShell](../layouts/AppShell.md) - Alternative app layout
- [Container](../layouts/Container.md) - Simpler centered container
- [SidebarLayout](../layouts/SidebarLayout.md) - Simpler sidebar layout

## References

- [Source](../../src/components/Layout.tsx)
