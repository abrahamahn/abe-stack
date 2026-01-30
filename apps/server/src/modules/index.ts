// apps/server/src/modules/index.ts
/**
 * Modules barrel — only exports the route registration function.
 * Consumers import handlers, types, and route maps directly from @abe-stack/* packages.
 */
export { registerRoutes } from './routes';
