// packages/shared/src/contracts/types.ts
/**
 * Contract Type Definitions
 *
 * Type-safe API endpoint definitions replacing ts-rest.
 * Used by both contracts and SDK for type inference.
 */

// ============================================================================
// Core Types
// ============================================================================

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/**
 * Schema interface for validation.
 * Replaces zod schemas with a simple interface that supports parse/safeParse.
 */
export interface Schema<T> {
  parse: (data: unknown) => T;
  safeParse: (data: unknown) => { success: true; data: T } | { success: false; error: Error };
  _type: T; // Phantom type for inference
}

/**
 * Definition of a single API endpoint.
 * Replaces ts-rest contract structure with plain TypeScript.
 */
export interface EndpointDef<TBody = unknown, TResponse = unknown, TQuery = unknown> {
  method: HttpMethod;
  path: string;
  body?: Schema<TBody>;
  query?: Schema<TQuery>;
  responses: Record<string, Schema<TResponse>>;
  summary?: string;
}

// ============================================================================
// Type Helpers
// ============================================================================

/**
 * Extract the success response type (200 or 201) from an endpoint definition.
 */
export type SuccessResponse<E extends EndpointDef> = '200' extends keyof E['responses']
  ? E['responses']['200'] extends Schema<infer R>
    ? R
    : never
  : '201' extends keyof E['responses']
    ? E['responses']['201'] extends Schema<infer R>
      ? R
      : never
    : '302' extends keyof E['responses']
      ? E['responses']['302'] extends Schema<infer R>
        ? R
        : never
      : unknown;

/**
 * Extract the request body type from an endpoint definition.
 */
export type RequestBody<E extends EndpointDef> = E['body'] extends Schema<infer B> ? B : undefined;

/**
 * Extract the query parameters type from an endpoint definition.
 */
export type QueryParams<E extends EndpointDef> = E['query'] extends Schema<infer Q> ? Q : undefined;

// ============================================================================
// Contract Types
// ============================================================================

/**
 * A contract is a record of endpoint names to endpoint definitions.
 */
export type Contract = Record<string, EndpointDef>;

/**
 * A router combines multiple contracts into a namespace.
 */
export type ContractRouter = Record<string, Contract>;

// ============================================================================
// SafeParse Result Type
// ============================================================================

/**
 * Result type for safeParse operations.
 */
export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * Infer the type from a schema (similar to z.infer).
 */
export type InferSchema<S> = S extends Schema<infer T> ? T : never;

// ============================================================================
// Service Interfaces (Ports - Hexagonal Architecture)
// ============================================================================

/**
 * Generic Logger interface.
 *
 * Provides Pino-compatible overloads supporting both `(msg, data?)` and
 * `(data, msg)` calling conventions. `FastifyBaseLogger` (Pino) structurally
 * satisfies this contract, so the server can pass its logger directly.
 *
 * `trace` and `fatal` are optional because not all logger implementations
 * provide them. `child` is optional for the same reason.
 */
export interface Logger {
  /** Log an info-level message */
  info(msg: string, data?: Record<string, unknown>): void;
  /** Log an info-level message with structured data first (Pino convention) */
  info(data: Record<string, unknown>, msg: string): void;
  /** Log a warn-level message */
  warn(msg: string, data?: Record<string, unknown>): void;
  /** Log a warn-level message with structured data first (Pino convention) */
  warn(data: Record<string, unknown>, msg: string): void;
  /** Log an error-level message */
  error(msg: string | Error, data?: Record<string, unknown>): void;
  /** Log an error-level message with structured data first (Pino convention) */
  error(data: unknown, msg?: string): void;
  /** Log a debug-level message */
  debug(msg: string, data?: Record<string, unknown>): void;
  /** Log a debug-level message with structured data first (Pino convention) */
  debug(data: Record<string, unknown>, msg: string): void;
  /** Log a trace-level message (optional -- not all loggers support trace) */
  trace?(msg: string, data?: Record<string, unknown>): void;
  /** Log a trace-level message with structured data first (optional) */
  trace?(data: Record<string, unknown>, msg: string): void;
  /** Log a fatal-level message (optional -- not all loggers support fatal) */
  fatal?(msg: string | Error, data?: Record<string, unknown>): void;
  /** Log a fatal-level message with structured data first (optional) */
  fatal?(data: Record<string, unknown>, msg: string): void;
  /**
   * Create a child logger with additional bindings (optional).
   *
   * @param bindings - Key-value pairs to attach to all child log entries
   * @returns A new logger instance with the bindings
   */
  child?(bindings: Record<string, unknown>): Logger;
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: { name: string; address: string };
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailService {
  send(options: EmailOptions): Promise<EmailResult>;
}

export interface StorageService {
  upload(key: string, data: Uint8Array | string, contentType: string): Promise<string>;
  download(key: string): Promise<unknown>;
  delete(key: string): Promise<void>;
  getSignedUrl(key: string, expiresIn: number): Promise<string>;
}

export interface NotificationService {
  isConfigured(): boolean;
  getFcmProvider?(): unknown;
}
