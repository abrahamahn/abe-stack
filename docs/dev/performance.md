# Performance

## Database Optimization

### Index Strategy

All foreign keys are indexed by default. Additional indexes follow these patterns:

- **Lookup columns**: Unique indexes on `email`, `canonical_email`, `username` in `users`
- **Composite indexes**: Multi-column indexes for common query patterns (e.g., `(token, expires_at)` for refresh token validation, `(email, success, created_at)` for login attempt counting)
- **Timestamp columns**: Indexes on `created_at` and `expires_at` for range queries and cleanup jobs
- **Soft delete columns**: Indexes on `deleted_at`, `deactivated_at` for filtering active records

### Query Optimization

The refresh token rotation (`main/server/core/src/auth/utils/refresh-token.ts`) demonstrates key optimization patterns:

1. **Parallel independent queries**: User, family, and session lookups run concurrently via `Promise.all`
2. **Composite index usage**: Token lookup uses `(token, expires_at)` index for single-query validation
3. **Atomic transactions**: Token rotation (delete old + insert new) in a single transaction
4. **Minimal round trips**: Batch independent queries to reduce database round trips

```typescript
// Parallel fetch of independent data
const [userRow, familyRow, sessionRow] = await Promise.all([
  db.queryOne(select(USERS_TABLE).where(eq('id', storedToken.userId)).limit(1).toSql()),
  db.queryOne(select(FAMILIES_TABLE).where(eq('id', storedToken.familyId)).limit(1).toSql()),
  db.queryOne(select(SESSIONS_TABLE).where(eq('id', storedToken.familyId)).limit(1).toSql()),
]);
```

### Pagination

Standard pagination pattern used across list endpoints:

```typescript
// Handler receives limit/offset from validated query params
const { limit = 20, offset = 0 } = query;

// Cap maximum to prevent abuse
const cappedLimit = Math.min(limit, 100);

const items = await db.query(
  select(TABLE).orderBy('created_at', 'desc').limit(cappedLimit).offset(offset).toSql(),
);
```

Key rules:

- Default limit: 20 items
- Maximum limit cap: 100 items (prevents full-table scans)
- Always use `ORDER BY` with pagination for deterministic results
- Return total count alongside items for client-side pagination controls

### Cleanup Jobs

Expired tokens and stale data are cleaned up periodically:

```typescript
// Delete expired refresh tokens
await db.execute(deleteFrom(REFRESH_TOKENS_TABLE).where(lt('expires_at', new Date())).toSql());
```

Use `lt('expires_at', now)` with an index on `expires_at` for efficient batch deletion.

## Frontend Performance

### Route-Based Code Splitting

The app root (`main/apps/web/src/app/App.tsx`) wraps all routes in `<Suspense>` with a loading fallback:

```tsx
const AppRoutes = (): ReactElement => {
  return (
    <Suspense fallback={<LoadingContainer />}>
      <Routes>{renderRoutes(appRoutes)}</Routes>
    </Suspense>
  );
};
```

Route components can be lazy-loaded to split the bundle per page, with `<LoadingContainer />` providing a consistent loading state.

### Bundle Splitting

Vite build config (`main/apps/web/vite.config.ts`) defines manual chunk splitting:

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
      },
    },
  },
  chunkSizeWarningLimit: 300,  // Warn on chunks > 300KB
  cssCodeSplit: true,          // CSS split per route
  minify: 'esbuild',
  target: 'es2020',
}
```

Key decisions:

- **vendor-react**: React and ReactDOM are extracted into a stable chunk that changes rarely (good cache hit rate)
- **chunkSizeWarningLimit: 300**: Aggressive threshold catches bundle bloat early
- **cssCodeSplit: true**: Each route loads only its own CSS

### Query Cache Persistence

The app persists the React Query cache to IndexedDB for instant perceived load times on return visits (`main/apps/web/src/app/App.tsx`):

1. On mount, cached data is restored from IndexedDB in the background (non-blocking)
2. The app renders immediately without waiting for cache restoration
3. Cache changes are persisted to IndexedDB with throttling to reduce write frequency
4. Stale data is refreshed in the background via React Query's normal refetch behavior

### Loading States

- **`<LoadingContainer />`**: Full-page loading state for route transitions
- **`<Suspense>`**: React's built-in lazy loading boundary
- **Skeleton loaders**: Individual components can render placeholder skeletons while data loads, preventing layout shift

### Production Optimizations

- **esbuild minification**: Faster than terser with comparable output size
- **ES2020 target**: Modern syntax (no unnecessary polyfills)
- **Tree shaking**: Unused code eliminated by Vite/Rollup
- **`resolve.conditions: ['source']`**: Dev server resolves monorepo packages to source for HMR; production resolves to built output

## Monitoring

### Rate Limit Headers

Every response includes rate limit headers that clients can use to implement backoff:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1708473600
```

### Request Timing (Development)

In non-production mode, the HTTP plugin stack logs timing for every request:

```json
{
  "method": "GET",
  "path": "/api/v1/users/me",
  "statusCode": 200,
  "durationMs": 12,
  "ip": "127.0.0.1",
  "correlationId": "abc-123"
}
```

Use `correlationId` (set via `x-correlation-id` header or auto-generated UUID) to trace requests across services.
