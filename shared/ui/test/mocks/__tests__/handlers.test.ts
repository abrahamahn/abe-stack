// packages/ui/src/test/mocks/__tests__/handlers.test.ts
import { describe, expect, it } from 'vitest';

import { handlers } from '../handlers';

describe('handlers', () => {
  it('exports an array of request handlers', () => {
    expect(Array.isArray(handlers)).toBe(true);
  });

  it('starts with no handlers registered', () => {
    expect(handlers).toHaveLength(0);
  });
});
