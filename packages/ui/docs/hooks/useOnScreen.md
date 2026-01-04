# useOnScreen

## Overview

Detects if an element is visible in the viewport using IntersectionObserver. Useful for lazy loading, infinite scroll, and scroll-triggered animations.

## Import

```tsx
import { useOnScreen } from '@abe-stack/ui';
```

## Signature

```tsx
function useOnScreen<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  options?: IntersectionObserverInit,
): boolean;
```

## Parameters

| Parameter | Type                         | Description                   |
| --------- | ---------------------------- | ----------------------------- |
| ref       | `React.RefObject<T \| null>` | Ref to the element to observe |
| options   | `IntersectionObserverInit`   | IntersectionObserver options  |

### IntersectionObserver Options

| Option     | Type                 | Description                             |
| ---------- | -------------------- | --------------------------------------- |
| root       | `Element \| null`    | Scrolling container (default: viewport) |
| rootMargin | `string`             | Margin around root (e.g., "100px")      |
| threshold  | `number \| number[]` | Visibility threshold (0-1)              |

## Returns

| Type      | Description                    |
| --------- | ------------------------------ |
| `boolean` | Whether the element is visible |

## Usage

### Lazy Loading Images

```tsx
function LazyImage({ src, alt }) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref);
  const [loaded, setLoaded] = useState(false);

  return (
    <div ref={ref}>
      {(isVisible || loaded) && <img src={src} alt={alt} onLoad={() => setLoaded(true)} />}
    </div>
  );
}
```

### Infinite Scroll

```tsx
function InfiniteList({ loadMore }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const isAtEnd = useOnScreen(sentinelRef, { rootMargin: '100px' });

  useEffect(() => {
    if (isAtEnd) {
      loadMore();
    }
  }, [isAtEnd, loadMore]);

  return (
    <div>
      {items.map((item) => (
        <Item key={item.id} {...item} />
      ))}
      <div ref={sentinelRef} /> {/* Sentinel element */}
    </div>
  );
}
```

### Scroll Animations

```tsx
function AnimatedSection({ children }) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref, { threshold: 0.3 });

  return (
    <div ref={ref} className={isVisible ? 'fade-in' : 'hidden'}>
      {children}
    </div>
  );
}
```

### With Custom Threshold

```tsx
function VideoPlayer({ src }) {
  const ref = useRef<HTMLVideoElement>(null);
  const isVisible = useOnScreen(ref, { threshold: 0.5 }); // 50% visible

  useEffect(() => {
    if (ref.current) {
      isVisible ? ref.current.play() : ref.current.pause();
    }
  }, [isVisible]);

  return <video ref={ref} src={src} />;
}
```

## Behavior

- Uses IntersectionObserver for performance
- Cleans up observer on unmount
- Returns false if IntersectionObserver unavailable

## Do's and Don'ts

### Do

- Use for lazy loading images and components
- Use for infinite scroll triggers
- Set appropriate rootMargin for preloading

### Don't

- Use for elements that need immediate visibility check
- Forget to handle the initial false state
- Create too many observers (batch when possible)

## References

- [Source Code](../../src/hooks/useOnScreen.ts)
