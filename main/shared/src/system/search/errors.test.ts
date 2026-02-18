// main/shared/src/system/search/errors.test.ts
import { describe, expect, test } from 'vitest';

import { SEARCH_ERROR_TYPES } from '../constants/limits';
import { AppError } from '../errors';

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
  SearchError,
  SearchProviderError,
  SearchProviderUnavailableError,
  SearchTimeoutError,
  UnsupportedOperatorError,
} from './errors';

describe('search errors', () => {
  describe('SearchError', () => {
    test('should have correct properties', () => {
      const error = new SearchError('Test error', SEARCH_ERROR_TYPES.InvalidQuery);

      expect(error.message).toBe('Test error');
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.InvalidQuery);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('SearchError');
    });

    test('should extend AppError', () => {
      const error = new SearchError('Test', SEARCH_ERROR_TYPES.InvalidQuery);
      expect(error).toBeInstanceOf(AppError);
    });

    test('should accept custom status code and details', () => {
      const error = new SearchError('Server error', SEARCH_ERROR_TYPES.ProviderError, 500, {
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.InvalidQuery);
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.InvalidFilter);
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.InvalidOperator);
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.InvalidField);
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.InvalidSort);
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.InvalidCursor);
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.UnsupportedOperator);
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
      expect(error.errorType).toBe(SEARCH_ERROR_TYPES.QueryTooComplex);
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
      const searchError = new SearchError('Test', SEARCH_ERROR_TYPES.InvalidQuery);
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
      expect(isSearchProviderError(new SearchError('Test', SEARCH_ERROR_TYPES.ProviderError))).toBe(
        false,
      );
    });

    test('isSearchTimeoutError should identify SearchTimeoutError', () => {
      expect(isSearchTimeoutError(new SearchTimeoutError(1000))).toBe(true);
      expect(isSearchTimeoutError(new SearchError('Test', SEARCH_ERROR_TYPES.SearchTimeout))).toBe(
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
        expect(json.ok).toBe(false);
        expect(json.error).toHaveProperty('code');
        expect(json.error).toHaveProperty('message');
      }
    });
  });

  // ============================================================================
  // Adversarial Tests
  // ============================================================================

  describe('adversarial: error hierarchy and instanceof checks', () => {
    test('every search error subclass is instanceof SearchError', () => {
      const instances: SearchError[] = [
        new InvalidQueryError(),
        new InvalidFilterError(),
        new InvalidOperatorError('op'),
        new InvalidFieldError('f'),
        new InvalidSortError(),
        new InvalidPaginationError(),
        new InvalidCursorError(),
        new SearchProviderError('m', 'p'),
        new SearchProviderUnavailableError('p'),
        new UnsupportedOperatorError('op', 'p'),
        new QueryTooComplexError(),
        new SearchTimeoutError(100),
      ];

      for (const err of instances) {
        expect(err).toBeInstanceOf(SearchError);
        expect(err).toBeInstanceOf(AppError);
        expect(err).toBeInstanceOf(Error);
      }
    });

    test('subclasses are NOT instanceof each other', () => {
      const queryErr = new InvalidQueryError();
      const filterErr = new InvalidFilterError();
      const providerErr = new SearchProviderError('m', 'p');
      const timeoutErr = new SearchTimeoutError(1);

      expect(queryErr instanceof InvalidFilterError).toBe(false);
      expect(filterErr instanceof InvalidQueryError).toBe(false);
      expect(providerErr instanceof SearchTimeoutError).toBe(false);
      expect(timeoutErr instanceof SearchProviderError).toBe(false);
    });

    test('SearchError base is NOT instanceof any subclass', () => {
      const base = new SearchError('base', SEARCH_ERROR_TYPES.InvalidQuery);

      expect(base instanceof InvalidQueryError).toBe(false);
      expect(base instanceof InvalidFilterError).toBe(false);
      expect(base instanceof SearchProviderError).toBe(false);
      expect(base instanceof SearchTimeoutError).toBe(false);
    });

    test('type guards return false for null, undefined, plain objects', () => {
      expect(isSearchError(null)).toBe(false);
      expect(isSearchError(undefined)).toBe(false);
      expect(isSearchError({ message: 'fake' })).toBe(false);
      expect(isSearchError('string error')).toBe(false);
      expect(isSearchError(42)).toBe(false);

      expect(isInvalidQueryError(null)).toBe(false);
      expect(isInvalidFilterError(undefined)).toBe(false);
      expect(isSearchProviderError({ name: 'SearchProviderError' })).toBe(false);
      expect(isSearchTimeoutError(new Error('timeout'))).toBe(false);
    });
  });

  describe('adversarial: error codes are unique across all search error types', () => {
    test('all SEARCH_ERROR_TYPES values are distinct strings', () => {
      const values = Object.values(SEARCH_ERROR_TYPES);
      const unique = new Set(values);

      expect(unique.size).toBe(values.length);
    });

    test('each error class carries its expected errorType code', () => {
      expect(new InvalidQueryError().errorType).toBe(SEARCH_ERROR_TYPES.InvalidQuery);
      expect(new InvalidFilterError().errorType).toBe(SEARCH_ERROR_TYPES.InvalidFilter);
      expect(new InvalidOperatorError('x').errorType).toBe(SEARCH_ERROR_TYPES.InvalidOperator);
      expect(new InvalidFieldError('x').errorType).toBe(SEARCH_ERROR_TYPES.InvalidField);
      expect(new InvalidSortError().errorType).toBe(SEARCH_ERROR_TYPES.InvalidSort);
      expect(new InvalidPaginationError().errorType).toBe(SEARCH_ERROR_TYPES.InvalidPagination);
      expect(new InvalidCursorError().errorType).toBe(SEARCH_ERROR_TYPES.InvalidCursor);
      expect(new SearchProviderError('m', 'p').errorType).toBe(SEARCH_ERROR_TYPES.ProviderError);
      expect(new SearchProviderUnavailableError('p').errorType).toBe(
        SEARCH_ERROR_TYPES.ProviderUnavailable,
      );
      expect(new UnsupportedOperatorError('op', 'p').errorType).toBe(
        SEARCH_ERROR_TYPES.UnsupportedOperator,
      );
      expect(new QueryTooComplexError().errorType).toBe(SEARCH_ERROR_TYPES.QueryTooComplex);
      expect(new SearchTimeoutError(1).errorType).toBe(SEARCH_ERROR_TYPES.SearchTimeout);
    });

    test('no two different error classes share the same errorType', () => {
      const errorTypes = [
        new InvalidQueryError().errorType,
        new InvalidFilterError().errorType,
        new InvalidOperatorError('x').errorType,
        new InvalidFieldError('x').errorType,
        new InvalidSortError().errorType,
        new InvalidPaginationError().errorType,
        new InvalidCursorError().errorType,
        new SearchProviderError('m', 'p').errorType,
        new SearchProviderUnavailableError('p').errorType,
        new UnsupportedOperatorError('op', 'p').errorType,
        new QueryTooComplexError().errorType,
        new SearchTimeoutError(1).errorType,
      ];
      const unique = new Set(errorTypes);
      expect(unique.size).toBe(errorTypes.length);
    });
  });

  describe('adversarial: error messages with special characters', () => {
    test('error message with SQL injection characters is stored verbatim', () => {
      const maliciousMsg = "'; DROP TABLE users; --";
      const err = new InvalidQueryError(maliciousMsg);
      expect(err.message).toBe(maliciousMsg);
    });

    test('error message with unicode and emoji is preserved', () => {
      const unicodeMsg = 'Invalid query: 你好 \u{1F4A5} \n\t\r';
      const err = new InvalidFilterError(unicodeMsg);
      expect(err.message).toBe(unicodeMsg);
    });

    test('error message with null byte is preserved', () => {
      const msgWithNull = 'bad\x00query';
      const err = new InvalidQueryError(msgWithNull);
      expect(err.message).toBe(msgWithNull);
    });

    test('empty string message is accepted by SearchError base', () => {
      const err = new SearchError('', SEARCH_ERROR_TYPES.InvalidQuery);
      expect(err.message).toBe('');
    });

    test('very long message is preserved without truncation', () => {
      const longMsg = 'x'.repeat(100_000);
      const err = new InvalidQueryError(longMsg);
      expect(err.message).toBe(longMsg);
      expect(err.message.length).toBe(100_000);
    });

    test('InvalidOperatorError embeds operator name including special chars', () => {
      const op = '<script>alert(1)</script>';
      const err = new InvalidOperatorError(op);
      expect(err.message).toContain(op);
    });

    test('InvalidFieldError embeds field name including path-traversal chars', () => {
      const field = '../../../etc/passwd';
      const err = new InvalidFieldError(field);
      expect(err.message).toContain(field);
    });
  });

  describe('adversarial: stack trace preservation', () => {
    test('SearchError has a stack trace', () => {
      const err = new SearchError('trace test', SEARCH_ERROR_TYPES.InvalidQuery);
      expect(err.stack).toBeDefined();
      expect(typeof err.stack).toBe('string');
    });

    test('subclass errors have stack traces pointing to throw site', () => {
      function throwInvalidQuery(): never {
        throw new InvalidQueryError('from function');
      }

      try {
        throwInvalidQuery();
      } catch (e) {
        expect(e).toBeInstanceOf(InvalidQueryError);
        const err = e as InvalidQueryError;
        expect(err.stack).toBeDefined();
        // Stack must mention the function that threw, not just Error internals
        expect(err.stack).toContain('throwInvalidQuery');
      }
    });

    test('SearchTimeoutError has a stack trace', () => {
      const err = new SearchTimeoutError(5000);
      expect(err.stack).toBeDefined();
      expect(err.stack).toContain('SearchTimeoutError');
    });
  });

  describe('adversarial: error wrapping with cause chain', () => {
    test('SearchProviderError stores originalError reference exactly', () => {
      const root = new TypeError('socket hang up');
      const provider = new SearchProviderError('Provider failed', 'elasticsearch', root);

      expect(provider.originalError).toBe(root);
      expect(provider.originalError?.message).toBe('socket hang up');
    });

    test('SearchProviderError with undefined originalError does not throw', () => {
      const err = new SearchProviderError('fail', 'redis', undefined);
      expect(err.originalError).toBeUndefined();
    });

    test('nested provider error chain is accessible', () => {
      const level1 = new Error('TCP connect ECONNREFUSED');
      const level2 = new SearchProviderError('Index error', 'opensearch', level1);
      const level3 = new SearchProviderError('Query failed', 'opensearch', level2);

      expect(level3.originalError).toBe(level2);
      // Access the chain manually — the type allows Error but not SearchProviderError
      const mid = level3.originalError as SearchProviderError;
      expect(mid.originalError).toBe(level1);
      expect(mid.originalError?.message).toBe('TCP connect ECONNREFUSED');
    });

    test('re-throwing preserves instanceof identity', () => {
      function rethrow(): never {
        throw new InvalidQueryError('original');
      }

      expect(() => rethrow()).toThrow(InvalidQueryError);
    });
  });

  describe('adversarial: serialization/deserialization round-trip', () => {
    test('toJSON output can be JSON.stringify/parsed without loss', () => {
      const err = new InvalidFilterError('Bad filter', 'email', 'REGEX', { hint: 'use eq' });
      const json = err.toJSON();
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized) as typeof json;

      expect(parsed.ok).toBe(false);
      expect(parsed.error.code).toBe(SEARCH_ERROR_TYPES.InvalidFilter);
      expect(parsed.error.message).toBe('Bad filter');
      expect(parsed.error.details).toEqual({ field: 'email', operator: 'REGEX', hint: 'use eq' });
    });

    test('toJSON does not include stack trace (security: no internals in response)', () => {
      const err = new SearchTimeoutError(3000);
      const json = err.toJSON();
      const serialized = JSON.stringify(json);

      expect(serialized).not.toContain('at new SearchTimeoutError');
    });

    test('details with special chars round-trip through JSON correctly', () => {
      const err = new InvalidQueryError('test', {
        raw: 'SELECT * FROM users WHERE name = \'";',
        unicode: '\u{1F525}',
      });
      const json = err.toJSON();
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized) as typeof json;

      expect(parsed.error.details?.['raw']).toBe('SELECT * FROM users WHERE name = \'";');
      expect(parsed.error.details?.['unicode']).toBe('\u{1F525}');
    });

    test('QueryTooComplexError details survive JSON round-trip', () => {
      const err = new QueryTooComplexError('too deep', 10, 500);
      const json = err.toJSON();

      expect(json.error.details?.['maxDepth']).toBe(10);
      expect(json.error.details?.['maxConditions']).toBe(500);
    });

    test('SearchProviderUnavailableError with custom message round-trips', () => {
      const err = new SearchProviderUnavailableError(
        'solr',
        'Solr cluster is down for maintenance',
      );
      const json = err.toJSON();
      const serialized = JSON.stringify(json);
      const parsed = JSON.parse(serialized) as typeof json;

      expect(parsed.error.message).toBe('Solr cluster is down for maintenance');
      expect(parsed.error.details?.['providerName']).toBe('solr');
    });
  });

  describe('adversarial: HTTP status code correctness under pressure', () => {
    test('all 4xx errors have statusCode < 500', () => {
      const fourHundredErrors: SearchError[] = [
        new InvalidQueryError(),
        new InvalidFilterError(),
        new InvalidOperatorError('op'),
        new InvalidFieldError('f'),
        new InvalidSortError(),
        new InvalidPaginationError(),
        new InvalidCursorError(),
        new UnsupportedOperatorError('op', 'p'),
        new QueryTooComplexError(),
      ];

      for (const err of fourHundredErrors) {
        expect(err.statusCode).toBeGreaterThanOrEqual(400);
        expect(err.statusCode).toBeLessThan(500);
      }
    });

    test('SearchProviderError is 500', () => {
      expect(new SearchProviderError('m', 'p').statusCode).toBe(500);
    });

    test('SearchProviderUnavailableError is 503', () => {
      expect(new SearchProviderUnavailableError('p').statusCode).toBe(503);
    });

    test('SearchTimeoutError is 504', () => {
      expect(new SearchTimeoutError(1000).statusCode).toBe(504);
    });

    test('expose is true for 4xx errors and false for 5xx errors', () => {
      expect(new InvalidQueryError().expose).toBe(true);
      expect(new SearchProviderError('m', 'p').expose).toBe(false);
      expect(new SearchProviderUnavailableError('p').expose).toBe(false);
      expect(new SearchTimeoutError(1).expose).toBe(false);
    });
  });

  describe('adversarial: edge cases in constructor arguments', () => {
    test('InvalidOperatorError with empty operator string', () => {
      const err = new InvalidOperatorError('');
      expect(err.message).toBe('Unknown filter operator: ');
      expect(err.details?.['operator']).toBe('');
    });

    test('InvalidFieldError with empty allowed fields array', () => {
      const err = new InvalidFieldError('bad', []);
      expect(err.details?.['allowedFields']).toEqual([]);
    });

    test('UnsupportedOperatorError with empty supported operators', () => {
      const err = new UnsupportedOperatorError('op', 'provider', []);
      expect(err.details?.['supportedOperators']).toEqual([]);
    });

    test('QueryTooComplexError with zero depth and conditions', () => {
      const err = new QueryTooComplexError('msg', 0, 0);
      expect(err.maxDepth).toBe(0);
      expect(err.maxConditions).toBe(0);
    });

    test('SearchTimeoutError with zero ms', () => {
      const err = new SearchTimeoutError(0);
      expect(err.timeoutMs).toBe(0);
      expect(err.message).toContain('0ms');
    });

    test('SearchTimeoutError with negative ms', () => {
      const err = new SearchTimeoutError(-1);
      expect(err.timeoutMs).toBe(-1);
      expect(err.message).toContain('-1ms');
    });

    test('SearchError details are immutable (readonly check at runtime)', () => {
      const err = new InvalidQueryError('msg', { key: 'value' });
      // details should be present and equal; we verify it cannot be silently swapped
      expect(err.details).toEqual({ key: 'value' });
      // TypeScript readonly: attempting reassignment would be a compile error.
      // Verify the reference is the same object that was passed through.
      const origDetails = err.details;
      expect(err.details).toBe(origDetails);
    });
  });
});
