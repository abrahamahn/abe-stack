# Module Creation Guide

## Quick Start

```bash
pnpm scaffold:module <name>
```

Where `<name>` is a kebab-case module name (e.g., `my-feature`, `payments`, `analytics`).

## What Gets Generated

```text
src/server/core/src/<name>/
├── index.ts          # Barrel exports (explicit named exports)
├── types.ts          # Module context interface extending BaseContext
├── service.ts        # Business logic (no HTTP awareness)
├── service.test.ts   # Service unit tests
├── handlers.ts       # Thin HTTP layer (calls services, formats responses)
├── handlers.test.ts  # Handler unit tests
└── routes.ts         # Route definitions using createRouteMap
```

The scaffold also patches `src/apps/server/src/routes/routes.ts` to import and register the new module's routes.

## Generated File Structure

### `types.ts`

Defines a narrow context interface for the module:

```typescript
export interface MyFeatureAppContext extends BaseContext {
  readonly repos: Record<string, unknown>;
}
```

Add your module-specific repository types here.

### `service.ts`

Pure business logic — no HTTP, no Fastify:

```typescript
export async function listMyFeature(ctx: MyFeatureAppContext): Promise<unknown[]> {
  // Implementation here
}
```

### `handlers.ts`

Thin HTTP layer using the `asAppContext` pattern:

```typescript
export async function handleListMyFeature(
  ctx: HandlerContext, _body: unknown, request: FastifyRequest, reply: FastifyReply,
): Promise<{ status: 200; body: { items: unknown[] } }> {
  const appCtx = asAppContext(ctx);
  const items = await listMyFeature(appCtx);
  return { status: 200, body: { items } };
}
```

### `routes.ts`

Uses the route map pattern:

```typescript
export const myFeatureRoutes = createRouteMap([
  ['my-feature', protectedRoute('GET', handleListMyFeature, 'user')],
]);
```

## Customizing the Skeleton

After scaffolding:

1. **Add repository types** — Update `types.ts` with your domain repositories
2. **Implement services** — Add business logic in `service.ts`
3. **Add handlers** — Map service calls to HTTP responses in `handlers.ts`
4. **Define routes** — Add more route entries in `routes.ts`
5. **Write tests** — Expand the generated test skeletons

## Naming Conventions

| Input (kebab-case) | PascalCase | camelCase | Usage |
|---|---|---|---|
| `my-feature` | `MyFeature` | `myFeature` | Types, variables |
| `api-keys` | `ApiKeys` | `apiKeys` | Types, variables |
| `analytics` | `Analytics` | `analytics` | Types, variables |

## Validation Rules

- Name must be kebab-case (`/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`)
- Name must not conflict with an existing module directory
- The `--force` flag is not supported (prevents overwriting)
