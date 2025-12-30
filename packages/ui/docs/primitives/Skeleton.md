# Skeleton

## Overview

A loading placeholder component that displays an animated skeleton screen while content is being fetched or loaded.

## Import

```tsx
import { Skeleton } from 'abeahn-ui/primitives';
```

## Props

| Prop      | Type                              | Default  | Description                                                     |
| --------- | --------------------------------- | -------- | --------------------------------------------------------------- |
| width     | `string \| number`                | `'100%'` | Width of the skeleton element (CSS value or number for pixels)  |
| height    | `string \| number`                | `'16px'` | Height of the skeleton element (CSS value or number for pixels) |
| radius    | `string \| number`                | `'8px'`  | Border radius (CSS value or number for pixels)                  |
| className | `string`                          | `''`     | Additional CSS classes to apply                                 |
| style     | `CSSProperties`                   | -        | Inline styles (merged with size props)                          |
| ...rest   | `ComponentPropsWithoutRef<'div'>` | -        | All standard HTML `<div>` attributes                            |
| ref       | `Ref<HTMLDivElement>`             | -        | Forwarded ref to the `<div>` element                            |

## Usage

### Basic Example

```tsx
<Skeleton />
```

### Custom Dimensions

```tsx
{
  /* Using CSS values */
}
<Skeleton width="200px" height="20px" />;

{
  /* Using numbers (pixels) */
}
<Skeleton width={300} height={40} />;

{
  /* Percentage widths */
}
<Skeleton width="50%" height="24px" />;
```

### Different Shapes

```tsx
{
  /* Circle avatar skeleton */
}
<Skeleton width={48} height={48} radius="50%" />;

{
  /* Rectangular card skeleton */
}
<Skeleton width="100%" height={200} radius={12} />;

{
  /* Sharp corners */
}
<Skeleton width={150} height={30} radius={0} />;
```

### Loading Card Example

```tsx
<div className="card">
  <Skeleton width={64} height={64} radius="50%" />
  <div style={{ marginTop: '16px' }}>
    <Skeleton width="60%" height={20} />
    <Skeleton width="90%" height={16} style={{ marginTop: '8px' }} />
    <Skeleton width="75%" height={16} style={{ marginTop: '8px' }} />
  </div>
</div>
```

### Loading List Example

```tsx
<div>
  {[1, 2, 3, 4].map((i) => (
    <div key={i} style={{ marginBottom: '12px' }}>
      <Skeleton width="100%" height={24} />
    </div>
  ))}
</div>
```

## Accessibility

- Uses `<div>` element with appropriate ARIA attributes
- Consider adding `aria-busy="true"` to parent container during loading
- Consider adding `aria-live="polite"` region for loading status announcements
- No keyboard interaction needed (non-interactive placeholder)

### Recommended ARIA Pattern

```tsx
<div aria-busy="true" aria-live="polite">
  <span className="sr-only">Loading content...</span>
  <Skeleton width="100%" height={24} />
  <Skeleton width="80%" height={20} />
</div>
```

## Do's and Don'ts

### Do

- Match skeleton dimensions to expected content size
- Use multiple skeletons to approximate final layout
- Animate skeleton for better perceived performance
- Replace skeletons immediately when content loads
- Use similar border radius to actual content

### Don't

- Don't use skeletons for very fast loading (<200ms)
- Don't use overly complex skeleton layouts
- Don't keep skeletons visible after content loads
- Don't use skeletons for error states (use error messages)
- Don't make skeletons too visually prominent

## Related Components

- [Spinner](../components/Spinner.md) - For indeterminate loading states
- [Progress](./Progress.md) - For determinate progress indication

## References

- [Source](../../src/primitives/Skeleton.tsx)
- [Skeleton Screens Pattern](https://www.nngroup.com/articles/skeleton-screens/)
