// packages/ui/src/theme/__tests__/colors.test.ts
import { describe, expect, it } from 'vitest';

import { colors } from '../colors';

const hexColorPattern = /^#[0-9a-f]{6}$/i;

describe('colors', () => {
  it('exposes the expected color keys', () => {
    expect(Object.keys(colors)).toEqual([
      'primary',
      'primaryMuted',
      'danger',
      'success',
      'warning',
      'neutral',
      'muted',
      'surface',
      'border',
    ]);
  });

  it('uses valid hex color values', () => {
    Object.values(colors).forEach((value) => {
      expect(value).toMatch(hexColorPattern);
    });
  });
});
