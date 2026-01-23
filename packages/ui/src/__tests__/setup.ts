// packages/ui/src/__tests__/setup.ts
/**
 * Test Setup Configuration
 *
 * This file runs before all tests and configures:
 * 1. @testing-library/jest-dom - Custom matchers for DOM assertions
 * 2. React Testing Library cleanup - Automatic cleanup after each test
 *
 * Libraries available in tests:
 * - @testing-library/react - render, screen, waitFor, etc.
 * - @testing-library/user-event - userEvent.click(), userEvent.type(), etc.
 *
 * For API mocking, use vi.mock() to mock your API client directly.
 */

import '@testing-library/jest-dom';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Mock window.matchMedia for tests (only in browser-like environments)
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: (): void => {},
      removeListener: (): void => {},
      addEventListener: (): void => {},
      removeEventListener: (): void => {},
      dispatchEvent: (): boolean => false,
    }),
  });
}

afterEach(() => {
  // Clean up React Testing Library DOM
  cleanup();
});
