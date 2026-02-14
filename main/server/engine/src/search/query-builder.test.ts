// main/server/engine/src/search/query-builder.test.ts
import * as shared from '@abe-stack/shared';
import { describe, expect, it } from 'vitest';

import * as engine from './query-builder';

describe('search/query-builder', () => {
  it('re-exports shared query builder helpers', () => {
    expect(engine.createSearchQuery).toBe(shared.createSearchQuery);
    expect(engine.fromSearchQuery).toBe(shared.fromSearchQuery);
    expect(engine.SearchQueryBuilder).toBe(shared.SearchQueryBuilder);
  });
});
