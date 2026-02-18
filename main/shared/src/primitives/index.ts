// main/shared/src/primitives/index.ts
/**
 * Primitives Module Barrel
 *
 * Re-exports from all primitives sub-modules.
 * This is the lowest layer — no imports from engine, core, contracts, or api.
 */

// ============================================================================
// API types
// ============================================================================

export type {
  ApiResponse,
  ApiResult,
  Contract,
  ContractRouter,
  EndpointContract,
  EndpointDef,
  ErrorCode,
  ErrorResponse,
  HttpMethod,
  InferOkData,
  InferResponseData,
  QueryParams,
  RequestBody,
  StatusCode,
  SuccessResponse,
} from './api';

// ============================================================================
// Logger
// ============================================================================

export type { Logger, ServerLogger } from './logger';

// ============================================================================
// Environment
// ============================================================================

export type { ServerEnvironment } from './environment';

// ============================================================================
// Observability
// ============================================================================

export type { BreadcrumbData, ErrorTracker, HasErrorTracker } from './observability';

// ============================================================================
// Schema (types, factory, parsers, composite, scalars, branded IDs)
// ============================================================================

export {
  // types
  type InferSchema,
  type SafeParseResult,
  type Schema,
  // factory
  createSchema,
  // parsers
  coerceDate,
  coerceNumber,
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
  type ParseNumberOptions,
  type ParseStringOptions,
  // composite
  createArraySchema,
  createBrandedStringSchema,
  createBrandedUuidSchema,
  createEnumSchema,
  createLiteralSchema,
  createUnionSchema,
  // scalars
  emailSchema,
  isoDateTimeSchema,
  passwordSchema,
  uuidSchema,
  // branded IDs
  activityIdSchema,
  apiKeyIdSchema,
  auditEventIdSchema,
  consentLogIdSchema,
  emailLogIdSchema,
  emailTemplateKeySchema,
  fileIdSchema,
  inviteIdSchema,
  jobIdSchema,
  legalDocumentIdSchema,
  membershipIdSchema,
  notificationIdSchema,
  organizationIdSchema,
  parsePlanId,
  parseTenantId,
  parseUserId,
  planIdSchema,
  sessionIdSchema,
  subscriptionIdSchema,
  tenantIdSchema,
  userAgreementIdSchema,
  userIdSchema,
  webhookDeliveryIdSchema,
  webhookIdSchema,
  type ActivityId,
  type ApiKeyId,
  type AuditEventId,
  type ConsentLogId,
  type EmailLogId,
  type EmailTemplateKey,
  type FileId,
  type InviteId,
  type JobId,
  type LegalDocumentId,
  type MembershipId,
  type NotificationId,
  type OrganizationId,
  type PlanId,
  type SessionId,
  type SubscriptionId,
  type TenantId,
  type UserId,
  type UserAgreementId,
  type WebhookDeliveryId,
  type WebhookId,
} from './schema';

// ============================================================================
// Constants
// ============================================================================

export {
  // regex
  AUDIT_ACTION_REGEX,
  AUDIT_PATTERNS,
  DATE_ONLY_REGEX,
  EMAIL_REGEX,
  IP_V4_REGEX,
  IP_V6_REGEX,
  PHONE_REGEX,
  REGEX_PATTERNS,
  URL_REGEX,
  USERNAME_REGEX_LOCAL,
  UUID_REGEX,
  // time
  DATE_FORMATS,
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  TIME,
  TIME_ZONE,
  // media
  ALL_MEDIA_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_MEDIA_MIME_TYPES,
  AUDIO_EXTENSIONS,
  EXT_TO_MIME,
  EXTRA_EXT_TO_MIME,
  FILE_PURPOSES,
  IMAGE_EXTENSIONS,
  MAGIC_NUMBERS,
  MIME_TO_EXT,
  STORAGE_PROVIDERS,
  VIDEO_EXTENSIONS,
} from './constants';

// ============================================================================
// Helpers
// ============================================================================

// --- async ---
export { DeferredPromise, delay } from './helpers';

// --- object ---
export {
  assert,
  assertDefined,
  assertNever,
  deepEqual,
  getFieldValue,
  hasDangerousKeys,
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isSafeObjectKey,
  isString,
  sanitizePrototype,
} from './helpers';

// --- string ---
export {
  camelizeKeys,
  camelToSnake,
  canonicalizeEmail,
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  formatBytes,
  normalizeEmail,
  normalizeWhitespace,
  padLeft,
  slugify,
  snakeifyKeys,
  snakeToCamel,
  stripControlChars,
  titleCase,
  toCamelCase,
  toCamelCaseArray,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  trimTrailingSlashes,
  truncate,
  type KeyMapping,
} from './helpers';

// --- parse ---
export { getBool, getInt, getList, getRequired } from './helpers';

// --- response ---
// Note: ApiResponse type omitted here — exported from ./api above.
export {
  isErrorResponse,
  isSuccessResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from './helpers';

// --- result ---
export {
  andThen,
  andThenAsync,
  err,
  fromPromise,
  isErr,
  isOk,
  map,
  mapErr,
  match,
  ok,
  tap,
  tapErr,
  toPromise,
  unwrap,
  unwrapErr,
  unwrapOr,
  type Err,
  type Ok,
  type Result,
} from './helpers';

// --- crypto ---
export {
  constantTimeCompare,
  generateSecureId,
  generateToken,
  generateUUID,
} from './helpers';
