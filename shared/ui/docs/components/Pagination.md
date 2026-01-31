# Pagination

## Overview

A pagination component for navigating through multiple pages of content with previous/next controls and direct page buttons.

> **Note**: For data fetching and API pagination, see the [Pagination System](../../docs/pagination-guide.md) which provides `usePaginatedQuery` and `useOffsetPaginatedQuery` hooks for infinite scroll and cursor-based pagination.

## Import

```tsx
import { Pagination } from 'abeahn-ui/elements';
```

## Props

| Prop         | Type                     | Default | Description                         |
| ------------ | ------------------------ | ------- | ----------------------------------- |
| totalPages   | `number` (required)      | -       | Total number of pages               |
| value        | `number`                 | -       | Controlled current page (1-indexed) |
| defaultValue | `number`                 | `1`     | Initial page for uncontrolled usage |
| onChange     | `(page: number) => void` | -       | Callback when page changes          |

## Usage

### Basic Example

```tsx
<Pagination totalPages={10} />
```

### Controlled

```tsx
const [currentPage, setCurrentPage] = useState(1);

<Pagination totalPages={20} value={currentPage} onChange={setCurrentPage} />;
```

### With Default Page

```tsx
<Pagination totalPages={5} defaultValue={3} />
```

### Complete Data Pagination Example

```tsx
const [page, setPage] = useState(1);
const itemsPerPage = 10;
const totalItems = 247;
const totalPages = Math.ceil(totalItems / itemsPerPage);

const currentData = data.slice((page - 1) * itemsPerPage, page * itemsPerPage);

<div>
  <div>
    {currentData.map((item) => (
      <div key={item.id}>{item.name}</div>
    ))}
  </div>
  <Pagination totalPages={totalPages} value={page} onChange={setPage} />
  <div>
    Showing {(page - 1) * itemsPerPage + 1}-{Math.min(page * itemsPerPage, totalItems)} of{' '}
    {totalItems} items
  </div>
</div>;
```

### API Pagination

```tsx
const [page, setPage] = useState(1);
const { data, isLoading } = useQuery({
  queryKey: ['items', page],
  queryFn: () => fetchItems({ page, perPage: 20 }),
});

<div>
  {isLoading ? (
    <Spinner />
  ) : (
    <>
      <ItemList items={data.items} />
      <Pagination totalPages={data.totalPages} value={page} onChange={setPage} />
    </>
  )}
</div>;
```

### With Page Info

```tsx
<div>
  <div>
    Page {currentPage} of {totalPages}
  </div>
  <Pagination totalPages={totalPages} value={currentPage} onChange={setCurrentPage} />
</div>
```

## Behavior

- Previous button (`‹`) navigates to the previous page
- Next button (`›`) navigates to the next page
- Number buttons jump directly to that page
- Previous button is disabled on page 1
- Next button is disabled on the last page
- Active page button is visually distinguished
- Page values are 1-indexed (1 to totalPages)

## Accessibility

- Uses semantic `<button>` elements
- Previous/Next buttons are disabled at boundaries
- Active page is indicated via `data-active` attribute
- Keyboard accessible (Tab to navigate, Enter/Space to activate)
- Consider adding `aria-label` to the pagination container

### Recommended ARIA Pattern

```tsx
<nav aria-label="Pagination navigation">
  <Pagination totalPages={totalPages} value={currentPage} onChange={setCurrentPage} />
</nav>
```

### With Accessible Labels

```tsx
{
  /* Wrap in nav with aria-label */
}
<nav aria-label="Search results pagination">
  <Pagination totalPages={10} value={page} onChange={setPage} />
</nav>;
```

## Do's and Don'ts

### Do

- Wrap in `<nav>` with `aria-label`
- Show current page context ("Page X of Y")
- Use reasonable page sizes (10-50 items per page)
- Maintain page state in URL for bookmarking (e.g., ?page=3)
- Disable pagination during loading states
- Consider using "Load More" for mobile

### Don't

- Don't show pagination for very few pages (<3 pages)
- Don't reset scroll position automatically
- Don't use pagination for real-time data
- Don't make pagination too prominent
- Don't forget to handle loading states during page changes

## Limitations

This component renders ALL page buttons. For large page counts (>10), consider:

- Showing ellipsis (...) for skipped pages
- Showing only a window of pages around current page
- Using infinite scroll or "Load More" instead

### Example Improvement

```tsx
{
  /* For large page counts, implement truncation: */
}
{
  /* 1 2 3 ... 8 9 [10] 11 12 ... 48 49 50 */
}
```

## Related Components

- [Button](../components/Button.md) - For action buttons
- [Progress](./Progress.md) - For showing loading progress

## References

- [Source](../../src/elements/Pagination.tsx)
- [Tests](../../src/elements/__tests__/Pagination.test.tsx)
- [Hooks: useControllableState](../../src/hooks/useControllableState.ts)
