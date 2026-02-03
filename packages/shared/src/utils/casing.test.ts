// shared/src/utils/casing.test.ts
import { describe, expect, it } from 'vitest';

import {
  camelizeKeys,
  camelToSnake,
  snakeToCamel,
  snakeifyKeys,
  toCamelCase,
  toCamelCaseArray,
  toSnakeCase,
} from './casing';

describe('casing utilities', () => {
  // ==========================================================================
  // camelToSnake
  // ==========================================================================
  describe('camelToSnake', () => {
    it('converts camelCase to snake_case', () => {
      expect(camelToSnake('camelCase')).toBe('camel_case');
    });

    it('converts PascalCase to snake_case', () => {
      expect(camelToSnake('PascalCase')).toBe('pascal_case');
    });

    it('handles acronyms', () => {
      expect(camelToSnake('XMLHttpRequest')).toBe('xml_http_request');
    });

    it('handles SCREAMING_SNAKE (all uppercase)', () => {
      expect(camelToSnake('SCREAMING')).toBe('screaming');
    });

    it('handles kebab-case by replacing hyphens', () => {
      expect(camelToSnake('kebab-case')).toBe('kebab_case');
    });

    it('handles simple lowercase', () => {
      expect(camelToSnake('simple')).toBe('simple');
    });
  });

  // ==========================================================================
  // snakeToCamel
  // ==========================================================================
  describe('snakeToCamel', () => {
    it('converts snake_case to camelCase', () => {
      expect(snakeToCamel('created_at')).toBe('createdAt');
    });

    it('converts kebab-case to camelCase', () => {
      expect(snakeToCamel('kebab-case')).toBe('kebabCase');
    });

    it('handles SCREAMING_SNAKE_CASE', () => {
      expect(snakeToCamel('SCREAMING_SNAKE')).toBe('screamingSnake');
    });

    it('ensures first character is lowercase', () => {
      expect(snakeToCamel('PascalCase')).toBe('pascalCase');
    });

    it('handles simple string', () => {
      expect(snakeToCamel('simple')).toBe('simple');
    });
  });

  // ==========================================================================
  // toSnakeCase
  // ==========================================================================
  describe('toSnakeCase', () => {
    it('converts a string', () => {
      expect(toSnakeCase('camelCase')).toBe('camel_case');
    });

    it('converts an object keys', () => {
      const result = toSnakeCase({ firstName: 'John', lastName: 'Doe' });
      expect(result).toEqual({ first_name: 'John', last_name: 'Doe' });
    });

    it('uses custom mapping when provided', () => {
      const result = toSnakeCase({ userId: '123' }, { userId: 'user_id' });
      expect(result).toEqual({ user_id: '123' });
    });
  });

  // ==========================================================================
  // toCamelCase
  // ==========================================================================
  describe('toCamelCase', () => {
    it('converts a string', () => {
      expect(toCamelCase('created_at')).toBe('createdAt');
    });

    it('converts object keys', () => {
      const result = toCamelCase({ first_name: 'John', last_name: 'Doe' });
      expect(result).toEqual({ firstName: 'John', lastName: 'Doe' });
    });

    it('uses reverse mapping when provided', () => {
      const result = toCamelCase({ user_id: '123' }, { userId: 'user_id' });
      expect(result).toEqual({ userId: '123' });
    });
  });

  // ==========================================================================
  // toCamelCaseArray
  // ==========================================================================
  describe('toCamelCaseArray', () => {
    it('converts array of records', () => {
      const records = [
        { first_name: 'John', last_name: 'Doe' },
        { first_name: 'Jane', last_name: 'Smith' },
      ];
      const result = toCamelCaseArray(records);
      expect(result).toEqual([
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ]);
    });

    it('handles empty array', () => {
      expect(toCamelCaseArray([])).toEqual([]);
    });
  });

  // ==========================================================================
  // snakeifyKeys (recursive)
  // ==========================================================================
  describe('snakeifyKeys', () => {
    it('recursively converts object keys to snake_case', () => {
      const result = snakeifyKeys({
        firstName: 'John',
        address: {
          streetName: '123 Main St',
          zipCode: '12345',
        },
      });
      expect(result).toEqual({
        first_name: 'John',
        address: {
          street_name: '123 Main St',
          zip_code: '12345',
        },
      });
    });

    it('handles arrays', () => {
      const result = snakeifyKeys({
        items: [{ itemName: 'A' }, { itemName: 'B' }],
      });
      expect(result).toEqual({
        items: [{ item_name: 'A' }, { item_name: 'B' }],
      });
    });

    it('handles null and primitive values', () => {
      expect(snakeifyKeys(null)).toBeNull();
      expect(snakeifyKeys('string')).toBe('string');
      expect(snakeifyKeys(42)).toBe(42);
    });

    it('preserves Date instances', () => {
      const date = new Date('2023-01-01');
      const result = snakeifyKeys({ createdAt: date }) as Record<string, unknown>;
      expect(result['created_at']).toBe(date);
    });
  });

  // ==========================================================================
  // camelizeKeys (recursive)
  // ==========================================================================
  describe('camelizeKeys', () => {
    it('recursively converts object keys to camelCase', () => {
      const result = camelizeKeys({
        first_name: 'John',
        address: {
          street_name: '123 Main St',
          zip_code: '12345',
        },
      });
      expect(result).toEqual({
        firstName: 'John',
        address: {
          streetName: '123 Main St',
          zipCode: '12345',
        },
      });
    });

    it('handles arrays', () => {
      const result = camelizeKeys({
        items: [{ item_name: 'A' }, { item_name: 'B' }],
      });
      expect(result).toEqual({
        items: [{ itemName: 'A' }, { itemName: 'B' }],
      });
    });

    it('handles null and primitive values', () => {
      expect(camelizeKeys(null)).toBeNull();
      expect(camelizeKeys(undefined)).toBeUndefined();
      expect(camelizeKeys(42)).toBe(42);
    });
  });
});
