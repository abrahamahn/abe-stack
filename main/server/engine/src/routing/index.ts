// main/server/engine/src/routing/index.ts
export {
  clearRegistry,
  getRegisteredRoutes,
  registerRoute,
  type RouteRegistryEntry,
} from './route-registry';
export {
  createRouteMap,
  protectedRoute,
  publicRoute,
  registerRouteMap,
  type AuthGuardFactory,
  type HandlerContext,
  type HttpMethod,
  type JsonSchemaObject,
  type RouteDefinition,
  type RouteDeprecation,
  type RouteHandler,
  type RouteMap,
  type RouteOpenApiMeta,
  type RouteResult,
  type RouteSchema,
  type RouterOptions,
  type ValidationSchema,
} from './routing';
