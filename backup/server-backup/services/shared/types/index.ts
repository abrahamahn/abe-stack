/**
 * Common types used across the services layer
 */

export interface ValidationError {
  field: string;
  message: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServiceResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
}

export interface ServiceOptions {
  traceId?: string;
  userId?: string;
  timeout?: number;
  cacheEnabled?: boolean;
}

/**
 * Generic service response type
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Paginated response type
 */
export interface PaginatedResponse<T> extends ServiceResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

/**
 * Base interface for CRUD operations
 */
export interface CrudOperations<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

/**
 * Interface for services that support pagination
 */
export interface PaginatedOperations<T> {
  list(options: PaginationOptions): Promise<PaginatedResponse<T>>;
}
