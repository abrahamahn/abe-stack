// main/shared/src/core/schema.utils.ts
/**
 * Schema Factory Helpers — Re-export barrel
 *
 * All schema primitives now live in types/schema.ts (L0).
 * This file re-exports for backward compatibility.
 *
 * @module Core/SchemaUtils
 */

export {
  URL_REGEX,
  UUID_REGEX,
  coerceDate,
  coerceNumber,
  createArraySchema,
  createBrandedStringSchema,
  createBrandedUuidSchema,
  createEnumSchema,
  createLiteralSchema,
  createSchema,
  createUnionSchema,
  parseBoolean,
  parseNullable,
  parseNullableOptional,
  parseNumber,
  parseObject,
  parseOptional,
  parseRecord,
  parseString,
  parseTypedRecord,
  withDefault,
  type InferSchema,
  type ParseNumberOptions,
  type ParseStringOptions,
  type SafeParseResult,
  type Schema,
} from '../primitives/schema';
