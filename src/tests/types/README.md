# 🧪 Test Type Definitions

## 📋 Overview

This directory contains type definition files that enhance the TypeScript development experience for tests. These definitions provide global type declarations and augment existing types to support testing functionality throughout the codebase.

## 🧩 Type Definition Files

| File                         | Description                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------ |
| [global.d.ts](./global.d.ts) | Provides global type declarations for test-specific objects and interfaces                       |
| [vitest.d.ts](./vitest.d.ts) | Ensures TypeScript recognizes Vitest's global types when using the `globals: true` configuration |

## 🔍 Key Type Definitions

### Global Test Types

The `global.d.ts` file extends the global namespace with test-specific types:

```typescript
declare global {
  namespace NodeJS {
    interface Global {
      __TEST_TYPES__: Record<string, symbol>;
    }
  }

  // For modern TypeScript that uses globalThis instead of Global
  interface globalThis {
    __TEST_TYPES__: Record<string, symbol>;
  }
}
```

This definition allows tests to access a global registry of test-specific type symbols, which is particularly useful for dependency injection and type identification in tests.

### Vitest Type References

The `vitest.d.ts` file includes:

```typescript
/// <reference types="vitest" />

// This file ensures TypeScript recognizes the global Vitest types
// when enabled through the config option `globals: true`
```

This reference ensures that TypeScript recognizes Vitest's global types (such as `describe`, `it`, `expect`) when you've enabled the `globals: true` configuration in your Vitest setup.

## 🔧 Usage in Tests

### Using Test Types

Test types are used throughout the test files to:

1. **Type Test Mocks**: Ensure mocked objects conform to the expected interfaces

   ```typescript
   // Type-safe mock of a logger service
   const mockLogger: ILoggerService = {
     info: vi.fn(),
     error: vi.fn(),
     warn: vi.fn(),
     debug: vi.fn(),
   };
   ```

2. **Register Test Type Tokens**: Create unique type identifiers for dependency injection in tests

   ```typescript
   // Access the global test types registry
   globalThis.__TEST_TYPES__.MockService = Symbol("MockService");
   ```

3. **Augment Existing Interfaces**: Extend interfaces with test-specific properties

   ```typescript
   // In your test files, TypeScript will recognize these augmented types
   const request: Request = {
     _testOverrides: { userId: "123" },
     // ... other request properties
   };
   ```

## 📚 Best Practices

When working with these type definitions:

1. **Keep Test-Specific Types Separate**: Avoid polluting the global namespace with application types
2. **Use Type Guards**: Implement runtime type checks to ensure values match their expected types
3. **Mirror Application Types**: Test types should closely match the structure of application types
4. **Maintain Compatibility**: Update test types when application types change

## 🔗 Related Components

- [Unit Tests](../server/unit/README.md) - Unit tests that leverage these type definitions
- [Integration Tests](../server/integration/README.md) - Integration tests that leverage these type definitions
- [Test Utilities](../utils/README.md) - Test utilities that work with these type definitions
