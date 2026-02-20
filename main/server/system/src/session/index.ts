// main/server/system/src/session/index.ts
/**
 * Session Module
 *
 * Redis-backed session storage for horizontal scaling.
 * Provides infrastructure for session-like data (CSRF tokens, rate-limit windows,
 * ephemeral user state) shared across multiple server instances.
 *
 * @module @bslt/server-system/session
 */

export {
  RedisSessionStore,
  createRedisSessionStore,
  type RedisSessionStoreOptions,
  type SessionData,
  type SessionLogger,
  type SessionStore,
} from './redis-session-store';
