# Text

## Overview

A polymorphic text component for rendering paragraphs and inline text with different semantic tones and flexible element types.

## Import

```tsx
import { Text } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                                            | Default     | Description                                                           |
| --------- | ----------------------------------------------- | ----------- | --------------------------------------------------------------------- |
| as        | `ElementType`                                   | `'p'`       | The HTML element or React component to render as                      |
| tone      | `'default' \| 'muted' \| 'danger' \| 'success'` | `'default'` | Visual style variant for semantic emphasis                            |
| className | `string`                                        | `''`        | Additional CSS classes to apply                                       |
| ...rest   | `ComponentPropsWithoutRef<'p'>`                 | -           | All standard HTML `<p>` attributes (or props for custom `as` element) |
| ref       | `Ref<HTMLElement>`                              | -           | Forwarded ref to the rendered element                                 |

## Usage

### Basic Example

```tsx
<Text>This is a paragraph of text.</Text>
```

### Different Tones

```tsx
<Text tone="default">Default text</Text>
<Text tone="muted">Muted secondary text</Text>
<Text tone="success">Success message</Text>
<Text tone="danger">Error or warning text</Text>
```

### Polymorphic Rendering

```tsx
{
  /* Render as a span */
}
<Text as="span">Inline text</Text>;

{
  /* Render as a label */
}
<Text as="label" htmlFor="input-id">
  Form label
</Text>;

{
  /* Render as a div */
}
<Text as="div">Block text container</Text>;
```

### Combined Usage

```tsx
<Text as="span" tone="muted" className="small">
  Helper text
</Text>
```

## Accessibility

- Uses semantic HTML elements (`<p>` by default)
- Tone communicated via `data-tone` attribute for styling
- Polymorphic rendering allows semantic correctness (e.g., `<label>` for form fields)
- Screen readers read content naturally

## Do's and Don'ts

### Do

- Use appropriate `as` prop for semantic HTML structure
- Use `tone="muted"` for secondary or helper text
- Use `tone="danger"` for error messages
- Use `tone="success"` for success feedback
- Keep text concise and scannable

### Don't

- Don't use Text for headings (use [Heading](./Heading.md) instead)
- Don't override tone colors to mean something different
- Don't use Text for interactive elements (use Button or Link)
- Don't nest Text components unnecessarily

## Related Components

- [Heading](./Heading.md) - For heading elements
- [Badge](./Badge.md) - For status labels
- [Alert](./Alert.md) - For message blocks

## References

- [Source](../../src/primitives/Text.tsx)
