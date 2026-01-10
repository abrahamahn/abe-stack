# useWindowSize

## Overview

Tracks window dimensions with debounced updates. SSR-safe, returns 0x0 on server.

## Import

```tsx
import { useWindowSize } from '@abe-stack/ui';
```

## Signature

```tsx
function useWindowSize(): { width: number; height: number };
```

## Returns

| Property | Type     | Description         |
| -------- | -------- | ------------------- |
| width    | `number` | Window inner width  |
| height   | `number` | Window inner height |

## Usage

### Basic Example

```tsx
function WindowDisplay() {
  const { width, height } = useWindowSize();

  return (
    <div>
      Window size: {width} x {height}
    </div>
  );
}
```

### Responsive Layout Logic

```tsx
function ResponsiveLayout() {
  const { width } = useWindowSize();

  const columns = width < 768 ? 1 : width < 1024 ? 2 : 3;

  return (
    <Grid columns={columns}>
      {items.map((item) => (
        <Card key={item.id} {...item} />
      ))}
    </Grid>
  );
}
```

### Canvas Sizing

```tsx
function FullscreenCanvas() {
  const { width, height } = useWindowSize();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = width;
      canvas.height = height;
      // Redraw canvas content...
    }
  }, [width, height]);

  return <canvas ref={canvasRef} />;
}
```

### Conditional Component Rendering

```tsx
function Navigation() {
  const { width } = useWindowSize();
  const isMobile = width < 768;

  return isMobile ? <MobileNav /> : <DesktopNav />;
}
```

### With Breakpoint Constants

```tsx
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

function useBreakpoint() {
  const { width } = useWindowSize();

  return {
    isSm: width >= BREAKPOINTS.sm,
    isMd: width >= BREAKPOINTS.md,
    isLg: width >= BREAKPOINTS.lg,
    isXl: width >= BREAKPOINTS.xl,
  };
}
```

## Behavior

- Debounces resize events (150ms)
- SSR-safe (returns 0x0 on server)
- Cleans up event listener on unmount
- Updates on window resize

## Do's and Don'ts

### Do

- Use for JavaScript-based layout decisions
- Use for canvas/SVG sizing
- Combine with debounce for expensive calculations

### Don't

- Use when CSS media queries would work
- Rely on SSR values (hydration mismatch)
- Recalculate on every pixel change (already debounced)

## Related Hooks

- [useMediaQuery](./useMediaQuery.md) - Media query matching
- [useDebounce](./useDebounce.md) - Value debouncing

## References

- [Source Code](../../src/hooks/useWindowSize.ts)
- [Tests](../../src/hooks/__tests__/useWindowSize.test.tsx)
