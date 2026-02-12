// src/shared/src/core/index.ts

export {
  type ApiResponse,
  type ApiResult,
  type Contract,
  type EndpointContract,
  type EndpointDef,
  type ErrorResponse,
  type HttpMethod,
  type InferResponseData,
  type InferSchema,
  type Logger,
  type QueryParams,
  type RequestBody,
  type SafeParseResult,
  type Schema,
  type StatusCode,
  type SuccessResponse,
} from './api';

export {
  ERROR_CODES,
  ERROR_MESSAGES,
  HTTP_STATUS,
  type ErrorCode,
  type HttpStatusCode,
} from './constants';

export {
  type AuthenticatedUser,
  type BaseContext,
  type HasBilling,
  type HasCache,
  type HasEmail,
  type HasNotifications,
  type HasPubSub,
  type HasStorage,
  type ReplyContext,
  type RequestContext,
  type RequestInfo,
} from './context';

export { type ServerEnvironment } from './environment';

export {
  AppError,
  BadRequestError,
  BaseError,
  ConfigurationError,
  ConflictError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  ForbiddenError,
  InternalError,
  InternalServerError,
  InvalidCredentialsError,
  InvalidTokenError,
  NotFoundError,
  OAuthError,
  OAuthStateMismatchError,
  ResourceNotFoundError,
  TokenReuseError,
  TooManyRequestsError,
  TotpInvalidError,
  TotpRequiredError,
  UnauthorizedError,
  UnprocessableError,
  UserNotFoundError,
  ValidationError,
  WeakPasswordError,
  formatValidationErrors,
  getErrorStatusCode,
  getSafeErrorMessage,
  isAppError,
  toAppError,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
  type ValidationIssue,
} from './errors';

export {
  isErrorResponse,
  isSuccessResponse,
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from './response';

export {
  assert,
  assertDefined,
  assertNever,
  isAuthenticatedRequest,
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isSafeObjectKey,
  isString,
} from './guard';

export { type NativeBridge } from './native';

export { err, isErr, isOk, ok, type Result } from './result';

export {
  can,
  hasPermission,
  type AuthContext,
  type PolicyAction,
  type PolicyResource,
} from './policy';

export { baseEnvSchema, getRawEnv, validateEnv, type BaseEnv } from './env';

export {
  type Attachment,
  type AuditEntry,
  type AuditQuery,
  type AuditResponse,
  type AuditService,
  type BaseStorageConfig,
  type CacheService,
  type ConfigService,
  type DeletionService,
  type EmailOptions,
  type EmailService,
  type HealthCheckResult,
  type InfrastructureService,
  type Job,
  type JobHandler,
  type JobOptions,
  type JobQueueService,
  type LocalStorageConfig,
  type MetricsService,
  type NotificationService,
  type ReadableStreamLike,
  type RecordAuditRequest,
  type S3StorageConfig,
  type SendResult,
  type StorageClient,
  type StorageConfig,
  type StorageProvider,
  type StorageService,
} from './ports';

export {
  apiResultSchema,
  bioSchema,
  createErrorCodeSchema,
  dateOfBirthSchema,
  emailSchema,
  emptyBodySchema,
  envelopeErrorResponseSchema,
  errorCodeSchema,
  errorResponseSchema,
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
  successResponseSchema,
  usernameSchema,
  uuidSchema,
  websiteSchema,
  type ApiResultEnvelope,
  type EmptyBody,
  type ErrorResponseEnvelope,
  type SuccessResponseEnvelope,
} from './schemas';

export type { ModuleDeps, ModuleRegistrationOptions } from './module-registration';

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
