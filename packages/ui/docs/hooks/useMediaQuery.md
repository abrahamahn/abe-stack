# useMediaQuery

## Overview

Subscribes to a CSS media query and returns whether it matches. Useful for responsive logic in JavaScript.

## Import

```tsx
import { useMediaQuery } from '@abe-stack/ui';
```

## Signature

```tsx
function useMediaQuery(query: string): boolean;
```

## Parameters

| Parameter | Type     | Description            |
| --------- | -------- | ---------------------- |
| query     | `string` | CSS media query string |

## Returns

| Type      | Description                     |
| --------- | ------------------------------- |
| `boolean` | Whether the media query matches |

## Usage

### Responsive Breakpoints

```tsx
function Layout() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  if (isMobile) return <MobileLayout />;
  if (isTablet) return <TabletLayout />;
  return <DesktopLayout />;
}
```

### Dark Mode Detection

```tsx
function App() {
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');

  return <div className={prefersDark ? 'dark-theme' : 'light-theme'}>Content</div>;
}
```

### Reduced Motion

```tsx
function AnimatedComponent() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <div className={prefersReducedMotion ? 'no-animations' : 'with-animations'}>
      Animated content
    </div>
  );
}
```

### Conditional Rendering

```tsx
function Navigation() {
  const isWide = useMediaQuery('(min-width: 1024px)');

  return <nav>{isWide ? <HorizontalNav /> : <HamburgerMenu />}</nav>;
}
```

## Behavior

- Updates when media query match changes
- SSR-safe (returns false on server)
- Cleans up listener on unmount
- Uses matchMedia API

## Do's and Don'ts

### Do

- Use for layout decisions that can't be done in CSS
- Use for accessibility preferences (reduced motion)
- Combine multiple queries for complex layouts

### Don't

- Use when CSS media queries would suffice
- Rely on SSR value (hydration mismatch possible)
- Create too many media query listeners

## Related Hooks

- [useWindowSize](./useWindowSize.md) - Window dimensions
- [useThemeMode](./useThemeMode.md) - Theme mode with dark mode detection

## References

- [Source Code](../../src/hooks/useMediaQuery.ts)
