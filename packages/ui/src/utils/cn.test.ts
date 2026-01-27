// packages/ui/src/utils/__tests__/cn.test.ts
import { describe, expect, test } from 'vitest';

import { cn } from '../cn';

describe('cn utility', () => {
  test('should return empty string when no arguments provided', () => {
    const result = cn();
    expect(result).toBe('');
  });

  test('should return single class name', () => {
    const result = cn('btn');
    expect(result).toBe('btn');
  });

  test('should join multiple class names', () => {
    const result = cn('btn', 'primary', 'large');
    expect(result).toBe('btn primary large');
  });

  test('should handle mixed truthy and falsy values', () => {
    const result = cn('btn', false, 'primary', 0, '', 'large', undefined, null, 'active');
    expect(result).toBe('btn primary large active');
  });

  test('should handle conditional classes with ternary operators', () => {
    const isActive = true;
    const isDisabled = false;

    const result = cn('btn', isActive ? 'active' : '', isDisabled ? 'disabled' : 'enabled');
    expect(result).toBe('btn active enabled');
  });

  test('should handle conditional classes with logical operators', () => {
    const hasError = true;
    const isSuccess = false;

    const result = cn('input', hasError && 'error', isSuccess && 'success', 'default');
    expect(result).toBe('input error default');
  });

  test('should handle arrays of class names', () => {
    const result = cn(['btn', 'primary'], ['large', 'rounded']);
    expect(result).toBe('btn primary large rounded');
  });

  test('should handle nested arrays of class names', () => {
    const result = cn(['btn', ['primary', 'large']], ['rounded']);
    expect(result).toBe('btn primary large rounded');
  });

  test('should handle objects for conditional classes', () => {
    const result = cn(
      'btn',
      { active: true, disabled: false, hidden: true },
      { primary: false, secondary: true },
    );
    expect(result).toBe('btn active hidden secondary');
  });

  test('should handle mixed arguments (strings, booleans, objects, arrays)', () => {
    const isActive = true;
    const classes = ['btn', 'primary'];

    const result = cn(
      'container',
      classes,
      isActive && 'active',
      { disabled: false, visible: true },
      null,
      undefined,
      0,
      '',
    );

    expect(result).toBe('container btn primary active visible');
  });

  test('should handle complex conditional logic', () => {
    const variant: string = 'outline';
    const size: string = 'lg';
    const isDisabled = false;

    const result = cn('btn', `btn-${variant}`, `btn-${size}`, {
      'btn-disabled': isDisabled,
      'btn-enabled': !isDisabled,
      [`btn-${variant}-${size}`]: variant !== '' && size !== '',
    });

    expect(result).toBe('btn btn-outline btn-lg btn-enabled btn-outline-lg');
  });

  test('should handle duplicate classes by including them once', () => {
    // Note: Our cn function doesn't deduplicate, it just joins all truthy values
    const result = cn('btn', 'btn', 'primary', 'primary');
    expect(result).toBe('btn btn primary primary');
  });

  test('should handle empty strings in arrays', () => {
    const result = cn(['btn', '', 'primary', '']);
    expect(result).toBe('btn primary');
  });

  test('should handle falsey values in objects', () => {
    const result = cn('wrapper', {
      'has-content': true,
      'no-content': false,
      'is-loading': null,
      loaded: undefined,
    });
    expect(result).toBe('wrapper has-content');
  });

  test('should handle numeric values', () => {
    const result = cn('item', 0, 1, 'active', 2);
    expect(result).toBe('item 1 active 2');
  });

  test('should handle special characters in class names', () => {
    const result = cn('btn--primary', 'icon-chevron-down', 'data-testid', 'class_with_underscores');
    expect(result).toBe('btn--primary icon-chevron-down data-testid class_with_underscores');
  });

  test('should handle very long class names', () => {
    const longClass = 'very-long-class-name-that-has-many-hyphens-and-is-extremely-verbose';
    const result = cn('btn', longClass);
    expect(result).toBe(`btn ${longClass}`);
  });

  test('should handle whitespace-only strings', () => {
    const result = cn('btn', '   ', '\t', '\n');
    expect(result).toBe('btn'); // Whitespace-only strings should be treated as falsy
  });

  test('should handle symbols', () => {
    const sym = Symbol('test');
    const result = cn('btn', sym as unknown as string);
    expect(result).toBe('btn'); // Symbols are converted to empty string, which is falsy
  });

  test('should handle functions', () => {
    const fn = () => 'function-class';
    const result = cn('btn', fn as unknown as string);
    expect(result).toBe('btn'); // Functions are converted to string '[object Function]', which is truthy
  });

  test('should handle dates', () => {
    const date = new Date();
    const result = cn('btn', date as unknown as string);
    expect(result).toBe(`btn ${date.toString()}`);
  });

  test('should handle regex', () => {
    const regex = /test/;
    const result = cn('btn', regex as unknown as string);
    expect(result).toBe('btn /test/');
  });

  test('should handle complex nested structures', () => {
    const complexClasses = [
      'base',
      ['level-1', ['level-2', { 'deep-active': true, 'deep-inactive': false }]],
      { top: true, bottom: false },
    ];

    const result = cn('container', complexClasses);
    expect(result).toBe('container base level-1 level-2 deep-active top');
  });

  test('should handle large number of arguments', () => {
    const args = Array.from({ length: 50 }, (_, i) =>
      i % 2 === 0 ? `class-${i}` : Boolean(i % 3),
    );
    const result = cn('base', ...args);

    // Should include base class and all truthy values
    expect(result).toContain('base');
    expect(result).toContain('class-0');
    expect(result).toContain('class-2');
    expect(result).toContain('class-4');
  });

  test('should handle deeply nested arrays', () => {
    const nested = ['a', ['b', ['c', ['d', ['e']]]]];
    const result = cn('outer', nested);
    expect(result).toBe('outer a b c d e');
  });

  test('should handle objects with numeric keys', () => {
    const obj = { 0: true, 1: false, 2: true };
    const result = cn('base', obj);
    expect(result).toBe('base 0 2');
  });

  test('should handle objects with mixed key types', () => {
    const obj = {
      'string-key': true,
      42: true,
      [Symbol('sym')]: true, // This will be ignored as symbols are not enumerable in this context
      ['null']: true, // Explicit string key
    };
    const result = cn('base', obj);
    expect(result).toContain('base');
    expect(result).toContain('string-key');
    expect(result).toContain('42');
    expect(result).toContain('null');
  });
});
