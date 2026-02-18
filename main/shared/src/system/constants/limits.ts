// main/shared/src/system/constants/limits.ts

/**
 * Numeric limits, quotas, pagination defaults, and search operators
 */

import { TIME } from '../../primitives/constants/time';

export const LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_UPLOAD_FILES: 10,
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
  MAX_LOGO_SIZE_BYTES: 2 * 1024 * 1024,
  HTTP_BODY_LIMIT_BYTES: 1024 * 1024,

  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  MAX_SLUG_LENGTH: 100,
  MAX_TITLE_LENGTH: 200,
  MAX_DESCRIPTION_LENGTH: 2000,

  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,

  MAX_SANITIZE_DEPTH: 10,
} as const;

export const QUOTAS = {
  MAX_PENDING_INVITATIONS: 50,
  MAX_USERNAME_LENGTH: 15,
  MAGIC_LINK_MAX_PER_EMAIL: 3,
  MAGIC_LINK_MAX_PER_IP: 10,
  IMPERSONATION_MAX_PER_HOUR: 5,
} as const;

export const SMS_LIMITS = {
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_HOURLY: 3,
  RATE_LIMIT_DAILY: 10,
} as const;

// --- Pagination & Search Defaults ---
export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 1000,
} as const;

export const SEARCH_DEFAULTS = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 1000,
} as const;

export const DEFAULT_PAGE_LIMIT = LIMITS.DEFAULT_PAGE_SIZE;
export const DEFAULT_SORT_ORDER = 'desc' as const;
export const DEFAULT_SORT_BY = 'createdAt';

export const SORT_ORDER = {
  ASC: 'asc',
  DESC: 'desc',
} as const;

export const AGGREGATION_TYPES = ['sum', 'max', 'last'] as const;

export const FILTER_OPERATORS = Object.freeze({
  EQ: 'eq',
  NEQ: 'neq',
  GT: 'gt',
  GTE: 'gte',
  LT: 'lt',
  LTE: 'lte',
  CONTAINS: 'contains',
  StartsWith: 'startsWith',
  EndsWith: 'endsWith',
  LIKE: 'like',
  ILIKE: 'ilike',
  IN: 'in',
  NotIn: 'notIn',
  IsNull: 'isNull',
  IsNotNull: 'isNotNull',
  BETWEEN: 'between',
  ArrayContains: 'arrayContains',
  ArrayContainsAny: 'arrayContainsAny',
  FullText: 'fullText',
} as const);

export const FILTER_OPERATOR_VALUES = Object.values(FILTER_OPERATORS);

export const LOGICAL_OPERATORS = {
  AND: 'and',
  OR: 'or',
  NOT: 'not',
} as const;

export const LOGICAL_OPERATOR_VALUES = Object.values(LOGICAL_OPERATORS);

export const SEARCH_ERROR_TYPES = {
  InvalidQuery: 'INVALID_QUERY',
  InvalidFilter: 'INVALID_FILTER',
  InvalidOperator: 'INVALID_OPERATOR',
  InvalidField: 'INVALID_FIELD',
  InvalidSort: 'INVALID_SORT',
  InvalidPagination: 'INVALID_PAGINATION',
  InvalidCursor: 'INVALID_CURSOR',
  ProviderError: 'PROVIDER_ERROR',
  ProviderUnavailable: 'PROVIDER_UNAVAILABLE',
  UnsupportedOperator: 'UNSUPPORTED_OPERATOR',
  QueryTooComplex: 'QUERY_TOO_COMPLEX',
  SearchTimeout: 'SEARCH_TIMEOUT',
} as const;

export const PAGINATION_ERROR_TYPES = {
  INVALID_CURSOR: 'INVALID_CURSOR',
  CURSOR_SORT_MISMATCH: 'CURSOR_SORT_MISMATCH',
  INVALID_LIMIT: 'INVALID_LIMIT',
  INVALID_PAGE: 'INVALID_PAGE',
  INVALID_SORT_FIELD: 'INVALID_SORT_FIELD',
  INVALID_SORT_ORDER: 'INVALID_SORT_ORDER',
} as const;

/**
 * Media upload tuning
 */
export const MAX_FILENAME_LENGTH = 255;
export const MAX_UPLOAD_FILE_SIZE = 1000 * 1024 * 1024;
export const MAX_CHUNK_SIZE = 10 * 1024 * 1024;
export const MAX_UPLOAD_TIMEOUT_MS = TIME.MS_PER_HOUR;

/**
 * Notifications / Webhook delivery tuning
 */
export const NOTIFICATION_PAYLOAD_MAX_SIZE = 4096;

export const MAX_DELIVERY_ATTEMPTS = 5;
export const RETRY_DELAYS_MINUTES = [1, 5, 30, 120, 720] as const;
