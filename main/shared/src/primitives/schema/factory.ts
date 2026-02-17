// main/shared/src/primitives/schema/factory.ts

/**
 * @file Schema Factory
 * @description Utilities for creating custom schemas.
 * @module Primitives/Schema/Factory
 */

import type { SafeParseResult, Schema } from './types';

// ============================================================================
// Core Factory
// ============================================================================

/**
 * Create a schema from a validation function.
 * This is the fundamental building block for all schemas.
 *
 * @param validate - Function that throws an Error if validation fails, or returns the value if valid.
 * @returns A Schema object with `parse` and `safeParse` methods.
 */
export function createSchema<T>(validate: (data: unknown) => T): Schema<T> {
  return {
    parse: validate,
    safeParse: (data: unknown): SafeParseResult<T> => {
      try {
        const result = validate(data);
        return { success: true, data: result };
      } catch (e) {
        return { success: false, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    _type: undefined as unknown as T,
  };
}
