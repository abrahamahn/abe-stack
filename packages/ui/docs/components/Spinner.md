# Spinner

## Overview

A simple loading spinner component for indicating indeterminate loading states.

## Import

```tsx
import { Spinner } from 'abeahn-ui/components';
```

## Props

| Prop | Type     | Default              | Description                     |
| ---- | -------- | -------------------- | ------------------------------- |
| size | `string` | `'var(--ui-gap-lg)'` | Size of the spinner (CSS value) |

## Usage

### Basic Example

```tsx
<Spinner />
```

### Custom Sizes

```tsx
<Spinner size="16px" />
<Spinner size="24px" />
<Spinner size="32px" />
<Spinner size="48px" />
```

### Using CSS Variables

```tsx
<Spinner size="var(--ui-gap-sm)" />
<Spinner size="var(--ui-gap-md)" />
<Spinner size="var(--ui-gap-lg)" />
<Spinner size="var(--ui-gap-xl)" />
```

### Loading State Example

```tsx
const [loading, setLoading] = useState(true);

{
  loading ? (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
      <Spinner />
    </div>
  ) : (
    <div>Content loaded!</div>
  );
}
```

### Button Loading State

```tsx
<button disabled={loading}>
  {loading ? (
    <>
      <Spinner size="16px" />
      <span style={{ marginLeft: '8px' }}>Loading...</span>
    </>
  ) : (
    'Submit'
  )}
</button>
```

### Centered Loading State

```tsx
<div
  style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '200px',
  }}
>
  <Spinner size="32px" />
</div>
```

## Accessibility

- Spinner is purely decorative (visual indicator only)
- Always pair with text or ARIA labels for screen reader users
- Consider using `aria-busy="true"` on parent container
- Provide status updates via ARIA live regions
- Don't rely on spinner alone to communicate loading state

### Recommended Accessibility Pattern

```tsx
<div aria-busy={loading} aria-live="polite">
  <span className="sr-only">{loading ? 'Loading content...' : 'Content loaded'}</span>
  {loading ? <Spinner /> : <div>Content</div>}
</div>
```

### With Accessible Label

```tsx
<div role="status" aria-label="Loading data">
  <Spinner />
</div>
```

## Do's and Don'ts

### Do

- Use for indeterminate loading states (unknown duration)
- Pair with accessible text labels
- Use appropriate size for context
- Show spinner while async operations are in progress
- Center spinner in its container
- Consider using with [Progress](../primitives/Progress.md) for determinate operations

### Don't

- Don't use for very fast operations (<200ms)
- Don't rely solely on visual spinner for accessibility
- Don't use multiple spinners on the same page simultaneously
- Don't use for determinate progress (use Progress component)
- Don't make spinner too small to see comfortably
- Don't forget to remove spinner when loading completes

## Related Components

- [Progress](../primitives/Progress.md) - For determinate progress (0-100%)
- [Skeleton](../primitives/Skeleton.md) - For content loading placeholders

## References

- [Source](../../src/components/Spinner.tsx)
