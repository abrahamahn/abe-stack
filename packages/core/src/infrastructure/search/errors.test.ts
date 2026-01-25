// packages/core/src/infrastructure/search/errors.test.ts
import { describe, expect, test } from 'vitest';

import { AppError } from './../../infrastructure/errors';
import {
  InvalidCursorError,
  InvalidFieldError,
  InvalidFilterError,
  InvalidOperatorError,
  InvalidPaginationError,
  InvalidQueryError,
  InvalidSortError,
  isInvalidFilterError,
  isInvalidQueryError,
  isSearchError,
  isSearchProviderError,
  isSearchTimeoutError,
  QueryTooComplexError,
  SEARCH_ERROR_TYPES,
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchTimeoutError,
  UnsupportedOperatorError,
} from './errors';

describe('search errors', () => {
  describe('SearchError', () => {
    test('should have correct properties', () => {
      const error = new SearchError('Test error', SEARCH_ERROR_TYPES.INVALID_QUERY);

      expect(error.message).toBe('Test error');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.INVALID_QUERY);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('SearchError');
    });

    test('should extend AppError', () => {
      const error = new SearchError('Test', SEARCH_ERROR_TYPES.INVALID_QUERY);
      expect(error).toBeInstanceOf(AppError);
    });

    test('should accept custom status code and details', () => {
      const error = new SearchError('Server error', SEARCH_ERROR_TYPES.PROVIDER_ERROR, 500, {
        additional: 'info',
      });

      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ additional: 'info' });
    });
  });

  describe('InvalidQueryError', () => {
    test('should have correct properties', () => {
      const error = new InvalidQueryError();

      expect(error.message).toBe('Invalid search query');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.INVALID_QUERY);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('InvalidQueryError');
    });

    test('should accept custom message and details', () => {
      const error = new InvalidQueryError('Query is malformed', { field: 'filters' });

      expect(error.message).toBe('Query is malformed');
      expect(error.details).toEqual({ field: 'filters' });
    });
  });

  describe('InvalidFilterError', () => {
    test('should have correct properties', () => {
      const error = new InvalidFilterError();

      expect(error.message).toBe('Invalid filter condition');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.INVALID_FILTER);
      expect(error.name).toBe('InvalidFilterError');
    });

    test('should include field and operator info', () => {
      const error = new InvalidFilterError('Bad filter', 'name', 'invalidOp');

      expect(error.field).toBe('name');
      expect(error.operator).toBe('invalidOp');
      expect(error.details).toEqual({ field: 'name', operator: 'invalidOp' });
    });
  });

  describe('InvalidOperatorError', () => {
    test('should have correct properties', () => {
      const error = new InvalidOperatorError('foobar');

      expect(error.message).toBe('Unknown filter operator: foobar');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.INVALID_OPERATOR);
      expect(error.name).toBe('InvalidOperatorError');
    });

    test('should include supported operators', () => {
      const error = new InvalidOperatorError('foobar', ['eq', 'neq', 'gt']);

      expect(error.details).toEqual({
        operator: 'foobar',
        supportedOperators: ['eq', 'neq', 'gt'],
      });
    });
  });

  describe('InvalidFieldError', () => {
    test('should have correct properties', () => {
      const error = new InvalidFieldError('unknownField');

      expect(error.message).toBe('Invalid field: unknownField');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.INVALID_FIELD);
      expect(error.name).toBe('InvalidFieldError');
    });

    test('should include allowed fields', () => {
      const error = new InvalidFieldError('badField', ['name', 'email', 'age']);

      expect(error.details).toEqual({
        field: 'badField',
        allowedFields: ['name', 'email', 'age'],
      });
    });
  });

  describe('InvalidSortError', () => {
    test('should have correct properties', () => {
      const error = new InvalidSortError();

      expect(error.message).toBe('Invalid sort configuration');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.INVALID_SORT);
      expect(error.name).toBe('InvalidSortError');
    });
  });

  describe('InvalidPaginationError', () => {
    test('should have correct properties', () => {
      const error = new InvalidPaginationError();

      expect(error.message).toBe('Invalid pagination parameters');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('InvalidPaginationError');
    });
  });

  describe('InvalidCursorError', () => {
    test('should have correct properties', () => {
      const error = new InvalidCursorError();

      expect(error.message).toBe('Invalid or expired cursor');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.INVALID_CURSOR);
      expect(error.name).toBe('InvalidCursorError');
    });
  });

  describe('SearchProviderError', () => {
    test('should have correct properties', () => {
      const originalError = new Error('Connection failed');
      const error = new SearchProviderError('Database error', 'sql', originalError);

      expect(error.message).toBe('Database error');
      expect(error.providerName).toBe('sql');
      expect(error.originalError).toBe(originalError);
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('SearchProviderError');
    });
  });

  describe('SearchProviderUnavailableError', () => {
    test('should have correct properties', () => {
      const error = new SearchProviderUnavailableError('elasticsearch');

      expect(error.message).toBe("Search provider 'elasticsearch' is unavailable");
      expect(error.statusCode).toBe(503);
      expect(error.name).toBe('SearchProviderUnavailableError');
    });
  });

  describe('UnsupportedOperatorError', () => {
    test('should have correct properties', () => {
      const error = new UnsupportedOperatorError('fullText', 'sql', ['eq', 'neq', 'gt']);

      expect(error.message).toBe("Operator 'fullText' is not supported by provider 'sql'");
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.UNSUPPORTED_OPERATOR);
      expect(error.details).toEqual({
        operator: 'fullText',
        providerName: 'sql',
        supportedOperators: ['eq', 'neq', 'gt'],
      });
      expect(error.name).toBe('UnsupportedOperatorError');
    });
  });

  describe('QueryTooComplexError', () => {
    test('should have correct properties', () => {
      const error = new QueryTooComplexError('Too many conditions', 5, 100);

      expect(error.message).toBe('Too many conditions');
      expect(error.maxDepth).toBe(5);
      expect(error.maxConditions).toBe(100);
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.QUERY_TOO_COMPLEX);
      expect(error.name).toBe('QueryTooComplexError');
    });
  });

  describe('SearchTimeoutError', () => {
    test('should have correct properties', () => {
      const error = new SearchTimeoutError(5000);

      expect(error.message).toBe('Search query timed out after 5000ms');
      expect(error.timeoutMs).toBe(5000);
      expect(error.statusCode).toBe(504);
      expect(error.name).toBe('SearchTimeoutError');
    });
  });

  describe('type guards', () => {
    test('isSearchError should identify SearchError', () => {
      const searchError = new SearchError('Test', SEARCH_ERROR_TYPES.INVALID_QUERY);
      const appError = new AppError('Test', 400);
      const regularError = new Error('Test');

      expect(isSearchError(searchError)).toBe(true);
      expect(isSearchError(new InvalidQueryError())).toBe(true);
      expect(isSearchError(appError)).toBe(false);
      expect(isSearchError(regularError)).toBe(false);
    });

    test('isInvalidQueryError should identify InvalidQueryError', () => {
      expect(isInvalidQueryError(new InvalidQueryError())).toBe(true);
      expect(isInvalidQueryError(new InvalidFilterError())).toBe(false);
    });

    test('isInvalidFilterError should identify InvalidFilterError', () => {
      expect(isInvalidFilterError(new InvalidFilterError())).toBe(true);
      expect(isInvalidFilterError(new InvalidQueryError())).toBe(false);
    });

    test('isSearchProviderError should identify SearchProviderError', () => {
      expect(isSearchProviderError(new SearchProviderError('Test', 'sql'))).toBe(true);
      expect(
        isSearchProviderError(new SearchError('Test', SEARCH_ERROR_TYPES.PROVIDER_ERROR)),
      ).toBe(false);
    });

    test('isSearchTimeoutError should identify SearchTimeoutError', () => {
      expect(isSearchTimeoutError(new SearchTimeoutError(1000))).toBe(true);
      expect(isSearchTimeoutError(new SearchError('Test', SEARCH_ERROR_TYPES.SEARCH_TIMEOUT))).toBe(
        false,
      );
    });
  });

  describe('error serialization', () => {
    test('all search errors should serialize to JSON', () => {
      const errors = [
        new InvalidQueryError(),
        new InvalidFilterError('msg', 'field', 'op'),
        new InvalidOperatorError('op'),
        new InvalidFieldError('field'),
        new InvalidSortError(),
        new InvalidCursorError(),
        new SearchProviderError('msg', 'sql'),
        new SearchProviderUnavailableError('es'),
        new UnsupportedOperatorError('op', 'sql'),
        new QueryTooComplexError(),
        new SearchTimeoutError(1000),
      ];

      for (const error of errors) {
        const json = error.toJSON();
        expect(json).toHaveProperty('error');
        expect(json).toHaveProperty('message');
        expect(json).toHaveProperty('code');
      }
    });
  });
});
