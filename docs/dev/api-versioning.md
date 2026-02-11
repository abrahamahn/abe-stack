# API Versioning

## Current Strategy

All API routes use the `/api/v1/` prefix:

```
GET  /api/v1/users/me
POST /api/v1/auth/login
GET  /api/v1/activities
```

### Backward Compatibility

Requests to `/api/*` (without version) are automatically redirected to `/api/v1/*` via a 302 redirect. This ensures existing clients continue to work during the transition.

Exceptions (not redirected):
- `/api/v1/*` — already versioned
- `/api/docs` — Swagger UI

## Deprecating a Route

Add the `deprecated` field to a route definition:

```typescript
const routes = createRouteMap([
  ['old-endpoint', protectedRoute('GET', handleOldEndpoint, 'user', undefined, undefined)],
]);

// Mark as deprecated with sunset date
routes.get('old-endpoint')!.deprecated = {
  sunset: 'Sat, 01 Jan 2028 00:00:00 GMT',
  message: 'Use /api/v1/new-endpoint instead',
};
```

Or set it inline using the `RouteDefinition` type:

```typescript
const deprecatedRoute: RouteDefinition = {
  method: 'GET',
  handler: handleOldEndpoint,
  isPublic: false,
  roles: ['user'],
  deprecated: {
    sunset: 'Sat, 01 Jan 2028 00:00:00 GMT',
    message: 'Use /api/v1/new-endpoint instead',
  },
};
```

### Response Headers

When a route is marked deprecated, these headers are added to every response:

| Header | Value | Purpose |
|---|---|---|
| `Deprecation` | `true` | Signals the endpoint is deprecated (RFC 8594) |
| `Sunset` | HTTP-date | When the endpoint will be removed |
| `X-Deprecation-Notice` | String | Human-readable migration instructions |

## When to Create v2

Create a new API version (`/api/v2/`) only when:

1. **Breaking changes** to request/response schemas that cannot be backward-compatible
2. **Semantic changes** where the same endpoint returns fundamentally different data
3. **Authentication changes** that require different client behavior

Do **not** create v2 for:
- Adding new fields to responses (backward-compatible)
- Adding new endpoints
- Deprecating endpoints (use the `deprecated` field instead)
- Bug fixes to existing endpoints

## Sunset Timeline

1. **Announce** — Add `deprecated` field, document in changelog
2. **Grace period** — Minimum 6 months with deprecation headers active
3. **Remove** — Delete the route after sunset date passes
