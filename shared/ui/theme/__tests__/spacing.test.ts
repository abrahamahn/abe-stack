// packages/ui/src/theme/__tests__/spacing.test.ts
import { describe, expect, it } from 'vitest';

import { spacing } from '../spacing';

const spacingPattern = /^\d+px$/;

describe('spacing', () => {
  it('exposes the expected spacing keys', () => {
    expect(Object.keys(spacing)).toEqual(['xs', 'sm', 'md', 'lg', 'xl']);
  });

  it('uses px values with positive numbers', () => {
    Object.values(spacing).forEach((value) => {
      expect(value).toMatch(spacingPattern);
      expect(Number.parseInt(value.replace('px', ''), 10)).toBeGreaterThan(0);
    });
  });
});
