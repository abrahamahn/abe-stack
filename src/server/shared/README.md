# 🔄 Shared Utilities and Types

## 📋 Purpose

The shared module provides common utilities, types, and helpers that are used across different parts of the application, offering:

- Reusable type definitions and interfaces
- Common utility functions
- Date manipulation and formatting utilities
- Helper functions for repetitive tasks
- Cross-cutting concerns shared between modules

This module serves as a centralized location for code that needs to be shared between different parts of the application, promoting consistency, reusability, and reducing duplication.

## 🧩 Key Components

### 1️⃣ Types

- **`types/`**: Common TypeScript interfaces, types, and enums
- Shared data structures
- Type guards and type utilities

### 2️⃣ Utilities

- **`utils/`**: General-purpose utility functions
- Common operations and transformations
- Small, focused utility functions

### 3️⃣ Helpers

- **`helpers/`**: Domain-specific helper functions
- Application-specific utilities
- Business logic that needs to be shared

### 4️⃣ Date Utilities

- **`date/`**: Date and time handling utilities
- Date formatting and parsing
- Date calculations and manipulations

## 🛠️ Usage Instructions

### Shared Types

```typescript
import {
  UserRole,
  PaginationParams,
  SortDirection,
} from "@/server/shared/types";

// Using shared enums
function hasAdminAccess(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

// Using shared interfaces
function fetchUsers(params: PaginationParams): Promise<User[]> {
  const { page, limit, sortBy, sortDirection } = params;

  // Build query with pagination parameters
  const query = {
    offset: (page - 1) * limit,
    limit,
    orderBy: sortBy,
    order: sortDirection || SortDirection.ASC,
  };

  // Execute query...
  return database.query(query);
}
```

### Utility Functions

```typescript
import { safeJSONParse, isEmpty, deepClone } from "@/server/shared/utils";

// Parse JSON safely without throwing exceptions
const data = safeJSONParse('{"name": "John"}', {});
console.log(data); // { name: "John" }

// Check if a value is empty
console.log(isEmpty("")); // true
console.log(isEmpty([])); // true
console.log(isEmpty({ prop: "value" })); // false

// Deep clone an object
const original = { nested: { value: 42 } };
const clone = deepClone(original);
clone.nested.value = 100;
console.log(original.nested.value); // Still 42
```

### Helper Functions

```typescript
import { formatCurrency, calculateTax } from "@/server/shared/helpers";

// Format currency amount
const price = formatCurrency(1299.99, "USD");
console.log(price); // "$1,299.99"

// Calculate tax for a given amount and rate
const subtotal = 100;
const taxRate = 0.08; // 8%
const tax = calculateTax(subtotal, taxRate);
console.log(tax); // 8
console.log(subtotal + tax); // 108
```

### Date Utilities

```typescript
import {
  formatDate,
  parseDate,
  addDays,
  isDateInRange,
} from "@/server/shared/date";

// Format a date
const today = new Date();
const formatted = formatDate(today, "YYYY-MM-DD");
console.log(formatted); // e.g., "2023-05-10"

// Parse a date string
const date = parseDate("2023-05-10", "YYYY-MM-DD");

// Add days to a date
const nextWeek = addDays(new Date(), 7);

// Check if a date is within a range
const isInRange = isDateInRange(
  new Date(),
  new Date("2023-01-01"),
  new Date("2023-12-31"),
);
console.log(isInRange); // true (if current date is in 2023)
```

## 🏗️ Architecture Decisions

### Reusability First

- **Decision**: Focus on creating highly reusable components
- **Rationale**: Reduces duplication and ensures consistency
- **Benefit**: Lower maintenance cost and higher code quality

### Minimal Dependencies

- **Decision**: Minimize external dependencies in shared code
- **Rationale**: Shared code should have minimal impact on bundle size
- **Implementation**: Pure functions with few or no dependencies

### Type Safety

- **Decision**: Strong typing for all shared code
- **Rationale**: Catch errors at compile-time rather than runtime
- **Benefit**: Improved developer experience with better autocomplete and error detection

### Clear Boundaries

- **Decision**: Maintain clear boundaries between shared and domain-specific code
- **Rationale**: Prevents shared code from becoming too coupled to specific features
- **Implementation**: Focus on generic utilities rather than application-specific logic

## ⚙️ Setup and Configuration Notes

### Best Practices

When working with shared code:

1. **Keep It Simple**: Shared utilities should be small, focused, and easy to understand.

2. **Document Well**: Add JSDoc comments to all shared functions to explain their purpose and usage.

3. **Test Thoroughly**: Write comprehensive tests for shared code since it's used in multiple places.

4. **Consider Performance**: Optimize shared utilities that will be used frequently.

5. **Avoid Side Effects**: Shared functions should be pure and avoid modifying external state.

### Example: Creating a New Utility

```typescript
/**
 * Truncates a string to a specified length and adds an ellipsis if truncated.
 *
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length of the resulting string (including ellipsis)
 * @param {string} [ellipsis='...'] - The ellipsis to append if truncated
 * @returns {string} The truncated string
 *
 * @example
 * truncateString("Hello world", 8); // Returns "Hello..."
 */
export function truncateString(
  str: string,
  maxLength: number,
  ellipsis = "...",
): string {
  if (!str || maxLength <= 0) {
    return "";
  }

  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}
```

### Example: Creating a New Type Definition

```typescript
/**
 * Represents the possible states of an asynchronous operation.
 */
export enum AsyncStatus {
  IDLE = "idle",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

/**
 * Represents the state of an asynchronous operation with data and error handling.
 */
export interface AsyncState<T, E = Error> {
  /** The current status of the async operation */
  status: AsyncStatus;

  /** The data returned by the operation when successful */
  data: T | null;

  /** The error that occurred during the operation, if any */
  error: E | null;

  /** When the last successful operation completed */
  lastUpdated?: Date;
}

/**
 * Creates an initial async state object.
 */
export function createInitialAsyncState<T, E = Error>(): AsyncState<T, E> {
  return {
    status: AsyncStatus.IDLE,
    data: null,
    error: null,
  };
}
```

### Organization Guidelines

Organize shared code according to these guidelines:

1. **`types/`**: Contains TypeScript interfaces, types, enums, and type guards.

   ```
   types/
   ├── common.ts      # Common types used throughout the app
   ├── api.ts         # API-related types and interfaces
   ├── models.ts      # Data model interfaces
   └── index.ts       # Re-exports all types
   ```

2. **`utils/`**: Contains pure utility functions.

   ```
   utils/
   ├── string.ts      # String manipulation utilities
   ├── array.ts       # Array manipulation utilities
   ├── object.ts      # Object manipulation utilities
   └── index.ts       # Re-exports all utilities
   ```

3. **`helpers/`**: Contains application-specific helper functions.

   ```
   helpers/
   ├── formatting.ts  # Formatting helpers for display
   ├── validation.ts  # Input validation helpers
   ├── calculations.ts # Business calculations
   └── index.ts       # Re-exports all helpers
   ```

4. **`date/`**: Contains date manipulation utilities.

   ```
   date/
   ├── formatting.ts  # Date formatting utilities
   ├── parsing.ts     # Date parsing utilities
   ├── calculations.ts # Date calculations
   └── index.ts       # Re-exports all date utilities
   ```
