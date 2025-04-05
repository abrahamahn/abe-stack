# 🛠️ Utility Functions

## 📋 Purpose

The utilities module provides a collection of helper functions and utilities for common programming tasks, offering:

- Generic utility functions for common operations
- Date and time handling utilities
- Object manipulation and comparison
- Random ID and token generation
- String manipulation and formatting
- Type checking and conversions
- Performance optimization helpers

This module serves as a centralized location for reusable utility functions used throughout the application, promoting code reuse and consistency.

## 🧩 Key Components

### 1️⃣ Date Helpers

- **`dateHelpers.ts`**: Utilities for date and time manipulation
- Functions for formatting, parsing, and comparing dates
- Time span calculations and timezone handling

### 2️⃣ Object Utilities

- **`shallowEqual.ts`**: Efficient object comparison
- Helpers for object manipulation and transformation
- Property access and validation

### 3️⃣ Random ID Generation

- **`randomId.ts`**: Secure random identifier generation
- Functions for creating UUIDs, tokens, and random strings
- Cryptographically secure random generation

### 4️⃣ Module Exports

- **`index.ts`**: Exports all utility functions
- Provides easy access to utility functionality

## 🛠️ Usage Instructions

### Date Manipulation

```typescript
import {
  formatDate,
  parseDate,
  addDays,
  daysBetween,
} from "@/server/infrastructure/utils/dateHelpers";

// Format date
const formattedDate = formatDate(new Date(), "YYYY-MM-DD");
console.log(formattedDate); // "2023-05-10"

// Parse date
const date = parseDate("2023-05-10", "YYYY-MM-DD");

// Add days to date
const nextWeek = addDays(new Date(), 7);

// Calculate days between dates
const dayCount = daysBetween(new Date("2023-05-01"), new Date("2023-05-10"));
console.log(dayCount); // 9
```

### Object Comparison

```typescript
import { shallowEqual } from "@/server/infrastructure/utils/shallowEqual";

// Compare two objects for equality
const obj1 = { name: "John", age: 30, preferences: { theme: "dark" } };
const obj2 = { name: "John", age: 30, preferences: { theme: "dark" } };
const obj3 = { name: "Jane", age: 30, preferences: { theme: "dark" } };

// Shallow equality check (only compares top-level properties)
console.log(shallowEqual(obj1, obj2)); // true
console.log(shallowEqual(obj1, obj3)); // false

// Compare only specific fields
console.log(shallowEqual(obj1, obj3, ["age", "preferences"])); // true
```

### Random ID Generation

```typescript
import {
  generateId,
  generateRandomString,
  generateUUID,
} from "@/server/infrastructure/utils/randomId";

// Generate simple random ID
const id = generateId();
console.log(id); // e.g., "a1b2c3d4"

// Generate UUID
const uuid = generateUUID();
console.log(uuid); // e.g., "123e4567-e89b-12d3-a456-426614174000"

// Generate random string with custom length
const randomString = generateRandomString(10);
console.log(randomString); // e.g., "xK9fPq2Lm5"

// Generate with custom character set
const randomCode = generateRandomString(6, "ABCDEF123456");
console.log(randomCode); // e.g., "A2C5F1"
```

## 🏗️ Architecture Decisions

### Pure Functions

- **Decision**: Implement pure function approach
- **Rationale**: Ensures predictable behavior and easier testing
- **Benefit**: Functions without side effects that always return the same output for the same input

### TypeScript-First

- **Decision**: Full TypeScript support with strict typing
- **Rationale**: Catch errors at compile time rather than runtime
- **Implementation**: Strong type definitions for all function parameters and return values

### Performance Optimized

- **Decision**: Focus on performance for frequently used utilities
- **Rationale**: Utility functions are called frequently throughout the application
- **Implementation**: Efficient algorithms and memoization where appropriate

### Modular Design

- **Decision**: Create modular, focused utility files
- **Rationale**: Improves maintainability and reduces bundle size
- **Benefit**: Allows tree-shaking to reduce application size

## ⚙️ Setup and Configuration Notes

### Basic Usage

Import utilities as needed:

```typescript
// Import only what you need
import { generateId } from "@/server/infrastructure/utils/randomId";
import { formatDate } from "@/server/infrastructure/utils/dateHelpers";

// Use the functions
const id = generateId();
const today = formatDate(new Date(), "YYYY-MM-DD");
```

### Date Formatting Configuration

Configure date formatting:

```typescript
import { configureDateHelpers } from "@/server/infrastructure/utils/dateHelpers";

// Configure default date settings
configureDateHelpers({
  defaultFormat: "YYYY-MM-DD",
  defaultTimeZone: "UTC",
  locale: "en-US",
});
```

### Extension Methods

Extending existing objects with utility methods:

```typescript
// In your application setup
import "@/server/infrastructure/utils/extensions";

// Now you can use extension methods
const str = "hello world";
const capitalized = str.capitalize(); // "Hello world"

const arr = [1, 2, 3, 4, 5];
const sum = arr.sum(); // 15
```

### Performance Monitoring

Adding performance monitoring to utilities:

```typescript
import { enablePerformanceLogging } from "@/server/infrastructure/utils";
import { LoggerService } from "@/server/infrastructure/logging";

const logger = new LoggerService();

// Enable performance logging for slow utilities
enablePerformanceLogging({
  logger,
  threshold: 5, // Log if function takes more than 5ms
  functions: ["shallowEqual", "deepClone"], // Functions to monitor
});
```

### Best Practices

Guidelines for using utilities effectively:

1. **Import Only What You Need**: To reduce bundle size, import specific functions rather than the entire module.

2. **Favor Pure Functions**: When creating new utilities, ensure they don't have side effects.

3. **Add Tests**: All utility functions should have comprehensive test coverage.

4. **Document Clearly**: Add JSDoc comments to document parameters, return values, and usage examples.

5. **Consider Performance**: For functions that may be called frequently, optimize for performance.

6. **Reuse Existing Utilities**: Check if a utility already exists before creating a new one.

Example of well-documented utility:

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
 * // Returns "Hello..."
 * truncateString("Hello world", 8);
 *
 * @example
 * // Returns "Hello world"
 * truncateString("Hello world", 20);
 */
export function truncateString(
  str: string,
  maxLength: number,
  ellipsis = "...",
): string {
  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength - ellipsis.length) + ellipsis;
}
```
