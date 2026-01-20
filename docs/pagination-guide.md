# Pagination Guide

This guide provides comprehensive documentation for the pagination system implemented in Abe Stack. The system supports both offset-based and cursor-based pagination with production-ready features including error handling, performance optimizations, and React hooks.

## Overview

The pagination system consists of:

- **Core Types & Schemas** (`@abe-stack/core`) - Type definitions and validation schemas
- **Cursor Utilities** (`@abe-stack/core`) - Encoding/decoding and query building utilities
- **Backend Middleware** (`@abe-stack/server`) - Request parsing and response formatting
- **React Hooks** (`@abe-stack/ui`) - Infinite scroll and traditional pagination hooks
- **Error Handling** - Comprehensive error types and validation

## Quick Start

### Backend Setup

```typescript
import { createPaginationMiddleware } from '@infra/pagination';

// Add middleware to your Fastify app
app.addHook(
  'preHandler',
  createPaginationMiddleware({
    defaultLimit: 50,
    maxLimit: 1000,
    defaultSortBy: 'createdAt',
    defaultSortOrder: 'desc',
  }),
);
```

### API Endpoint

```typescript
import type { PaginationRequest } from '@infra/pagination';

app.get('/api/items', {
  handler: async (request: PaginationRequest) => {
    const { pagination } = request;

    if (pagination.type === 'cursor') {
      // Apply cursor pagination to database query
      const result = await pagination.helpers.applyCursorPagination(
        db.items, // Your query builder
        pagination.cursor!,
        'createdAt', // sort field
      );

      return {
        status: 200,
        body: pagination.helpers.createCursorResult(
          result.data,
          result.nextCursor,
          result.hasNext,
          pagination.cursor!.limit,
        ),
      };
    }

    // Handle offset pagination...
  },
});
```

### Frontend Usage

```typescript
import { usePaginatedQuery } from '@abe-stack/ui';

function ItemList() {
  const {
    data,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = usePaginatedQuery({
    queryKey: ['items'],
    queryFn: (options) => api.items.list(options),
    initialOptions: { limit: 20 },
  });

  return (
    <div>
      {data.map((item) => (
        <Item key={item.id} item={item} />
      ))}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## Architecture

### Core Types

#### PaginationOptions

```typescript
interface PaginationOptions {
  page: number; // Page number (1-based)
  limit: number; // Items per page
  sortBy?: string; // Sort field
  sortOrder: 'asc' | 'desc'; // Sort direction
}
```

#### CursorPaginationOptions

```typescript
interface CursorPaginationOptions {
  cursor?: string; // Base64-encoded cursor
  limit: number; // Items per page
  sortBy?: string; // Sort field
  sortOrder: 'asc' | 'desc'; // Sort direction
}
```

#### PaginatedResult<T>

```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalPages: number;
}
```

#### CursorPaginatedResult<T>

```typescript
interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasNext: boolean;
  limit: number;
}
```

### Cursor Encoding

Cursors are encoded as URL-safe base64 strings containing:

- Primary sort field value
- Tie-breaker field value (usually ID)
- Sort order
- Optional additional values

```typescript
// Example cursor data
{
  value: "2024-01-01T00:00:00Z",
  tieBreaker: "123",
  sortOrder: "desc"
}

// Encoded: "WzIwMjQtMDEtMDFUMDA6MDA6MDBaIiwiMTIzIiwiZGVzYyJd"
```

## Backend Implementation

### Middleware Configuration

```typescript
const paginationMiddleware = createPaginationMiddleware({
  defaultLimit: 50, // Default items per page
  maxLimit: 1000, // Maximum allowed limit
  defaultSortBy: 'createdAt', // Default sort field
  defaultSortOrder: 'desc', // Default sort order
  enableCursorPagination: true, // Enable cursor pagination
  paramNames: {
    // Customize query parameter names
    page: 'page',
    limit: 'limit',
    cursor: 'cursor',
    sortBy: 'sortBy',
    sortOrder: 'sortOrder',
  },
});
```

### Database Integration

#### Cursor Pagination with SQL

```typescript
import { buildCursorPaginationQuery } from '@abe-stack/core';

function getItemsWithCursor(options: CursorPaginationOptions) {
  const { whereClause, orderByClause, params } = buildCursorPaginationQuery(
    options.cursor,
    'createdAt',
    options.sortOrder,
    'id', // tie-breaker field
  );

  let query = db('items');

  if (whereClause) {
    query = query.whereRaw(whereClause, params);
  }

  return query.orderByRaw(orderByClause).limit(options.limit + 1); // +1 to check for next page
}
```

#### Offset Pagination

```typescript
function getItemsWithOffset(options: PaginationOptions) {
  const { page, limit, sortBy, sortOrder } = options;
  const offset = (page - 1) * limit;

  return db('items')
    .orderBy(sortBy || 'createdAt', sortOrder)
    .limit(limit)
    .offset(offset);
}
```

### Error Handling

The system provides specific error types for different scenarios:

```typescript
import { PaginationError, PAGINATION_ERROR_TYPES } from '@abe-stack/core';

try {
  // Pagination logic...
} catch (error) {
  if (PaginationError.isType(error, PAGINATION_ERROR_TYPES.INVALID_CURSOR)) {
    return { status: 400, body: { message: 'Invalid pagination cursor' } };
  }
  if (PaginationError.isType(error, PAGINATION_ERROR_TYPES.INVALID_LIMIT)) {
    return { status: 400, body: { message: 'Invalid page size' } };
  }
}
```

## Frontend Implementation

### usePaginatedQuery Hook

For infinite scroll with cursor pagination:

```typescript
const {
  data, // Flattened array of all loaded items
  isLoading, // Initial loading state
  isFetchingNextPage, // Loading next page state
  hasNextPage, // Whether more data is available
  fetchNextPage, // Function to load next page
  refetch, // Refetch all data
  reset, // Reset pagination state
  error, // Error state
} = usePaginatedQuery({
  queryKey: ['items'],
  queryFn: (options) => api.items.list(options),
  initialOptions: {
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  },
  onDataReceived: (data, isInitialLoad) => {
    console.log(`Loaded ${data.length} items`);
  },
  onError: (error) => {
    console.error('Pagination error:', error);
  },
});
```

### useOffsetPaginatedQuery Hook

For traditional page-based pagination:

```typescript
const { data, currentPage, totalPages, hasNextPage, hasPrevPage, fetchPage, isLoading } =
  useOffsetPaginatedQuery({
    queryKey: ['items'],
    queryFn: (options) => api.items.list(options),
    initialOptions: { page: 1, limit: 20 },
  });
```

### Manual Cursor Management

For advanced use cases, you can manage cursors manually:

```typescript
import { encodeCursor, decodeCursor } from '@abe-stack/core';

function createCustomCursor(item: any, sortBy: string) {
  return encodeCursor({
    value: item[sortBy],
    tieBreaker: item.id,
    sortOrder: 'desc',
  });
}

function parseCursor(cursor: string) {
  const data = decodeCursor(cursor);
  return data
    ? {
        sortValue: data.value,
        tieBreaker: data.tieBreaker,
        sortOrder: data.sortOrder,
      }
    : null;
}
```

## Performance Considerations

### Cursor Encoding Optimization

- Uses compact array format instead of objects
- URL-safe base64 encoding
- Backward compatible with legacy format

### Large Dataset Handling

For arrays with > 1000 items, use optimized functions:

```typescript
import { paginateLargeArrayWithCursor } from '@abe-stack/core';

// Uses binary search for cursor positioning
const result = paginateLargeArrayWithCursor(largeArray, options);
```

### Database Indexing

Ensure proper database indexes for pagination performance:

```sql
-- For cursor pagination
CREATE INDEX idx_items_created_at_id ON items (created_at DESC, id DESC);

-- For offset pagination
CREATE INDEX idx_items_created_at ON items (created_at DESC);
```

### Memory Usage

- Cursor pagination doesn't require counting total items
- No offset calculations that slow down with large datasets
- Fixed memory usage regardless of page number

## Best Practices

### Choosing Pagination Type

**Use Cursor Pagination for:**

- Large datasets (50k+ items)
- Real-time data
- Infinite scroll interfaces
- APIs consumed by mobile apps

**Use Offset Pagination for:**

- Small datasets
- Traditional web pagination
- Random access to specific pages
- Admin interfaces

### API Design

```typescript
// Good: Consistent pagination across endpoints
GET /api/users?cursor=...&limit=50
GET /api/posts?cursor=...&limit=50

// Good: Clear pagination parameters
GET /api/items?page=1&limit=20&sortBy=name&sortOrder=asc

// Avoid: Mixing pagination types in same endpoint
GET /api/items?page=1&cursor=... // Confusing
```

### Error Handling

```typescript
// Client-side error handling
const { error, isError } = usePaginatedQuery({...});

if (isError) {
  if (PaginationError.isType(error, PAGINATION_ERROR_TYPES.INVALID_CURSOR)) {
    // Handle invalid cursor (e.g., redirect to first page)
    reset();
  }
}
```

### Testing

```typescript
// Unit test pagination logic
describe('Pagination', () => {
  it('should handle empty results', () => {
    const result = paginateArrayWithCursor([], { limit: 10 });
    expect(result.data).toHaveLength(0);
    expect(result.hasNext).toBe(false);
  });

  it('should validate cursor data', () => {
    expect(decodeCursor('invalid')).toBeNull();
    expect(decodeCursor('')).toBeNull();
  });
});
```

## Migration Guide

### From Offset to Cursor Pagination

1. Update API endpoints to accept `cursor` parameter
2. Replace `page`/`total` logic with `cursor`/`hasNext`
3. Update frontend to use `usePaginatedQuery` instead of `useOffsetPaginatedQuery`
4. Add database indexes for cursor fields

### Backward Compatibility

The system maintains backward compatibility:

- Existing offset pagination continues to work
- Cursor encoding handles both old and new formats
- Error types provide clear migration paths

## Troubleshooting

### Common Issues

**Invalid Cursor Errors**

```typescript
// Check cursor format
const decoded = decodeCursor(cursor);
if (!decoded) {
  console.error('Invalid cursor format');
}
```

**Performance Issues**

```typescript
// Add database indexes
CREATE INDEX CONCURRENTLY idx_table_sort_field ON table (sort_field, id);

// Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE SELECT * FROM items WHERE ... ORDER BY ... LIMIT ...;
```

**Memory Issues**

```typescript
// For large arrays, use streaming or chunked processing
const BATCH_SIZE = 1000;
for (let i = 0; i < largeArray.length; i += BATCH_SIZE) {
  const batch = largeArray.slice(i, i + BATCH_SIZE);
  // Process batch
}
```

## Examples

### Complete API Endpoint

```typescript
// apps/server/src/modules/items/routes.ts
import { protectedRoute } from '@infra/router';
import type { PaginationRequest } from '@infra/pagination';
import type { CursorPaginatedResult, Item } from '@abe-stack/core';

export const itemRoutes = {
  'items/list': protectedRoute<undefined, CursorPaginatedResult<Item>>(
    'GET',
    async (ctx, _, req: PaginationRequest) => {
      const { pagination } = req;

      if (pagination.type !== 'cursor') {
        return {
          status: 400,
          body: { message: 'Cursor pagination required' },
        };
      }

      try {
        const result = await ctx.db.items.paginateWithCursor(pagination.cursor!);

        return {
          status: 200,
          body: pagination.helpers.createCursorResult(
            result.data,
            result.nextCursor,
            result.hasNext,
            pagination.cursor!.limit,
          ),
        };
      } catch (error) {
        if (PaginationError.isPaginationError(error)) {
          return {
            status: 400,
            body: { message: error.message },
          };
        }
        throw error;
      }
    },
    'user',
  ),
};
```

### React Component with Virtual Scrolling

```typescript
// apps/web/src/features/items/ItemList.tsx
import { usePaginatedQuery, useVirtualScroll } from '@abe-stack/ui';

function ItemList() {
  const pagination = usePaginatedQuery({
    queryKey: ['items'],
    queryFn: api.items.list,
    initialOptions: { limit: 50 },
  });

  const { virtualItems, totalHeight, scrollElementRef } = useVirtualScroll({
    items: pagination.data,
    itemHeight: 60,
    containerHeight: 400,
    overscan: 5,
  });

  return (
    <div
      ref={scrollElementRef}
      style={{ height: 400, overflow: 'auto' }}
      onScroll={() => {
        // Load more when nearing bottom
        if (pagination.hasNextPage && !pagination.isFetchingNextPage) {
          const { scrollTop, scrollHeight, clientHeight } = scrollElementRef.current!;
          if (scrollTop + clientHeight >= scrollHeight - 200) {
            pagination.fetchNextPage();
          }
        }
      }}
    >
      <div style={{ height: totalHeight }}>
        {virtualItems.map(({ index, style }) => (
          <div key={pagination.data[index].id} style={style}>
            <Item item={pagination.data[index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

This pagination system provides a robust, scalable solution suitable for production applications serving thousands to millions of users.
