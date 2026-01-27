// packages/ui/src/theme/__tests__/spacing.test.ts
import { describe, expect, it } from 'vitest';

import { spacing } from './spacing';

const spacingPattern = /^[\d.]+rem$/;

describe('spacing', () => {
  it('exposes the expected spacing keys', () => {
    expect(Object.keys(spacing)).toEqual(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']);
  });

  it('uses rem values with positive numbers', () => {
    Object.values(spacing).forEach((value) => {
      expect(value).toMatch(spacingPattern);
      expect(Number.parseFloat(value.replace('rem', ''))).toBeGreaterThan(0);
    });
  });
});
