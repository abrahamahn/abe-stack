// packages/shared/src/contracts/pagination.test.ts
import { describe, expect, it } from 'vitest';

import {
  cursorPaginatedResultSchema,
  cursorPaginationOptionsSchema,
  paginatedResultSchema,
  paginationOptionsSchema,
  SORT_ORDER,
  universalPaginatedResultSchema,
  universalPaginationOptionsSchema,
} from './pagination';
import { createSchema } from './schema';

import type { Schema } from './types';

// Helper to create simple test schemas
const stringSchema: Schema<string> = createSchema((data: unknown) => {
  if (typeof data !== 'string') {
    throw new Error('Expected string');
  }
  return data;
});

const userSchemaManual: Schema<{ id: string; name: string }> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Expected object');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') {
    throw new Error('Expected id to be string');
  }
  if (typeof obj['name'] !== 'string') {
    throw new Error('Expected name to be string');
  }
  return { id: obj['id'], name: obj['name'] };
});

const productSchemaManual: Schema<{ id: string; price: number }> = createSchema((data: unknown) => {
  if (data === null || data === undefined || typeof data !== 'object') {
    throw new Error('Expected object');
  }
  const obj = data as Record<string, unknown>;
  if (typeof obj['id'] !== 'string') {
    throw new Error('Expected id to be string');
  }
  if (typeof obj['price'] !== 'number') {
    throw new Error('Expected price to be number');
  }
  return { id: obj['id'], price: obj['price'] };
});

describe('SORT_ORDER', () => {
  it('should have correct sort order values', () => {
    expect(SORT_ORDER.ASC).toBe('asc');
    expect(SORT_ORDER.DESC).toBe('desc');
  });
});

// ============================================================================
// Offset-based Pagination Tests
// ============================================================================

describe('paginationOptionsSchema', () => {
  it('should validate correct pagination options', () => {
    const validOptions = {
      page: 1,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };
    const result = paginationOptionsSchema.safeParse(validOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.sortBy).toBe('createdAt');
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('should apply default values', () => {
    const minimalOptions = {};
    const result = paginationOptionsSchema.safeParse(minimalOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.sortOrder).toBe('desc');
      expect(result.data.sortBy).toBeUndefined();
    }
  });

  it('should reject page less than 1', () => {
    const invalidOptions = {
      page: 0,
      limit: 50,
    };
    const result = paginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });

  it('should reject negative page', () => {
    const invalidOptions = {
      page: -1,
      limit: 50,
    };
    const result = paginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1', () => {
    const invalidOptions = {
      page: 1,
      limit: 0,
    };
    const result = paginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });

  it('should reject limit greater than 1000', () => {
    const invalidOptions = {
      page: 1,
      limit: 1001,
    };
    const result = paginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });

  it('should accept limit of exactly 1000', () => {
    const validOptions = {
      page: 1,
      limit: 1000,
    };
    const result = paginationOptionsSchema.safeParse(validOptions);
    expect(result.success).toBe(true);
  });

  it('should reject non-integer page', () => {
    const invalidOptions = {
      page: 1.5,
      limit: 50,
    };
    const result = paginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });

  it('should only accept asc or desc for sortOrder', () => {
    const invalidOptions = {
      page: 1,
      limit: 50,
      sortOrder: 'ascending',
    };
    const result = paginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });

  it('should accept asc sort order', () => {
    const validOptions = {
      page: 1,
      limit: 50,
      sortOrder: 'asc',
    };
    const result = paginationOptionsSchema.safeParse(validOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortOrder).toBe('asc');
    }
  });
});

describe('paginatedResultSchema', () => {
  const schema = paginatedResultSchema(stringSchema);

  it('should validate correct paginated result', () => {
    const validResult = {
      data: ['item1', 'item2', 'item3'],
      total: 100,
      page: 1,
      limit: 50,
      hasNext: true,
      hasPrev: false,
      totalPages: 2,
    };
    const result = schema.safeParse(validResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.data).toHaveLength(3);
      expect(result.data.total).toBe(100);
      expect(result.data.hasNext).toBe(true);
      expect(result.data.hasPrev).toBe(false);
    }
  });

  it('should validate empty data array', () => {
    const emptyResult = {
      data: [],
      total: 0,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      totalPages: 0,
    };
    const result = schema.safeParse(emptyResult);
    expect(result.success).toBe(true);
  });

  it('should reject missing required fields', () => {
    const incompleteResult = {
      data: ['item1'],
      total: 1,
    };
    const result = schema.safeParse(incompleteResult);
    expect(result.success).toBe(false);
  });

  it('should reject negative total', () => {
    const invalidResult = {
      data: [],
      total: -1,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      totalPages: 0,
    };
    const result = schema.safeParse(invalidResult);
    expect(result.success).toBe(false);
  });

  it('should work with complex item schemas', () => {
    const userPaginatedSchema = paginatedResultSchema(userSchemaManual);

    const validResult = {
      data: [
        { id: '1', name: 'John' },
        { id: '2', name: 'Jane' },
      ],
      total: 2,
      page: 1,
      limit: 10,
      hasNext: false,
      hasPrev: false,
      totalPages: 1,
    };
    const result = userPaginatedSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });

  it('should reject items that do not match item schema', () => {
    const validResult = {
      data: [1, 2, 3], // Numbers instead of strings
      total: 3,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      totalPages: 1,
    };
    const result = schema.safeParse(validResult);
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// Cursor-based Pagination Tests
// ============================================================================

describe('cursorPaginationOptionsSchema', () => {
  it('should validate correct cursor pagination options', () => {
    const validOptions = {
      cursor: 'abc123',
      limit: 25,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    };
    const result = cursorPaginationOptionsSchema.safeParse(validOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBe('abc123');
      expect(result.data.limit).toBe(25);
    }
  });

  it('should apply default values', () => {
    const minimalOptions = {};
    const result = cursorPaginationOptionsSchema.safeParse(minimalOptions);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cursor).toBeUndefined();
      expect(result.data.limit).toBe(50);
      expect(result.data.sortOrder).toBe('desc');
    }
  });

  it('should accept undefined cursor (first page)', () => {
    const firstPageOptions = {
      limit: 20,
    };
    const result = cursorPaginationOptionsSchema.safeParse(firstPageOptions);
    expect(result.success).toBe(true);
  });

  it('should reject limit greater than 1000', () => {
    const invalidOptions = {
      limit: 1001,
    };
    const result = cursorPaginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });

  it('should reject limit less than 1', () => {
    const invalidOptions = {
      limit: 0,
    };
    const result = cursorPaginationOptionsSchema.safeParse(invalidOptions);
    expect(result.success).toBe(false);
  });
});

describe('cursorPaginatedResultSchema', () => {
  const schema = cursorPaginatedResultSchema(stringSchema);

  it('should validate correct cursor paginated result', () => {
    const validResult = {
      data: ['item1', 'item2'],
      nextCursor: 'cursor123',
      hasNext: true,
      limit: 50,
    };
    const result = schema.safeParse(validResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextCursor).toBe('cursor123');
      expect(result.data.hasNext).toBe(true);
    }
  });

  it('should accept null nextCursor (last page)', () => {
    const lastPageResult = {
      data: ['item1'],
      nextCursor: null,
      hasNext: false,
      limit: 50,
    };
    const result = schema.safeParse(lastPageResult);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.nextCursor).toBeNull();
    }
  });

  it('should validate empty data array', () => {
    const emptyResult = {
      data: [],
      nextCursor: null,
      hasNext: false,
      limit: 50,
    };
    const result = schema.safeParse(emptyResult);
    expect(result.success).toBe(true);
  });

  it('should reject missing limit', () => {
    const incompleteResult = {
      data: ['item1'],
      nextCursor: null,
      hasNext: false,
    };
    const result = schema.safeParse(incompleteResult);
    expect(result.success).toBe(false);
  });

  it('should work with complex item schemas', () => {
    const productCursorSchema = cursorPaginatedResultSchema(productSchemaManual);

    const validResult = {
      data: [
        { id: 'prod1', price: 29.99 },
        { id: 'prod2', price: 49.99 },
      ],
      nextCursor: 'cursor-abc',
      hasNext: true,
      limit: 10,
    };
    const result = productCursorSchema.safeParse(validResult);
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// Universal Pagination Tests
// ============================================================================

describe('universalPaginationOptionsSchema', () => {
  it('should validate offset-based pagination options', () => {
    const offsetOptions = {
      type: 'offset',
      page: 2,
      limit: 25,
      sortOrder: 'asc',
    };
    const result = universalPaginationOptionsSchema.safeParse(offsetOptions);
    expect(result.success).toBe(true);
  });

  it('should validate cursor-based pagination options', () => {
    const cursorOptions = {
      type: 'cursor',
      cursor: 'abc123',
      limit: 50,
      sortOrder: 'desc',
    };
    const result = universalPaginationOptionsSchema.safeParse(cursorOptions);
    expect(result.success).toBe(true);
  });

  it('should reject missing type', () => {
    const noTypeOptions = {
      page: 1,
      limit: 50,
    };
    const result = universalPaginationOptionsSchema.safeParse(noTypeOptions);
    expect(result.success).toBe(false);
  });

  it('should reject invalid type', () => {
    const invalidTypeOptions = {
      type: 'invalid',
      page: 1,
      limit: 50,
    };
    const result = universalPaginationOptionsSchema.safeParse(invalidTypeOptions);
    expect(result.success).toBe(false);
  });
});

describe('universalPaginatedResultSchema', () => {
  const schema = universalPaginatedResultSchema(stringSchema);

  it('should validate offset-based result', () => {
    const offsetResult = {
      type: 'offset',
      data: ['item1', 'item2'],
      total: 100,
      page: 1,
      limit: 50,
      hasNext: true,
      hasPrev: false,
      totalPages: 2,
    };
    const result = schema.safeParse(offsetResult);
    expect(result.success).toBe(true);
  });

  it('should validate cursor-based result', () => {
    const cursorResult = {
      type: 'cursor',
      data: ['item1', 'item2'],
      nextCursor: 'next123',
      hasNext: true,
      limit: 50,
    };
    const result = schema.safeParse(cursorResult);
    expect(result.success).toBe(true);
  });

  it('should reject result without type', () => {
    const noTypeResult = {
      data: ['item1'],
      total: 1,
      page: 1,
      limit: 50,
      hasNext: false,
      hasPrev: false,
      totalPages: 1,
    };
    const result = schema.safeParse(noTypeResult);
    expect(result.success).toBe(false);
  });
});
