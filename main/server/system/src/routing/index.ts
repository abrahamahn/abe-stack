// main/server/system/src/routing/index.ts
export {
  clearRegistry,
  getRegisteredRoutes,
  registerRoute,
  type RouteRegistryEntry,
} from './route.registry';
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
export { type HttpReply, type HttpRequest } from './http.types';
export {
  API_VERSIONS,
  apiVersioningPlugin,
  extractApiVersion,
} from './api.versioning';
export {
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
  type ApiVersion,
  type ApiVersionInfo,
  type ApiVersionSource,
} from './api.versioning.types';
