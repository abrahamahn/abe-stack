// apps/server/src/shared/index.ts
/**
 * Shared Kernel
 *
 * Server-specific types for the composition root, DI container,
 * and Fastify request/reply extensions.
 *
 * Domain types (User, Auth, Billing) belong in @abe-stack/* packages.
 * Constants and error classes belong in @abe-stack/core or @abe-stack/auth.
 */

export type {
  AppContext,
  HasContext,
  IServiceContainer,
  ReplyWithCookies,
  RequestWithCookies,
} from './types';
