# CardElement

## Overview

A compound component for building structured card layouts with header, body, and footer sections. Use CardElement for low-level card structure; use Card from components for a simpler API.

## Import

```tsx
import { CardElement } from '@abe-stack/ui';
```

## Props

### CardElement.Root

| Prop      | Type          | Default | Description            |
| --------- | ------------- | ------- | ---------------------- |
| as        | `ElementType` | `'div'` | Element type to render |
| className | `string`      | `''`    | Additional CSS classes |
| children  | `ReactNode`   | -       | Card content           |

### CardElement.Header / Body / Footer

| Prop      | Type        | Default | Description            |
| --------- | ----------- | ------- | ---------------------- |
| className | `string`    | -       | Additional CSS classes |
| children  | `ReactNode` | -       | Section content        |

## Usage

### Basic Example

```tsx
<CardElement.Root>
  <CardElement.Header>
    <h3>Card Title</h3>
  </CardElement.Header>
  <CardElement.Body>
    <p>Card content goes here</p>
  </CardElement.Body>
  <CardElement.Footer>
    <Button>Action</Button>
  </CardElement.Footer>
</CardElement.Root>
```

### As Article Element

```tsx
<CardElement.Root as="article">
  <CardElement.Header>
    <h2>Blog Post</h2>
  </CardElement.Header>
  <CardElement.Body>
    <p>Article content...</p>
  </CardElement.Body>
</CardElement.Root>
```

## Accessibility

- Use semantic HTML elements via the `as` prop when appropriate
- Ensure proper heading hierarchy within cards
- Card sections are standard divs with appropriate class names

## Do's and Don'ts

### Do

- Use CardElement for complex card layouts needing fine control
- Combine with other elements like headings, text, buttons
- Use the `as` prop for semantic HTML (article, section, etc.)

### Don't

- Use CardElement for simple cards; use Card component instead
- Nest cards within cards
- Forget to include content in the body section

## Related Components

- [Card](../components/Card.md) - Simpler card wrapper component

## References

- [Source Code](../../src/elements/CardElement.tsx)
- [Tests](../../src/elements/__tests__/CardElement.test.tsx)
