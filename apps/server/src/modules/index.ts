// apps/server/src/modules/index.ts
export {
  registerRoutes,
  handleAdminUnlock,
  handleMe,
} from './routes';

export {
  adminRoutes,
  authRoutes,
  notificationRoutesConfig,
  realtimeRoutes,
  systemRoutes,
  userRoutes,
} from './routes';

export {
  protectedRoute,
  publicRoute,
  registerRouteMap,
} from '@/infrastructure/http/router';
export type {
  HttpMethod,
  ProtectedHandler,
  PublicHandler,
  RouteDefinition,
  RouteHandler,
  RouteMap,
  RouteResult,
  RouterOptions,
  ValidationSchema,
} from '@/infrastructure/http/router';
