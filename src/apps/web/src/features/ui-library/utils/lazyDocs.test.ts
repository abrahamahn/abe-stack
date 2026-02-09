// src/apps/web/src/features/ui-library/utils/lazyDocs.test.ts
import { describe, expect, test } from 'vitest';

import { clearDocsCache, getComponentDocsLazy } from './lazyDocs';

import type { ComponentCategory } from '@ui-library/types';

describe('lazyDocs utilities', () => {
  test('should return null for unknown component docs', async () => {
    const category: ComponentCategory = 'components';
    const result = await getComponentDocsLazy('unknown-component', category);
    expect(result).toBeNull();
  });

  test('should clear docs cache without throwing', () => {
    expect(() => {
      clearDocsCache();
    }).not.toThrow();
  });
});
