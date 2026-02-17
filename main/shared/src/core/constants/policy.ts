// main/shared/src/core/constants/policy.ts

/**
 * @file Policy Constants
 * @description Constants defining business logic policies.
 * @module Core/Constants/Policy
 */

/**
 * Fields that cannot be updated directly by users.
 */
export const PROTECTED_FIELDS = new Set<string>([
  'id',
  'version',
  'created_at',
  'updated_at',
  'password_hash',
  'passwordHash',
]);
