// infra/contracts/src/schema.ts
/**
 * Schema Factory Helpers
 *
 * Runtime utilities for creating validation schemas.
 */

import type { SafeParseResult, Schema } from './types.js';

/**
 * Create a schema from a validation function.
 * This is the building block for all manual validation schemas.
 *
 * @param validate - A function that validates and transforms unknown data into type T
 * @returns A Schema object with parse and safeParse methods
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
