# useDebounce

## Overview

Debounces a value by delaying updates until after a specified delay. Useful for search inputs, API calls, and expensive operations.

## Import

```tsx
import { useDebounce } from '@abe-stack/ui';
```

## Signature

```tsx
function useDebounce<T>(value: T, delay?: number): T;
```

## Parameters

| Parameter | Type     | Default | Description           |
| --------- | -------- | ------- | --------------------- |
| value     | `T`      | -       | Value to debounce     |
| delay     | `number` | `500`   | Delay in milliseconds |

## Returns

| Type | Description                           |
| ---- | ------------------------------------- |
| `T`  | Debounced value (updates after delay) |

## Usage

### Search Input

```tsx
function SearchInput() {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      searchAPI(debouncedQuery);
    }
  }, [debouncedQuery]);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search..." />;
}
```

### API Filtering

```tsx
function FilteredList({ items }) {
  const [filter, setFilter] = useState('');
  const debouncedFilter = useDebounce(filter, 250);

  const filteredItems = useMemo(
    () => items.filter((item) => item.name.includes(debouncedFilter)),
    [items, debouncedFilter],
  );

  return (
    <div>
      <input value={filter} onChange={(e) => setFilter(e.target.value)} />
      <ul>
        {filteredItems.map((item) => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Resize Handler

```tsx
function ResizeAware() {
  const [width, setWidth] = useState(window.innerWidth);
  const debouncedWidth = useDebounce(width, 150);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Use debouncedWidth for expensive calculations
  return <Chart width={debouncedWidth} />;
}
```

## Do's and Don'ts

### Do

- Use for search inputs to reduce API calls
- Adjust delay based on use case (typing: 300ms, resize: 150ms)
- Combine with loading states for better UX

### Don't

- Use for values that need immediate updates
- Set delay too high (causes perceived lag)
- Forget that the debounced value lags behind

## References

- [Source Code](../../src/hooks/useDebounce.ts)
