// main/shared/src/core/index.ts
/**
 * Core Module Barrel
 *
 * Business logic: field schemas, transactions, and auth policy.
 * Infrastructure (errors, envelopes, env) lives in engine/.
 */

// --- Auth policy ---
export {
  can,
  hasPermission,
  type AuthContext,
  type PolicyAction,
  type PolicyResource,
} from './auth/auth.policy';

// --- Field validation schemas ---
export {
  bioSchema,
  dateOfBirthSchema,
  emailSchema,
  firstNameSchema,
  genderSchema,
  identifierSchema,
  isoDateTimeSchema,
  lastNameSchema,
  nameSchema,
  optionalShortTextSchema,
  passwordSchema,
  phoneSchema,
  requiredNameSchema,
  usernameSchema,
  uuidSchema,
  websiteSchema,
} from './schemas';

// --- Transactions (undo/redo) ---
export {
  createListInsertOperation,
  createListRemoveOperation,
  createSetOperation,
  createTransaction,
  invertOperation,
  invertTransaction,
  isListInsertOperation,
  isListRemoveOperation,
  isSetOperation,
  mergeTransactions,
  type ListInsertOperation,
  type ListRemoveOperation,
  type Operation,
  type SetOperation,
  type Transaction,
} from './transactions';
