// main/shared/src/primitives/schema/types.ts

/**
 * @file Schema Types
 * @description Core type definitions for the runtime validation system.
 * @module Primitives/Schema/Types
 */

// ============================================================================
// Core Schema Types
// ============================================================================

/**
 * Result type for safeParse operations.
 * Discriminated union of success and failure states.
 */
export type SafeParseResult<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * Schema interface for validation.
 * Supports both throwing (`parse`) and safe (`safeParse`) validation methods.
 *
 * @template T - The inferred type of the schema's output.
 */
export interface Schema<T> {
  /**
   * Parse unknown data and return the typed value.
   * @throws {Error} If validation fails.
   */
  parse: (data: unknown) => T;
  /**
   * Parse unknown data and return a result object.
   * Does not throw; checks `success` property.
   */
  safeParse: (data: unknown) => SafeParseResult<T>;
  /**
   * Phantom type for TypeScript inference.
   * @internal
   */
  _type: T;
}

/**
 * Infer the output type from a Schema instance.
 * @example type MyType = InferSchema<typeof mySchema>;
 */
export type InferSchema<S> = S extends Schema<infer T> ? T : never;
