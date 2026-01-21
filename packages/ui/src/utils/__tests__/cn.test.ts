// packages/ui/src/utils/__tests__/cn.test.ts
import { describe, expect, it } from 'vitest';

import { cn } from '../cn';

describe('cn', () => {
  it('joins string parts with spaces', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('filters out false values', () => {
    expect(cn('foo', false, 'bar')).toBe('foo bar');
  });

  it('filters out null values', () => {
    expect(cn('foo', null, 'bar')).toBe('foo bar');
  });

  it('filters out undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar');
  });

  it('handles empty string', () => {
    expect(cn('foo', '', 'bar')).toBe('foo bar');
  });

  it('returns empty string when no valid parts', () => {
    expect(cn(false, null, undefined)).toBe('');
  });

  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });

  it('handles single string argument', () => {
    expect(cn('foo')).toBe('foo');
  });

  it('handles mixed valid and invalid values', () => {
    expect(cn('a', false, 'b', null, 'c', undefined, 'd')).toBe('a b c d');
  });
});
