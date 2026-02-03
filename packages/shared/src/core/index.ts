// shared/src/core/index.ts

export {
  errorCodeSchema,
  type ApiResponse,
  type ApiResult,
  type Contract,
  type EndpointContract,
  type ErrorResponse,
  type InferResponseData,
  type StatusCode,
} from './api';

export { ERROR_CODES, HTTP_STATUS, type ErrorCode } from './constants';

export {
  AppError,
  BadRequestError,
  BaseError,
  ConfigurationError,
  ConflictError,
  EmailAlreadyExistsError,
  EmailNotVerifiedError,
  ForbiddenError,
  formatValidationErrors,
  getErrorStatusCode,
  getSafeErrorMessage,
  InternalServerError,
  InvalidCredentialsError,
  InvalidTokenError,
  isAppError,
  NotFoundError,
  OAuthError,
  OAuthStateMismatchError,
  ResourceNotFoundError,
  toAppError,
  TokenReuseError,
  TooManyRequestsError,
  TotpInvalidError,
  TotpRequiredError,
  UnauthorizedError,
  UserNotFoundError,
  ValidationError,
  WeakPasswordError,
  type ValidationErrorDetail,
  type ValidationErrorResponse,
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
  isNonEmptyString,
  isNumber,
  isObjectLike,
  isPlainObject,
  isString,
} from './guard';

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
  type BaseStorageConfig,
  type CacheService,
  type ConfigService,
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
  type ReadableStreamLike,
  type S3StorageConfig,
  type SendResult,
  type StorageClient,
  type StorageConfig,
  type StorageProvider,
} from './ports';

export {
  apiResultSchema,
  emailSchema,
  emptyBodySchema,
  errorResponseSchema,
  isoDateTimeSchema,
  passwordSchema,
  successResponseSchema,
  type EmptyBody,
} from './schemas';

export type { ModuleDeps, ModuleRegistrationOptions } from './module-registration';

export * from './transactions';
