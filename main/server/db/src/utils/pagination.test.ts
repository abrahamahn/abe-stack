// main/server/db/src/utils/pagination.test.ts
import { encodeCursor } from '@abe-stack/shared';
import { describe, expect, it } from 'vitest';

import { and, eq, gt, lt, or } from '../builder/index';

import { buildCursorCondition, buildCursorResult, combineConditions } from './pagination';

import type { SqlFragment } from '../builder/index';

describe('Pagination Utils', () => {
  describe('buildCursorCondition', () => {
    describe('when given valid cursor and desc sort order', () => {
      it('should return OR condition with lt comparisons', () => {
        const testDate = new Date('2024-01-15T10:30:00Z');
        const cursor = encodeCursor({
          value: testDate,
          tieBreaker: 'test-id-123',
          sortOrder: 'desc',
        });

        const result = buildCursorCondition(cursor, 'desc');

        expect(result).toBeDefined();
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('values');

        // Should produce: (created_at < $1) OR (created_at = $2 AND id < $3)
        const expected = or(
          lt('created_at', testDate),
          and(eq('created_at', testDate), lt('id', 'test-id-123')),
        );
        expect(result).toEqual(expected);
      });

      it('should handle string date values in cursor', () => {
        const cursor = encodeCursor({
          value: '2024-01-15T10:30:00Z',
          tieBreaker: 'test-id-456',
          sortOrder: 'desc',
        });

        const result = buildCursorCondition(cursor, 'desc');

        expect(result).toBeDefined();
        expect(result?.values).toHaveLength(3);
        // First and second values should be the date (converted from string)
        expect(result?.values[0]).toBeInstanceOf(Date);
        expect(result?.values[1]).toBeInstanceOf(Date);
      });
    });

    describe('when given valid cursor and asc sort order', () => {
      it('should return OR condition with gt comparisons', () => {
        const testDate = new Date('2024-02-20T14:45:00Z');
        const cursor = encodeCursor({
          value: testDate,
          tieBreaker: 'test-id-789',
          sortOrder: 'asc',
        });

        const result = buildCursorCondition(cursor, 'asc');

        expect(result).toBeDefined();
        expect(result).toHaveProperty('text');
        expect(result).toHaveProperty('values');

        // Should produce: (created_at > $1) OR (created_at = $2 AND id > $3)
        const expected = or(
          gt('created_at', testDate),
          and(eq('created_at', testDate), gt('id', 'test-id-789')),
        );
        expect(result).toEqual(expected);
      });

      it('should handle numeric tiebreaker values', () => {
        const testDate = new Date('2024-03-01T08:00:00Z');
        const cursor = encodeCursor({
          value: testDate,
          tieBreaker: '12345',
          sortOrder: 'asc',
        });

        const result = buildCursorCondition(cursor, 'asc');

        expect(result).toBeDefined();
        expect(result?.values[2]).toBe('12345');
      });
    });

    describe('when given undefined cursor', () => {
      it('should return null', () => {
        const result = buildCursorCondition(undefined, 'desc');
        expect(result).toBeNull();
      });
    });

    describe('when given empty string cursor', () => {
      it('should return null', () => {
        const result = buildCursorCondition('', 'asc');
        expect(result).toBeNull();
      });
    });

    describe('when given invalid cursor', () => {
      it('should return null for malformed base64', () => {
        const result = buildCursorCondition('not-valid-base64!!!', 'desc');
        expect(result).toBeNull();
      });

      it('should return null for invalid JSON structure', () => {
        const invalidCursor = Buffer.from('{"invalid": "structure"}').toString('base64url');
        const result = buildCursorCondition(invalidCursor, 'asc');
        expect(result).toBeNull();
      });

      it('should return null for cursor with missing fields', () => {
        const invalidCursor = Buffer.from('["2024-01-01"]').toString('base64url');
        const result = buildCursorCondition(invalidCursor, 'desc');
        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle Date objects in cursor value', () => {
        const testDate = new Date('2024-06-15T12:00:00Z');
        const cursor = encodeCursor({
          value: testDate,
          tieBreaker: 'edge-case-id',
          sortOrder: 'desc',
        });

        const result = buildCursorCondition(cursor, 'desc');

        expect(result).toBeDefined();
        expect(result?.values[0]).toEqual(testDate);
      });

      it('should handle ISO string dates in cursor value', () => {
        const isoString = '2024-12-25T00:00:00.000Z';
        const cursor = encodeCursor({
          value: isoString,
          tieBreaker: 'christmas-id',
          sortOrder: 'asc',
        });

        const result = buildCursorCondition(cursor, 'asc');

        expect(result).toBeDefined();
        expect(result?.values[0]).toEqual(new Date(isoString));
      });
    });
  });

  describe('combineConditions', () => {
    describe('when given multiple conditions', () => {
      it('should combine with AND operator', () => {
        const condition1: SqlFragment = { text: 'status = $1', values: ['active'] };
        const condition2: SqlFragment = { text: 'age > $2', values: [18] };
        const condition3: SqlFragment = { text: 'country = $3', values: ['US'] };

        const result = combineConditions([condition1, condition2, condition3]);

        expect(result).toBeDefined();
        const expected = and(condition1, condition2, condition3);
        expect(result).toEqual(expected);
      });

      it('should preserve all values from conditions', () => {
        const condition1: SqlFragment = { text: 'id = $1', values: ['id-123'] };
        const condition2: SqlFragment = { text: 'name = $2', values: ['John'] };

        const result = combineConditions([condition1, condition2]);

        expect(result?.values).toHaveLength(2);
        expect(result?.values[0]).toBe('id-123');
        expect(result?.values[1]).toBe('John');
      });
    });

    describe('when given single condition', () => {
      it('should return the condition unchanged', () => {
        const condition: SqlFragment = { text: 'status = $1', values: ['active'] };

        const result = combineConditions([condition]);

        expect(result).toEqual(condition);
      });
    });

    describe('when given empty array', () => {
      it('should return null', () => {
        const result = combineConditions([]);
        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should handle conditions with no values', () => {
        const condition1: SqlFragment = { text: 'is_deleted = false', values: [] };
        const condition2: SqlFragment = { text: 'is_active = true', values: [] };

        const result = combineConditions([condition1, condition2]);

        expect(result).toBeDefined();
        expect(result?.values).toHaveLength(0);
      });

      it('should handle conditions with complex parameterized queries', () => {
        const condition1: SqlFragment = {
          text: '(status = $1 OR status = $2)',
          values: ['active', 'pending'],
        };
        const condition2: SqlFragment = { text: 'created_at > $3', values: [new Date()] };

        const result = combineConditions([condition1, condition2]);

        expect(result).toBeDefined();
        expect(result?.values).toHaveLength(3);
      });

      it('should handle array with undefined first element', () => {
        const condition: SqlFragment = { text: 'test = $1', values: ['test'] };
        const arrayWithUndefined = [undefined as unknown as SqlFragment, condition];

        const result = combineConditions(arrayWithUndefined);

        // Should return null when first element is undefined
        expect(result).toBeNull();
      });
    });
  });

  describe('buildCursorResult', () => {
    interface TestItem {
      id: string;
      createdAt: Date;
      name: string;
    }

    const createTestItems = (count: number): TestItem[] => {
      return Array.from({ length: count }, (_, i) => ({
        id: `item-${String(i + 1)}`,
        createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
        name: `Item ${String(i + 1)}`,
      }));
    };

    describe('when data has more items than limit', () => {
      it('should trim extra item and set hasNext to true', () => {
        const items = createTestItems(11); // limit + 1
        const limit = 10;

        const result = buildCursorResult(items, limit, 'desc');

        expect(result.data).toHaveLength(10);
        expect(result.hasNext).toBe(true);
        expect(result.limit).toBe(10);
        // Should not include the 11th item
        expect(result.data.every((item) => item.id !== 'item-11')).toBe(true);
      });

      it('should encode cursor for the last item in trimmed data', () => {
        const items = createTestItems(6); // limit + 1
        const limit = 5;

        const result = buildCursorResult(items, limit, 'desc');

        expect(result.nextCursor).toBeDefined();
        expect(result.nextCursor).not.toBeNull();
        expect(typeof result.nextCursor).toBe('string');

        // The cursor should be for the 5th item (last in trimmed data)
        const lastItem = result.data[result.data.length - 1];
        expect(lastItem?.id).toBe('item-5');
      });

      it('should use correct sort order when encoding cursor', () => {
        const items = createTestItems(4);
        const limit = 3;

        const resultDesc = buildCursorResult(items, limit, 'desc');
        const resultAsc = buildCursorResult(items, limit, 'asc');

        expect(resultDesc.nextCursor).toBeDefined();
        expect(resultAsc.nextCursor).toBeDefined();
        // Cursors should be different due to different sort orders
        expect(resultDesc.nextCursor).not.toEqual(resultAsc.nextCursor);
      });
    });

    describe('when data has exactly limit items', () => {
      it('should not trim data and set hasNext to false', () => {
        const items = createTestItems(10);
        const limit = 10;

        const result = buildCursorResult(items, limit, 'desc');

        expect(result.data).toHaveLength(10);
        expect(result.hasNext).toBe(false);
        expect(result.nextCursor).toBeNull();
      });
    });

    describe('when data has fewer items than limit', () => {
      it('should not trim data and set hasNext to false', () => {
        const items = createTestItems(5);
        const limit = 10;

        const result = buildCursorResult(items, limit, 'asc');

        expect(result.data).toHaveLength(5);
        expect(result.hasNext).toBe(false);
        expect(result.nextCursor).toBeNull();
      });
    });

    describe('when data is empty', () => {
      it('should return empty result with no cursor', () => {
        const items: TestItem[] = [];
        const limit = 10;

        const result = buildCursorResult(items, limit, 'desc');

        expect(result.data).toHaveLength(0);
        expect(result.hasNext).toBe(false);
        expect(result.nextCursor).toBeNull();
        expect(result.limit).toBe(10);
      });
    });

    describe('edge cases', () => {
      it('should handle single item with limit 1', () => {
        const items = createTestItems(2); // limit + 1
        const limit = 1;

        const result = buildCursorResult(items, limit, 'desc');

        expect(result.data).toHaveLength(1);
        expect(result.hasNext).toBe(true);
        expect(result.nextCursor).not.toBeNull();
      });

      it('should mutate original array by popping last item', () => {
        const items = createTestItems(6);
        const originalLength = items.length;
        const limit = 5;

        buildCursorResult(items, limit, 'desc');

        // Original array should be mutated (popped)
        expect(items).toHaveLength(originalLength - 1);
      });

      it('should handle items with same createdAt but different ids', () => {
        const sameDate = new Date('2024-01-01T10:00:00Z');
        const items: TestItem[] = [
          { id: 'item-1', createdAt: sameDate, name: 'Item 1' },
          { id: 'item-2', createdAt: sameDate, name: 'Item 2' },
          { id: 'item-3', createdAt: sameDate, name: 'Item 3' },
        ];
        const limit = 2;

        const result = buildCursorResult(items, limit, 'asc');

        expect(result.hasNext).toBe(true);
        expect(result.nextCursor).toBeDefined();
        // Cursor should include both createdAt and id for tie-breaking
        expect(result.nextCursor).not.toBeNull();
      });

      it('should handle very large limit', () => {
        const items = createTestItems(5);
        const limit = 1000;

        const result = buildCursorResult(items, limit, 'desc');

        expect(result.data).toHaveLength(5);
        expect(result.hasNext).toBe(false);
        expect(result.nextCursor).toBeNull();
      });

      it('should handle zero limit with data', () => {
        const items = createTestItems(5);
        const limit = 0;

        const result = buildCursorResult(items, limit, 'desc');

        // With limit 0, data.length (5) > limit (0) is true, so it pops 1 item
        expect(result.hasNext).toBe(true);
        expect(result.data).toHaveLength(4);
      });
    });

    describe('cursor encoding integration', () => {
      it('should encode cursor that can be decoded and used in buildCursorCondition', () => {
        const items = createTestItems(6);
        const limit = 5;

        const result = buildCursorResult(items, limit, 'desc');

        expect(result.nextCursor).toBeDefined();
        expect(result.nextCursor).not.toBeNull();

        // Should be able to use this cursor with buildCursorCondition
        const condition = buildCursorCondition(result.nextCursor ?? undefined, 'desc');
        expect(condition).toBeDefined();
        expect(condition).toHaveProperty('text');
        expect(condition).toHaveProperty('values');
      });

      it('should produce cursor with correct field references', () => {
        const items = createTestItems(3);
        const limit = 2;

        const result = buildCursorResult(items, limit, 'asc');
        const lastItem = result.data[result.data.length - 1];

        expect(lastItem).toBeDefined();
        expect(result.nextCursor).not.toBeNull();

        // Cursor should reference the last item's createdAt and id
        const condition = buildCursorCondition(result.nextCursor ?? undefined, 'asc');
        expect(condition?.values[0]).toEqual(lastItem?.createdAt);
        expect(condition?.values[2]).toBe(lastItem?.id);
      });
    });
  });

  describe('Integration tests', () => {
    describe('cursor pagination flow', () => {
      it('should handle complete pagination cycle', () => {
        interface TestItem {
          id: string;
          createdAt: Date;
          name: string;
        }

        const allItems: TestItem[] = Array.from({ length: 25 }, (_, i) => ({
          id: `item-${String(i + 1)}`,
          createdAt: new Date(`2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`),
          name: `Item ${String(i + 1)}`,
        }));

        const limit = 10;
        let cursor: string | undefined;
        let page = 0;

        // First page (no cursor)
        const condition1 = buildCursorCondition(cursor, 'desc');
        const conditions1 = condition1 !== null ? [condition1] : [];
        const combined1 = combineConditions(conditions1);
        const page1Data = allItems.slice(0, limit + 1); // Simulate fetching limit+1
        const result1 = buildCursorResult(page1Data, limit, 'desc');

        page++;
        expect(result1.data).toHaveLength(10);
        expect(result1.hasNext).toBe(true);
        expect(result1.nextCursor).not.toBeNull();
        expect(combined1).toBeNull(); // No cursor on first page

        // Second page (with cursor)
        cursor = result1.nextCursor ?? undefined;
        const condition2 = buildCursorCondition(cursor, 'desc');
        const conditions2 = condition2 !== null ? [condition2] : [];
        const combined2 = combineConditions(conditions2);
        const page2Data = allItems.slice(10, 20 + 1); // Simulate fetching next limit+1
        const result2 = buildCursorResult(page2Data, limit, 'desc');

        page++;
        expect(result2.data).toHaveLength(10);
        expect(result2.hasNext).toBe(true);
        expect(result2.nextCursor).not.toBeNull();
        expect(combined2).not.toBeNull(); // Should have condition from cursor

        // Third page (last partial page)
        cursor = result2.nextCursor ?? undefined;
        const condition3 = buildCursorCondition(cursor, 'desc');
        const page3Data = allItems.slice(20, 30 + 1); // Only 5 items left
        const result3 = buildCursorResult(page3Data, limit, 'desc');

        page++;
        expect(result3.data).toHaveLength(5);
        expect(result3.hasNext).toBe(false);
        expect(result3.nextCursor).toBeNull();
        expect(condition3).not.toBeNull();

        // Verify we paginated through all items
        expect(page).toBe(3);
        expect(result1.data.length + result2.data.length + result3.data.length).toBe(25);
      });

      it('should support both asc and desc sort orders', () => {
        interface TestItem {
          id: string;
          createdAt: Date;
        }

        const items: TestItem[] = [
          { id: 'item-1', createdAt: new Date('2024-01-01T10:00:00Z') },
          { id: 'item-2', createdAt: new Date('2024-01-02T10:00:00Z') },
          { id: 'item-3', createdAt: new Date('2024-01-03T10:00:00Z') },
        ];

        const limit = 2;

        // Descending order
        const resultDesc = buildCursorResult([...items].slice(0, 3), limit, 'desc');
        const conditionDesc = buildCursorCondition(resultDesc.nextCursor ?? undefined, 'desc');

        expect(conditionDesc).not.toBeNull();
        expect(conditionDesc?.text).toContain('<'); // Should use lt for desc

        // Ascending order
        const resultAsc = buildCursorResult([...items].slice(0, 3), limit, 'asc');
        const conditionAsc = buildCursorCondition(resultAsc.nextCursor ?? undefined, 'asc');

        expect(conditionAsc).not.toBeNull();
        expect(conditionAsc?.text).toContain('>'); // Should use gt for asc
      });
    });
  });
});
