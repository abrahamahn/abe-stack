# PageContainer

## Overview

A semantic `<main>` container with centered layout, max-width constraints, and grid display for consistent page structure.

## Import

```tsx
import { PageContainer } from 'abeahn-ui/layouts';
```

## Props

| Prop     | Type                               | Default              | Description                   |
| -------- | ---------------------------------- | -------------------- | ----------------------------- |
| maxWidth | `number`                           | `960`                | Maximum width in pixels       |
| padding  | `string`                           | Complex default      | Container padding (CSS value) |
| gap      | `number \| string`                 | `'var(--ui-gap-lg)'` | Grid gap between children     |
| style    | `CSSProperties`                    | -                    | Additional inline styles      |
| children | `ReactNode`                        | -                    | Page content                  |
| ...rest  | `ComponentPropsWithoutRef<'main'>` | -                    | All `<main>` attributes       |

**Default padding**: `calc(var(--ui-gap-lg) * 2) var(--ui-gap-xl) calc(var(--ui-gap-xl) + var(--ui-gap-lg))`

## Usage

### Basic Example

```tsx
<PageContainer>
  <h1>Page Title</h1>
  <p>Page content</p>
</PageContainer>
```

### Custom Max Width

```tsx
<PageContainer maxWidth={1200}>
  <h1>Wide Page</h1>
  <div>Content with 1200px max width</div>
</PageContainer>
```

### Narrow Content

```tsx
<PageContainer maxWidth={640}>
  <article>
    <h1>Blog Post</h1>
    <p>Comfortable reading width...</p>
  </article>
</PageContainer>
```

### Custom Padding

```tsx
<PageContainer padding="40px 20px">
  <div>Custom padding content</div>
</PageContainer>
```

### Custom Gap

```tsx
<PageContainer gap="32px">
  <section>Section 1</section>
  <section>Section 2</section>
  <section>Section 3</section>
</PageContainer>
```

### Complete Page Example

```tsx
<PageContainer>
  <header>
    <h1>Dashboard</h1>
    <p>Welcome back, User!</p>
  </header>

  <section>
    <h2>Metrics</h2>
    <MetricsGrid />
  </section>

  <section>
    <h2>Recent Activity</h2>
    <ActivityList />
  </section>
</PageContainer>
```

### With Custom Styling

```tsx
<PageContainer maxWidth={1000} gap="24px" style={{ backgroundColor: '#f5f5f5' }}>
  <div>Content</div>
</PageContainer>
```

## Layout

Uses CSS Grid with:

- `display: grid`
- `gap: var(--ui-gap-lg)` (configurable)
- `maxWidth: 960px` (configurable)
- `margin: 0 auto` (centered)
- Generous padding for comfortable content spacing

## Accessibility

- Uses semantic `<main>` element
- Provides `role="main"` landmark automatically
- Should be used once per page
- Supports all `<main>` attributes and ARIA properties

### With ARIA

```tsx
<PageContainer aria-labelledby="page-title">
  <h1 id="page-title">Dashboard</h1>
  <div>Content</div>
</PageContainer>
```

## Do's and Don'ts

### Do

- Use as the main content container
- Use once per page
- Adjust `maxWidth` for content type
- Keep content within max-width for readability
- Use `gap` to space sections vertically

### Don't

- Don't use multiple PageContainers on same page
- Don't nest PageContainers
- Don't use for components (use Container or Box)
- Don't set too wide max-width (>1400px)
- Don't forget responsive considerations

## Max-Width Recommendations

| Content Type         | Recommended Max-Width |
| -------------------- | --------------------- |
| Blog posts, articles | 640-720px             |
| Documentation        | 800-960px             |
| Dashboards           | 1200-1400px           |
| General pages        | 960-1200px            |

## Related Components

- [Container](./Container.md) - Simpler centered container
- [AppShell](./AppShell.md) - Full app layout
- [StackedLayout](./StackedLayout.md) - Stacked sections layout

## References

- [Source](../../src/layouts/PageContainer.tsx)
