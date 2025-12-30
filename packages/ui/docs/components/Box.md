# Box

## Overview

A flexible container component for creating simple flex-based layouts with optional padding and flex direction controls.

## Import

```tsx
import { Box } from 'abeahn-ui/components';
```

## Props

| Prop          | Type                | Default    | Description                                          |
| ------------- | ------------------- | ---------- | ---------------------------------------------------- |
| children      | `ReactNode`         | -          | Content to render inside the box                     |
| style         | `CSSProperties`     | -          | Additional inline styles (merged with layout styles) |
| className     | `string`            | -          | CSS class name for custom styling                    |
| padding       | `number \| string`  | -          | Padding value (CSS value or number for pixels)       |
| flexDirection | `'row' \| 'column'` | `'column'` | Flex direction for child layout                      |

## Usage

### Basic Example

```tsx
<Box>
  <p>Content inside a flex container</p>
</Box>
```

### Horizontal Layout

```tsx
<Box flexDirection="row">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Box>
```

### Vertical Layout (Default)

```tsx
<Box flexDirection="column">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</Box>
```

### With Padding

```tsx
<Box padding={16}>
  <p>Content with 16px padding</p>
</Box>

<Box padding="1rem">
  <p>Content with 1rem padding</p>
</Box>
```

### Combined Props

```tsx
<Box
  flexDirection="row"
  padding={24}
  className="custom-box"
  style={{ gap: '16px', alignItems: 'center' }}
>
  <div>Item 1</div>
  <div>Item 2</div>
</Box>
```

### Card-like Container

```tsx
<Box
  padding={20}
  style={{
    border: '1px solid #ccc',
    borderRadius: '8px',
    backgroundColor: '#fff',
  }}
>
  <h3>Title</h3>
  <p>Content goes here</p>
</Box>
```

### Centered Content

```tsx
<Box
  style={{
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '200px',
  }}
>
  <p>Centered content</p>
</Box>
```

### Form Layout

```tsx
<Box flexDirection="column" padding={16} style={{ gap: '12px' }}>
  <input type="text" placeholder="Name" />
  <input type="email" placeholder="Email" />
  <button>Submit</button>
</Box>
```

## Accessibility

- Renders a semantic `<div>` element
- No built-in ARIA attributes (container only)
- Ensure child content has proper semantic structure
- Use appropriate heading levels and landmarks
- Consider adding `role` if Box represents a specific region

## Do's and Don'ts

### Do

- Use for simple flex-based layouts
- Combine with `style` prop for additional flexbox properties (gap, align, justify)
- Use `flexDirection` to control layout direction
- Use `padding` for consistent spacing
- Nest Box components for complex layouts

### Don't

- Don't use Box when a more semantic HTML element is appropriate (nav, main, section, etc.)
- Don't use Box for complex grid layouts (use CSS Grid instead)
- Don't add too many inline styles (consider creating a component)
- Don't use Box as a replacement for proper semantic markup
- Don't override `display` property (Box always uses `display: flex`)

## Related Components

- [Card](./Card.md) - For content cards with built-in styling
- [Container](./Container.md) - For page-level layout containers

## References

- [Source](../../src/components/Box.tsx)
- [MDN: Flexbox](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout)
