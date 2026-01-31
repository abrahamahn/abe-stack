# Divider

## Overview

A horizontal rule component that renders a semantic `<hr>` element to visually separate content sections.

## Import

```tsx
import { Divider } from 'abeahn-ui/elements';
```

## Props

| Prop      | Type                             | Default | Description                         |
| --------- | -------------------------------- | ------- | ----------------------------------- |
| className | `string`                         | `''`    | Additional CSS classes to apply     |
| ...rest   | `ComponentPropsWithoutRef<'hr'>` | -       | All standard HTML `<hr>` attributes |
| ref       | `Ref<HTMLHRElement>`             | -       | Forwarded ref to the `<hr>` element |

## Usage

### Basic Example

```tsx
<div>
  <p>Content above</p>
  <Divider />
  <p>Content below</p>
</div>
```

### With Custom Styling

```tsx
<Divider className="my-custom-divider" />
```

### With ARIA Label

```tsx
<Divider aria-label="Section separator" />
```

## Accessibility

- Uses semantic `<hr>` element for proper document structure
- Screen readers announce it as a separator
- Can accept `aria-label` for additional context
- Keyboard users can navigate to it using standard navigation

## Do's and Don'ts

### Do

- Use to separate distinct sections of content
- Keep styling minimal for clarity
- Use semantic heading elements before sections when appropriate

### Don't

- Don't overuse dividers; rely on whitespace when possible
- Don't use for purely decorative purposes without semantic meaning
- Don't use as the only visual separator in complex layouts

## Related Components

- [Box](../components/Box.md) - For structural layout
- [Card](../components/Card.md) - For grouped content with built-in separation

## References

- [Source](../../src/elements/Divider.tsx)
- [MDN: hr element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/hr)
