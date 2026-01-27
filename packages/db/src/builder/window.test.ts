// packages/db/src/builder/__tests__/window.test.ts
import { describe, expect, it } from 'vitest';

import {
  arrayAgg,
  avg,
  count,
  cumeDist,
  denseRank,
  emptyWindow,
  firstValue,
  lag,
  lastValue,
  lead,
  max,
  min,
  nthValue,
  ntile,
  orderBy,
  partitionBy,
  percentRank,
  rank,
  rowNumber,
  stringAgg,
  sum,
} from '../window';

describe('Window Functions', () => {
  describe('window specification', () => {
    it('partitionBy creates partition specification', () => {
      const spec = partitionBy('user_id');
      expect(spec.toSql()).toBe('PARTITION BY user_id');
    });

    it('partitionBy with multiple columns', () => {
      const spec = partitionBy('user_id', 'region');
      expect(spec.toSql()).toBe('PARTITION BY user_id, region');
    });

    it('orderBy creates order specification', () => {
      const spec = orderBy('created_at');
      expect(spec.toSql()).toBe('ORDER BY created_at ASC');
    });

    it('orderBy with descending direction', () => {
      const spec = orderBy('created_at', 'desc');
      expect(spec.toSql()).toBe('ORDER BY created_at DESC');
    });

    it('combined partition and order', () => {
      const spec = partitionBy('user_id').orderBy('created_at', 'desc');
      expect(spec.toSql()).toBe('PARTITION BY user_id ORDER BY created_at DESC');
    });

    it('multiple order by columns', () => {
      const spec = orderBy('category', 'asc').orderBy('price', 'desc');
      expect(spec.toSql()).toBe('ORDER BY category ASC, price DESC');
    });

    it('rows frame with unbounded preceding', () => {
      const spec = orderBy('created_at').rows('unbounded preceding', 'current row');
      expect(spec.toSql()).toBe(
        'ORDER BY created_at ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW',
      );
    });

    it('rows frame with numeric bounds', () => {
      const spec = orderBy('created_at').rows({ preceding: 5 }, { following: 5 });
      expect(spec.toSql()).toBe('ORDER BY created_at ASC ROWS BETWEEN 5 PRECEDING AND 5 FOLLOWING');
    });

    it('range frame', () => {
      const spec = orderBy('value').range('unbounded preceding');
      expect(spec.toSql()).toBe('ORDER BY value ASC RANGE UNBOUNDED PRECEDING');
    });

    it('empty window specification', () => {
      const spec = emptyWindow();
      expect(spec.toSql()).toBe('');
    });
  });

  describe('ranking functions', () => {
    it('rowNumber generates ROW_NUMBER()', () => {
      const expr = rowNumber().over(partitionBy('user_id').orderBy('created_at'));
      expect(expr.text).toBe('ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC)');
      expect(expr.values).toEqual([]);
    });

    it('rank generates RANK()', () => {
      const expr = rank().over(orderBy('score', 'desc'));
      expect(expr.text).toBe('RANK() OVER (ORDER BY score DESC)');
    });

    it('denseRank generates DENSE_RANK()', () => {
      const expr = denseRank().over(orderBy('score', 'desc'));
      expect(expr.text).toBe('DENSE_RANK() OVER (ORDER BY score DESC)');
    });

    it('ntile generates NTILE(n)', () => {
      const expr = ntile(4).over(orderBy('value'));
      expect(expr.text).toBe('NTILE(4) OVER (ORDER BY value ASC)');
    });

    it('percentRank generates PERCENT_RANK()', () => {
      const expr = percentRank().over(orderBy('score'));
      expect(expr.text).toBe('PERCENT_RANK() OVER (ORDER BY score ASC)');
    });

    it('cumeDist generates CUME_DIST()', () => {
      const expr = cumeDist().over(orderBy('score'));
      expect(expr.text).toBe('CUME_DIST() OVER (ORDER BY score ASC)');
    });
  });

  describe('value functions', () => {
    it('lag generates LAG() with default offset', () => {
      const expr = lag('value').over(orderBy('timestamp'));
      expect(expr.text).toBe('LAG(value, 1) OVER (ORDER BY timestamp ASC)');
      expect(expr.values).toEqual([]);
    });

    it('lag with custom offset', () => {
      const expr = lag('value', 3).over(orderBy('timestamp'));
      expect(expr.text).toBe('LAG(value, 3) OVER (ORDER BY timestamp ASC)');
    });

    it('lag with default value', () => {
      const expr = lag('value', 1, 0).over(orderBy('timestamp'));
      expect(expr.text).toBe('LAG(value, 1, $1) OVER (ORDER BY timestamp ASC)');
      expect(expr.values).toEqual([0]);
    });

    it('lead generates LEAD() with default offset', () => {
      const expr = lead('value').over(orderBy('timestamp'));
      expect(expr.text).toBe('LEAD(value, 1) OVER (ORDER BY timestamp ASC)');
    });

    it('lead with custom offset and default', () => {
      const expr = lead('value', 2, null).over(orderBy('timestamp'));
      expect(expr.text).toBe('LEAD(value, 2, $1) OVER (ORDER BY timestamp ASC)');
      expect(expr.values).toEqual([null]);
    });

    it('firstValue generates FIRST_VALUE()', () => {
      const expr = firstValue('price').over(partitionBy('product_id').orderBy('date'));
      expect(expr.text).toBe('FIRST_VALUE(price) OVER (PARTITION BY product_id ORDER BY date ASC)');
    });

    it('lastValue generates LAST_VALUE()', () => {
      const expr = lastValue('price').over(partitionBy('product_id').orderBy('date'));
      expect(expr.text).toBe('LAST_VALUE(price) OVER (PARTITION BY product_id ORDER BY date ASC)');
    });

    it('nthValue generates NTH_VALUE()', () => {
      const expr = nthValue('price', 2).over(partitionBy('product_id').orderBy('date'));
      expect(expr.text).toBe(
        'NTH_VALUE(price, 2) OVER (PARTITION BY product_id ORDER BY date ASC)',
      );
    });
  });

  describe('aggregate functions as window functions', () => {
    it('sum generates SUM()', () => {
      const expr = sum('amount').over(partitionBy('region'));
      expect(expr.text).toBe('SUM(amount) OVER (PARTITION BY region)');
    });

    it('avg generates AVG()', () => {
      const expr = avg('amount').over(partitionBy('region'));
      expect(expr.text).toBe('AVG(amount) OVER (PARTITION BY region)');
    });

    it('count generates COUNT(column)', () => {
      const expr = count('id').over(partitionBy('user_id'));
      expect(expr.text).toBe('COUNT(id) OVER (PARTITION BY user_id)');
    });

    it('count without column generates COUNT(*)', () => {
      const expr = count().over(partitionBy('user_id'));
      expect(expr.text).toBe('COUNT(*) OVER (PARTITION BY user_id)');
    });

    it('min generates MIN()', () => {
      const expr = min('price').over(partitionBy('category'));
      expect(expr.text).toBe('MIN(price) OVER (PARTITION BY category)');
    });

    it('max generates MAX()', () => {
      const expr = max('price').over(partitionBy('category'));
      expect(expr.text).toBe('MAX(price) OVER (PARTITION BY category)');
    });

    it('stringAgg generates STRING_AGG()', () => {
      const expr = stringAgg('name', ', ').over(partitionBy('group_id'));
      expect(expr.text).toBe('STRING_AGG(name, $1) OVER (PARTITION BY group_id)');
      expect(expr.values).toEqual([', ']);
    });

    it('arrayAgg generates ARRAY_AGG()', () => {
      const expr = arrayAgg('id').over(partitionBy('group_id'));
      expect(expr.text).toBe('ARRAY_AGG(id) OVER (PARTITION BY group_id)');
    });

    it('aggregate functions can be used without OVER', () => {
      const frag = sum('amount').toSql();
      expect(frag.text).toBe('SUM(amount)');
      expect(frag.values).toEqual([]);
    });
  });

  describe('aliasing', () => {
    it('as() adds alias to window expression', () => {
      const expr = rowNumber().over(partitionBy('user_id').orderBy('created_at')).as('rn');
      expect(expr.text).toBe(
        'ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at ASC) AS rn',
      );
      expect(expr.alias).toBe('rn');
    });

    it('sum with alias', () => {
      const expr = sum('amount').over(partitionBy('region')).as('region_total');
      expect(expr.text).toBe('SUM(amount) OVER (PARTITION BY region) AS region_total');
      expect(expr.alias).toBe('region_total');
    });
  });

  describe('empty OVER clause', () => {
    it('rowNumber with empty OVER', () => {
      const expr = rowNumber().over();
      expect(expr.text).toBe('ROW_NUMBER() OVER ()');
    });

    it('sum with empty OVER', () => {
      const expr = sum('amount').over();
      expect(expr.text).toBe('SUM(amount) OVER ()');
    });
  });
});
