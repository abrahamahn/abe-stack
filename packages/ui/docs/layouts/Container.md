# Container

## Overview

A centered, max-width container component for consistent page layouts with responsive sizing.

## Import

```tsx
import { Container } from 'abeahn-ui/layouts';
```

## Props

| Prop      | Type                              | Default | Description                             |
| --------- | --------------------------------- | ------- | --------------------------------------- |
| size      | `'sm' \| 'md' \| 'lg'`            | `'md'`  | Maximum width of the container          |
| className | `string`                          | -       | Additional CSS classes to apply         |
| style     | `CSSProperties`                   | -       | Inline styles (merged with size styles) |
| ...rest   | `ComponentPropsWithoutRef<'div'>` | -       | All standard HTML `<div>` attributes    |

## Size Values

| Size | Max Width |
| ---- | --------- |
| `sm` | 640px     |
| `md` | 960px     |
| `lg` | 1200px    |

## Usage

### Basic Example

```tsx
<Container>
  <h1>Page Title</h1>
  <p>Page content goes here...</p>
</Container>
```

### Different Sizes

```tsx
<Container size="sm">
  Narrow container for focused content
</Container>

<Container size="md">
  Medium container (default)
</Container>

<Container size="lg">
  Wide container for dashboard layouts
</Container>
```

### Page Layout

```tsx
<div>
  <header>
    <Container>
      <nav>Navigation</nav>
    </Container>
  </header>

  <main>
    <Container>
      <h1>Page Title</h1>
      <p>Content...</p>
    </Container>
  </main>

  <footer>
    <Container>
      <p>&copy; 2024 Company</p>
    </Container>
  </footer>
</div>
```

### Article/Blog Post

```tsx
<article>
  <Container size="sm">
    <h1>Blog Post Title</h1>
    <p>Published on December 30, 2024</p>
    <p>Article content with comfortable reading width...</p>
  </Container>
</article>
```

### Dashboard Layout

```tsx
<Container size="lg">
  <h1>Dashboard</h1>
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
    <Card>Widget 1</Card>
    <Card>Widget 2</Card>
    <Card>Widget 3</Card>
  </div>
</Container>
```

### Marketing Page

```tsx
<div>
  {/* Hero section - full width */}
  <section style={{ backgroundColor: '#f0f0f0', padding: '60px 0' }}>
    <Container size="md">
      <h1>Welcome to Our Product</h1>
      <p>Tagline goes here</p>
    </Container>
  </section>

  {/* Features section */}
  <section style={{ padding: '40px 0' }}>
    <Container size="lg">
      <h2>Features</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
        <div>Feature 1</div>
        <div>Feature 2</div>
        <div>Feature 3</div>
      </div>
    </Container>
  </section>
</div>
```

### Nested Containers (Not Recommended)

```tsx
{
  /* Avoid nesting containers */
}
<Container size="lg">
  {/* Don't do this */}
  <Container size="sm">Content</Container>
</Container>;
```

### Custom Styling

```tsx
<Container
  size="md"
  className="custom-container"
  style={{ paddingTop: '40px', paddingBottom: '40px' }}
>
  Content with custom spacing
</Container>
```

## Behavior

- Centers content horizontally with `margin: 0 auto`
- Applies horizontal padding via CSS variable `--ui-gap-lg`
- Constrains maximum width based on `size` prop
- Responsive by default (adapts to viewport width)

## Accessibility

- Renders a semantic `<div>` element
- No built-in ARIA attributes (neutral container)
- Ensure child content has proper semantic structure
- Use appropriate landmarks (`<main>`, `<header>`, `<footer>`, etc.)

### With Landmarks

```tsx
<header>
  <Container>
    <nav aria-label="Main navigation">...</nav>
  </Container>
</header>

<main>
  <Container>
    <article>...</article>
  </Container>
</main>

<footer>
  <Container>
    <p>Footer content</p>
  </Container>
</footer>
```

## Do's and Don'ts

### Do

- Use for consistent page-level layouts
- Choose appropriate size for content type:
  - `sm` for reading content (articles, blog posts)
  - `md` for general pages
  - `lg` for dashboards and wide layouts
- Wrap sections consistently
- Combine with semantic HTML landmarks

### Don't

- Don't nest containers inside containers
- Don't use for component-level layout (use Box or native CSS)
- Don't override max-width without good reason
- Don't forget responsive padding/margins on mobile
- Don't use when full-width layout is needed

## Size Selection Guide

| Content Type         | Recommended Size |
| -------------------- | ---------------- |
| Blog posts, articles | `sm` (640px)     |
| Documentation        | `sm` or `md`     |
| Landing pages        | `md` (960px)     |
| App dashboards       | `lg` (1200px)    |
| Wide tables/charts   | `lg` (1200px)    |
| General pages        | `md` (960px)     |

## Related Components

- [Box](../components/Box.md) - For component-level flex layouts
- [PageContainer](./PageContainer.md) - For complete page layouts

## References

- [Source](../../src/layouts/Container.tsx)
