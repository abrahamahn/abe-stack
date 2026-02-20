// main/server/system/src/routing/http.types.ts
/**
 * Abstract HTTP interfaces for framework-agnostic route handlers.
 *
 * These interfaces describe the minimal surface a route handler needs from
 * the HTTP layer — no Fastify coupling. Adapters in apps/server bridge
 * concrete Fastify request/reply objects to these shapes.
 */

import type { Logger } from '@bslt/shared/system';

/**
 * Framework-agnostic HTTP request interface.
 *
 * Covers all fields accessed by route handlers in server/core.
 * Concrete frameworks (Fastify) must be structurally assignable to this.
 */
export interface HttpRequest {
  body: unknown;
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
  ip: string;
  method: string;
  url: string;
  correlationId: string;
  logger: Logger;
  user?: { userId: string; role: string; [key: string]: unknown };
  cookies?: Record<string, string | undefined>;
}

/**
 * Framework-agnostic HTTP reply interface.
 *
 * Route handlers use status/send/header — the only surface they need.
 * Concrete frameworks must be structurally assignable to this.
 */
export interface HttpReply {
  status(code: number): this;
  send(data: unknown): void | Promise<void>;
  header(key: string, value: string): this;
}
