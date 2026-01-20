// packages/core/src/domains/pagination/__tests__/error.test.ts
import { describe, expect, it } from 'vitest';

import { PAGINATION_ERROR_TYPES, PaginationError } from '../error';

describe('PaginationError', () => {
  it('should create error with correct type and message', () => {
    const error = new PaginationError('INVALID_CURSOR', 'Test message');

    expect(error.type).toBe('INVALID_CURSOR');
    expect(error.message).toBe('Test message');
    expect(error.name).toBe('PaginationError');
  });

  it('should identify pagination errors correctly', () => {
    const paginationError = new PaginationError('INVALID_CURSOR', 'Test');
    const regularError = new Error('Regular error');

    expect(PaginationError.isPaginationError(paginationError)).toBe(true);
    expect(PaginationError.isPaginationError(regularError)).toBe(false);
    expect(PaginationError.isType(paginationError, 'INVALID_CURSOR')).toBe(true);
    expect(PaginationError.isType(paginationError, 'INVALID_PAGE')).toBe(false);
  });

  it('should have all error types defined', () => {
    expect(PAGINATION_ERROR_TYPES.INVALID_CURSOR).toBe('INVALID_CURSOR');
    expect(PAGINATION_ERROR_TYPES.CURSOR_SORT_MISMATCH).toBe('CURSOR_SORT_MISMATCH');
    expect(PAGINATION_ERROR_TYPES.INVALID_PAGE).toBe('INVALID_PAGE');
    expect(PAGINATION_ERROR_TYPES.INVALID_LIMIT).toBe('INVALID_LIMIT');
  });
});
