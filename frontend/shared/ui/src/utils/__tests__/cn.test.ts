// packages/ui/src/utils/__tests__/cn.test.ts
import { describe, expect, it } from 'vitest';

import { cn } from '../cn';

describe('cn', () => {
  it('joins truthy class names in order', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsey values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });

  it('drops empty strings', () => {
    expect(cn('a', '', 'b')).toBe('a b');
  });

  it('returns an empty string when no truthy values exist', () => {
    expect(cn(false, null, undefined, '')).toBe('');
  });
});
