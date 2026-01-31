# Badge

## Overview

A polymorphic badge component for displaying small pieces of information such as status, counts, or labels with different visual tones.

## Import

```tsx
import { Badge } from 'abeahn-ui/elements';
```

## Props

| Prop      | Type                                           | Default  | Description                                                              |
| --------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| as        | `ElementType`                                  | `'span'` | The HTML element or React component to render as                         |
| tone      | `'info' \| 'success' \| 'danger' \| 'warning'` | `'info'` | Visual style variant indicating semantic meaning                         |
| className | `string`                                       | `''`     | Additional CSS classes to apply                                          |
| ...rest   | `ComponentPropsWithoutRef<'span'>`             | -        | All standard HTML `<span>` attributes (or props for custom `as` element) |
| ref       | `Ref<HTMLElement>`                             | -        | Forwarded ref to the rendered element                                    |

## Usage

### Basic Example

```tsx
<Badge>New</Badge>
```

### Different Tones

```tsx
<Badge tone="info">Info</Badge>
<Badge tone="success">Success</Badge>
<Badge tone="warning">Warning</Badge>
<Badge tone="danger">Error</Badge>
```

### Polymorphic Rendering

```tsx
{
  /* Render as a different element */
}
<Badge as="div">Custom Element</Badge>;

{
  /* Render as a button */
}
<Badge as="button" onClick={() => console.log('clicked')}>
  Clickable
</Badge>;
```

### With Count

```tsx
<Badge tone="danger">5</Badge>
```

## Accessibility

- Uses semantic HTML elements (`<span>` by default)
- Tone is communicated via `data-tone` attribute for styling
- Consider adding `aria-label` for icon-only or number-only badges
- When clickable, use appropriate interactive elements (`button`, `a`)

## Do's and Don'ts

### Do

- Use appropriate `tone` to convey semantic meaning (success for completion, danger for errors, etc.)
- Keep badge text concise (1-3 words or a number)
- Use polymorphic `as` prop for semantic correctness
- Add `aria-label` for badges with only numbers or icons

### Don't

- Don't use badges for long text labels
- Don't use badges as primary action buttons
- Don't override tone colors in a way that breaks semantic meaning
- Don't nest interactive badges

## Related Components

- [Text](./Text.md) - For regular text content
- [Button](../components/Button.md) - For primary actions

## References

- [Source](../../src/elements/Badge.tsx)
