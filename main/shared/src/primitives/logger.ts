// main/shared/src/primitives/logger.ts
/**
 * Logger Interface
 *
 * Minimal, framework-agnostic logger contract used across all layers.
 * The engine/logger module provides concrete implementations and the
 * more detailed LogData type for structured logging.
 */

/**
 * Generic Logger interface.
 *
 * All log methods accept either (msg, data?) or (data, msg) overloads
 * to match pino's calling convention. Optional methods (trace, fatal, child)
 * may not be available on all implementations.
 */
export interface Logger {
  info(msg: string, data?: Record<string, unknown>): void;
  info(data: Record<string, unknown>, msg: string): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  warn(data: Record<string, unknown>, msg: string): void;
  error(msg: string | Error, data?: Record<string, unknown>): void;
  error(data: unknown, msg?: string): void;
  debug(msg: string, data?: Record<string, unknown>): void;
  debug(data: Record<string, unknown>, msg: string): void;
  trace?(msg: string, data?: Record<string, unknown>): void;
  trace?(data: Record<string, unknown>, msg: string): void;
  fatal?(msg: string | Error, data?: Record<string, unknown>): void;
  fatal?(data: Record<string, unknown>, msg: string): void;
  child?(bindings: Record<string, unknown>): Logger;
}

/** Backward-compatible alias used by server packages. */
export type ServerLogger = Logger;
