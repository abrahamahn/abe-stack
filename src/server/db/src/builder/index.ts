// backend/db/src/builder/index.ts

// Types
export {
  EMPTY_FRAGMENT,
  combine,
  escapeIdentifier,
  formatTable,
  fragment,
  param,
  raw,
  type ColumnSpec,
  type DbValue,
  type JoinSpec,
  type QueryBuilder,
  type QueryResult,
  type SortDirection,
  type SortSpec,
  type SqlFragment,
  type TableSpec,
} from './types';

// Conditions
export {
  and,
  any,
  arrayContains,
  arrayOverlaps,
  between,
  colEq,
  contains,
  endsWith,
  eq,
  escapeLikePattern,
  exists,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  jsonbContainedBy,
  jsonbContains,
  jsonbEq,
  jsonbHasAllKeys,
  jsonbHasAnyKey,
  jsonbHasKey,
  jsonbPath,
  jsonbPathEq,
  jsonbPathText,
  like,
  lt,
  lte,
  ne,
  not,
  notBetween,
  notExists,
  notIlike,
  notInArray,
  notLike,
  or,
  rawCondition,
  startsWith,
} from './conditions';

// Select
export { SelectBuilder, select, selectCount, selectExists } from './select';

// Insert
export { InsertBuilder, insert } from './insert';

// Update
export { UpdateBuilder, update } from './update';

// Delete
export { DeleteBuilder, del, deleteFrom, truncate, truncateCascade } from './delete';

// Window Functions
export {
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
  type AggregateFunction,
  type AliasedWindowExpr,
  type FrameBound,
  type WindowExpr,
  type WindowFunction,
  type WindowSpec,
} from './window';

// CTEs (Common Table Expressions)
export {
  withCte,
  withRecursiveCte,
  type CteBuilder,
  type CteDeleteBuilder,
  type CteInsertBuilder,
  type CteSelectBuilder,
  type CteUpdateBuilder,
} from './cte';
