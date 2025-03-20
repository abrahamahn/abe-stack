// Base classes
export { BaseService } from "./base/BaseService";

// Types
export {
  ValidationError,
  ServiceResponse,
  PaginatedResponse,
  PaginationOptions,
  CrudOperations,
  PaginatedOperations,
} from "./types/validation";

// Errors
export { ValidationFailedError } from "./errors/ValidationError";
export {
  ServiceError,
  ResourceNotFoundError,
  DuplicateResourceError,
  UnauthorizedError,
  ForbiddenError,
  ExternalServiceError,
  TooManyRequestsError,
} from "./errors/ServiceError";

// Validation
export { ValidationRule, Validator } from "./validation/ValidationRule";
export { commonValidators } from "./validation/commonValidators";
export { ContentValidator } from "./validation/ContentValidator";
export { urlValidator } from "./validation/UrlValidator";

// Security
export { RateLimiter } from "./security/RateLimiter";
export { PostRateLimiter } from "./security/PostRateLimiter";
export { profanityFilter } from "./security/ProfanityFilter";

// Communication
export { TemplateEngine } from "./communication/TemplateEngine";
export { EventEmitter } from "./communication/EventEmitter";

// Session
export { SessionManager } from "./session/SessionManager";

// Utilities - Caching
export { CacheManager } from "./cache/CacheManager";
export { PostCacheManager } from "../app/social/post/PostCacheManager";
