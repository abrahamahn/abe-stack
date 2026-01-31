# Kbd

## Overview

A keyboard key display component for showing keyboard shortcuts and key combinations. Renders as a styled `<kbd>` element with proper semantics.

## Import

```tsx
import { Kbd } from '@abe-stack/ui';
```

## Props

| Prop      | Type           | Default | Description            |
| --------- | -------------- | ------- | ---------------------- |
| size      | `'sm' \| 'md'` | `'md'`  | Size variant           |
| className | `string`       | `''`    | Additional CSS classes |
| children  | `ReactNode`    | -       | Key label text         |

## Usage

### Basic Example

```tsx
<Kbd>Ctrl</Kbd>
<Kbd>K</Kbd>
```

### Key Combinations

```tsx
<span>
  Press <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> to search
</span>
```

### Size Variants

```tsx
<Kbd size="sm">Esc</Kbd>
<Kbd size="md">Enter</Kbd>
```

### Common Shortcuts Display

```tsx
<div className="shortcuts-list">
  <div>
    <Kbd>Ctrl</Kbd> + <Kbd>S</Kbd> Save
  </div>
  <div>
    <Kbd>Ctrl</Kbd> + <Kbd>Z</Kbd> Undo
  </div>
  <div>
    <Kbd>Escape</Kbd> Close
  </div>
</div>
```

## Accessibility

- Uses semantic `<kbd>` element
- Screen readers announce as keyboard input
- Monospace font for consistent key display

## Do's and Don'ts

### Do

- Use for displaying keyboard shortcuts
- Combine with text explaining the action
- Use consistent sizing within the same context

### Don't

- Use for non-keyboard input
- Use for decorative purposes
- Mix different sizes in the same shortcut combination

## Related Components

- [Text](./Text.md) - For surrounding descriptive text

## References

- [Source Code](../../src/elements/Kbd.tsx)
- [Tests](../../src/elements/__tests__/Kbd.test.tsx)
