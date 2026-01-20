// packages/core/src/shared/index.ts
/**
 * Shared Domain
 *
 * Re-exports common utilities used across the application.
 * This provides a convenient single entry point for shared functionality.
 */

// Async utilities
export { BatchedQueue, DeferredPromise, ReactiveMap, type BatchedQueueOptions } from '../async';

// HTTP utilities
export { parseCookies } from '../http';

// State management
export {
  createUndoRedoStore,
  toastStore,
  useUndoRedoStore,
  type ToastMessage,
  type UndoRedoState,
} from '../stores';

// Transaction utilities
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
} from '../transactions';

// Base errors and helpers
export {
  AppError,
  getErrorStatusCode,
  getSafeErrorMessage,
  isAppError,
  toAppError,
  ValidationError,
  type ApiErrorResponse,
  type ApiResponse,
  type ApiSuccessResponse,
  isErrorResponse,
  isSuccessResponse,
} from '../errors';

// HTTP errors
export {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  TooManyRequestsError,
  UnauthorizedError,
  UnprocessableError,
} from '../errors';

// Constants
export {
  DAYS_PER_WEEK,
  HOURS_PER_DAY,
  HTTP_STATUS,
  MINUTES_PER_HOUR,
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
  SECONDS_PER_DAY,
  SECONDS_PER_HOUR,
  SECONDS_PER_MINUTE,
  type HttpStatusCode,
} from '../constants';

// Token utilities
export { addAuthHeader, createTokenStore, tokenStore, type TokenStore } from './token';
export { randomId } from './utils';
