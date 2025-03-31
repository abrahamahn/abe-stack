/**
 * Global type declarations for tests
 */
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

// This is needed to make the file a module
export {};
