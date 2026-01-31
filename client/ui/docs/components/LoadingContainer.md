# LoadingContainer

## Overview

A centered loading display component that combines a spinner with optional loading text. Ideal for full-page or section loading states.

## Import

```tsx
import { LoadingContainer } from '@abe-stack/ui';
```

## Props

| Prop      | Type                   | Default        | Description             |
| --------- | ---------------------- | -------------- | ----------------------- |
| text      | `string`               | `'Loading...'` | Loading text to display |
| size      | `'sm' \| 'md' \| 'lg'` | `'md'`         | Spinner size            |
| className | `string`               | `''`           | Additional CSS classes  |

## Usage

### Basic Example

```tsx
<LoadingContainer />
```

### Custom Text

```tsx
<LoadingContainer text="Fetching data..." />
```

### Different Sizes

```tsx
<LoadingContainer size="sm" text="Loading..." />
<LoadingContainer size="md" text="Loading..." />
<LoadingContainer size="lg" text="Please wait..." />
```

### Conditional Loading

```tsx
{
  isLoading ? <LoadingContainer text="Loading users..." /> : <UserList users={users} />;
}
```

### Full Page Loading

```tsx
<div style={{ height: '100vh' }}>
  <LoadingContainer size="lg" text="Initializing application..." />
</div>
```

## Accessibility

- Spinner has appropriate ARIA attributes
- Text provides context for screen readers
- Centered layout works with various container sizes

## Do's and Don'ts

### Do

- Use descriptive loading text when possible
- Match spinner size to the container/content size
- Show loading state promptly to provide feedback

### Don't

- Use generic "Loading..." when more specific text is available
- Use excessively large spinners for small content areas
- Show loading indefinitely without timeout handling

## Related Components

- [Spinner](./Spinner.md) - Standalone spinner component
- [Skeleton](../elements/Skeleton.md) - Content placeholder loading

## References

- [Source Code](../../src/components/LoadingContainer.tsx)
- [Tests](../../src/components/__tests__/LoadingContainer.test.tsx)
