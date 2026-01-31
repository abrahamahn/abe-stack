# StackedLayout

## Overview

A simple stacked layout with optional hero section and centered content using Container.

## Import

```tsx
import { StackedLayout } from 'abeahn-ui/layouts';
```

## Props

| Prop     | Type                   | Default | Description                                       |
| -------- | ---------------------- | ------- | ------------------------------------------------- |
| hero     | `ReactNode`            | -       | Hero section content (appears above main content) |
| children | `ReactNode` (required) | -       | Main content                                      |

## Usage

### Basic Example

```tsx
<StackedLayout>
  <h1>Page Title</h1>
  <p>Page content goes here</p>
</StackedLayout>
```

### With Hero Section

```tsx
<StackedLayout
  hero={
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ fontSize: '3rem' }}>Welcome</h1>
      <p style={{ fontSize: '1.25rem' }}>Your tagline here</p>
    </div>
  }
>
  <section>
    <h2>Features</h2>
    <p>Content...</p>
  </section>
</StackedLayout>
```

### Marketing Page

```tsx
<StackedLayout
  hero={
    <div style={{ textAlign: 'center', padding: '60px 0' }}>
      <h1>Build Faster with Our Platform</h1>
      <p>The best tools for modern development</p>
      <Button size="large">Get Started</Button>
    </div>
  }
>
  <section>
    <h2>Why Choose Us</h2>
    <FeatureGrid />
  </section>

  <section>
    <h2>Pricing</h2>
    <PricingTable />
  </section>

  <section>
    <h2>Testimonials</h2>
    <TestimonialSlider />
  </section>
</StackedLayout>
```

### Documentation Page

```tsx
<StackedLayout
  hero={
    <div>
      <h1>Documentation</h1>
      <SearchBar />
    </div>
  }
>
  <nav>
    <Link to="#getting-started">Getting Started</Link>
    <Link to="#api">API Reference</Link>
  </nav>

  <article>
    <h2 id="getting-started">Getting Started</h2>
    <p>Documentation content...</p>
  </article>
</StackedLayout>
```

### Blog Post

```tsx
<StackedLayout
  hero={
    <article>
      <h1>Blog Post Title</h1>
      <div>
        <Avatar src={author.avatar} />
        <span>{author.name}</span>
        <time>{publishDate}</time>
      </div>
    </article>
  }
>
  <div>
    <p>Post content...</p>
  </div>
</StackedLayout>
```

## Layout

- Wrapper padding: `calc(var(--ui-gap-xl) * 2) 0`
- Uses Container with `size="md"` (960px max-width)
- Hero section has bottom margin: `calc(var(--ui-gap-lg) * 2)`
- Content is vertically stacked

## Accessibility

- No specific ARIA attributes (neutral container)
- Ensure child content has proper semantic structure
- Use appropriate heading hierarchy
- Hero should contain `<h1>` for page title

## Do's and Don'ts

### Do

- Use for simple content pages
- Use hero for page title and intro
- Keep content focused and scannable
- Use semantic HTML in children
- Test responsive behavior

### Don't

- Don't use for complex app layouts
- Don't put too much in hero section
- Don't forget responsive spacing
- Don't nest StackedLayout
- Don't use when sidebar is needed

## Related Components

- [PageContainer](./PageContainer.md) - Alternative page layout
- [Container](./Container.md) - Used internally
- [AuthLayout](./AuthLayout.md) - For auth pages

## References

- [Source](../../src/layouts/StackedLayout.tsx)
