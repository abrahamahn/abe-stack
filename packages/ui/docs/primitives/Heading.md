# Heading

## Overview

A polymorphic heading component for rendering semantic heading elements (`h1`-`h6`) with consistent sizing independent of the HTML level.

## Import

```tsx
import { Heading } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                             | Default | Description                                                             |
| --------- | -------------------------------- | ------- | ----------------------------------------------------------------------- |
| as        | `ElementType`                    | `'h2'`  | The HTML element to render as (typically `h1`-`h6`)                     |
| size      | `'xl' \| 'lg' \| 'md' \| 'sm'`   | `'lg'`  | Visual size variant independent of semantic level                       |
| className | `string`                         | `''`    | Additional CSS classes to apply                                         |
| ...rest   | `ComponentPropsWithoutRef<'h2'>` | -       | All standard HTML heading attributes (or props for custom `as` element) |
| ref       | `Ref<HTMLElement>`               | -       | Forwarded ref to the rendered element                                   |

## Usage

### Basic Example

```tsx
<Heading>Page Section Title</Heading>
```

### Different Sizes

```tsx
<Heading size="xl">Extra Large Heading</Heading>
<Heading size="lg">Large Heading</Heading>
<Heading size="md">Medium Heading</Heading>
<Heading size="sm">Small Heading</Heading>
```

### Semantic Levels with Independent Sizing

```tsx
{/* h1 with extra large size */}
<Heading as="h1" size="xl">
  Main Page Title
</Heading>

{/* h3 but visually small */}
<Heading as="h3" size="sm">
  Subsection Title
</Heading>

{/* Maintain semantic hierarchy while controlling visual size */}
<Heading as="h2" size="lg">Section</Heading>
<Heading as="h3" size="md">Subsection</Heading>
<Heading as="h4" size="sm">Detail</Heading>
```

### With Custom Styling

```tsx
<Heading as="h1" size="xl" className="text-center">
  Centered Title
</Heading>
```

## Accessibility

- Uses semantic heading elements (`<h1>`-`<h6>`) for proper document outline
- Screen readers navigate by heading levels using `as` prop
- Visual size (`size` prop) is independent of semantic level (`as` prop)
- Maintains proper heading hierarchy for accessibility while allowing flexible visual design
- Automatically gets heading role and ARIA semantics

## Do's and Don'ts

### Do

- Maintain proper heading hierarchy (h1 → h2 → h3, etc.) using the `as` prop
- Use `size` prop to control visual appearance independently
- Use single `h1` per page/view for main title
- Use meaningful, descriptive heading text
- Keep headings concise

### Don't

- Don't skip heading levels (e.g., h1 → h3)
- Don't choose `as` value based on visual size alone; use `size` for that
- Don't use headings for text that isn't a section heading
- Don't use headings for styling regular text (use [Text](./Text.md) instead)
- Don't use headings for interactive elements

## Related Components

- [Text](./Text.md) - For paragraph and inline text
- [Badge](./Badge.md) - For labels and status

## References

- [Source](../../src/primitives/Heading.tsx)
- [MDN: h1-h6 elements](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/Heading_Elements)
- [WCAG: Headings and Labels](https://www.w3.org/WAI/WCAG21/Understanding/headings-and-labels.html)
