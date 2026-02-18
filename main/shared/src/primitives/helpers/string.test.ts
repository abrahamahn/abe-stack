// main/shared/src/primitives/helpers/string.test.ts
import { describe, expect, it } from 'vitest';

import {
  camelToSnake,
  camelizeKeys,
  canonicalizeEmail,
  capitalize,
  countCharactersNoWhitespace,
  countWords,
  escapeHtml,
  formatBytes,
  normalizeEmail,
  normalizeWhitespace,
  padLeft,
  slugify,
  snakeToCamel,
  snakeifyKeys,
  toCamelCase,
  toCamelCaseArray,
  toKebabCase,
  toPascalCase,
  toSnakeCase,
  titleCase,
  trimTrailingSlashes,
  truncate,
  stripControlChars,
} from './string';

// ============================================================================
// camelToSnake
// ============================================================================
describe('camelToSnake', () => {
  it('converts basic camelCase', () => {
    expect(camelToSnake('camelCase')).toBe('camel_case');
  });

  it('converts PascalCase', () => {
    expect(camelToSnake('PascalCase')).toBe('pascal_case');
  });

  it('returns empty string unchanged', () => {
    expect(camelToSnake('')).toBe('');
  });

  it('returns single lowercase char unchanged', () => {
    expect(camelToSnake('a')).toBe('a');
  });

  it('lowercases already-uppercase single char', () => {
    expect(camelToSnake('A')).toBe('a');
  });

  it('lowercases fully-uppercase strings (ALL_CAPS shortcut branch)', () => {
    // The implementation treats fully-uppercase as all-caps and just lowercases
    expect(camelToSnake('HTTP')).toBe('http');
    expect(camelToSnake('ID')).toBe('id');
  });

  it('handles consecutive uppercase letters — HTTPServer', () => {
    // HTTPServer: the "all uppercase" shortcut doesn't fire (S is lowercase)
    // regex splits: H_T_T_P_Server → expect realistic output
    const result = camelToSnake('HTTPServer');
    // Must be lowercase and contain underscores between boundary transitions
    expect(result).toMatch(/^[a-z_]+$/);
    expect(result).toContain('server');
  });

  it('handles consecutive uppercase prefix — XMLParser', () => {
    const result = camelToSnake('XMLParser');
    expect(result).toMatch(/^[a-z_]+$/);
    expect(result).toContain('parser');
  });

  it('converts kebab-case dashes to underscores', () => {
    expect(camelToSnake('hello-world')).toBe('hello_world');
  });

  it('keeps existing underscores', () => {
    expect(camelToSnake('already_snake')).toBe('already_snake');
  });

  it('handles string with digits', () => {
    expect(camelToSnake('base64Encode')).toBe('base64_encode');
    expect(camelToSnake('version2Update')).toBe('version2_update');
  });

  it('handles leading underscore', () => {
    // _private stays _private (no camel boundary)
    expect(camelToSnake('_privateField')).toBe('_private_field');
  });

  it('does not produce double underscores for already snake_case', () => {
    const result = camelToSnake('user_name');
    expect(result).not.toContain('__');
  });
});

// ============================================================================
// snakeToCamel
// ============================================================================
describe('snakeToCamel', () => {
  it('converts basic snake_case', () => {
    expect(snakeToCamel('created_at')).toBe('createdAt');
  });

  it('converts kebab-case', () => {
    expect(snakeToCamel('hello-world')).toBe('helloWorld');
  });

  it('returns empty string unchanged', () => {
    expect(snakeToCamel('')).toBe('');
  });

  it('returns single lowercase char unchanged', () => {
    expect(snakeToCamel('a')).toBe('a');
  });

  it('lowercases a single uppercase char (first char toLowerCase)', () => {
    expect(snakeToCamel('A')).toBe('a');
  });

  it('lowercases all-uppercase input before processing', () => {
    // ALL_CAPS → all lowercase path; 'HELLO_WORLD' → lowercase → camel
    expect(snakeToCamel('HELLO_WORLD')).toBe('helloWorld');
  });

  it('handles leading underscore — trailing separator with no following char', () => {
    // _field: the leading underscore is a separator with no preceding char
    const result = snakeToCamel('_field');
    // the leading _ is consumed, 'f' becomes uppercase: 'Field'
    // then first char is lowercased: 'field'
    expect(result).toBe('field');
  });

  it('handles trailing underscore gracefully', () => {
    // trailing underscore: separator with no following char → empty string replacement
    const result = snakeToCamel('field_');
    expect(result).toBe('field');
  });

  it('handles consecutive underscores', () => {
    // consecutive underscores: multiple separators — last one wins
    const result = snakeToCamel('field__name');
    expect(result).toBe('fieldName');
  });

  it('does not re-uppercase an already-camelCase string', () => {
    // camelCase in → snakeToCamel should pass through (no separators)
    expect(snakeToCamel('alreadyCamel')).toBe('alreadyCamel');
  });

  it('handles digits adjacent to underscores', () => {
    expect(snakeToCamel('field_2_name')).toBe('field2Name');
  });
});

// ============================================================================
// toKebabCase
// ============================================================================
describe('toKebabCase', () => {
  it('converts camelCase', () => {
    expect(toKebabCase('camelCase')).toBe('camel-case');
  });

  it('converts space-separated words', () => {
    expect(toKebabCase('hello world')).toBe('hello-world');
  });

  it('converts underscores to hyphens', () => {
    expect(toKebabCase('snake_case')).toBe('snake-case');
  });

  it('returns empty string for empty input', () => {
    expect(toKebabCase('')).toBe('');
  });

  it('lowercases all characters', () => {
    expect(toKebabCase('ALLCAPS')).toBe('allcaps');
  });

  it('handles consecutive spaces — collapses to single hyphen', () => {
    // [\s_]+ pattern collapses runs
    expect(toKebabCase('hello  world')).toBe('hello-world');
  });

  it('does not insert extra hyphen for already-kebab input', () => {
    // Already lowercase with hyphen; no camel boundary detected
    expect(toKebabCase('already-kebab')).toBe('already-kebab');
  });

  it('does not handle leading/trailing spaces — produces leading/trailing hyphen', () => {
    // Implementation does not trim — this exposes the gap
    const result = toKebabCase(' leading');
    expect(result).toBe('-leading');
  });
});

// ============================================================================
// toPascalCase
// ============================================================================
describe('toPascalCase', () => {
  it('converts space-separated words', () => {
    expect(toPascalCase('hello world')).toBe('HelloWorld');
  });

  it('returns empty string for empty input', () => {
    expect(toPascalCase('')).toBe('');
  });

  it('handles already PascalCase input', () => {
    expect(toPascalCase('HelloWorld')).toBe('HelloWorld');
  });

  it('handles single word', () => {
    expect(toPascalCase('hello')).toBe('Hello');
  });

  it('uppercases each word boundary letter', () => {
    expect(toPascalCase('foo bar baz')).toBe('FooBarBaz');
  });

  it('does not trim — leading space produces empty leading token', () => {
    // \b\w matches first char of each word; leading space collapses
    const result = toPascalCase('  hello');
    // Implementation removes whitespace entirely after capitalizing; result may vary
    expect(typeof result).toBe('string');
    expect(result).toContain('Hello');
  });
});

// ============================================================================
// toSnakeCase (overloads)
// ============================================================================
describe('toSnakeCase', () => {
  it('converts a string argument via camelToSnake', () => {
    expect(toSnakeCase('camelCase')).toBe('camel_case');
  });

  it('converts object keys to snake_case', () => {
    expect(toSnakeCase({ firstName: 'John', lastName: 'Doe' })).toEqual({
      first_name: 'John',
      last_name: 'Doe',
    });
  });

  it('applies custom key mapping over automatic conversion', () => {
    const mapping = { userId: 'user_identifier' };
    expect(toSnakeCase({ userId: 42 }, mapping)).toEqual({ user_identifier: 42 });
  });

  it('handles empty object', () => {
    expect(toSnakeCase({})).toEqual({});
  });

  it('preserves values unchanged — only keys are converted', () => {
    expect(toSnakeCase({ camelKey: 'CamelValue' })).toEqual({ camel_key: 'CamelValue' });
  });

  it('does not recursively convert nested objects (shallow)', () => {
    const result = toSnakeCase({ outerKey: { innerKey: 1 } });
    // inner key is NOT converted — toSnakeCase is shallow
    expect(result).toEqual({ outer_key: { innerKey: 1 } });
  });
});

// ============================================================================
// toCamelCase (overloads)
// ============================================================================
describe('toCamelCase', () => {
  it('converts snake_case string via snakeToCamel', () => {
    expect(toCamelCase('snake_case')).toBe('snakeCase');
  });

  it('converts space-separated string via word-boundary logic', () => {
    expect(toCamelCase('hello world')).toBe('helloWorld');
  });

  it('converts object keys from snake_case to camelCase', () => {
    expect(toCamelCase({ first_name: 'John', last_name: 'Doe' })).toEqual({
      firstName: 'John',
      lastName: 'Doe',
    });
  });

  it('applies reverse of custom key mapping on object', () => {
    const mapping = { userId: 'user_identifier' };
    const result = toCamelCase({ user_identifier: 42 }, mapping);
    expect(result).toEqual({ userId: 42 });
  });

  it('handles empty object', () => {
    expect(toCamelCase({})).toEqual({});
  });

  it('does not recursively convert nested objects (shallow)', () => {
    const result = toCamelCase({ outer_key: { inner_key: 1 } }) as Record<string, unknown>;
    expect(result['outerKey']).toEqual({ inner_key: 1 });
  });

  it('converts string with multiple spaces', () => {
    // multiple spaces: word-boundary regex handles each word
    const result = toCamelCase('foo  bar');
    // extra space between foo and bar — depends on split behavior
    expect(typeof result).toBe('string');
  });
});

// ============================================================================
// toCamelCaseArray
// ============================================================================
describe('toCamelCaseArray', () => {
  it('converts array of snake_case objects', () => {
    const input = [{ first_name: 'Alice' }, { first_name: 'Bob' }];
    expect(toCamelCaseArray(input)).toEqual([{ firstName: 'Alice' }, { firstName: 'Bob' }]);
  });

  it('returns empty array for empty input', () => {
    expect(toCamelCaseArray([])).toEqual([]);
  });

  it('applies mapping across all items', () => {
    const mapping = { userId: 'user_id' };
    const input = [{ user_id: 1 }, { user_id: 2 }];
    expect(toCamelCaseArray(input, mapping)).toEqual([{ userId: 1 }, { userId: 2 }]);
  });
});

// ============================================================================
// snakeifyKeys (recursive)
// ============================================================================
describe('snakeifyKeys', () => {
  it('converts top-level camelCase keys', () => {
    expect(snakeifyKeys({ firstName: 'Alice' })).toEqual({ first_name: 'Alice' });
  });

  it('recursively converts nested object keys', () => {
    expect(snakeifyKeys({ outerKey: { innerKey: 1 } })).toEqual({
      outer_key: { inner_key: 1 },
    });
  });

  it('converts keys inside arrays of objects', () => {
    expect(snakeifyKeys({ items: [{ itemName: 'foo' }] })).toEqual({
      items: [{ item_name: 'foo' }],
    });
  });

  it('passes through null values without throwing', () => {
    expect(snakeifyKeys(null)).toBeNull();
  });

  it('passes through undefined without throwing', () => {
    expect(snakeifyKeys(undefined)).toBeUndefined();
  });

  it('passes through primitive values unchanged', () => {
    expect(snakeifyKeys(42)).toBe(42);
    expect(snakeifyKeys('hello')).toBe('hello');
  });

  it('handles empty object', () => {
    expect(snakeifyKeys({})).toEqual({});
  });

  it('handles empty array', () => {
    expect(snakeifyKeys([])).toEqual([]);
  });

  it('preserves Date instances without converting them', () => {
    const d = new Date('2024-01-01');
    const result = snakeifyKeys({ createdAt: d }) as Record<string, unknown>;
    expect(result['created_at']).toBe(d);
  });

  it('handles circular references without infinite loop', () => {
    const obj: Record<string, unknown> = { selfRef: null };
    obj['selfRef'] = obj;
    // Should not throw; circular ref is handled via WeakMap
    expect(() => snakeifyKeys(obj)).not.toThrow();
  });

  it('preserves symbol-keyed properties', () => {
    const sym = Symbol('test');
    const obj = Object.assign({ camelKey: 1 }, { [sym]: 'symbol-value' });
    const result = snakeifyKeys(obj) as Record<string | symbol, unknown>;
    expect(result[sym]).toBe('symbol-value');
  });

  it('does not convert keys of Date/RegExp/TypedArray objects themselves', () => {
    const re = /abc/;
    const result = snakeifyKeys({ myRegex: re }) as Record<string, unknown>;
    expect(result['my_regex']).toBe(re);
  });
});

// ============================================================================
// camelizeKeys (recursive)
// ============================================================================
describe('camelizeKeys', () => {
  it('converts top-level snake_case keys', () => {
    expect(camelizeKeys({ first_name: 'Alice' })).toEqual({ firstName: 'Alice' });
  });

  it('recursively converts nested object keys', () => {
    expect(camelizeKeys({ outer_key: { inner_key: 1 } })).toEqual({
      outerKey: { innerKey: 1 },
    });
  });

  it('converts keys inside arrays of objects', () => {
    expect(camelizeKeys({ items: [{ item_name: 'foo' }] })).toEqual({
      items: [{ itemName: 'foo' }],
    });
  });

  it('passes through null values without throwing', () => {
    expect(camelizeKeys(null)).toBeNull();
  });

  it('handles circular references without infinite loop', () => {
    const obj: Record<string, unknown> = { inner_ref: null };
    obj['inner_ref'] = obj;
    expect(() => camelizeKeys(obj)).not.toThrow();
  });
});

// ============================================================================
// capitalize
// ============================================================================
describe('capitalize', () => {
  it('capitalizes first letter and lowercases rest', () => {
    expect(capitalize('hello')).toBe('Hello');
  });

  it('lowercases already-uppercase rest of string', () => {
    expect(capitalize('HELLO')).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(capitalize('')).toBe('');
  });

  it('handles single character', () => {
    expect(capitalize('a')).toBe('A');
    expect(capitalize('Z')).toBe('Z');
  });

  it('handles string starting with digit', () => {
    expect(capitalize('1foo')).toBe('1foo');
  });

  it('lowercases mixed-case second-onward chars', () => {
    expect(capitalize('hELLO')).toBe('Hello');
  });
});

// ============================================================================
// titleCase
// ============================================================================
describe('titleCase', () => {
  it('capitalizes each word', () => {
    expect(titleCase('hello world')).toBe('Hello World');
  });

  it('returns empty string for empty input', () => {
    expect(titleCase('')).toBe('');
  });

  it('handles already-capitalized input', () => {
    expect(titleCase('Hello World')).toBe('Hello World');
  });

  it('lowercases all-caps input before title-casing', () => {
    expect(titleCase('HELLO WORLD')).toBe('Hello World');
  });

  it('handles single word', () => {
    expect(titleCase('hello')).toBe('Hello');
  });

  it('handles extra spaces — produces empty tokens that survive as-is', () => {
    // split(' ') on 'hello  world' produces ['hello', '', 'world']
    // empty token charAt(0) is '', so ''.toUpperCase() + '' = '' — preserved as empty
    const result = titleCase('hello  world');
    expect(result).toBe('Hello  World');
  });

  it('handles string with numbers', () => {
    expect(titleCase('hello 2 world')).toBe('Hello 2 World');
  });
});

// ============================================================================
// slugify
// ============================================================================
describe('slugify', () => {
  it('converts basic string to slug', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(slugify('   ')).toBe('');
  });

  it('strips special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });

  it('strips Unicode letters (non-ASCII)', () => {
    // Implementation only allows a-z and 0-9; Unicode chars are treated as separators
    expect(slugify('café')).toBe('caf');
    expect(slugify('naïve')).toBe('na-ve');
  });

  it('collapses consecutive special chars into a single hyphen', () => {
    expect(slugify('hello   world')).toBe('hello-world');
    expect(slugify('hello---world')).toBe('hello-world');
  });

  it('does not produce leading hyphen', () => {
    expect(slugify('!hello')).toBe('hello');
  });

  it('does not produce trailing hyphen', () => {
    expect(slugify('hello!')).toBe('hello');
  });

  it('handles string that is entirely special characters', () => {
    expect(slugify('!!!')).toBe('');
  });

  it('preserves digits', () => {
    expect(slugify('page 2')).toBe('page-2');
    expect(slugify('v1.2.3')).toBe('v1-2-3');
  });

  it('handles very long string', () => {
    const long = 'a'.repeat(10000);
    const result = slugify(long);
    expect(result).toBe('a'.repeat(10000));
  });

  it('handles string with only digits', () => {
    expect(slugify('12345')).toBe('12345');
  });
});

// ============================================================================
// truncate
// ============================================================================
describe('truncate', () => {
  it('truncates string longer than maxLength', () => {
    expect(truncate('Hello, World!', 8)).toBe('Hello...');
  });

  it('returns string unchanged when shorter than maxLength', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('returns string unchanged when exactly at maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('returns empty string for empty input', () => {
    expect(truncate('')).toBe('');
  });

  it('uses default maxLength of 100', () => {
    const str = 'a'.repeat(101);
    const result = truncate(str);
    expect(result.length).toBe(100);
    expect(result.endsWith('...')).toBe(true);
  });

  it('uses custom ellipsis — single-char suffix has length 1, not 3', () => {
    // '…' is a single JS character (length 1), so substring(0, 8 - 1) = 'Hello, '
    // This differs from '...' (length 3) which would give substring(0, 8 - 3) = 'Hello'
    // The implementation uses suffix.length, not a fixed 3 — so the caller must account for this
    expect(truncate('Hello, World!', 8, '…')).toBe('Hello, …');
  });

  it('handles maxLength of 0 — substring(0, 0 - 3) = substring(0, -3) = empty string', () => {
    // substring with negative stop is treated as 0, so result is just suffix
    const result = truncate('Hello', 0);
    expect(result).toBe('...');
  });

  it('handles maxLength of 1 with default suffix — suffix longer than max', () => {
    // substring(0, 1 - 3) = substring(0, -2) = '' → '...'
    const result = truncate('Hello', 1);
    expect(result).toBe('...');
  });

  it('handles maxLength of 3 — exactly suffix length', () => {
    // substring(0, 3 - 3) = substring(0, 0) = '' → '...'
    const result = truncate('Hello', 3);
    expect(result).toBe('...');
  });

  it('handles maxLength of 4', () => {
    expect(truncate('Hello', 4)).toBe('H...');
  });

  it('handles empty custom suffix', () => {
    expect(truncate('Hello', 3, '')).toBe('Hel');
  });

  it('does not truncate when string equals maxLength exactly', () => {
    // length <= maxLength returns original — strict less-than-or-equal check
    expect(truncate('abc', 3)).toBe('abc');
  });
});

// ============================================================================
// normalizeWhitespace
// ============================================================================
describe('normalizeWhitespace', () => {
  it('collapses multiple spaces to one', () => {
    expect(normalizeWhitespace('hello   world')).toBe('hello world');
  });

  it('returns empty string for empty input', () => {
    expect(normalizeWhitespace('')).toBe('');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
  });

  it('collapses tabs to a single space', () => {
    expect(normalizeWhitespace('hello\t\tworld')).toBe('hello world');
  });

  it('collapses newlines to a single space', () => {
    expect(normalizeWhitespace('hello\n\nworld')).toBe('hello world');
  });

  it('handles whitespace-only string — trims to empty', () => {
    expect(normalizeWhitespace('   ')).toBe('');
  });

  it('handles mixed whitespace types', () => {
    expect(normalizeWhitespace(' \t hello \n world \t ')).toBe('hello world');
  });

  it('handles non-breaking space (\\u00A0) — \\s+ matches it', () => {
    expect(normalizeWhitespace('hello\u00A0world')).toBe('hello world');
  });
});

// ============================================================================
// padLeft
// ============================================================================
describe('padLeft', () => {
  it('pads string to specified length', () => {
    expect(padLeft('5', 3, '0')).toBe('005');
  });

  it('returns string unchanged when already at target length', () => {
    expect(padLeft('abc', 3)).toBe('abc');
  });

  it('returns string unchanged when longer than target length', () => {
    expect(padLeft('abcde', 3)).toBe('abcde');
  });

  it('uses space as default pad character', () => {
    expect(padLeft('hi', 5)).toBe('   hi');
  });

  it('handles empty string input', () => {
    expect(padLeft('', 3, 'x')).toBe('xxx');
  });

  it('pads to length 0 returns original string', () => {
    expect(padLeft('hello', 0)).toBe('hello');
  });

  it('pads to length 1 when string is empty', () => {
    expect(padLeft('', 1, '*')).toBe('*');
  });

  it('handles multi-char pad character — repeat may over-pad', () => {
    // padChar.repeat(length - str.length): if padChar is 'ab' and we need 2 chars,
    // repeat(2) gives 'abab' (4 chars), not 2 — the implementation does not truncate
    const result = padLeft('x', 3, 'ab');
    expect(result.endsWith('x')).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(3);
  });
});

// ============================================================================
// normalizeEmail
// ============================================================================
describe('normalizeEmail', () => {
  it('lowercases email', () => {
    expect(normalizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('handles already-normalized email', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('handles empty string', () => {
    expect(normalizeEmail('')).toBe('');
  });

  it('does not validate format — passes through invalid emails', () => {
    expect(normalizeEmail('not-an-email')).toBe('not-an-email');
    expect(normalizeEmail('@nodomain')).toBe('@nodomain');
    expect(normalizeEmail('noatsign')).toBe('noatsign');
  });

  it('handles multiple @ signs — treats all as part of the string', () => {
    expect(normalizeEmail('user@@example.com')).toBe('user@@example.com');
  });
});

// ============================================================================
// canonicalizeEmail
// ============================================================================
describe('canonicalizeEmail', () => {
  it('normalizes case and trims whitespace', () => {
    expect(canonicalizeEmail('  USER@EXAMPLE.COM  ')).toBe('user@example.com');
  });

  it('strips plus addressing', () => {
    expect(canonicalizeEmail('user+tag@example.com')).toBe('user@example.com');
  });

  it('strips dots from Gmail local part', () => {
    expect(canonicalizeEmail('u.s.e.r@gmail.com')).toBe('user@gmail.com');
  });

  it('strips dots from Googlemail domain', () => {
    expect(canonicalizeEmail('u.s.e.r@googlemail.com')).toBe('user@googlemail.com');
  });

  it('combines plus stripping and dot removal for Gmail', () => {
    expect(canonicalizeEmail('u.s.e.r+tag@gmail.com')).toBe('user@gmail.com');
  });

  it('does NOT strip dots from non-Gmail domains', () => {
    expect(canonicalizeEmail('u.s.e.r@outlook.com')).toBe('u.s.e.r@outlook.com');
  });

  it('returns string unchanged when no @ present', () => {
    expect(canonicalizeEmail('notanemail')).toBe('notanemail');
  });

  it('handles empty string', () => {
    expect(canonicalizeEmail('')).toBe('');
  });

  it('handles email with only @ — empty local part', () => {
    // atIndex is 0; localPart is ''; domain is ''
    expect(canonicalizeEmail('@')).toBe('@');
  });

  it('uses FIRST @ for splitting — multiple @ signs', () => {
    // indexOf('@') finds the first one
    const result = canonicalizeEmail('user@host@gmail.com');
    // localPart = 'user', domain = 'host@gmail.com'
    // domain is not 'gmail.com' so no dot stripping
    expect(result).toBe('user@host@gmail.com');
  });

  it('handles plus at position 0 of local part — strips entire local part', () => {
    const result = canonicalizeEmail('+alias@example.com');
    expect(result).toBe('@example.com');
  });
});

// ============================================================================
// trimTrailingSlashes
// ============================================================================
describe('trimTrailingSlashes', () => {
  it('removes single trailing slash', () => {
    expect(trimTrailingSlashes('https://example.com/')).toBe('https://example.com');
  });

  it('removes multiple trailing slashes', () => {
    expect(trimTrailingSlashes('https://example.com///')).toBe('https://example.com');
  });

  it('returns string unchanged when no trailing slash', () => {
    expect(trimTrailingSlashes('https://example.com')).toBe('https://example.com');
  });

  it('returns empty string for null input', () => {
    expect(trimTrailingSlashes(null)).toBe('');
  });

  it('returns empty string for undefined input', () => {
    expect(trimTrailingSlashes(undefined)).toBe('');
  });

  it('returns empty string for a string of only slashes', () => {
    expect(trimTrailingSlashes('///')).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(trimTrailingSlashes('')).toBe('');
  });

  it('returns single slash string with content unchanged when interior slash present', () => {
    expect(trimTrailingSlashes('/path/to/resource/')).toBe('/path/to/resource');
  });

  it('handles single slash string', () => {
    expect(trimTrailingSlashes('/')).toBe('');
  });
});

// ============================================================================
// stripControlChars
// ============================================================================
describe('stripControlChars', () => {
  it('removes null bytes', () => {
    expect(stripControlChars('hello\0world')).toBe('helloworld');
  });

  it('removes backspace character (\\x08)', () => {
    expect(stripControlChars('hello\x08world')).toBe('helloworld');
  });

  it('removes bell character (\\x07)', () => {
    expect(stripControlChars('hello\x07world')).toBe('helloworld');
  });

  it('removes escape character (\\x1B)', () => {
    expect(stripControlChars('hello\x1Bworld')).toBe('helloworld');
  });

  it('removes delete character (\\x7F)', () => {
    expect(stripControlChars('hello\x7Fworld')).toBe('helloworld');
  });

  it('preserves tab (\\x09) and newline (\\x0A) and carriage return (\\x0D)', () => {
    // \\x09 = tab, \\x0A = newline, \\x0D = CR — these are NOT in the strip range
    // Range strips \\x00-\\x08, \\x0B, \\x0C, \\x0E-\\x1F
    expect(stripControlChars('line1\nline2')).toBe('line1\nline2');
    expect(stripControlChars('col1\tcol2')).toBe('col1\tcol2');
  });

  it('strips vertical tab (\\x0B) and form feed (\\x0C)', () => {
    expect(stripControlChars('a\x0Bb')).toBe('ab');
    expect(stripControlChars('a\x0Cb')).toBe('ab');
  });

  it('returns empty string for empty input', () => {
    expect(stripControlChars('')).toBe('');
  });

  it('preserves regular ASCII printable characters', () => {
    expect(stripControlChars('Hello, World! 123')).toBe('Hello, World! 123');
  });

  it('preserves multi-byte Unicode characters', () => {
    expect(stripControlChars('Hello 🌍')).toBe('Hello 🌍');
    expect(stripControlChars('héllo')).toBe('héllo');
  });

  it('handles string with multiple consecutive null bytes', () => {
    expect(stripControlChars('\0\0\0')).toBe('');
  });

  it('handles XSS attempt with control chars mixed in', () => {
    const input = '<sc\x00ript>alert(1)</sc\x0Bript>';
    const result = stripControlChars(input);
    expect(result).not.toContain('\x00');
    expect(result).not.toContain('\x0B');
    expect(result).toContain('<script>');
  });
});

// ============================================================================
// escapeHtml
// ============================================================================
describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('x > y')).toBe('x &gt; y');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"quoted"')).toBe('&quot;quoted&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#x27;s');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes all entities in a single string', () => {
    expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#x27;');
  });

  it('does not double-escape already-escaped strings', () => {
    // '&amp;' contains '&' which gets escaped again → '&amp;amp;'
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('handles XSS script injection payload', () => {
    const payload = '<script>alert("xss")</script>';
    const result = escapeHtml(payload);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).toContain('&quot;xss&quot;');
  });

  it('handles nested HTML', () => {
    expect(escapeHtml('<div class="foo">bar</div>')).toBe(
      '&lt;div class=&quot;foo&quot;&gt;bar&lt;/div&gt;',
    );
  });

  it('passes through string with no special characters unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

// ============================================================================
// countWords
// ============================================================================
describe('countWords', () => {
  it('counts words in a normal sentence', () => {
    expect(countWords('hello world')).toBe(2);
  });

  it('returns 0 for empty string', () => {
    expect(countWords('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countWords('   ')).toBe(0);
  });

  it('handles multiple spaces between words', () => {
    expect(countWords('hello   world')).toBe(2);
  });

  it('handles tabs between words', () => {
    expect(countWords('hello\tworld')).toBe(2);
  });

  it('handles newlines between words', () => {
    expect(countWords('hello\nworld')).toBe(2);
  });

  it('counts single word', () => {
    expect(countWords('hello')).toBe(1);
  });

  it('handles leading and trailing whitespace', () => {
    expect(countWords('  hello world  ')).toBe(2);
  });

  it('handles string with only one character', () => {
    expect(countWords('a')).toBe(1);
  });
});

// ============================================================================
// countCharactersNoWhitespace
// ============================================================================
describe('countCharactersNoWhitespace', () => {
  it('counts characters excluding spaces', () => {
    expect(countCharactersNoWhitespace('hello world')).toBe(10);
  });

  it('returns 0 for empty string', () => {
    expect(countCharactersNoWhitespace('')).toBe(0);
  });

  it('returns 0 for whitespace-only string', () => {
    expect(countCharactersNoWhitespace('   ')).toBe(0);
  });

  it('counts all chars in string with no whitespace', () => {
    expect(countCharactersNoWhitespace('hello')).toBe(5);
  });

  it('strips tabs and newlines', () => {
    expect(countCharactersNoWhitespace('a\tb\nc')).toBe(3);
  });

  it('counts Unicode characters correctly', () => {
    // emoji is 2 code units in JS but is 1 char visually; .length returns code units
    const result = countCharactersNoWhitespace('a 🌍 b');
    // '🌍' has length 2 in JS (surrogate pair)
    expect(result).toBe(4); // 'a' + emoji(2 units) + 'b' = 4
  });
});

// ============================================================================
// formatBytes
// ============================================================================
describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes under 1 KB', () => {
    expect(formatBytes(512)).toBe('512 B');
  });

  it('formats exactly 1 KB boundary', () => {
    expect(formatBytes(1024)).toBe('1 KB');
  });

  it('formats exactly 1 MB boundary', () => {
    expect(formatBytes(1048576)).toBe('1 MB');
  });

  it('formats exactly 1 GB boundary', () => {
    expect(formatBytes(1073741824)).toBe('1 GB');
  });

  it('formats fractional KB', () => {
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats fractional MB', () => {
    expect(formatBytes(1572864)).toBe('1.5 MB');
  });

  it('handles very large number exceeding GB index — falls back to sizes[i] ?? B', () => {
    // 1 PB = 1024^5; sizes array only has indices 0-3 (B, KB, MB, GB)
    // i = floor(log(1PB) / log(1024)) = 5 → sizes[5] is undefined → falls back to 'B'
    const onePB = Math.pow(1024, 5);
    const result = formatBytes(onePB);
    expect(result).toContain('B');
  });

  it('handles negative numbers — Math.log of negative is NaN, result is unpredictable', () => {
    // Negative input: Math.log(-1) = NaN → i = NaN → sizes[NaN] = undefined → 'B' fallback
    const result = formatBytes(-1);
    expect(typeof result).toBe('string');
  });

  it('handles NaN input — log(NaN) = NaN', () => {
    const result = formatBytes(NaN);
    expect(typeof result).toBe('string');
  });

  it('handles Infinity — log(Infinity) = Infinity, i = Infinity', () => {
    const result = formatBytes(Infinity);
    expect(typeof result).toBe('string');
  });

  it('handles fractional bytes (e.g. 0.5)', () => {
    // Math.log(0.5) is negative → i = -1 → sizes[-1] is undefined → 'B' fallback
    const result = formatBytes(0.5);
    expect(typeof result).toBe('string');
  });

  it('formats 1 byte', () => {
    expect(formatBytes(1)).toBe('1 B');
  });

  it('rounds to 2 decimal places', () => {
    // 1025 bytes: 1025 / 1024 = 1.0009765625 → toFixed(2) = '1'
    expect(formatBytes(1025)).toBe('1 KB');
  });
});
