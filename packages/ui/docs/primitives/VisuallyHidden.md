# VisuallyHidden

## Overview

A component that hides content visually while keeping it accessible to screen readers and other assistive technologies.

## Import

```tsx
import { VisuallyHidden } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                               | Default | Description                           |
| --------- | ---------------------------------- | ------- | ------------------------------------- |
| className | `string`                           | `''`    | Additional CSS classes to apply       |
| ...rest   | `ComponentPropsWithoutRef<'span'>` | -       | All standard HTML `<span>` attributes |
| ref       | `Ref<HTMLSpanElement>`             | -       | Forwarded ref to the `<span>` element |

## Usage

### Basic Example

```tsx
<VisuallyHidden>This text is hidden visually but read by screen readers</VisuallyHidden>
```

### Form Labels

```tsx
<div>
  <VisuallyHidden>
    <label htmlFor="search">Search</label>
  </VisuallyHidden>
  <input id="search" type="search" placeholder="Search..." aria-label="Search" />
</div>
```

### Icon Buttons

```tsx
<button>
  <IconClose />
  <VisuallyHidden>Close dialog</VisuallyHidden>
</button>
```

### Skip Links

```tsx
<VisuallyHidden>
  <a href="#main-content">Skip to main content</a>
</VisuallyHidden>
```

### Status Announcements

```tsx
<VisuallyHidden aria-live="polite" aria-atomic="true">
  {statusMessage}
</VisuallyHidden>
```

### Additional Context for Icons

```tsx
<div>
  <IconWarning />
  <VisuallyHidden>Warning:</VisuallyHidden>
  <span>Your session will expire soon</span>
</div>
```

## Accessibility

- Content is visually hidden using CSS but remains in the DOM
- Screen readers can access and read the content
- Content remains focusable if it contains interactive elements
- Maintains semantic structure and document flow
- Respects user preferences (won't hide content in high contrast mode)

## Do's and Don'ts

### Do

- Use for screen reader-only content that adds context
- Use for icon button labels
- Use for skip links
- Use for live region announcements
- Use when visual design shows information that needs text alternatives
- Test with actual screen readers

### Don't

- Don't use to hide important content from all users
- Don't use for content that should be visible on focus
- Don't use as a replacement for proper semantic HTML
- Don't hide interactive elements that sighted users need
- Don't use `display: none` or `visibility: hidden` (breaks accessibility)

## Related Components

- [Text](./Text.md) - For visible text content
- [Heading](./Heading.md) - For visible headings

## References

- [Source](../../src/primitives/VisuallyHidden.tsx)
- [WebAIM: Invisible Content](https://webaim.org/techniques/css/invisiblecontent/)
- [Inclusive Components: Tooltips & Toggletips](https://inclusive-components.design/tooltips-toggletips/)
