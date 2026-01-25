// packages/core/src/shared/pagination/error.test.ts
import { describe, expect, it } from 'vitest';

import { PAGINATION_ERROR_TYPES, PaginationError } from './error';

describe('PaginationError', () => {
  it('should create an error with correct properties', () => {
    const error = new PaginationError(
      PAGINATION_ERROR_TYPES.INVALID_CURSOR,
      'Invalid cursor provided',
    );

    expect(error.type).toBe(PAGINATION_ERROR_TYPES.INVALID_CURSOR);
    expect(error.message).toBe('Invalid cursor provided');
    expect(error.name).toBe('PaginationError');
  });

  it('should handle sort mismatch error', () => {
    const error = new PaginationError(
      PAGINATION_ERROR_TYPES.CURSOR_SORT_MISMATCH,
      'Sort order mismatch',
    );

    expect(error.type).toBe(PAGINATION_ERROR_TYPES.CURSOR_SORT_MISMATCH);
  });
});
