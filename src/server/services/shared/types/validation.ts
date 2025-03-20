/**
 * Represents a validation error with field and message
 */
export interface ValidationError {
  field: string;
  message: string;
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
 * Pagination options for list operations
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  offset?: number;
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
