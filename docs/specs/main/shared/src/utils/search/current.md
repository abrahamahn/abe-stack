# Shared Utils: Search Module - Current Behavior Spec

**Status:** DRAFT (Current State)
**Module:** `@bslt/shared/utils/search`
**Source:** `main/shared/src/utils/search`

## Overview

The Search module provides a type-safe, fluent query builder and filtering system for frontend and backend use. It abstracts the complexity of building search queries, pagination, and sorting into a unified API.

## Core Capabilities

### 1. Query Building (`SearchQueryBuilder`)

- **Architecture:** Fluent API pattern (chainable methods).
- **State:** Maintains internal state for `filters` (AND logic default), `sort`, `search`, `page`, `limit`, `cursor`, `select`, `includeCount`, and `facets`.
- **Immutability:** `clone()` method allows for branching query logic.

### 2. Filtering

- **Operators:** Supports strict equality (`eq`), inequality (`neq`), comparison (`gt`, `lt`, `gte`, `lte`), string matching (`contains`, `startsWith`, `endsWith`, `like`, `ilike`), and set operations (`in`, `notIn`).
- **Case Sensitivity:** Optional for string operations (default `false` for helpers, `true` for raw filters).
- **Logical Groups:** Supports `AND`, `OR`, and `NOT` grouping via callback pattern (`.or(builder => ...)`).
- **Null Handling:** Explicit `whereNull`, `whereNotNull`.
- **Array Handling:** `whereArrayContains`, `whereArrayContainsAny`.

### 3. Pagination & Sorting

- **Pagination:** 1-indexed page numbering. Max limit capped at 1000.
- **Cursor:** Supports string-based cursor pagination.
- **Sorting:** Supports multiple sort fields with optional null handling (`first` / `last`).

### 4. Full-Text Search

- **Search:** Supports simple query string or field-targeted search.
- **Fuzziness:** Configurable fuzziness factor (default 0.8).

## API Surface

### `SearchQueryBuilder<T>`

| Method           | Input                | Output        | Side Effects                                     |
| :--------------- | :------------------- | :------------ | :----------------------------------------------- |
| `where`          | `field`, `op`, `val` | `this`        | Pushes to internal `_filters` array.             |
| `and`/`or`/`not` | `callback`           | `this`        | Creates sub-builder/group, pushes to `_filters`. |
| `orderBy`        | `field`, `asc/desc`  | `this`        | Pushes to internal `_sort` array.                |
| `limit`          | `number`             | `this`        | Clamps input between 1 and 1000.                 |
| `scan`           | `string`             | `this`        | Sets full-text search config.                    |
| `build`          | `void`               | `SearchQuery` | Returns serialized query object.                 |

### Helper Factories

- `createSearchQuery<T>()`: Returns a new empty builder.
- `fromSearchQuery<T>(query)`: Rehydrates a builder from a serialized object.
- `eq`, `neq`, `gt`, `lt`, `contains`, `inArray`: Stateless factory functions for filter conditions.

## Behavior Notes & Edge Cases

1.  **Multiple Filters:** By default, calling `.where()` multiple times acts as an implicit `AND`.
2.  **Empty Groups:** `and()`, `or()`, and `not()` ignore the callback if it adds no filters (preventing empty logic groups).
3.  **Page Index:** `page()` input is clamped to `Math.max(1, input)`. 0 or negative pages become 1.
4.  **Limit Cap:** `limit()` input is clamped to `Math.min(limit, 1000)`.
5.  **Undefined Filters:** `build()` omits `filters` property if the array is empty.

## Observed Limitations / Flaws (For Audit)

- **No Validation:** The builder does not validate if `field` actually exists on type `T` at runtime (only compile-time TS check).
- **Complexity Limit:** No explicit safeguards against deeply nested logic groups (potential Stack Overflow or complex query DOS).
- **Serialization:** `fromSearchQuery` directly accesses private properties which is an anti-pattern (though valid in JS).

## Usage Example

```typescript
const query = createSearchQuery<User>()
  .whereEq('status', 'active')
  .whereGte('age', 18)
  .or((b) => b.whereContains('name', 'John').whereContains('email', 'gmail'))
  .orderByDesc('createdAt')
  .limit(20)
  .build();
```
