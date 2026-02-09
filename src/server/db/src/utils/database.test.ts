// src/server/db/src/utils/database.test.ts
import { describe, expect, test } from 'vitest';

import { camelizeKeys, camelToSnake, snakeifyKeys, snakeToCamel } from './database';

describe('Database Utils', () => {
  describe('snakeifyKeys', () => {
    test('should convert camelCase keys to snake_case', () => {
      const input = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john.doe@example.com',
        userId: 123,
        isActive: true,
        dateOfBirth: new Date('1990-01-01'),
      };

      const expected = {
        ['first_name']: 'John',
        ['last_name']: 'Doe',
        ['email_address']: 'john.doe@example.com',
        ['user_id']: 123,
        ['is_active']: true,
        ['date_of_birth']: input.dateOfBirth,
      };

      const result = snakeifyKeys(input);
      expect(result).toEqual(expected);
    });

    test('should handle nested objects', () => {
      const input = {
        user: {
          firstName: 'Jane',
          lastName: 'Smith',
          profile: {
            bioText: 'Software developer',
            joinDate: new Date(),
          },
        },
      };

      const expected = {
        user: {
          ['first_name']: 'Jane',
          ['last_name']: 'Smith',
          profile: {
            ['bio_text']: 'Software developer',
            ['join_date']: input.user.profile.joinDate,
          },
        },
      };

      const result = snakeifyKeys(input);
      expect(result).toEqual(expected);
    });

    test('should handle arrays of objects', () => {
      const input = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ];

      const expected = [
        { ['first_name']: 'John', ['last_name']: 'Doe' },
        { ['first_name']: 'Jane', ['last_name']: 'Smith' },
      ];

      const result = snakeifyKeys(input);
      expect(result).toEqual(expected);
    });

    test('should handle primitive values', () => {
      expect(snakeifyKeys('string')).toBe('string');
      expect(snakeifyKeys(123)).toBe(123);
      expect(snakeifyKeys(true)).toBe(true);
      expect(snakeifyKeys(null)).toBe(null);
      expect(snakeifyKeys(undefined)).toBe(undefined);
    });

    test('should handle empty objects and arrays', () => {
      expect(snakeifyKeys({})).toEqual({});
      expect(snakeifyKeys([])).toEqual([]);
    });

    test('should not modify values, only keys', () => {
      const input = {
        stringVal: 'unchanged',
        numberVal: 42,
        boolVal: false,
        nullVal: null,
        arrayVal: [1, 2, 3],
        objectVal: { nested: 'value' },
      };

      const result = snakeifyKeys(input) as any;

      expect(result.string_val).toBe('unchanged');
      expect(result.number_val).toBe(42);
      expect(result.bool_val).toBe(false);
      expect(result.null_val).toBe(null);
      expect(result.array_val).toEqual([1, 2, 3]);
      expect(result.object_val).toEqual({ nested: 'value' });
    });

    test('should handle already snake_cased keys', () => {
      const input = {
        ['already_snake_cased']: 'value',
        ['normal_key']: 'another_value',
      };

      const result = snakeifyKeys(input);
      // Keys that are already snake_cased should remain unchanged
      expect(result).toEqual(input);
    });

    test('should handle mixed key formats', () => {
      const input = {
        camelCase: 'a',
        PascalCase: 'b',
        ['snake_case']: 'c',
        ['SCREAMING_SNAKE_CASE']: 'd',
        ['kebab-case']: 'e',
      };

      const result = snakeifyKeys(input);

      expect(result).toEqual({
        ['camel_case']: 'a',
        ['pascal_case']: 'b',
        ['snake_case']: 'c',
        ['screaming_snake_case']: 'd',
        ['kebab_case']: 'e',
      });
    });
  });

  describe('camelizeKeys', () => {
    test('should convert snake_case keys to camelCase', () => {
      const input = {
        ['first_name']: 'John',
        ['last_name']: 'Doe',
        ['email_address']: 'john.doe@example.com',
        ['user_id']: 123,
        ['is_active']: true,
        ['date_of_birth']: new Date('1990-01-01'),
      };

      const expected = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john.doe@example.com',
        userId: 123,
        isActive: true,
        dateOfBirth: input.date_of_birth,
      };

      const result = camelizeKeys(input);
      expect(result).toEqual(expected);
    });

    test('should handle nested objects', () => {
      const input = {
        user: {
          ['first_name']: 'Jane',
          ['last_name']: 'Smith',
          profile: {
            ['bio_text']: 'Software developer',
            ['join_date']: new Date(),
          },
        },
      };

      const expected = {
        user: {
          firstName: 'Jane',
          lastName: 'Smith',
          profile: {
            bioText: 'Software developer',
            joinDate: input.user.profile['join_date'],
          },
        },
      };

      const result = camelizeKeys(input);
      expect(result).toEqual(expected);
    });

    test('should handle arrays of objects', () => {
      const input = [
        { ['first_name']: 'John', ['last_name']: 'Doe' },
        { ['first_name']: 'Jane', ['last_name']: 'Smith' },
      ];

      const expected = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: 'Jane', lastName: 'Smith' },
      ];

      const result = camelizeKeys(input);
      expect(result).toEqual(expected);
    });

    test('should handle primitive values', () => {
      expect(camelizeKeys('string')).toBe('string');
      expect(camelizeKeys(123)).toBe(123);
      expect(camelizeKeys(true)).toBe(true);
      expect(camelizeKeys(null)).toBe(null);
      expect(camelizeKeys(undefined)).toBe(undefined);
    });

    test('should handle empty objects and arrays', () => {
      expect(camelizeKeys({})).toEqual({});
      expect(camelizeKeys([])).toEqual([]);
    });

    test('should not modify values, only keys', () => {
      const input = {
        ['string_val']: 'unchanged',
        ['number_val']: 42,
        ['bool_val']: false,
        ['null_val']: null,
        ['array_val']: [1, 2, 3],
        ['object_val']: { ['nested_val']: 'value' },
      };

      const result = camelizeKeys(input) as Record<string, unknown>;

      expect(result['stringVal']).toBe('unchanged');
      expect(result['numberVal']).toBe(42);
      expect(result['boolVal']).toBe(false);
      expect(result['nullVal']).toBe(null);
      expect(result['arrayVal']).toEqual([1, 2, 3]);
      expect(result['objectVal']).toEqual({ nestedVal: 'value' });
    });

    test('should handle already camelCased keys', () => {
      const input = {
        alreadyCamelCased: 'value',
        normalKey: 'another_value',
      };

      const result = camelizeKeys(input);
      // Keys that are already camelCased should remain unchanged
      expect(result).toEqual(input);
    });

    test('should handle mixed key formats', () => {
      const input = {
        ['snake_case']: 'a',
        ['SCREAMING_SNAKE_CASE']: 'b',
        camelCase: 'c',
        PascalCase: 'd',
        ['kebab-case']: 'e',
      };

      const result = camelizeKeys(input);

      expect(result).toEqual({
        snakeCase: 'a',
        screamingSnakeCase: 'b',
        camelCase: 'c',
        pascalCase: 'd',
        kebabCase: 'e',
      });
    });
  });

  describe('camelToSnake', () => {
    test('should convert camelCase to snake_case', () => {
      expect(camelToSnake('firstName')).toBe('first_name');
      expect(camelToSnake('lastName')).toBe('last_name');
      expect(camelToSnake('emailAddress')).toBe('email_address');
    });

    test('should convert PascalCase to snake_case', () => {
      expect(camelToSnake('FirstName')).toBe('first_name');
      expect(camelToSnake('UserProfile')).toBe('user_profile');
    });

    test('should handle acronyms', () => {
      expect(camelToSnake('XMLHttpRequest')).toBe('xml_http_request');
      expect(camelToSnake('iOSVersion')).toBe('i_os_version');
      expect(camelToSnake('URLPath')).toBe('url_path');
    });

    test('should handle numbers', () => {
      expect(camelToSnake('version2Number')).toBe('version2_number');
      expect(camelToSnake('item1Id')).toBe('item1_id');
    });

    test('should handle already snake_cased strings', () => {
      expect(camelToSnake('already_snake_cased')).toBe('already_snake_cased');
    });

    test('should handle single words', () => {
      expect(camelToSnake('word')).toBe('word');
      expect(camelToSnake('Word')).toBe('word');
      expect(camelToSnake('WORD')).toBe('word');
    });

    test('should handle empty string', () => {
      expect(camelToSnake('')).toBe('');
    });

    test('should handle strings with underscores', () => {
      expect(camelToSnake('already_underscored')).toBe('already_underscored');
      expect(camelToSnake('mixed_Case_and_underscore')).toBe('mixed__case_and_underscore');
    });
  });

  describe('snakeToCamel', () => {
    test('should convert snake_case to camelCase', () => {
      expect(snakeToCamel('first_name')).toBe('firstName');
      expect(snakeToCamel('last_name')).toBe('lastName');
      expect(snakeToCamel('email_address')).toBe('emailAddress');
    });

    test('should handle multiple underscores', () => {
      expect(snakeToCamel('very_long_field_name')).toBe('veryLongFieldName');
    });

    test('should handle already camelCased strings', () => {
      expect(snakeToCamel('firstName')).toBe('firstName');
      expect(snakeToCamel('alreadyCamelCased')).toBe('alreadyCamelCased');
    });

    test('should handle PascalCase input', () => {
      expect(snakeToCamel('FirstName')).toBe('firstName');
      expect(snakeToCamel('UserProfile')).toBe('userProfile');
    });

    test('should handle single words', () => {
      expect(snakeToCamel('word')).toBe('word');
      expect(snakeToCamel('Word')).toBe('word');
      expect(snakeToCamel('WORD')).toBe('word');
    });

    test('should handle empty string', () => {
      expect(snakeToCamel('')).toBe('');
    });

    test('should handle strings with hyphens', () => {
      expect(snakeToCamel('first-name')).toBe('firstName');
      expect(snakeToCamel('very-long-field-name')).toBe('veryLongFieldName');
    });

    test('should handle mixed separators', () => {
      expect(snakeToCamel('field_name-with-mixed_separators')).toBe('fieldNameWithMixedSeparators');
    });

    test('should handle numbers', () => {
      expect(snakeToCamel('field_name_2')).toBe('fieldName2');
      expect(snakeToCamel('version_2_number')).toBe('version2Number');
    });
  });

  describe('Integration tests', () => {
    test('snakeifyKeys and camelizeKeys should be inverses', () => {
      const original = {
        firstName: 'John',
        lastName: 'Doe',
        emailAddress: 'john@example.com',
        userId: 123,
        isActive: true,
      };

      // Convert to snake_case and back to camelCase
      const snakeCased = snakeifyKeys(original);
      const camelCased = camelizeKeys(snakeCased);

      expect(camelCased).toEqual(original);
    });

    test('camelizeKeys and snakeifyKeys should be inverses', () => {
      const original = {
        ['first_name']: 'John',
        ['last_name']: 'Doe',
        ['email_address']: 'john@example.com',
        ['user_id']: 123,
        ['is_active']: true,
      };

      // Convert to camelCase and back to snake_case
      const camelCased = camelizeKeys(original);
      const snakeCased = snakeifyKeys(camelCased);

      expect(snakeCased).toEqual(original);
    });

    test('camelToSnake and snakeToCamel should be inverses for simple cases', () => {
      const original = 'firstName';

      const snakeCased = camelToSnake(original);
      const camelCased = snakeToCamel(snakeCased);

      expect(camelCased).toBe(original);
    });

    test('should handle complex nested structures', () => {
      const complexInput = {
        userProfile: {
          personalInfo: {
            firstName: 'John',
            lastName: 'Doe',
            contactDetails: {
              emailAddress: 'john@example.com',
              phoneNumber: '+1234567890',
            },
          },
          preferences: {
            notificationSettings: {
              emailNotifications: true,
              smsNotifications: false,
            },
          },
        },
        userPosts: [
          {
            postId: 1,
            postTitle: 'My First Post',
            postContent: 'This is my first post',
            tags: ['intro', 'first'],
          },
          {
            postId: 2,
            postTitle: 'Second Post',
            postContent: 'This is my second post',
            tags: ['update', 'progress'],
          },
        ],
      };

      // Convert to snake_case
      const snakeCased = snakeifyKeys(complexInput) as any;

      // Verify structure is preserved
      expect(snakeCased).toHaveProperty('user_profile.personal_info.first_name');
      expect(snakeCased).toHaveProperty(
        'user_profile.preferences.notification_settings.email_notifications',
      );
      expect(Array.isArray(snakeCased.user_posts)).toBe(true);
      expect(snakeCased.user_posts[0]).toHaveProperty('post_id');

      // Convert back to camelCase
      const camelCased = camelizeKeys(snakeCased);

      // Should match original
      expect(camelCased).toEqual(complexInput);
    });
  });

  describe('Edge cases', () => {
    test('should handle null and undefined in objects', () => {
      const input = {
        nullValue: null,
        undefinedValue: undefined,
        actualValue: 'exists',
      };

      const snakeResult = snakeifyKeys(input) as any;
      expect(snakeResult.null_value).toBeNull();
      expect(snakeResult.undefined_value).toBeUndefined();
      expect(snakeResult.actual_value).toBe('exists');

      const camelResult = camelizeKeys(snakeResult) as any;
      expect(camelResult.nullValue).toBeNull();
      expect(camelResult.undefinedValue).toBeUndefined();
      expect(camelResult.actualValue).toBe('exists');
    });

    test('should handle dates and regexps', () => {
      const date = new Date();
      const regexp = /test/gi;
      const input = {
        dateField: date,
        regexpField: regexp,
      };

      const result = snakeifyKeys(input) as any;
      expect(result.date_field).toBe(date);
      expect(result.regexp_field).toBe(regexp);

      const backToCamel = camelizeKeys(result) as any;
      expect(backToCamel.dateField).toBe(date);
      expect(backToCamel.regexpField).toBe(regexp);
    });

    test('should handle functions in objects', () => {
      const func = () => 'test';
      const input = { funcField: func };

      const result = snakeifyKeys(input) as any;
      expect(result.func_field).toBe(func);

      const backToCamel = camelizeKeys(result) as any;
      expect(backToCamel.funcField).toBe(func);
    });

    test('should handle symbol keys', () => {
      const sym = Symbol('test');
      const input: Record<PropertyKey, unknown> = {};
      input[sym] = 'symbol value';
      input['normalKey'] = 'normal value';

      // The transformation should only affect string keys
      const result = snakeifyKeys(input) as any;
      expect(result[sym]).toBe('symbol value');
      expect(result['normal_key']).toBe('normal value');
    });

    test('should handle circular references', () => {
      type Circular = { name: string; self?: Circular };
      const obj: Circular = { name: 'parent' };
      obj.self = obj; // Create circular reference

      // This should not cause an infinite loop
      expect(() => snakeifyKeys(obj)).not.toThrow();
      expect(() => camelizeKeys(obj)).not.toThrow();
    });
  });
});
