// packages/ui/src/test/setup.ts
/**
 * Test Setup Configuration
 *
 * This file runs before all tests and configures:
 * 1. @testing-library/jest-dom - Custom matchers for DOM assertions
 * 2. vitest-axe - Accessibility testing matchers (optional, import axe manually in tests)
 * 3. MSW (Mock Service Worker) - Network request mocking
 * 4. React Testing Library cleanup - Automatic cleanup after each test
 *
 * Libraries available in tests:
 * - @testing-library/react - render, screen, waitFor, etc.
 * - @testing-library/user-event - userEvent.click(), userEvent.type(), etc.
 * - vitest-axe - import { axe } from '@/test/setup' and use toHaveNoViolations()
 * - msw - Mock network requests with http.get(), http.post(), etc.
 */

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { server } from './mocks/server';

// MSW Server Lifecycle
beforeAll(() => {
  // Start MSW server before all tests
  server.listen({
    onUnhandledRequest: 'warn', // Warn about unmocked requests
  });
});

afterEach(() => {
  // Clean up React Testing Library DOM
  cleanup();

  // Reset MSW handlers after each test
  server.resetHandlers();
});

afterAll(() => {
  // Clean up MSW server after all tests
  server.close();
});

// Export axe for use in tests (import manually when needed)
// Usage: import { axe } from '@/test/setup';
//        const results = await axe(container);
//        expect(results).toHaveNoViolations();
export { axe } from 'vitest-axe';
